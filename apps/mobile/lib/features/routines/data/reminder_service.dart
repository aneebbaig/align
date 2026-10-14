import 'dart:convert';

import 'package:flutter/foundation.dart';
import 'package:flutter_local_notifications/flutter_local_notifications.dart';
import 'package:flutter_timezone/flutter_timezone.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:timezone/data/latest.dart' as tzdata;
import 'package:timezone/timezone.dart' as tz;

import '../domain/entities/routine_entity.dart';
import 'reminder_plan.dart';
import 'tick_queue.dart';

const _doneAction = 'done';
const _snoozeAction = 'snooze';
const _cacheKey = 'routines_cache';
const _snoozeMinutes = 10;

/// Handles a tap on a notification action. Top-level and entry-point annotated
/// so Android can run it with the app closed. Only Done and Snooze are actions;
/// a plain tap (no actionId) is handled by the foreground callback.
@pragma('vm:entry-point')
Future<void> routineNotificationBackground(NotificationResponse response) async {
  await ReminderService.handleAction(response);
}

/// Schedules the phone-side routine reminders. Everything is local: the alarms
/// fire with no network and survive a reboot (the plugin's boot receiver).
class ReminderService {
  ReminderService._();
  static final ReminderService instance = ReminderService._();

  final FlutterLocalNotificationsPlugin _plugin = FlutterLocalNotificationsPlugin();
  bool _ready = false;

  /// Called when the user taps the notification body (opens the checklist).
  void Function()? onOpen;

  static Future<void> _initTimezone() async {
    tzdata.initializeTimeZones();
    try {
      tz.setLocalLocation(tz.getLocation((await FlutterTimezone.getLocalTimezone()).identifier));
    } catch (e) {
      debugPrint('Timezone lookup failed, using UTC: $e');
    }
  }

  Future<void> init() async {
    if (_ready) return;
    await _initTimezone();
    await _plugin.initialize(
      settings: const InitializationSettings(android: AndroidInitializationSettings('@mipmap/ic_launcher')),
      onDidReceiveNotificationResponse: (r) async {
        if (r.actionId == null) {
          onOpen?.call();
        } else {
          await handleAction(r);
        }
      },
      onDidReceiveBackgroundNotificationResponse: routineNotificationBackground,
    );
    _ready = true;
  }

  static NotificationDetails _details() => const NotificationDetails(
        android: AndroidNotificationDetails(
          'routines',
          'Routine reminders',
          channelDescription: 'Loud reminders for your timed routines',
          importance: Importance.max,
          priority: Priority.high,
          category: AndroidNotificationCategory.reminder,
          playSound: true,
          enableVibration: true,
          visibility: NotificationVisibility.public,
          actions: [
            AndroidNotificationAction(_doneAction, 'Done'),
            AndroidNotificationAction(_snoozeAction, 'Snooze 10m'),
          ],
        ),
      );

  /// Asks for notification and exact-alarm permission. Returns whether exact
  /// alarms are allowed; without them reminders may arrive a few minutes late.
  Future<bool> requestPermissions() async {
    await init();
    final android = _plugin.resolvePlatformSpecificImplementation<AndroidFlutterLocalNotificationsPlugin>();
    if (android == null) return false;
    await android.requestNotificationsPermission();
    if (await android.canScheduleExactNotifications() != true) {
      await android.requestExactAlarmsPermission();
    }
    return await android.canScheduleExactNotifications() ?? false;
  }

