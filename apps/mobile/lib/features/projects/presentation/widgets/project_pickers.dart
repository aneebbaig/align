import 'package:flutter/material.dart';

import '../../../../core/theme/app_colors.dart';
import '../../../../core/theme/app_text_styles.dart';
import 'project_card.dart';

/// Bottom sheet listing the project statuses; resolves to the one tapped.
Future<String?> pickProjectStatus(BuildContext context, String current) =>
    showModalBottomSheet<String>(
      context: context,
      backgroundColor: AppColors.card,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(16)),
      ),
      builder: (ctx) => SafeArea(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            for (final s in ['ACTIVE', 'ON_HOLD', 'COMPLETED', 'CANCELLED'])
              ListTile(
                title: Text(projectStatusMeta(s).$1, style: AppTextStyles.bodyMedium),
                trailing: current == s
                    ? const Icon(Icons.check, color: AppColors.primary, size: 18)
                    : null,
                onTap: () => Navigator.pop(ctx, s),
              ),
          ],
        ),
      ),
    );

/// Rename dialog; resolves to the trimmed text, or null when cancelled.
Future<String?> askProjectName(BuildContext context, String current) async {
  final controller = TextEditingController(text: current);
  final newName = await showDialog<String>(
    context: context,
    builder: (ctx) => AlertDialog(
      backgroundColor: AppColors.card,
      title: Text(
        'Rename project',
        style: AppTextStyles.bodyMedium.copyWith(fontWeight: FontWeight.w600),
      ),
      content: TextField(
        controller: controller,
        autofocus: true,
        style: AppTextStyles.bodyMedium,
        textCapitalization: TextCapitalization.sentences,
        decoration: const InputDecoration(hintText: 'Project name'),
        onSubmitted: (v) => Navigator.pop(ctx, v.trim()),
      ),
      actions: [
        TextButton(
          onPressed: () => Navigator.pop(ctx),
          child: Text(
            'Cancel',
            style: AppTextStyles.bodySmall.copyWith(color: AppColors.mutedForeground),
          ),
        ),
        TextButton(
          onPressed: () => Navigator.pop(ctx, controller.text.trim()),
          child: Text(
            'Save',
            style: AppTextStyles.bodySmall.copyWith(
              color: AppColors.primary,
              fontWeight: FontWeight.w600,
            ),
          ),
        ),
      ],
    ),
  );
  controller.dispose();
  return newName;
}
