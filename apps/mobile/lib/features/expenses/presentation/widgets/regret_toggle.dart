import 'package:flutter/material.dart';

import '../../../../core/theme/app_colors.dart';
import '../../../../core/theme/app_text_styles.dart';

/// "Regret buy" switch row on the expense form.
class RegretToggle extends StatelessWidget {
  const RegretToggle({required this.value, required this.onTap, super.key});
  final bool value;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) => GestureDetector(
        onTap: onTap,
        child: Container(
          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 14),
          decoration: BoxDecoration(
            color: value ? AppColors.destructive.withValues(alpha: 0.12) : AppColors.card,
            borderRadius: BorderRadius.circular(8),
            border: Border.all(
              color: value ? AppColors.destructive.withValues(alpha: 0.5) : AppColors.border.withValues(alpha: 0.5),
            ),
          ),
          child: Row(
            children: [
              Icon(
                value ? Icons.sentiment_dissatisfied : Icons.sentiment_dissatisfied_outlined,
                size: 16,
                color: value ? AppColors.destructive : AppColors.mutedForeground,
              ),
              const SizedBox(width: 10),
              Text(
                'Regret buy - wish I hadn\'t',
                style: AppTextStyles.bodyMedium.copyWith(
                  color: value ? AppColors.destructive : AppColors.mutedForeground,
                ),
              ),
              const Spacer(),
              if (value) const Icon(Icons.check, size: 16, color: AppColors.destructive),
            ],
          ),
        ),
      );
}
