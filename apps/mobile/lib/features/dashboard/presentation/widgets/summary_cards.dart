import 'package:flutter/material.dart';

import '../../../../../core/extensions/currency_ext.dart';
import '../../../../../core/theme/app_colors.dart';
import '../../../../../core/theme/app_text_styles.dart';
import '../../../../../core/widgets/app_card.dart';

class SummaryCards extends StatelessWidget {
  const SummaryCards({
    required this.totalIncomePaisas,
    required this.totalExpensesPaisas,
    required this.netSavingsPaisas,
    super.key,
  });

  final int totalIncomePaisas;
  final int totalExpensesPaisas;
  final int netSavingsPaisas;

  @override
  Widget build(BuildContext context) => Row(
        children: [
          Expanded(
            child: _SummaryCard(
              label: 'Income',
              amountPaisas: totalIncomePaisas,
              color: const Color(0xFF4CAF50),
            ),
          ),
          const SizedBox(width: 10),
          Expanded(
            child: _SummaryCard(
              label: 'Spent',
              amountPaisas: totalExpensesPaisas,
              color: AppColors.destructive,
            ),
          ),
          const SizedBox(width: 10),
          Expanded(
            child: _SummaryCard(
              label: 'Saved',
              amountPaisas: netSavingsPaisas,
              color: AppColors.primary,
              highlight: true,
            ),
          ),
        ],
      );
}

class _SummaryCard extends StatelessWidget {
  const _SummaryCard({
    required this.label,
    required this.amountPaisas,
    required this.color,
    this.highlight = false,
  });

  final String label;
  final int amountPaisas;
  final Color color;
  final bool highlight;

  @override
  Widget build(BuildContext context) => AppCard(
        color: highlight ? color.withValues(alpha: 0.08) : null,
        borderColor: highlight ? color.withValues(alpha: 0.3) : null,
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 14),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              label,
              style: AppTextStyles.labelSmall.copyWith(
                color: AppColors.mutedForeground,
                letterSpacing: 0.4,
              ),
            ),
            const SizedBox(height: 6),
            Text(
              amountPaisas.formatPKRCompact(),
              style: AppTextStyles.currencyMedium.copyWith(
                color: color,
                fontSize: 16,
              ),
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
            ),
          ],
        ),
      );
}
