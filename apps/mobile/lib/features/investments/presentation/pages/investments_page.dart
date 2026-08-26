import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';

import '../../../../core/errors/app_exception.dart';
import '../../../../core/extensions/currency_ext.dart';
import '../../../../core/services/toast_service.dart';
import '../../../../core/theme/app_colors.dart';
import '../../../../core/theme/app_text_styles.dart';
import '../../../../core/widgets/app_card.dart';
import '../../../../core/widgets/app_empty_state.dart';
import '../../data/datasources/investments_datasource.dart';
import '../../domain/entities/investment_entity.dart';
import '../providers/investments_provider.dart';
import '../widgets/investment_sheets.dart';

const _typeLabels = {
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

class InvestmentsPage extends ConsumerWidget {
  const InvestmentsPage({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final async = ref.watch(investmentsProvider);

    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        backgroundColor: AppColors.background,
        elevation: 0,
        title: const Text('Investments', style: AppTextStyles.headlineSmall),
        actions: [
          async.maybeWhen(
            data: (data) => IconButton(
              icon: const Icon(Icons.add, color: AppColors.primary),
              tooltip: 'Add investment',
              onPressed: () => showPlanEditorSheet(context, ref, data.plan),
            ),
            orElse: () => const SizedBox.shrink(),
          ),
        ],
      ),
      body: RefreshIndicator(
        color: AppColors.primary,
        backgroundColor: AppColors.card,
        onRefresh: () => ref.refresh(investmentsProvider.future),
        child: async.when(
          data: (data) => _Content(data: data),
          loading: () =>
              const Center(child: CircularProgressIndicator(color: AppColors.primary)),
          error: (_, __) => ListView(
            children: [
              const SizedBox(height: 120),
              AppEmptyState(
                title: 'Could not load investments',
                icon: Icons.wifi_off_outlined,
                onRetry: () => ref.refresh(investmentsProvider.future),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

// A row in the "Invested Savings" list: either a plan category (funded or
// not yet) or a legacy Investment with no category link.
class _Row {
  const _Row.category(this.category, this.investment) : isUncategorized = false;
  const _Row.uncategorized(InvestmentEntity inv)
      : investment = inv,
        category = null,
        isUncategorized = true;
  final PlanCategoryEntity? category;
  final InvestmentEntity? investment;
  final bool isUncategorized;
}

class _Content extends ConsumerWidget {
  const _Content({required this.data});
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

    final rows = <_Row>[
      for (final c in data.plan?.categories ?? []) _Row.category(c, investmentFor(c.id)),
      for (final inv in data.investments.where((i) => i.planCategoryId == null || !categoryIds.contains(i.planCategoryId)))
        _Row.uncategorized(inv),
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
                child: _SipCard(row: row),
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
            Text('${data.totalInvestedPaisas.formatPKR()} in · ${data.investments.length} SIP${data.investments.length == 1 ? '' : 's'}',
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

class _SipCard extends ConsumerWidget {
  const _SipCard({required this.row});
  final _Row row;

  String get _name => row.category?.name ?? row.investment!.name;
  String get _type => row.category?.investmentType ?? row.investment?.type ?? 'OTHER';

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final inv = row.investment;
    final positive = (inv?.gainPaisas ?? 0) >= 0;
    return AppCard(
      onTap: () => _showActions(context, ref),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Container(
                width: 36,
                height: 36,
                decoration: BoxDecoration(
                  color: AppColors.muted,
                  borderRadius: BorderRadius.circular(999),
                ),
                child: Icon(typeIcon(_type), size: 18, color: AppColors.mutedForeground),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(children: [
                      Flexible(
                        child: Text(_name,
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                            style: AppTextStyles.bodyMedium.copyWith(fontWeight: FontWeight.w600)),
                      ),
                      if (row.isUncategorized) ...[
                        const SizedBox(width: 6),
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 1),
                          decoration: BoxDecoration(
                            border: Border.all(color: AppColors.border),
                            borderRadius: BorderRadius.circular(4),
                          ),
                          child: Text('Uncategorized',
                              style: AppTextStyles.labelSmall.copyWith(color: AppColors.mutedForeground)),
                        ),
                      ],
                    ]),
                    const SizedBox(height: 2),
                    Text(
                      inv != null
                          ? '${_typeLabels[_type] ?? _type} · ${inv.investedPaisas.formatPKR()} in · ${inv.contributions.length}×'
                          : '${_typeLabels[_type] ?? _type} · No money added yet',
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: AppTextStyles.bodySmall,
                    ),
                  ],
                ),
              ),
              const SizedBox(width: 8),
              Column(
                crossAxisAlignment: CrossAxisAlignment.end,
                children: [
                  Text((inv?.currentValuePaisas ?? 0).formatPKR(),
                      style: AppTextStyles.bodyMedium.copyWith(fontWeight: FontWeight.w700)),
                  if (inv != null)
                    Text(
                      '${positive ? '+' : ''}${inv.gainPaisas.formatPKR()} · ${positive ? '+' : ''}${inv.gainPct.toStringAsFixed(1)}%',
                      style: AppTextStyles.labelSmall.copyWith(
                        color: positive ? AppColors.success : AppColors.destructive,
                      ),
                    ),
                ],
              ),
            ],
          ),
          const SizedBox(height: 12),
          Row(
            children: [
              Expanded(
                child: OutlinedButton.icon(
                  onPressed: () => _addMoney(context, ref),
                  icon: const Icon(Icons.add, size: 16),
                  label: const Text('Add money'),
                  style: OutlinedButton.styleFrom(
                    foregroundColor: AppColors.primary,
                    side: BorderSide(color: AppColors.primary.withValues(alpha: 0.4)),
                    padding: const EdgeInsets.symmetric(vertical: 8),
                  ),
                ),
              ),
              if (inv != null) ...[
                const SizedBox(width: 8),
                IconButton(
                  onPressed: () => _showActions(context, ref),
                  icon: const Icon(Icons.more_horiz, color: AppColors.mutedForeground),
                ),
              ],
            ],
          ),
        ],
      ),
    );
  }

  void _addMoney(BuildContext context, WidgetRef ref) {
    if (row.category != null) {
      showAddMoneyToCategorySheet(context, ref, row.category!);
    } else {
      showLogContributionSheet(context, ref, row.investment!);
    }
  }

  void _showActions(BuildContext context, WidgetRef ref) {
    final inv = row.investment;
    if (inv == null) {
      _addMoney(context, ref);
      return;
    }
    showModalBottomSheet<void>(
      context: context,
      backgroundColor: AppColors.popover,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(16)),
      ),
      builder: (ctx) => SafeArea(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            _SheetAction(
              icon: Icons.add,
              label: 'Add money',
              onTap: () {
                Navigator.pop(ctx);
                _addMoney(context, ref);
              },
            ),
            _SheetAction(
              icon: Icons.refresh,
              label: 'Update value',
              onTap: () {
                Navigator.pop(ctx);
                showUpdateValueSheet(context, ref, inv);
              },
            ),
            if (inv.contributions.isNotEmpty)
              _SheetAction(
                icon: Icons.history,
                label: 'History (${inv.contributions.length})',
                onTap: () {
                  Navigator.pop(ctx);
                  showHistorySheet(context, ref, inv);
                },
              ),
            _SheetAction(
              icon: Icons.delete_outline,
              label: row.category != null ? 'Clear money & history' : 'Delete SIP',
              destructive: true,
              onTap: () {
                Navigator.pop(ctx);
                _confirmDelete(context, ref, inv);
              },
            ),
          ],
        ),
      ),
    );
  }

  Future<void> _confirmDelete(BuildContext context, WidgetRef ref, InvestmentEntity inv) async {
    final keepsCategory = row.category != null;
    final ok = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        backgroundColor: AppColors.card,
        title: Text(keepsCategory ? 'Clear money & history?' : 'Delete SIP?', style: AppTextStyles.bodyLarge),
        content: Text(
          keepsCategory
              ? 'This removes all logged contributions and value for ${inv.name}. The plan investment stays - you can add money into it again any time.'
              : 'This removes ${inv.name} and its full contribution history.',
          style: AppTextStyles.bodySmall,
        ),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx, false), child: const Text('Cancel')),
          TextButton(
            onPressed: () => Navigator.pop(ctx, true),
            child: Text(keepsCategory ? 'Clear' : 'Delete', style: const TextStyle(color: AppColors.destructive)),
          ),
        ],
      ),
    );
    if (ok != true || !context.mounted) return;
    try {
      HapticFeedback.mediumImpact();
      await ref.read(investmentsDatasourceProvider).deleteSip(inv.id);
      ref.invalidate(investmentsProvider);
      if (context.mounted) ref.read(toastServiceProvider).success(context, 'Deleted');
    } catch (e) {
      if (context.mounted) {
        ref.read(toastServiceProvider).error(
            context, e is AppException ? e.message : 'Failed to delete');
      }
    }
  }
}

class _SheetAction extends StatelessWidget {
  const _SheetAction({
    required this.icon,
    required this.label,
    required this.onTap,
    this.destructive = false,
  });
  final IconData icon;
  final String label;
  final VoidCallback onTap;
  final bool destructive;

  @override
  Widget build(BuildContext context) {
    final color = destructive ? AppColors.destructive : AppColors.foreground;
    return ListTile(
      leading: Icon(icon, color: color, size: 20),
      title: Text(label, style: AppTextStyles.bodyMedium.copyWith(color: color)),
      onTap: onTap,
    );
  }
}

// Small date helper shared by the sheets.
String shortDate(DateTime d) => DateFormat('d MMM y').format(d);
