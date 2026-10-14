import '../domain/entities/routine_entity.dart';

/// One scheduled alarm: a weekly one for [weekday] (ISO 1-7), or a single one
/// on [date] when [weekday] is null.
class ReminderEntry {
  const ReminderEntry({
    required this.id,
    required this.routineId,
    required this.title,
    required this.hour,
    required this.minute,
    this.weekday,
    this.date,
  });

  final int id;
  final String routineId;
  final String title;
  final int hour;
  final int minute;
  final int? weekday;
  final String? date;
}

int _fnv1a(String s) {
  var h = 0x811c9dc5;
  for (final c in s.codeUnits) {
    h = ((h ^ c) * 0x01000193) & 0xffffffff;
  }
  return h;
}

/// Stable notification id for a routine's alarm. Slot 0 is the one-off, 1-7
/// the weekdays, 9 the snooze - so rescheduling replaces rather than stacks.
int reminderId(String routineId, int slot) => (_fnv1a(routineId) % 100000) * 10 + slot;

const int snoozeSlot = 9;

String _ymd(DateTime d) =>
    '${d.year.toString().padLeft(4, '0')}-${d.month.toString().padLeft(2, '0')}-${d.day.toString().padLeft(2, '0')}';

/// What should be scheduled right now. Inactive routines and one-offs whose
/// moment has passed are left out; everything else is rescheduled from scratch
/// by the caller, so a deleted or paused routine's alarms simply disappear.
List<ReminderEntry> buildReminderPlan(List<RoutineEntity> routines, DateTime now) {
  final entries = <ReminderEntry>[];
  for (final r in routines) {
    if (!r.active) continue;
    if (r.isOneOff) {
      final date = r.date;
      if (date == null) continue;
      final p = date.split('-').map(int.parse).toList();
      final at = DateTime(p[0], p[1], p[2], r.hour, r.minute);
      if (!at.isAfter(now)) continue;
      entries.add(ReminderEntry(
        id: reminderId(r.id, 0),
        routineId: r.id,
        title: r.title,
        hour: r.hour,
        minute: r.minute,
        date: _ymd(at),
      ));
    } else {
      for (final d in r.days) {
        entries.add(ReminderEntry(
          id: reminderId(r.id, d),
          routineId: r.id,
          title: r.title,
          hour: r.hour,
          minute: r.minute,
          weekday: d,
        ));
      }
    }
  }
  return entries;
}
