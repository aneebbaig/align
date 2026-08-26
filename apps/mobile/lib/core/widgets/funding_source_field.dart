import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../features/savings/presentation/providers/savings_provider.dart';
import '../extensions/async_value_ext.dart';
import '../extensions/currency_ext.dart';
import '../providers/funding_context_provider.dart';
import '../theme/app_colors.dart';
import '../theme/app_text_styles.dart';

/// Picks whether an expense/repayment is funded from income (default) or a
/// specific savings pot's base-currency balance, mirroring the web app's
/// funding-source selector (single-source only - no split across sources).
///
/// `month`/`year` is the resolved *target* budget period (from the entry's
/// own date + the "file under this date's budget" checkbox) - the income
/// chip's available figure is refetched for that period, never the stale
/// current-period number.
class FundingSourceField extends ConsumerWidget {
  const FundingSourceField({
    required this.potId,
    required this.onChanged,
    required this.month,
    required this.year,
    super.key,
  });

  final String? potId;
  final void Function(String? potId) onChanged;
  // Resolved target budget period - null/null defers to the server's current
  // open period (mirrors the funding-context API's optional query params).
  final int? month;
  final int? year;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final savingsAsync = ref.watch(savingsProvider);
    final fundingAsync = ref.watch(fundingContextProvider(month, year));

    return savingsAsync.when(
      data: (state) {
        final incomeAvailable = fundingAsync.valueOrNull?.monthlyIncomeAvailablePaisas;
        final incomeLoading = fundingAsync.isLoading;
        return Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'FUND FROM',
              style: AppTextStyles.labelSmall.copyWith(
                color: AppColors.mutedForeground,
                letterSpacing: 0.7,
              ),
            ),
            const SizedBox(height: 8),
            Wrap(
              spacing: 8,
              runSpacing: 8,
              children: [
                _Chip(
                  label: incomeLoading
                      ? 'Income · …'
                      : 'Income${incomeAvailable != null ? ' · ${incomeAvailable.formatPKR()} available' : ''}',
                  selected: potId == null,
                  onTap: () => onChanged(null),
                ),
                ...state.pots.map((p) => _Chip(
                      label: '${p.name} · ${p.currentPaisas.formatPKR()}',
                      selected: potId == p.id,
                      onTap: () => onChanged(p.id),
                    )),
              ],
            ),
          ],
        );
      },
      loading: () => const SizedBox.shrink(),
      error: (_, __) => const SizedBox.shrink(),
    );
  }
}

class _Chip extends StatelessWidget {
  const _Chip({required this.label, required this.selected, required this.onTap});
  final String label;
  final bool selected;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) => GestureDetector(
        onTap: onTap,
        child: Container(
          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 9),
          decoration: BoxDecoration(
            color: selected ? AppColors.primary.withValues(alpha: 0.15) : AppColors.card,
            borderRadius: BorderRadius.circular(20),
            border: Border.all(
              color: selected ? AppColors.primary : AppColors.border.withValues(alpha: 0.5),
            ),
          ),
          child: Text(
            label,
            style: AppTextStyles.labelMedium.copyWith(
              color: selected ? AppColors.primary : AppColors.foreground,
              fontWeight: selected ? FontWeight.w600 : FontWeight.w400,
            ),
          ),
        ),
      );
}
