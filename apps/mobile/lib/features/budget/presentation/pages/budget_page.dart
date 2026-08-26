import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../../core/extensions/currency_ext.dart';
import '../../../../core/extensions/lucide_ext.dart';
import '../../../../core/theme/app_colors.dart';
import '../../../../core/theme/app_text_styles.dart';
import '../../../../core/widgets/app_card.dart';
import '../../../../core/widgets/app_empty_state.dart';
import '../../../../core/widgets/app_icon_box.dart';
import '../../../../core/widgets/app_progress_bar.dart';
import '../../../../core/widgets/app_section.dart';
import '../../domain/entities/budget_data.dart';
import '../providers/budget_provider.dart';

class BudgetPage extends ConsumerWidget {
  const BudgetPage({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final async = ref.watch(budgetProvider);

    return Scaffold(
      backgroundColor: AppColors.background,
      body: RefreshIndicator(
        color: AppColors.primary,
        backgroundColor: AppColors.card,
        onRefresh: () => ref.refresh(budgetProvider.future),
        child: CustomScrollView(
          slivers: [
            SliverAppBar(
              backgroundColor: AppColors.background,
              floating: true,
              snap: true,
              elevation: 0,
              title: async.when(
                data: (d) => Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(d.periodLabel, style: AppTextStyles.headlineSmall),
                    const Text('Budget', style: AppTextStyles.bodySmall),
                  ],
                ),
                loading: () => const Text('Budget', style: AppTextStyles.headlineSmall),
                error: (_, __) => const Text('Budget', style: AppTextStyles.headlineSmall),
              ),
            ),
            async.when(
              data: (d) => SliverPadding(
                padding: const EdgeInsets.fromLTRB(16, 8, 16, 100),
                sliver: SliverList(
                  delegate: SliverChildListDelegate([
                    if (d.hasBudget) ...[
                      _OverviewCard(data: d),
                      const SizedBox(height: 20),
                    ],
                    AppSection(
                      label: 'Categories',
                      children: d.categories.isEmpty
                          ? [
                              const Padding(
                                padding: EdgeInsets.symmetric(vertical: 16),
                                child: Text(
                                  'No budget categories set',
                                  style: AppTextStyles.bodySmall,
                                ),
                              ),
                            ]
                          : d.categories
                              .map((c) => Padding(
                                    padding: const EdgeInsets.only(bottom: 10),
                                    child: _CategoryBudgetRow(cat: c),
                                  ))
                              .toList(),
                    ),
                  ]),
                ),
              ),
              loading: () => const SliverFillRemaining(
                child: Center(
                  child: CircularProgressIndicator(color: AppColors.primary),
                ),
              ),
              error: (_, __) => SliverFillRemaining(
                child: AppEmptyState(
                  title: 'Could not load budget',
                  icon: Icons.wifi_off_outlined,
                  onRetry: () => ref.refresh(budgetProvider.future),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _OverviewCard extends StatelessWidget {
  const _OverviewCard({required this.data});
  final BudgetData data;

  double get _pct => data.totalBudgetPaisas != null && data.totalBudgetPaisas! > 0
      ? (data.totalSpentPaisas / data.totalBudgetPaisas!).clamp(0.0, 1.0)
      : 0.0;

  Color get _color {
    if (_pct >= 1.0) return AppColors.destructive;
    if (_pct >= 0.85) return const Color(0xFFE67E22);
    return AppColors.primary;
  }

  @override
  Widget build(BuildContext context) => AppCard(
        child: Column(
          children: [
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                _Stat(
                  label: 'Budget',
                  amount: data.totalBudgetPaisas?.formatPKR() ?? '-',
                  color: AppColors.mutedForeground,
                ),
                _Stat(
                  label: 'Spent',
                  amount: data.totalSpentPaisas.formatPKR(),
                  color: AppColors.foreground,
                ),
                _Stat(
                  label: 'Left',
                  amount: data.remainingPaisas?.formatPKR() ?? '-',
                  color: _color,
                ),
              ],
            ),
            const SizedBox(height: 14),
            AppProgressBar(value: _pct, color: _color),
          ],
        ),
      );
}

class _Stat extends StatelessWidget {
  const _Stat({required this.label, required this.amount, required this.color});
  final String label;
  final String amount;
  final Color color;

  @override
  Widget build(BuildContext context) => Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(label, style: AppTextStyles.labelSmall.copyWith(
            color: AppColors.mutedForeground,
          )),
          const SizedBox(height: 4),
          Text(amount, style: AppTextStyles.currencySmall.copyWith(color: color)),
        ],
      );
}

class _CategoryBudgetRow extends StatelessWidget {
  const _CategoryBudgetRow({required this.cat});
  final BudgetCategoryData cat;

  Color get _color {
    if (cat.pct >= 100) return AppColors.destructive;
    if (cat.pct >= 85) return const Color(0xFFE67E22);
    return AppColors.primary;
  }

  @override
  Widget build(BuildContext context) => AppCard(
        padding: const EdgeInsets.all(12),
        child: Column(
          children: [
            Row(
              children: [
                AppIconBox(icon: cat.category.icon.lucideIcon, size: 32, radius: 8),
                const SizedBox(width: 10),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(cat.category.name, style: AppTextStyles.bodyMedium.copyWith(
                        fontWeight: FontWeight.w500,
                      )),
                      Text(
                        '${cat.spentPaisas.formatPKR()} of ${cat.allocatedPaisas.formatPKR()}',
                        style: AppTextStyles.bodySmall,
                      ),
                    ],
                  ),
                ),
                Text(
                  '${cat.pct}%',
                  style: AppTextStyles.labelMedium.copyWith(color: _color),
                ),
              ],
            ),
            const SizedBox(height: 8),
            AppProgressBar(value: cat.pct / 100, color: _color, height: 4),
          ],
        ),
      );
}
