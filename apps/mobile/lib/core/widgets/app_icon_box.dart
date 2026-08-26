import 'package:flutter/material.dart';

import '../theme/app_colors.dart';

/// Rounded container for emoji icons or IconData - used in transaction rows, category chips, etc.
class AppIconBox extends StatelessWidget {
  const AppIconBox({
    this.emoji,
    this.icon,
    this.size = 36,
    this.iconSize,
    this.color,
    this.borderColor,
    this.radius = 10.0,
    super.key,
  }) : assert(emoji != null || icon != null, 'provide emoji or icon');

  final String? emoji;
  final IconData? icon;
  final double size;
  final double? iconSize;
  final Color? color;
  final Color? borderColor;
  final double radius;

  @override
  Widget build(BuildContext context) => Container(
        width: size,
        height: size,
        decoration: BoxDecoration(
          color: color ?? AppColors.card,
          border: Border.all(color: borderColor ?? AppColors.border),
          borderRadius: BorderRadius.circular(radius),
        ),
        alignment: Alignment.center,
        child: emoji != null
            ? Text(emoji!, style: TextStyle(fontSize: (iconSize ?? size * 0.5)))
            : Icon(icon, size: iconSize ?? size * 0.5, color: AppColors.foreground),
      );
}
