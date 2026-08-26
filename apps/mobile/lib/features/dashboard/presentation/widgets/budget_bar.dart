import 'package:flutter/material.dart';

import '../../../../../core/extensions/currency_ext.dart';
import '../../../../../core/theme/app_colors.dart';
import '../../../../../core/theme/app_text_styles.dart';
import '../../../../../core/widgets/app_card.dart';
import '../../../../../core/widgets/app_progress_bar.dart';
import '../../domain/entities/dashboard_data.dart';

class BudgetBar extends StatelessWidget {
  const BudgetBar({required this.budget, super.key});
  final BudgetSummary budget;

  double get _pct => budget.totalBudgetPaisas > 0
      ? (budget.totalSpentPaisas / budget.totalBudgetPaisas).clamp(0.0, 1.0)
      : 0.0;

  Color get _barColor {
    if (_pct >= 1.0) return AppColors.destructive;
    if (_pct >= 0.85) return const Color(0xFFE67E22);
    return AppColors.primary;
  }

  @override
  Widget build(BuildContext context) => AppCard(
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text(
                  'Budget',
                  style: AppTextStyles.labelMedium.copyWith(
                    color: AppColors.mutedForeground,
                    letterSpacing: 0.4,
                  ),
                ),
                Text(
                  '${(_pct * 100).round()}%',
                  style: AppTextStyles.labelMedium.copyWith(color: _barColor),
                ),
              ],
            ),
            const SizedBox(height: 8),
            AppProgressBar(value: _pct, color: _barColor),
            const SizedBox(height: 10),
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text(
                  budget.totalSpentPaisas.formatPKR(),
                  style: AppTextStyles.currencySmall,
                ),
                Text(
                  budget.totalBudgetPaisas.formatPKR(),
                  style: AppTextStyles.currencySmall.copyWith(
                    color: AppColors.mutedForeground,
                  ),
                ),
              ],
            ),
          ],
        ),
      );
}
