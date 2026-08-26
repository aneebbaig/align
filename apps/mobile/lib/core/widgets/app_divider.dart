import 'package:flutter/material.dart';

import '../theme/app_colors.dart';

class AppDivider extends StatelessWidget {
  const AppDivider({
    this.indent = 0,
    this.endIndent = 0,
    this.color,
    this.thickness = 1,
    super.key,
  });

  final double indent;
  final double endIndent;
  final Color? color;
  final double thickness;

  @override
  Widget build(BuildContext context) => Divider(
        indent: indent,
        endIndent: endIndent,
        color: color ?? AppColors.border,
        thickness: thickness,
        height: thickness,
      );
}
