import 'package:flutter_test/flutter_test.dart';
import 'package:shared_preferences/shared_preferences.dart';

import 'package:align/features/routines/data/tick_queue.dart';

class _FakeSink implements TickSink {
  _FakeSink({this.failFor = const {}});
  final Set<String> failFor;
  final calls = <String>[];

  @override
  Future<void> setCompletion(String id, String date, DateTime at) async {
    if (failFor.contains(id)) throw Exception('offline');
    calls.add('set:$id:$date');
  }

  @override
  Future<void> clearCompletion(String id, String date) async {
    if (failFor.contains(id)) throw Exception('offline');
    calls.add('clear:$id:$date');
  }
}

void main() {
  setUp(() => SharedPreferences.setMockInitialValues({}));
  final at = DateTime.utc(2026, 10, 14, 13, 12);

  test('ticks persist across instances', () async {
    await TickQueue().add(QueuedTick(routineId: 'a', date: '2026-10-14', at: at));
    final all = await TickQueue().all();
    expect(all.single.routineId, 'a');
    expect(all.single.at, at);
    expect(all.single.unset, isFalse);
  });

  test('the same routine and day keeps a single entry, the latest op winning', () async {
    final q = TickQueue();
    await q.add(QueuedTick(routineId: 'a', date: '2026-10-14', at: at));
    await q.add(QueuedTick(routineId: 'a', date: '2026-10-14', at: at, unset: true));
    final all = await q.all();
    expect(all, hasLength(1));
    expect(all.single.unset, isTrue);
  });

  test('flush sends queued ops and clears them', () async {
    final q = TickQueue();
    await q.add(QueuedTick(routineId: 'a', date: '2026-10-14', at: at));
    await q.add(QueuedTick(routineId: 'b', date: '2026-10-14', at: at, unset: true));
    final sink = _FakeSink();
    await q.flush(sink);
    expect(sink.calls, ['set:a:2026-10-14', 'clear:b:2026-10-14']);
    expect(await q.all(), isEmpty);
  });

  test('flush keeps the ones that failed', () async {
    final q = TickQueue();
    await q.add(QueuedTick(routineId: 'a', date: '2026-10-14', at: at));
    await q.add(QueuedTick(routineId: 'b', date: '2026-10-14', at: at));
    await q.flush(_FakeSink(failFor: {'b'}));
    expect((await q.all()).map((t) => t.routineId), ['b']);
  });

  test('pending lists queued ticks for a day so the UI can show them as done', () async {
    final q = TickQueue();
    await q.add(QueuedTick(routineId: 'a', date: '2026-10-14', at: at));
    await q.add(QueuedTick(routineId: 'b', date: '2026-10-15', at: at));
    expect((await q.forDate('2026-10-14')).map((t) => t.routineId), ['a']);
  });
}
