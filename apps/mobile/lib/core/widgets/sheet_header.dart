import 'package:flutter/material.dart';

import '../theme/app_colors.dart';
import '../theme/app_text_styles.dart';

/// Title row for a bottom sheet with a text Save/Create button on the right.
class SheetHeader extends StatelessWidget {
  const SheetHeader({
    required this.title,
    this.onSubmit,
    this.canSubmit = false,
    this.loading = false,
    this.submit = 'Save',
    super.key,
  });
  final String title;
  final VoidCallback? onSubmit;
  final bool canSubmit;
  final bool loading;
  final String submit;

  @override
  Widget build(BuildContext context) => Row(children: [
        Expanded(child: Text(title, style: AppTextStyles.bodyLarge.copyWith(fontWeight: FontWeight.w600))),
        if (onSubmit != null)
          TextButton(
            onPressed: canSubmit && !loading ? onSubmit : null,
          child: loading
              ? const SizedBox(width: 16, height: 16, child: CircularProgressIndicator(strokeWidth: 2, color: AppColors.primary))
              : Text(submit, style: AppTextStyles.labelLarge.copyWith(
                  color: canSubmit ? AppColors.primary : AppColors.mutedForeground, fontWeight: FontWeight.w600)),
        ),
      ]);
}
