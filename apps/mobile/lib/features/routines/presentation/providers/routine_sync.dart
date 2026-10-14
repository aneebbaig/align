import 'package:flutter/widgets.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../../app.dart';
import '../../data/datasources/routines_datasource.dart';
import '../../data/reminder_service.dart';
import '../../data/tick_queue.dart';
import '../../domain/entities/routine_entity.dart';
import 'routines_provider.dart';

/// Sends any ticks queued while offline, then re-reads the routines and
/// replaces the phone's alarms to match. If the server cannot be reached the
/// cached list is used, so alarms still get rescheduled offline.
Future<void> syncRoutines(WidgetRef ref) async {
  final ds = ref.read(routinesDatasourceProvider);
  await TickQueue().flush(ds);
  List<RoutineEntity> list;
  try {
    list = await ds.getRoutines();
    await ReminderService.cacheRoutines(list);
  } catch (_) {
    list = await ReminderService.cachedRoutines();
  }
  await ReminderService.instance.reschedule(list);
  ref.invalidate(routinesProvider);
}

/// Sits around the signed-in shell: syncs routines on start and whenever the
/// app comes back to the foreground, and makes a notification tap open the
/// checklist.
class RoutineSyncHost extends ConsumerStatefulWidget {
  const RoutineSyncHost({required this.child, super.key});
  final Widget child;

  @override
  ConsumerState<RoutineSyncHost> createState() => _RoutineSyncHostState();
}

class _RoutineSyncHostState extends ConsumerState<RoutineSyncHost> with WidgetsBindingObserver {
  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addObserver(this);
    ReminderService.instance.onOpen = () => ref.read(goRouterProvider).go('/routines');
    _sync();
  }

  @override
  void dispose() {
    WidgetsBinding.instance.removeObserver(this);
    ReminderService.instance.onOpen = null;
    super.dispose();
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    if (state == AppLifecycleState.resumed) _sync();
  }

  Future<void> _sync() async {
    try {
      await ReminderService.instance.init();
      await syncRoutines(ref);
    } catch (e) {
      debugPrint('Routine sync failed: $e');
    }
  }

  @override
  Widget build(BuildContext context) => widget.child;
}
