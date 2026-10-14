import 'dart:convert';

import 'package:shared_preferences/shared_preferences.dart';

/// A tick (or un-tick) made while the server could not be reached - or from a
/// notification action with the app closed. Replayed when we are back online.
class QueuedTick {
  const QueuedTick({required this.routineId, required this.date, required this.at, this.unset = false});

  factory QueuedTick.fromJson(Map<String, dynamic> j) => QueuedTick(
        routineId: j['routineId'] as String,
        date: j['date'] as String,
        at: DateTime.parse(j['at'] as String),
        unset: j['unset'] as bool? ?? false,
      );

  final String routineId;
  final String date; // "YYYY-MM-DD"
  final DateTime at;
  final bool unset;

  Map<String, dynamic> toJson() =>
      {'routineId': routineId, 'date': date, 'at': at.toUtc().toIso8601String(), 'unset': unset};
}

/// What the queue needs from the API; RoutinesDatasource implements it.
abstract class TickSink {
  Future<void> setCompletion(String id, String date, DateTime at);
  Future<void> clearCompletion(String id, String date);
}

class TickQueue {
  static const _key = 'routine_tick_queue';

  Future<List<QueuedTick>> all() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.reload(); // a notification action may have written from another isolate
    final raw = prefs.getString(_key);
    if (raw == null) return [];
    return (jsonDecode(raw) as List<dynamic>).map((e) => QueuedTick.fromJson(e as Map<String, dynamic>)).toList();
  }

  Future<void> _save(List<QueuedTick> ticks) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(_key, jsonEncode(ticks.map((t) => t.toJson()).toList()));
  }

  /// One entry per routine and day: the latest op replaces any earlier one.
  Future<void> add(QueuedTick tick) async {
    final ticks = (await all()).where((t) => !(t.routineId == tick.routineId && t.date == tick.date)).toList()
      ..add(tick);
    await _save(ticks);
  }

  Future<List<QueuedTick>> forDate(String date) async => (await all()).where((t) => t.date == date).toList();

  /// Sends everything queued; whatever fails stays for next time. Re-reads the
  /// queue before saving so a tick added mid-flush (e.g. from a notification
  /// action) is not lost.
  Future<void> flush(TickSink sink) async {
    final sent = <String>{};
    for (final t in await all()) {
      try {
        if (t.unset) {
          await sink.clearCompletion(t.routineId, t.date);
        } else {
          await sink.setCompletion(t.routineId, t.date, t.at);
        }
        sent.add('${t.routineId}|${t.date}|${t.at.toIso8601String()}|${t.unset}');
      } catch (_) {}
    }
    await _save((await all()).where((t) => !sent.contains('${t.routineId}|${t.date}|${t.at.toIso8601String()}|${t.unset}')).toList());
  }
}
