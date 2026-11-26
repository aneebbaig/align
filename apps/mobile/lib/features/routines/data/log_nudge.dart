import 'package:flutter_local_notifications/flutter_local_notifications.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:timezone/timezone.dart' as tz;

import '../../../core/services/last_entry_store.dart';
import 'reminder_service.dart';
import '../../../core/utils/app_log.dart';

const _kEnabled = 'log_nudge_enabled';
const _kMinutes = 'log_nudge_minutes';
const nudgeDefaultMinutes = 21 * 60;
const nudgeId = 900000001;
const nudgePayload = 'log_nudge';

/// When the evening nudge should next fire, or null when it's switched off.
/// A day on which something was already logged is skipped.
DateTime? nextNudgeFire({
  required DateTime now,
  required DateTime? lastEntrySavedAt,
  required bool enabled,
  required int hour,
  required int minute,
}) {
  if (!enabled) return null;
  final today = DateTime(now.year, now.month, now.day, hour, minute);
  final tomorrow = DateTime(now.year, now.month, now.day + 1, hour, minute);
  final loggedToday = lastEntrySavedAt != null &&
      lastEntrySavedAt.year == now.year &&
      lastEntrySavedAt.month == now.month &&
      lastEntrySavedAt.day == now.day;
  if (loggedToday) return tomorrow;
  return today.isAfter(now) ? today : tomorrow;
}

/// The daily "Anything spent today?" reminder. Local to this phone; one
/// notification id, so only one is ever pending.
class LogNudge {
  LogNudge._();

  static Future<bool> isEnabled() async =>
      (await SharedPreferences.getInstance()).getBool(_kEnabled) ?? true;

  static Future<int> minutes() async =>
      (await SharedPreferences.getInstance()).getInt(_kMinutes) ?? nudgeDefaultMinutes;

  static Future<void> setEnabled(bool v) async {
    await (await SharedPreferences.getInstance()).setBool(_kEnabled, v);
    await reschedule();
  }

  static Future<void> setMinutes(int m) async {
    await (await SharedPreferences.getInstance()).setInt(_kMinutes, m);
    await reschedule();
  }

  /// Cancels and re-plans the single pending nudge. Call on app start/resume,
  /// after the settings change, and after a new entry is saved.
  static Future<void> reschedule() async {
    try {
      final service = ReminderService.instance;
      await service.init();
      final plugin = service.plugin;
      await plugin.cancel(id: nudgeId);

      final m = await minutes();
      final at = nextNudgeFire(
        now: DateTime.now(),
        lastEntrySavedAt: (await LastEntryStore.read())?.savedAt,
        enabled: await isEnabled(),
        hour: m ~/ 60,
        minute: m % 60,
      );
      if (at == null || !await service.notificationsEnabled()) return;

      await plugin.zonedSchedule(
        id: nudgeId,
        title: 'Anything spent today?',
        body: 'Tap to log it – takes a few seconds.',
        scheduledDate: tz.TZDateTime(tz.local, at.year, at.month, at.day, at.hour, at.minute),
        notificationDetails: const NotificationDetails(
          android: AndroidNotificationDetails(
            'log_nudge',
            'Daily log reminder',
            channelDescription: 'A gentle evening nudge to log your spending',
            importance: Importance.defaultImportance,
            priority: Priority.defaultPriority,
          ),
        ),
        androidScheduleMode: AndroidScheduleMode.inexactAllowWhileIdle,
        payload: nudgePayload,
        matchDateTimeComponents: DateTimeComponents.time,
      );
    } catch (e) {
      appLog.w('Log nudge scheduling failed', error: e);
    }
  }
}
