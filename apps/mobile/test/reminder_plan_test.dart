import 'package:flutter_test/flutter_test.dart';

import 'package:align/features/routines/data/reminder_plan.dart';
import 'package:align/features/routines/data/reminder_service.dart';
import 'package:align/features/routines/domain/entities/routine_entity.dart';

RoutineEntity r(String id, {List<int> days = const [1, 3], String? date, String time = '18:00', bool active = true}) =>
    RoutineEntity(id: id, title: 'R-$id', time: time, days: days, date: date, active: active);

void main() {
  final now = DateTime(2026, 10, 14, 12, 0); // a Wednesday, noon

  test('weekday routine gets one entry per weekday with distinct stable ids', () {
    final plan = buildReminderPlan([r('a')], now);
    expect(plan.map((e) => e.weekday), [1, 3]);
    expect(plan.map((e) => e.hour).toSet(), {18});
    expect(plan.map((e) => e.id).toSet().length, 2);
    expect(buildReminderPlan([r('a')], now).map((e) => e.id), plan.map((e) => e.id));
  });

  test('inactive routines get no reminders', () {
    expect(buildReminderPlan([r('a', active: false)], now), isEmpty);
  });

  test('a one-off in the past gets no reminder, one later today does', () {
    expect(buildReminderPlan([r('p', days: [], date: '2026-10-13')], now), isEmpty);
    expect(buildReminderPlan([r('p', days: [], date: '2026-10-14', time: '09:00')], now), isEmpty);
    final later = buildReminderPlan([r('p', days: [], date: '2026-10-14', time: '21:30')], now);
    expect(later, hasLength(1));
    expect(later.single.weekday, isNull);
    expect(later.single.date, '2026-10-14');
    expect(later.single.hour, 21);
    expect(later.single.minute, 30);
  });

  test('reminderId is deterministic and differs by weekday and routine', () {
    expect(reminderId('abc', 1), reminderId('abc', 1));
    expect(reminderId('abc', 1), isNot(reminderId('abc', 2)));
    expect(reminderId('abc', 1), isNot(reminderId('abd', 1)));
    expect(reminderId('abc', 0), lessThan(2147483647));
  });

  group('dateForTap', () {
    test('a tap after the scheduled time belongs to today', () {
      expect(ReminderService.dateForTap('18:00', DateTime(2026, 10, 14, 18, 5)), '2026-10-14');
    });
    test('a tap before the scheduled time of day means it fired yesterday', () {
      expect(ReminderService.dateForTap('23:30', DateTime(2026, 10, 15, 0, 10)), '2026-10-14');
      expect(ReminderService.dateForTap('23:30', DateTime(2026, 11, 1, 0, 10)), '2026-10-31');
    });
  });
}
