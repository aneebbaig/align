import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';

import '../../../../core/extensions/currency_ext.dart';
import '../../../../core/theme/app_colors.dart';
import '../../../../core/theme/app_text_styles.dart';
import '../../../../core/widgets/app_card.dart';
import '../../../../core/widgets/app_empty_state.dart';
import '../../domain/entities/investment_entity.dart';
import 'investment_sheets.dart';
import 'investment_sip_card.dart';

const typeLabels = {
  'MUTUAL_FUND': 'Mutual Fund',
  'STOCKS': 'Stocks',
  'GOLD': 'Gold',
  'CRYPTO': 'Crypto',
  'FIXED_DEPOSIT': 'Fixed Deposit',
  'OTHER': 'Other',
};

IconData typeIcon(String type) => switch (type) {
      'MUTUAL_FUND' => Icons.account_balance_outlined,
      'STOCKS' => Icons.trending_up,
      'GOLD' => Icons.diamond_outlined,
      'CRYPTO' => Icons.currency_bitcoin,
      'FIXED_DEPOSIT' => Icons.savings_outlined,
      _ => Icons.layers_outlined,
    };

// A row in the "Invested Savings" list: either a plan category (funded or
// not yet) or a legacy Investment with no category link.
class InvestmentRow {
  const InvestmentRow.category(this.category, this.investment) : isUncategorized = false;
  const InvestmentRow.uncategorized(InvestmentEntity inv)
      : investment = inv,
        category = null,
        isUncategorized = true;
  final PlanCategoryEntity? category;
  final InvestmentEntity? investment;
  final bool isUncategorized;
}

class InvestmentsContent extends ConsumerWidget {
  const InvestmentsContent({required this.data, super.key});
  final InvestmentsData data;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final categoryIds = (data.plan?.categories ?? []).map((c) => c.id).toSet();
    InvestmentEntity? investmentFor(String categoryId) {
      for (final inv in data.investments) {
        if (inv.planCategoryId == categoryId) return inv;
      }
      return null;
    }

    final rows = <InvestmentRow>[
      for (final c in data.plan?.categories ?? []) InvestmentRow.category(c, investmentFor(c.id)),
      for (final inv in data.investments.where((i) => i.planCategoryId == null || !categoryIds.contains(i.planCategoryId)))
        InvestmentRow.uncategorized(inv),
    ];

    return ListView(
      padding: const EdgeInsets.fromLTRB(16, 8, 16, 100),
      children: [
        if (data.plan != null) ...[
          _PlanCard(plan: data.plan!),
          const SizedBox(height: 16),
        ],
        _InvestedSavingsHeader(data: data),
        const SizedBox(height: 12),
        if (rows.isEmpty)
          Padding(
            padding: const EdgeInsets.only(top: 40),
            child: AppEmptyState(
              title: 'No investments yet',
              subtitle: 'Add an investment to the plan, then add money into it any time.',
              icon: Icons.pie_chart_outline,
              onRetry: () => showPlanEditorSheet(context, ref, data.plan),
              retryLabel: 'Add investment',
            ),
          )
        else
          ...rows.map((row) => Padding(
                padding: const EdgeInsets.only(bottom: 10),
                child: SipCard(row: row),
              )),
      ],
    );
  }
}

class _PlanCard extends StatelessWidget {
  const _PlanCard({required this.plan});
  final InvestmentPlanEntity plan;

  @override
  Widget build(BuildContext context) {
    return AppCard(
      color: AppColors.card.withValues(alpha: 0.5),
      borderColor: AppColors.border.withValues(alpha: 0.6),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              const Icon(Icons.track_changes_outlined, size: 16, color: AppColors.mutedForeground),
              const SizedBox(width: 8),
              Text('Investment Plan', style: AppTextStyles.bodyMedium.copyWith(fontWeight: FontWeight.w600)),
              const SizedBox(width: 8),
              Text('TARGET', style: AppTextStyles.labelSmall.copyWith(
                color: AppColors.mutedForeground.withValues(alpha: 0.7),
                letterSpacing: 1,
              )),
              const Spacer(),
              if (plan.monthlyTargetPaisas > 0)
                Text('${plan.monthlyTargetPaisas.formatPKR()}/mo',
                    style: AppTextStyles.bodySmall),
            ],
          ),
          const SizedBox(height: 14),
          _AllocationBar(categories: plan.categories),
          const SizedBox(height: 14),
          ...plan.categories.asMap().entries.map((e) => Padding(
                padding: const EdgeInsets.only(bottom: 10),
                child: _LegendRow(category: e.value, opacity: _segOpacity(e.key)),
              )),
        ],
      ),
    );
  }
}

