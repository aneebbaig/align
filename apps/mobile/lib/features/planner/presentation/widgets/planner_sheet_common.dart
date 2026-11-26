import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../../core/errors/app_exception.dart';
import '../../../../core/extensions/currency_ext.dart';
import '../../../../core/services/toast_service.dart';
import '../../../../core/theme/app_colors.dart';
import '../../../../core/theme/app_text_styles.dart';
import '../../../../core/utils/amount_expr.dart';
import '../../data/datasources/planner_datasource.dart';
import '../providers/planner_provider.dart';

/// User input (a number or a sum) in rupees/dollars -> paisas/cents. 0 is
/// allowed (it ends a line); null when blank or not an amount.
int? plannerUnits(String s) {
  final v = parseOptionalAmount(s);
  return v == null || v == badAmount ? null : v;
}

/// Paisas/cents -> plain input text, no grouping: 5000000 -> "50000", 1250 -> "12.5".
String plannerInput(int units) {
  final v = units.toRupees;
  return v == v.truncateToDouble() ? v.toInt().toString() : v.toString();
}

/// Runs one planner change: haptic, call, refresh the table, short toast.
/// Returns whether it worked so the caller can close its sheet.
Future<bool> applyPlannerChange(
  BuildContext context,
  WidgetRef ref,
  Future<void> Function(PlannerDatasource ds) action, {
  required String done,
}) async {
  try {
    HapticFeedback.mediumImpact();
    await action(ref.read(plannerDatasourceProvider));
    ref.invalidate(plannerProvider);
    if (context.mounted) ref.read(toastServiceProvider).success(context, done);
    return true;
  } catch (e) {
    if (context.mounted) ref.read(toastServiceProvider).error(context, e is AppException ? e.message : 'Failed');
    return false;
  }
}

class PlannerChoice extends StatelessWidget {
  const PlannerChoice({required this.label, required this.selected, required this.onTap, super.key});
  final String label;
  final bool selected;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) => Expanded(
        child: GestureDetector(
          onTap: onTap,
          behavior: HitTestBehavior.opaque,
          child: Container(
            padding: const EdgeInsets.symmetric(vertical: 10),
            alignment: Alignment.center,
            decoration: BoxDecoration(
              color: selected ? AppColors.primary.withValues(alpha: 0.12) : AppColors.card,
              borderRadius: BorderRadius.circular(8),
              border: Border.all(color: selected ? AppColors.primary.withValues(alpha: 0.6) : AppColors.border.withValues(alpha: 0.5)),
            ),
            child: Text(label, style: AppTextStyles.labelMedium.copyWith(color: selected ? AppColors.primary : AppColors.foreground)),
          ),
        ),
      );
}

