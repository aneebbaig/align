import 'package:flutter/material.dart';

import '../theme/app_colors.dart';
import '../theme/app_text_styles.dart';

/// The standard bottom sheet: scroll-controlled, lifted above the keyboard.
Future<T?> showAppSheet<T>(BuildContext context, Widget child, {bool safeArea = false}) =>
    showModalBottomSheet<T>(
      context: context,
      isScrollControlled: true,
      backgroundColor: AppColors.popover,
      shape: const RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(16))),
      builder: (_) => Padding(
        padding: EdgeInsets.only(bottom: MediaQuery.of(context).viewInsets.bottom),
        child: safeArea ? SafeArea(child: child) : child,
      ),
    );

/// A cancel / destructive-confirm dialog. Returns true only when confirmed.
Future<bool> confirmDestructive(
  BuildContext context, {
  required String title,
  required String body,
  String confirmLabel = 'Delete',
}) async =>
    await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        backgroundColor: AppColors.card,
        title: Text(title, style: AppTextStyles.bodyLarge),
        content: Text(body, style: AppTextStyles.bodySmall),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx, false), child: const Text('Cancel')),
          TextButton(
            onPressed: () => Navigator.pop(ctx, true),
            child: Text(confirmLabel, style: const TextStyle(color: AppColors.destructive)),
          ),
        ],
      ),
    ) ==
    true;
