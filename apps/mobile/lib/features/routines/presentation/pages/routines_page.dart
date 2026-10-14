import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';

import '../../../../core/errors/app_exception.dart';
import '../../../../core/services/toast_service.dart';
import '../../../../core/theme/app_colors.dart';
import '../../../../core/theme/app_text_styles.dart';
import '../../../../core/widgets/app_card.dart';
import '../../../../core/widgets/app_progress_bar.dart';
import '../../../../core/widgets/async_value_widget.dart';
import '../../data/datasources/routines_datasource.dart';
import '../../data/tick_queue.dart';
import '../../domain/entities/routine_entity.dart';
import '../providers/routines_provider.dart';
import '../widgets/routine_form_sheet.dart';

String ymd(DateTime d) => DateFormat('yyyy-MM-dd').format(d);

String formatDelta(int m) {
  final a = m.abs();
  final text = a >= 60 ? '${a ~/ 60}h${a % 60 == 0 ? '' : '${a % 60}m'}' : '${a}m';
  return '${m > 0 ? '+' : m < 0 ? '−' : '±'}$text';
}

class RoutinesPage extends ConsumerStatefulWidget {
  const RoutinesPage({super.key});

  @override
  ConsumerState<RoutinesPage> createState() => _RoutinesPageState();
}

class _RoutinesPageState extends ConsumerState<RoutinesPage> {
  DateTime _day = DateTime.now();

  /// Ticks made here (or queued offline) that the server has not confirmed yet:
  /// routineId -> tick time, or null for an un-tick.
  final Map<String, DateTime?> _pending = {};

  String get _date => ymd(_day);
  bool get _isToday => _date == ymd(DateTime.now());

  @override
  void initState() {
    super.initState();
    _loadQueued();
  }

  Future<void> _loadQueued() async {
    final queued = await TickQueue().forDate(_date);
    if (!mounted) return;
    setState(() {
      for (final t in queued) {
        _pending[t.routineId] = t.unset ? null : t.at;
      }
    });
  }

  void _goTo(DateTime d) {
    setState(() {
      _day = d;
      _pending.clear();
    });
    _loadQueued();
  }

  Future<void> _toggle(DayItemEntity item, bool currentlyDone) async {
    HapticFeedback.lightImpact();
    final date = _date;
    final now = DateTime.now();
    setState(() => _pending[item.routineId] = currentlyDone ? null : now);
    final ds = ref.read(routinesDatasourceProvider);
    try {
      if (currentlyDone) {
        await ds.clearCompletion(item.routineId, date);
      } else {
        await ds.setCompletion(item.routineId, date, now);
      }
      if (!mounted) return;
      ref.invalidate(routineDayProvider(date));
      ref.invalidate(routineStatsProvider);
      setState(() => _pending.remove(item.routineId));
    } catch (e) {
      // Keep it: queue the tick with its real time and send it when we can.
      await TickQueue().add(QueuedTick(routineId: item.routineId, date: date, at: now, unset: currentlyDone));
      if (!mounted) return;
      final msg = e is AppException ? e.message : 'Saved on this phone; will sync when online';
      ref.read(toastServiceProvider).info(context, msg);
    }
  }

