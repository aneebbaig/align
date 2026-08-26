import 'package:flutter/material.dart';

import '../theme/app_colors.dart';
import '../theme/app_text_styles.dart';

/// Labelled section: small uppercase header + optional "See all" trailing action.
class AppSection extends StatelessWidget {
  const AppSection({
    required this.label,
    required this.children,
    this.trailingLabel,
    this.onTrailingTap,
    this.padding = EdgeInsets.zero,
    super.key,
  });

  final String label;
  final List<Widget> children;
  final String? trailingLabel;
  final VoidCallback? onTrailingTap;
  final EdgeInsetsGeometry padding;

  @override
  Widget build(BuildContext context) => Padding(
        padding: padding,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text(
                  label.toUpperCase(),
                  style: AppTextStyles.labelSmall.copyWith(
                    color: AppColors.mutedForeground,
                    letterSpacing: 0.8,
                  ),
                ),
                if (trailingLabel != null)
                  GestureDetector(
                    onTap: onTrailingTap,
                    child: Text(
                      trailingLabel!,
                      style: AppTextStyles.labelSmall.copyWith(
                        color: AppColors.primary,
                      ),
                    ),
                  ),
              ],
            ),
            const SizedBox(height: 10),
            ...children,
          ],
        ),
      );
}
