import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../../core/errors/app_exception.dart';
import '../../../../core/services/toast_service.dart';
import '../../../../core/theme/app_colors.dart';
import '../../../../core/theme/app_text_styles.dart';
import '../../../../core/utils/currency_utils.dart';
import '../../domain/wedding_logic.dart';
import '../providers/wedding_provider.dart';

String money(int paisas) => CurrencyUtils.formatPKR(paisas);
String moneyShort(int paisas) => formatShort(paisas, symbol: 'PKR');

Color budgetColor(BudgetState s) => switch (s) {
      BudgetState.over => AppColors.destructive,
      BudgetState.close => AppColors.warning,
      _ => AppColors.primary,
    };

String errorText(Object e) => e is AppException ? e.message : 'Something went wrong';

void toastError(BuildContext context, WidgetRef ref, Object e) {
  if (context.mounted) ref.read(toastServiceProvider).error(context, errorText(e));
}

/// Refetch everything that shows this wedding.
void refreshWedding(WidgetRef ref, String planId) {
  ref.invalidate(weddingPlanProvider(planId));
  ref.invalidate(weddingListProvider);
}

/// Planned cost as a bar with the paid share filled in over it.
class BudgetMeter extends StatelessWidget {
  const BudgetMeter({required this.projected, required this.paid, required this.budget, this.height = 8, super.key});
  final int projected;
  final int paid;
  final int budget;
  final double height;

  @override
  Widget build(BuildContext context) {
    final st = budgetStatus(projected, budget);
    // With no budget the bar is relative to the planned cost itself.
    final scale = budget > 0 ? (projected > budget ? projected : budget) : (projected > 0 ? projected : 1);
    double frac(int v) => (v / scale).clamp(0.0, 1.0);
    final color = budget > 0 ? budgetColor(st.state) : AppColors.primary;
    return ClipRRect(
      borderRadius: BorderRadius.circular(height / 2),
      child: SizedBox(
        height: height,
        child: LayoutBuilder(
          builder: (_, c) => Stack(children: [
            Container(color: AppColors.border),
            Container(width: c.maxWidth * frac(projected), color: color.withValues(alpha: 0.35)),
            Container(width: c.maxWidth * frac(paid), color: color),
          ]),
        ),
      ),
    );
  }
}

class SectionTitle extends StatelessWidget {
  const SectionTitle(this.text, {this.trailing, super.key});
  final String text;
  final Widget? trailing;

  @override
  Widget build(BuildContext context) => Padding(
        padding: const EdgeInsets.only(top: 20, bottom: 8),
        child: Row(children: [
          Expanded(child: Text(text, style: AppTextStyles.bodyLarge.copyWith(fontWeight: FontWeight.w600))),
          if (trailing != null) trailing!,
        ]),
      );
}

/// A small selectable pill.
class PillChip extends StatelessWidget {
  const PillChip({required this.label, required this.selected, required this.onTap, super.key});
  final String label;
  final bool selected;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) => GestureDetector(
        onTap: onTap,
        child: Container(
          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 7),
          decoration: BoxDecoration(
            color: selected ? AppColors.primary.withValues(alpha: 0.15) : AppColors.card,
            border: Border.all(color: selected ? AppColors.primary : AppColors.border),
            borderRadius: BorderRadius.circular(20),
          ),
          child: Text(
            label,
            style: AppTextStyles.labelMedium.copyWith(color: selected ? AppColors.primary : AppColors.mutedForeground),
          ),
        ),
      );
}

/// Undo snackbar for a swipe action.
void showUndoBar(BuildContext context, String message, {required VoidCallback onUndo}) {
  final m = ScaffoldMessenger.of(context);
  m.hideCurrentSnackBar();
  m.showSnackBar(SnackBar(
    content: Text(message, style: AppTextStyles.bodyMedium),
    backgroundColor: AppColors.popover,
    duration: const Duration(seconds: 4),
    behavior: SnackBarBehavior.floating,
    action: SnackBarAction(label: 'Undo', textColor: AppColors.primary, onPressed: onUndo),
  ));
}
