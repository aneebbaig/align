import 'package:flutter/material.dart';
import 'package:intl/intl.dart';

import '../theme/app_colors.dart';
import '../theme/app_text_styles.dart';

/// Optional budget-period override, derived from the entry's own date field
/// rather than a separate month/year picker. Unchecked (default): files under
/// the server's current open budget period. Checked: files under whichever
/// month/year [date] falls in - the way to backfill an old expense/income/
/// loan into its actual budget month.
class BudgetPeriodField extends StatelessWidget {
  const BudgetPeriodField({
    required this.date,
    required this.checked,
    required this.onChanged,
    super.key,
  });

  final DateTime date;
  final bool checked;
  final void Function(bool checked) onChanged;

  @override
  Widget build(BuildContext context) => GestureDetector(
        onTap: () => onChanged(!checked),
        behavior: HitTestBehavior.opaque,
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Checkbox(
              value: checked,
              activeColor: AppColors.primary,
              onChanged: (v) => onChanged(v ?? false),
            ),
            const SizedBox(width: 4),
            Expanded(
              child: Padding(
                padding: const EdgeInsets.only(top: 12),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      "File under ${DateFormat('MMMM y').format(date)}'s budget",
                      style: AppTextStyles.bodyMedium,
                    ),
                    Text(
                      'Otherwise files under the current open period',
                      style: AppTextStyles.bodySmall.copyWith(color: AppColors.mutedForeground),
                    ),
                  ],
                ),
              ),
            ),
          ],
        ),
      );
}
