import 'package:flutter/material.dart';

import '../theme/app_colors.dart';
import '../theme/app_text_styles.dart';
import 'app_card.dart';

enum AppSummaryTone { neutral, positive, negative, muted }

class AppSummaryItem {
  const AppSummaryItem({required this.label, required this.value, this.tone = AppSummaryTone.neutral, this.caption});
  final String label;
  final String value;
  final AppSummaryTone tone;
  final String? caption;
}

/// A row of small labelled figures in one card - the mobile counterpart of the
/// web summary cards on the Expenses and Income pages.
class AppSummaryStrip extends StatelessWidget {
  const AppSummaryStrip({required this.items, super.key});
  final List<AppSummaryItem> items;

  Color _color(AppSummaryTone tone) => switch (tone) {
        AppSummaryTone.positive => AppColors.success,
        AppSummaryTone.negative => AppColors.destructive,
        AppSummaryTone.muted => AppColors.mutedForeground,
        AppSummaryTone.neutral => AppColors.foreground,
      };

  @override
  Widget build(BuildContext context) => AppCard(
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 12),
        child: Row(
          children: [
            for (final item in items)
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(item.label.toUpperCase(),
                        style: AppTextStyles.labelSmall.copyWith(color: AppColors.mutedForeground, letterSpacing: 0.5)),
                    const SizedBox(height: 4),
                    FittedBox(
                      fit: BoxFit.scaleDown,
                      alignment: Alignment.centerLeft,
                      child: Text(item.value, style: AppTextStyles.currencySmall.copyWith(color: _color(item.tone))),
                    ),
                    if (item.caption != null)
                      Text(item.caption!, style: AppTextStyles.labelSmall.copyWith(color: _color(item.tone))),
                  ],
                ),
              ),
          ],
        ),
      );
}
