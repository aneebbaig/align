import 'package:flutter/material.dart';

import '../theme/app_colors.dart';
import '../theme/app_text_styles.dart';

/// Swipe-to-delete with Undo: the row is hidden by the caller right away, and
/// [commit] (the real API delete) only runs once the snackbar has closed
/// without Undo being pressed. [onUndo] brings the row back.
void deferDelete(
  BuildContext context, {
  required String message,
  required Future<void> Function() commit,
  required VoidCallback onUndo,
  void Function(Object error)? onError,
}) {
  final messenger = ScaffoldMessenger.of(context);
  messenger.hideCurrentSnackBar();
  messenger
      .showSnackBar(SnackBar(
        content: Text(message, style: AppTextStyles.bodyMedium),
        backgroundColor: AppColors.popover,
        duration: const Duration(seconds: 4),
        behavior: SnackBarBehavior.floating,
        action: SnackBarAction(label: 'Undo', textColor: AppColors.primary, onPressed: onUndo),
      ))
      .closed
      .then((reason) async {
    if (reason == SnackBarClosedReason.action) return;
    try {
      await commit();
    } catch (e) {
      onUndo();
      onError?.call(e);
    }
  });
}

/// Red delete background for a swipe-left [Dismissible].
class SwipeBackground extends StatelessWidget {
  const SwipeBackground({required this.alignment, required this.color, required this.icon, super.key});
  final Alignment alignment;
  final Color color;
  final IconData icon;

  @override
  Widget build(BuildContext context) => Container(
        alignment: alignment,
        padding: const EdgeInsets.symmetric(horizontal: 20),
        color: color.withValues(alpha: 0.2),
        child: Icon(icon, color: color),
      );
}
