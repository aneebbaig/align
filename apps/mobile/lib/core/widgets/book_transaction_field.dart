import 'package:flutter/material.dart';

import '../theme/app_colors.dart';
import '../theme/app_text_styles.dart';

/// Toggle for whether a loan/repayment also books a ledger Transaction
/// (an entry in Expenses/Income). Checked (default): book it - existing
/// behavior. Unchecked: loan/payment tracking only, no ledger entry.
class BookTransactionField extends StatelessWidget {
  const BookTransactionField({
    required this.label,
    required this.checked,
    required this.onChanged,
    super.key,
  });

  final String label;
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
                    Text('Also record as $label', style: AppTextStyles.bodyMedium),
                    Text(
                      'Uncheck to track this without an entry in Expenses/Income',
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
