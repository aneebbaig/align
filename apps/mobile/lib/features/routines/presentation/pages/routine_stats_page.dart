import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';

import '../../../../core/theme/app_colors.dart';
import '../../../../core/theme/app_text_styles.dart';
import '../../../../core/widgets/app_card.dart';
import '../../../../core/widgets/app_progress_bar.dart';
import '../../../../core/widgets/async_value_widget.dart';
import '../../domain/entities/routine_entity.dart';
import '../providers/routines_provider.dart';
import 'routines_page.dart' show ymd;

class RoutineStatsPage extends ConsumerWidget {
  const RoutineStatsPage({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final now = DateTime.now();
    final stats = ref.watch(routineStatsProvider(ymd(now.subtract(const Duration(days: 59))), ymd(now)));
    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        backgroundColor: AppColors.background,
        elevation: 0,
        title: const Text('Routine progress', style: AppTextStyles.headlineSmall),
      ),
      body: AsyncValueWidget<RoutineStatsEntity>(
        value: stats,
        data: (s) {
          final last14 = s.days.reversed.take(14).toList();
          return ListView(
            padding: const EdgeInsets.fromLTRB(16, 8, 16, 32),
            children: [
              Row(
                children: [
                  Expanded(child: _Tile(label: 'Current streak', value: '${s.currentStreak} days')),
                  const SizedBox(width: 12),
                  Expanded(child: _Tile(label: 'Best streak', value: '${s.bestStreak} days')),
                ],
              ),
              const SizedBox(height: 20),
              const Text('Last 14 days', style: AppTextStyles.labelLarge),
              const SizedBox(height: 8),
              for (final d in last14)
                Padding(
                  padding: const EdgeInsets.only(bottom: 10),
                  child: Row(
                    children: [
                      SizedBox(
                        width: 72,
                        child: Text(DateFormat('EEE d MMM').format(DateTime.parse(d.date)), style: AppTextStyles.bodySmall),
                      ),
                      Expanded(
                        child: AppProgressBar(
                          value: d.scheduled == 0 ? 0 : d.done / d.scheduled,
                          color: d.scheduled > 0 && d.done == d.scheduled ? AppColors.success : AppColors.primary,
                        ),
                      ),
                      SizedBox(
                        width: 44,
                        child: Text(
                          d.scheduled == 0 ? '–' : '${d.done}/${d.scheduled}',
                          textAlign: TextAlign.right,
                          style: AppTextStyles.bodySmall,
                        ),
                      ),
                    ],
                  ),
                ),
            ],
          );
        },
      ),
    );
  }
}

class _Tile extends StatelessWidget {
  const _Tile({required this.label, required this.value});
  final String label;
  final String value;

  @override
  Widget build(BuildContext context) => AppCard(
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(label, style: AppTextStyles.bodySmall),
            const SizedBox(height: 4),
            Text(value, style: AppTextStyles.headlineSmall),
          ],
        ),
      );
}