double _segOpacity(int i) => (1 - i * 0.22).clamp(0.28, 1.0);

class _AllocationBar extends StatelessWidget {
  const _AllocationBar({required this.categories});
  final List<PlanCategoryEntity> categories;

  @override
  Widget build(BuildContext context) {
    return ClipRRect(
      borderRadius: BorderRadius.circular(999),
      child: SizedBox(
        height: 8,
        child: Row(
          children: categories
              .asMap()
              .entries
              .map((e) => Expanded(
                    flex: e.value.percentage.clamp(1, 100),
                    child: Container(
                      margin: EdgeInsets.only(right: e.key == categories.length - 1 ? 0 : 2),
                      color: AppColors.primary.withValues(alpha: _segOpacity(e.key)),
                    ),
                  ))
              .toList(),
        ),
      ),
    );
  }
}

class _LegendRow extends StatelessWidget {
  const _LegendRow({required this.category, required this.opacity});
  final PlanCategoryEntity category;
  final double opacity;

  @override
  Widget build(BuildContext context) {
    final done = category.plannedPaisas > 0 && category.actualPaisas >= category.plannedPaisas;
    return Row(
      children: [
        Container(
          width: 10,
          height: 10,
          decoration: BoxDecoration(
            color: AppColors.primary.withValues(alpha: opacity),
            borderRadius: BorderRadius.circular(3),
          ),
        ),
        const SizedBox(width: 10),
        Expanded(
          child: Text(category.name,
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
              style: AppTextStyles.bodySmall.copyWith(color: AppColors.foreground)),
        ),
        const SizedBox(width: 8),
        Text('${category.percentage}%', style: AppTextStyles.labelSmall),
        const SizedBox(width: 10),
        Text(
          '${category.actualPaisas.formatPKR()} / ${category.plannedPaisas.formatPKR()}',
          style: AppTextStyles.labelSmall.copyWith(
            color: done ? AppColors.success : AppColors.mutedForeground,
          ),
        ),
      ],
    );
  }
}

class _InvestedSavingsHeader extends StatelessWidget {
  const _InvestedSavingsHeader({required this.data});
  final InvestmentsData data;

  @override
  Widget build(BuildContext context) {
    final gain = data.totalGainPaisas;
    final positive = gain >= 0;
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      crossAxisAlignment: CrossAxisAlignment.end,
      children: [
        Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(children: [
              const Icon(Icons.account_balance_wallet_outlined, size: 16, color: AppColors.mutedForeground),
              const SizedBox(width: 8),
              Text('Invested Savings', style: AppTextStyles.bodyMedium.copyWith(fontWeight: FontWeight.w600)),
            ]),
            const SizedBox(height: 4),
            Text('${data.totalInvestedPaisas.formatPKR()} in · ${data.investments.length} investment${data.investments.length == 1 ? '' : 's'}',
                style: AppTextStyles.bodySmall),
          ],
        ),
        Column(
          crossAxisAlignment: CrossAxisAlignment.end,
          children: [
            Text(data.totalCurrentValuePaisas.formatPKR(),
                style: AppTextStyles.currencyMedium.copyWith(color: AppColors.foreground)),
            Text('${positive ? '+' : ''}${gain.formatPKR()}',
                style: AppTextStyles.labelMedium.copyWith(
                  color: positive ? AppColors.success : AppColors.destructive,
                )),
          ],
        ),
      ],
    );
  }
}

/// Confirm copy for "Delete investment". Plan categories also leave the plan.
String deleteInvestmentMessage(String name, {required bool isCategory}) {
  final base = 'Delete $name? Its money and history are removed. Expenses or income it booked are removed too.';
  return isCategory
      ? '$base It is also removed from your investment plan; the other percentages stay as they are.'
      : base;
}

// Small date helper shared by the sheets.
String shortDate(DateTime d) => DateFormat('d MMM y').format(d);