  /// Replaces every routine alarm with what [routines] call for. Snoozes in
  /// flight are left alone.
  Future<void> reschedule(List<RoutineEntity> routines) async {
    await init();
    final android = _plugin.resolvePlatformSpecificImplementation<AndroidFlutterLocalNotificationsPlugin>();
    final exact = await android?.canScheduleExactNotifications() ?? false;
    final mode = exact ? AndroidScheduleMode.exactAllowWhileIdle : AndroidScheduleMode.inexactAllowWhileIdle;

    for (final p in await _plugin.pendingNotificationRequests()) {
      if (p.id % 10 != snoozeSlot) await _plugin.cancel(id: p.id);
    }

    final byId = {for (final r in routines) r.id: r};
    for (final e in buildReminderPlan(routines, DateTime.now())) {
      final when = _nextInstance(e);
      if (when == null) continue;
      await _plugin.zonedSchedule(
        id: e.id,
        title: e.title,
        body: 'Time for your routine (${byId[e.routineId]!.time})',
        scheduledDate: when,
        notificationDetails: _details(),
        androidScheduleMode: mode,
        payload: '${e.routineId}|${byId[e.routineId]!.time}',
        matchDateTimeComponents: e.weekday != null ? DateTimeComponents.dayOfWeekAndTime : null,
      );
    }
  }

  static tz.TZDateTime? _nextInstance(ReminderEntry e) {
    final now = tz.TZDateTime.now(tz.local);
    if (e.weekday == null) {
      final p = e.date!.split('-').map(int.parse).toList();
      final at = tz.TZDateTime(tz.local, p[0], p[1], p[2], e.hour, e.minute);
      return at.isAfter(now) ? at : null;
    }
    var at = tz.TZDateTime(tz.local, now.year, now.month, now.day, e.hour, e.minute);
    while (at.weekday != e.weekday || !at.isAfter(now)) {
      at = tz.TZDateTime(tz.local, at.year, at.month, at.day + 1, e.hour, e.minute);
    }
    return at;
  }

  // ── Notification actions (also run from a background isolate) ──────────────

  /// Which day a notification belongs to: the payload carries the routine's
  /// time, and a tap before that time of day means it fired yesterday.
  @visibleForTesting
  static String dateForTap(String time, DateTime now) {
    final sched = int.parse(time.substring(0, 2)) * 60 + int.parse(time.substring(3, 5));
    final day = now.hour * 60 + now.minute < sched ? now.subtract(const Duration(days: 1)) : now;
    return '${day.year.toString().padLeft(4, '0')}-${day.month.toString().padLeft(2, '0')}-${day.day.toString().padLeft(2, '0')}';
  }

  static Future<void> handleAction(NotificationResponse r) async {
    final parts = (r.payload ?? '').split('|');
    if (parts.length != 2) return;
    final routineId = parts[0];
    final time = parts[1];

    if (r.actionId == _doneAction) {
      final now = DateTime.now();
      await TickQueue().add(QueuedTick(routineId: routineId, date: dateForTap(time, now), at: now));
    } else if (r.actionId == _snoozeAction) {
      await _initTimezone();
      final plugin = FlutterLocalNotificationsPlugin();
      await plugin.initialize(
        settings: const InitializationSettings(android: AndroidInitializationSettings('@mipmap/ic_launcher')),
      );
      final title = await _cachedTitle(routineId);
      await plugin.zonedSchedule(
        id: reminderId(routineId, snoozeSlot),
        title: title ?? 'Routine',
        body: 'Snoozed reminder ($time)',
        scheduledDate: tz.TZDateTime.now(tz.local).add(const Duration(minutes: _snoozeMinutes)),
        notificationDetails: _details(),
        androidScheduleMode: AndroidScheduleMode.exactAllowWhileIdle,
        payload: r.payload,
      );
    }
  }

  // ── Offline cache so alarms can be rescheduled without the network ─────────

  static Future<void> cacheRoutines(List<RoutineEntity> routines) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(
      _cacheKey,
      jsonEncode([
        for (final r in routines)
          {'id': r.id, 'title': r.title, 'time': r.time, 'days': r.days, 'date': r.date, 'active': r.active},
      ]),
    );
  }

  static Future<List<RoutineEntity>> cachedRoutines() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.reload();
    final raw = prefs.getString(_cacheKey);
    if (raw == null) return [];
    return (jsonDecode(raw) as List<dynamic>).map((e) => RoutineEntity.fromJson(e as Map<String, dynamic>)).toList();
  }

  static Future<String?> _cachedTitle(String routineId) async {
    for (final r in await cachedRoutines()) {
      if (r.id == routineId) return r.title;
    }
    return null;
  }
}
