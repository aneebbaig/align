import 'package:flutter_test/flutter_test.dart';

import 'package:align/features/routines/data/log_nudge.dart';

DateTime? next(DateTime now, {DateTime? saved, bool enabled = true, int h = 21, int m = 0}) =>
    nextNudgeFire(now: now, lastEntrySavedAt: saved, enabled: enabled, hour: h, minute: m);

void main() {
  final morning = DateTime(2026, 11, 26, 9, 0);
  final night = DateTime(2026, 11, 26, 22, 0);

  test('disabled means no nudge', () {
    expect(next(morning, enabled: false), isNull);
  });
  test('before the time, nothing logged: tonight', () {
    expect(next(morning), DateTime(2026, 11, 26, 21, 0));
  });
  test('after the time: tomorrow', () {
    expect(next(night), DateTime(2026, 11, 27, 21, 0));
  });
  test('exactly at the time counts as passed', () {
    expect(next(DateTime(2026, 11, 26, 21, 0)), DateTime(2026, 11, 27, 21, 0));
  });
  test('something logged today skips to tomorrow', () {
    expect(next(morning, saved: DateTime(2026, 11, 26, 8, 0)), DateTime(2026, 11, 27, 21, 0));
  });
  test('something logged yesterday does not skip today', () {
    expect(next(morning, saved: DateTime(2026, 11, 25, 20, 0)), DateTime(2026, 11, 26, 21, 0));
  });
  test('custom time and month rollover', () {
    expect(next(DateTime(2026, 11, 30, 23, 0), h: 7, m: 30), DateTime(2026, 12, 1, 7, 30));
  });
}
