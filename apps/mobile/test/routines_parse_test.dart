import 'package:flutter_test/flutter_test.dart';

import 'package:align/features/routines/domain/entities/routine_entity.dart';

void main() {
  test('parses a weekday routine and a one-off', () {
    final weekday = RoutineEntity.fromJson({
      'id': 'r1', 'title': 'Gym', 'time': '18:00', 'days': [1, 3, 5], 'date': null, 'active': true,
    });
    expect(weekday.days, [1, 3, 5]);
    expect(weekday.isOneOff, isFalse);
    expect(weekday.hour, 18);
    expect(weekday.minute, 0);

    final once = RoutineEntity.fromJson({
      'id': 'r2', 'title': 'Dentist', 'time': '09:30', 'days': [], 'date': '2026-10-20', 'active': false,
    });
    expect(once.isOneOff, isTrue);
    expect(once.date, '2026-10-20');
    expect(once.active, isFalse);
    expect(once.minute, 30);
  });

  test('parses a day item with its delta', () {
    final done = DayItemEntity.fromJson({
      'routineId': 'r1', 'title': 'Gym', 'time': '18:00', 'done': true,
      'completedAt': '2026-10-14T13:12:00.000Z', 'deltaMinutes': 12,
    });
    expect(done.done, isTrue);
    expect(done.deltaMinutes, 12);
    expect(done.completedAt!.toUtc().hour, 13);

    final pending = DayItemEntity.fromJson({
      'routineId': 'r2', 'title': 'Read', 'time': '21:00', 'done': false, 'completedAt': null, 'deltaMinutes': null,
    });
    expect(pending.completedAt, isNull);
    expect(pending.deltaMinutes, isNull);
  });

  test('parses stats with streaks', () {
    final s = RoutineStatsEntity.fromJson({
      'days': [{'date': '2026-10-14', 'scheduled': 3, 'done': 2}],
      'currentStreak': 4, 'bestStreak': 9,
    });
    expect(s.days.single.scheduled, 3);
    expect(s.currentStreak, 4);
    expect(s.bestStreak, 9);
  });
}
