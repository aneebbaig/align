import 'package:flutter/material.dart';

import '../theme/app_colors.dart';

class AppProgressBar extends StatelessWidget {
  const AppProgressBar({
    required this.value,
    this.color,
    this.backgroundColor,
    this.height = 6.0,
    this.radius = 4.0,
    super.key,
  });

  /// 0.0 - 1.0 (clamped).
  final double value;
  final Color? color;
  final Color? backgroundColor;
  final double height;
  final double radius;

  @override
  Widget build(BuildContext context) => ClipRRect(
        borderRadius: BorderRadius.circular(radius),
        child: LinearProgressIndicator(
          value: value.clamp(0.0, 1.0),
          minHeight: height,
          backgroundColor: backgroundColor ?? AppColors.border,
          valueColor: AlwaysStoppedAnimation(color ?? AppColors.primary),
        ),
      );
}