  @override
  Widget build(BuildContext context) {
    final day = ref.watch(routineDayProvider(_date));
    final all = ref.watch(routinesProvider);
    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        backgroundColor: AppColors.background,
        elevation: 0,
        title: const Text('Routines', style: AppTextStyles.headlineSmall),
        actions: [
          IconButton(
            tooltip: 'Progress',
            icon: const Icon(Icons.insights_outlined, color: AppColors.mutedForeground),
            onPressed: () => context.push('/routines/stats'),
          ),
          IconButton(
            tooltip: 'Add routine',
            icon: const Icon(Icons.add, color: AppColors.primary),
            onPressed: () => showRoutineFormSheet(context, ref),
          ),
        ],
      ),
      body: RefreshIndicator(
        onRefresh: () async {
          ref.invalidate(routineDayProvider(_date));
          ref.invalidate(routinesProvider);
        },
        child: ListView(
          padding: const EdgeInsets.fromLTRB(16, 8, 16, 32),
          children: [
            Row(
              children: [
                IconButton(
                  tooltip: 'Previous day',
                  icon: const Icon(Icons.chevron_left),
                  onPressed: () => _goTo(_day.subtract(const Duration(days: 1))),
                ),
                Expanded(
                  child: Center(
                    child: Text(_isToday ? 'Today' : DateFormat('EEE, d MMM').format(_day), style: AppTextStyles.labelLarge),
                  ),
                ),
                IconButton(
                  tooltip: 'Next day',
                  icon: const Icon(Icons.chevron_right),
                  onPressed: () => _goTo(_day.add(const Duration(days: 1))),
                ),
              ],
            ),
            AsyncValueWidget<List<DayItemEntity>>(
              value: day,
              data: (items) => _DayList(
                items: items,
                pending: _pending,
                onToggle: _toggle,
              ),
            ),
            const SizedBox(height: 24),
            const Text('All routines', style: AppTextStyles.labelLarge),
            const SizedBox(height: 8),
            AsyncValueWidget<List<RoutineEntity>>(
              value: all,
              data: (routines) => routines.isEmpty
                  ? const Padding(
                      padding: EdgeInsets.symmetric(vertical: 16),
                      child: Text('No routines yet. Tap + to add one.', style: AppTextStyles.bodySmall),
                    )
                  : Column(
                      children: [
                        for (final r in routines)
                          Padding(
                            padding: const EdgeInsets.only(bottom: 8),
                            child: AppCard(
                              onTap: () => showRoutineFormSheet(context, ref, routine: r),
                              child: Row(
                                children: [
                                  Text(r.time, style: AppTextStyles.bodyMedium.copyWith(color: AppColors.mutedForeground)),
                                  const SizedBox(width: 12),
                                  Expanded(
                                    child: Column(
                                      crossAxisAlignment: CrossAxisAlignment.start,
                                      children: [
                                        Text(r.title, style: AppTextStyles.bodyMedium),
                                        Text(_describe(r), style: AppTextStyles.bodySmall),
                                      ],
                                    ),
                                  ),
                                  Icon(r.active ? Icons.notifications_active_outlined : Icons.notifications_off_outlined,
                                      size: 18, color: AppColors.mutedForeground),
                                ],
                              ),
                            ),
                          ),
                      ],
                    ),
            ),
          ],
        ),
      ),
    );
  }
}

const _names = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

String _describe(RoutineEntity r) {
  if (r.date != null) return 'Once · ${r.date}';
  if (r.days.length == 7) return 'Every day';
  return r.days.map((d) => _names[d - 1]).join(', ');
}

class _DayList extends StatelessWidget {
  const _DayList({required this.items, required this.pending, required this.onToggle});
  final List<DayItemEntity> items;
  final Map<String, DateTime?> pending;
  final void Function(DayItemEntity item, bool currentlyDone) onToggle;

  bool _done(DayItemEntity i) => pending.containsKey(i.routineId) ? pending[i.routineId] != null : i.done;

  @override
  Widget build(BuildContext context) {
    final done = items.where(_done).length;
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        AppCard(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text('$done / ${items.length} done', style: AppTextStyles.headlineSmall),
              const SizedBox(height: 10),
              AppProgressBar(value: items.isEmpty ? 0 : done / items.length),
            ],
          ),
        ),
        const SizedBox(height: 12),
        if (items.isEmpty)
          const Padding(
            padding: EdgeInsets.symmetric(vertical: 16),
            child: Text('Nothing scheduled for this day.', style: AppTextStyles.bodySmall),
          ),
        for (final item in items)
          Padding(
            padding: const EdgeInsets.only(bottom: 8),
            child: AppCard(
              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
              onTap: () => onToggle(item, _done(item)),
              child: Row(
                children: [
                  Icon(_done(item) ? Icons.check_circle : Icons.radio_button_unchecked,
                      color: _done(item) ? AppColors.success : AppColors.mutedForeground),
                  const SizedBox(width: 12),
                  Text(item.time, style: AppTextStyles.bodyMedium.copyWith(color: AppColors.mutedForeground)),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Text(
                      item.title,
                      style: AppTextStyles.bodyMedium.copyWith(
                        decoration: _done(item) ? TextDecoration.lineThrough : null,
                        color: _done(item) ? AppColors.mutedForeground : AppColors.foreground,
                      ),
                    ),
                  ),
                  if (item.done && item.deltaMinutes != null && !pending.containsKey(item.routineId))
                    Text(
                      formatDelta(item.deltaMinutes!),
                      style: AppTextStyles.bodySmall.copyWith(
                        color: item.deltaMinutes! > 0 ? AppColors.warning : AppColors.success,
                      ),
                    ),
                ],
              ),
            ),
          ),
      ],
    );
  }
}
