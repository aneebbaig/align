import 'package:flutter/material.dart';

import '../theme/app_colors.dart';
import '../theme/app_text_styles.dart';
import 'app_card.dart';
import 'app_divider.dart';
import 'app_progress_bar.dart';

/// One headline figure with an optional progress bar, a caption, and a
/// footer row for a second figure - the summary at the top of the Expenses
/// and Income tabs.
///
/// ```
/// Spent this month
/// Rs 84,200
/// ████████████░░░░  70%
/// of Rs 120,000 budget · Rs 35,800 left
/// ───────────────────────────────
/// Available income        Rs 41,500
/// ```
class AppSummaryCard extends StatelessWidget {
  const AppSummaryCard({
    required this.label,
    required this.value,
    this.valueColor,
    this.progress,
    this.progressColor,
    this.progressLabel,
    this.caption,
    this.captionColor,
    this.footerLabel,
    this.footerValue,
    this.footerColor,
    super.key,
  });

  final String label;
  final String value;
  final Color? valueColor;

  /// 0.0 - 1.0. Null hides the bar (e.g. no budget to measure against).
  final double? progress;
  final Color? progressColor;
  final String? progressLabel; // e.g. "70%"

  final String? caption;
  final Color? captionColor;

  final String? footerLabel;
  final String? footerValue;
  final Color? footerColor;

  @override
  Widget build(BuildContext context) => AppCard(
        padding: const EdgeInsets.fromLTRB(16, 16, 16, 14),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(label, style: AppTextStyles.labelSmall.copyWith(color: AppColors.mutedForeground, letterSpacing: 0.3)),
            const SizedBox(height: 6),
            Text(value, style: AppTextStyles.currencyMedium.copyWith(fontSize: 28, color: valueColor ?? AppColors.foreground)),
            if (progress != null) ...[
              const SizedBox(height: 12),
              Row(children: [
                Expanded(child: AppProgressBar(value: progress!, color: progressColor)),
                if (progressLabel != null) ...[
                  const SizedBox(width: 10),
                  Text(progressLabel!, style: AppTextStyles.labelSmall.copyWith(color: progressColor ?? AppColors.mutedForeground)),
                ],
              ]),
            ],
            if (caption != null) ...[
              const SizedBox(height: 8),
              Text(caption!, style: AppTextStyles.bodySmall.copyWith(color: captionColor ?? AppColors.mutedForeground)),
            ],
            if (footerLabel != null && footerValue != null) ...[
              const SizedBox(height: 12),
              const AppDivider(),
              const SizedBox(height: 10),
              Row(children: [
                Expanded(child: Text(footerLabel!, style: AppTextStyles.bodySmall.copyWith(color: AppColors.mutedForeground))),
                Text(footerValue!, style: AppTextStyles.labelLarge.copyWith(color: footerColor ?? AppColors.foreground)),
              ]),
            ],
          ],
        ),
      );
}
