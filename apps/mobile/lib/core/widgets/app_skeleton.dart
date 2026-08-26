import 'package:flutter/material.dart';

import '../theme/app_colors.dart';

/// Shimmer-free loading skeleton - uses muted background color, adequate for dark theme.
class AppSkeleton extends StatelessWidget {
  const AppSkeleton({
    this.width,
    this.height = 16,
    this.radius = 6.0,
    super.key,
  });

  final double? width;
  final double height;
  final double radius;

  @override
  Widget build(BuildContext context) => Container(
        width: width,
        height: height,
        decoration: BoxDecoration(
          color: AppColors.muted,
          borderRadius: BorderRadius.circular(radius),
        ),
      );
}

/// Convenience: stack of skeletons for a card-like loading state.
class AppCardSkeleton extends StatelessWidget {
  const AppCardSkeleton({super.key});

  @override
  Widget build(BuildContext context) => Container(
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: AppColors.card,
          border: Border.all(color: AppColors.border),
          borderRadius: BorderRadius.circular(12),
        ),
        child: const Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            AppSkeleton(width: 80, height: 12),
            SizedBox(height: 10),
            AppSkeleton(height: 20),
            SizedBox(height: 8),
            AppSkeleton(width: 140, height: 14),
          ],
        ),
      );
}
