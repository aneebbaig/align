import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../../core/extensions/currency_ext.dart';
import '../../../../core/extensions/datetime_ext.dart';
import '../../../../core/theme/app_colors.dart';
import '../../../../core/theme/app_text_styles.dart';
import '../../../../core/widgets/app_card.dart';
import '../../domain/entities/cashflow_summary_entity.dart';
import '../providers/cashflow_summary_provider.dart';

class CashflowSummaryCard extends ConsumerWidget {
  const CashflowSummaryCard({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final async = ref.watch(cashflowSummaryProvider);

    return async.when(
      data: (summary) => _buildCard(summary),
      loading: () => const SizedBox.shrink(),
      error: (_, __) => const SizedBox.shrink(),
    );
  }

  Widget _buildCard(CashflowSummaryEntity summary) {
    final flagged = summary.flagged;
    final leftOk = summary.leftAfterObligationsPaisas >= 0;

    return AppCard(
      color: flagged ? AppColors.destructive.withValues(alpha: 0.05) : null,
      borderColor: flagged ? AppColors.destructive.withValues(alpha: 0.4) : null,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Icon(
                Icons.event_available_outlined,
                size: 16,
                color: flagged ? AppColors.destructive : AppColors.mutedForeground,
              ),
              const SizedBox(width: 8),
              Text('This Month', style: AppTextStyles.bodyMedium.copyWith(fontWeight: FontWeight.w600)),
            ],
          ),
          const SizedBox(height: 10),
          RichText(
            text: TextSpan(
              style: AppTextStyles.bodySmall.copyWith(color: AppColors.foreground, height: 1.5),
              children: [
                TextSpan(
                  text: summary.dueTotalPaisas.formatPKR(),
                  style: const TextStyle(fontWeight: FontWeight.w700),
                ),
                const TextSpan(text: ' due this month'),
                if (summary.soonest != null) ...[
                  const TextSpan(text: ' · '),
                  TextSpan(
                    text: summary.soonest!.amountPaisas.formatPKR(),
                    style: const TextStyle(fontWeight: FontWeight.w700),
                  ),
                  TextSpan(text: ' to ${summary.soonest!.payee} on ${summary.soonest!.dueDate.toShortDate}'),
                ],
                const TextSpan(text: ' · '),
                TextSpan(
                  text: leftOk
                      ? summary.leftAfterObligationsPaisas.formatPKR()
                      : summary.leftAfterObligationsPaisas.abs().formatPKR(),
                  style: TextStyle(
                    fontWeight: FontWeight.w700,
                    color: leftOk ? const Color(0xFF4CAF50) : AppColors.destructive,
                  ),
                ),
                TextSpan(text: leftOk ? ' left after obligations' : ' short after obligations'),
              ],
            ),
          ),
          if (flagged) ...[
            const SizedBox(height: 10),
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
              decoration: BoxDecoration(
                color: AppColors.destructive.withValues(alpha: 0.1),
                borderRadius: BorderRadius.circular(8),
              ),
              child: Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Icon(Icons.warning_amber_rounded, size: 14, color: AppColors.destructive),
                  const SizedBox(width: 6),
                  Expanded(
                    child: Text(
                      '${summary.shortfallPaisas.formatPKR()} over your reliable income floor this month.',
                      style: AppTextStyles.labelSmall.copyWith(color: AppColors.destructive),
                    ),
                  ),
                ],
              ),
            ),
          ],
          if (summary.alerts.isNotEmpty) ...[
            const SizedBox(height: 10),
            Text(
              'COMING UP',
              style: AppTextStyles.labelSmall.copyWith(
                color: AppColors.mutedForeground.withValues(alpha: 0.6),
                letterSpacing: 0.7,
              ),
            ),
            const SizedBox(height: 6),
            ...summary.alerts.take(4).map((item) => Padding(
                  padding: const EdgeInsets.only(bottom: 4),
                  child: Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Expanded(
                        child: Text.rich(
                          TextSpan(
                            text: item.payee,
                            style: AppTextStyles.bodySmall,
                            children: [
                              TextSpan(
                                text: '  · ${item.daysUntil == 0 ? 'today' : item.daysUntil == 1 ? 'tomorrow' : 'in ${item.daysUntil}d'}',
                                style: AppTextStyles.labelSmall.copyWith(color: AppColors.mutedForeground),
                              ),
                            ],
                          ),
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                        ),
                      ),
                      Text(item.amountPaisas.formatPKR(), style: AppTextStyles.labelMedium),
                    ],
                  ),
                )),
          ],
        ],
      ),
    );
  }
}
