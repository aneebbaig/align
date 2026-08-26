import 'package:flutter/material.dart';

import '../theme/app_colors.dart';
import '../theme/app_text_styles.dart';

enum AppBadgeVariant { primary, success, warning, destructive, neutral }

class AppBadge extends StatelessWidget {
  const AppBadge({
    required this.label,
    this.variant = AppBadgeVariant.neutral,
    this.color,
    this.textColor,
    super.key,
  });

  final String label;
  final AppBadgeVariant variant;

  /// Override color (ignores [variant] when set).
  final Color? color;
  final Color? textColor;

  Color get _bg {
    if (color != null) return color!.withValues(alpha: 0.15);
    return switch (variant) {
      AppBadgeVariant.primary => AppColors.primary.withValues(alpha: 0.15),
      AppBadgeVariant.success => const Color(0xFF4CAF50).withValues(alpha: 0.15),
      AppBadgeVariant.warning => const Color(0xFFE67E22).withValues(alpha: 0.15),
      AppBadgeVariant.destructive => AppColors.destructive.withValues(alpha: 0.15),
      AppBadgeVariant.neutral => AppColors.muted,
    };
  }

  Color get _fg {
    if (textColor != null) return textColor!;
    if (color != null) return color!;
    return switch (variant) {
      AppBadgeVariant.primary => AppColors.primary,
      AppBadgeVariant.success => const Color(0xFF4CAF50),
      AppBadgeVariant.warning => const Color(0xFFE67E22),
      AppBadgeVariant.destructive => AppColors.destructive,
      AppBadgeVariant.neutral => AppColors.mutedForeground,
    };
  }

  @override
  Widget build(BuildContext context) => Container(
        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
        decoration: BoxDecoration(
          color: _bg,
          borderRadius: BorderRadius.circular(20),
        ),
        child: Text(
          label,
          style: AppTextStyles.labelSmall.copyWith(
            color: _fg,
            fontWeight: FontWeight.w600,
          ),
        ),
      );
}
