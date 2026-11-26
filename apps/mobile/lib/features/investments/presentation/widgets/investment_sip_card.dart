import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../../core/errors/app_exception.dart';
import '../../../../core/extensions/currency_ext.dart';
import '../../../../core/services/toast_service.dart';
import '../../../../core/theme/app_colors.dart';
import '../../../../core/theme/app_text_styles.dart';
import '../../../../core/widgets/app_card.dart';
import '../../../../core/widgets/app_sheet.dart';
import '../../data/datasources/investments_datasource.dart';
import '../../domain/entities/investment_entity.dart';
import '../providers/investments_provider.dart';
import 'investment_sheets.dart';

import 'investment_cards.dart';

class SipCard extends ConsumerWidget {
  const SipCard({required this.row, super.key});
  final InvestmentRow row;

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
                          ? '${typeLabels[_type] ?? _type} · ${inv.investedPaisas.formatPKR()} invested${inv.withdrawnPaisas > 0 ? ' · ${inv.withdrawnPaisas.formatPKR()} out' : ''}'
                          : '${typeLabels[_type] ?? _type} · No money added yet',
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
              const SizedBox(width: 8),
              IconButton(
                onPressed: () => _showActions(context, ref),
                icon: const Icon(Icons.more_horiz, color: AppColors.mutedForeground),
              ),
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
            if (inv != null && inv.currentValuePaisas > 0)
              _SheetAction(
                icon: Icons.remove,
                label: 'Withdraw',
                onTap: () {
                  Navigator.pop(ctx);
                  showWithdrawSheet(context, ref, inv);
                },
              ),
            if (inv != null)
              _SheetAction(
              icon: Icons.refresh,
              label: 'Update value',
              onTap: () {
                Navigator.pop(ctx);
                showUpdateValueSheet(context, ref, inv);
              },
            ),
            if (inv != null && inv.contributions.isNotEmpty)
              _SheetAction(
                icon: Icons.history,
                label: 'History (${inv.contributions.length})',
                onTap: () {
                  Navigator.pop(ctx);
                  showHistorySheet(context, ref, inv);
                },
              ),
            if (row.category != null && inv != null)
              _SheetAction(
                icon: Icons.layers_clear_outlined,
                label: 'Clear money & history',
                destructive: true,
                onTap: () {
                  Navigator.pop(ctx);
                  _confirmClear(context, ref, inv);
                },
              ),
            _SheetAction(
              icon: Icons.delete_outline,
              label: 'Delete investment',
              destructive: true,
              onTap: () {
                Navigator.pop(ctx);
                _confirmDelete(context, ref);
              },
            ),
          ],
        ),
      ),
    );
  }

  Future<void> _confirmClear(BuildContext context, WidgetRef ref, InvestmentEntity inv) async {
    final ok = await confirmDestructive(
      context,
      title: 'Clear money & history?',
      body:
          'This removes all logged contributions and value for ${inv.name}. The plan investment stays - you can add money into it again any time.',
      confirmLabel: 'Clear',
    );
    if (!ok || !context.mounted) return;
    await _run(context, ref, () => ref.read(investmentsDatasourceProvider).deleteSip(inv.id), 'Cleared');
  }

  Future<void> _confirmDelete(BuildContext context, WidgetRef ref) async {
    final isCategory = row.category != null;
    final ok = await confirmDestructive(
      context,
      title: 'Delete investment?',
      body: deleteInvestmentMessage(_name, isCategory: isCategory),
      confirmLabel: 'Delete',
    );
    if (!ok || !context.mounted) return;
    final ds = ref.read(investmentsDatasourceProvider);
    await _run(
      context,
      ref,
      () => isCategory ? ds.deletePlanCategory(row.category!.id) : ds.deleteSip(row.investment!.id),
      'Deleted',
    );
  }

  Future<void> _run(BuildContext context, WidgetRef ref, Future<void> Function() op, String done) async {
    try {
      HapticFeedback.mediumImpact();
      await op();
      ref.invalidate(investmentsProvider);
      if (context.mounted) ref.read(toastServiceProvider).success(context, done);
    } catch (e) {
      if (context.mounted) {
        ref.read(toastServiceProvider).error(context, e is AppException ? e.message : 'Failed to delete');
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
