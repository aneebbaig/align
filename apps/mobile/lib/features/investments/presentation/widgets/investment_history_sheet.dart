import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../../core/errors/app_exception.dart';
import '../../../../core/extensions/currency_ext.dart';
import '../../../../core/services/toast_service.dart';
import '../../../../core/theme/app_colors.dart';
import '../../../../core/theme/app_text_styles.dart';
import '../../../../core/widgets/undo_delete.dart';
import '../../data/datasources/investments_datasource.dart';
import '../../domain/entities/investment_entity.dart';
import 'investment_cards.dart' show shortDate;
import '../providers/investments_provider.dart';

// ── History ──────────────────────────────────────────────────────────────────

class HistorySheet extends ConsumerWidget {
  const HistorySheet({required this.inv, super.key});
  final InvestmentEntity inv;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    return Padding(
      padding: const EdgeInsets.fromLTRB(16, 16, 16, 24),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text('History — ${inv.name}', style: AppTextStyles.bodyLarge.copyWith(fontWeight: FontWeight.w600)),
          const SizedBox(height: 12),
          Text('Swipe left to delete', style: AppTextStyles.bodySmall.copyWith(color: AppColors.mutedForeground)),
          const SizedBox(height: 4),
          ...inv.contributions.map((c) => Dismissible(
                key: ValueKey('contrib-${c.id}'),
                direction: DismissDirection.endToStart,
                background: const SizedBox.shrink(),
                secondaryBackground: const SwipeBackground(
                  alignment: Alignment.centerRight,
                  color: AppColors.destructive,
                  icon: Icons.delete_outline,
                ),
                onDismissed: (_) => _delete(context, ref, c),
                child: Padding(
                  padding: const EdgeInsets.symmetric(vertical: 6),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        '${c.isWithdrawal ? '−' : '+'}${c.amountPaisas.formatPKR()}${c.hasTransaction ? (c.isWithdrawal ? ' · in Income' : ' · in Expenses') : ''}',
                        style: AppTextStyles.bodyMedium.copyWith(
                          fontWeight: FontWeight.w600,
                          color: c.isWithdrawal ? AppColors.destructive : AppColors.foreground,
                        ),
                      ),
                      Text(shortDate(c.date) + (c.notes != null && c.notes!.isNotEmpty ? ' · ${c.notes}' : ''),
                          style: AppTextStyles.bodySmall),
                    ],
                  ),
                ),
              )),
        ],
      ),
    );
  }

  /// The snackbar must outlive this sheet (it would sit behind it), so the sheet
  /// closes right away and the real delete runs once Undo's window has passed.
  void _delete(BuildContext context, WidgetRef ref, ContributionEntity c) {
    final ds = ref.read(investmentsDatasourceProvider);
    final toast = ref.read(toastServiceProvider);
    final root = Navigator.of(context, rootNavigator: true).context;
    deferDelete(
      context,
      message: 'Entry deleted',
      commit: () async {
        await ds.deleteContribution(investmentId: inv.id, contributionId: c.id);
        ref.invalidate(investmentsProvider);
      },
      onUndo: () {},
      onError: (e) {
        if (root.mounted) toast.error(root, e is AppException ? e.message : 'Failed');
      },
    );
    Navigator.pop(context);
  }
}
