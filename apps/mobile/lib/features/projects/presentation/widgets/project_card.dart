import 'package:flutter/material.dart';
import 'package:intl/intl.dart';

import '../../../../core/theme/app_colors.dart';
import '../../../../core/theme/app_text_styles.dart';
import '../../../../core/widgets/app_card.dart';
import '../../../../core/widgets/app_progress_bar.dart';
import '../../domain/entities/project_entity.dart';

/// Parse a "#RRGGBB" hex string into a Color, falling back to the brand primary.
Color projectColor(String hex) {
  final cleaned = hex.replaceFirst('#', '');
  final value = int.tryParse(cleaned, radix: 16);
  if (value == null) return AppColors.primary;
  return Color(cleaned.length <= 6 ? 0xFF000000 | value : value);
}

(String, Color) projectStatusMeta(String status) => switch (status) {
      'ACTIVE' => ('Active', AppColors.success),
      'ON_HOLD' => ('On Hold', AppColors.warning),
      'COMPLETED' => ('Completed', AppColors.info),
      'CANCELLED' => ('Cancelled', AppColors.destructive),
      _ => (status, AppColors.mutedForeground),
    };

IconData projectTaskStatusIcon(String status) => switch (status) {
      'IN_PROGRESS' => Icons.adjust,
      'REVIEW' => Icons.visibility_outlined,
      'DONE' => Icons.check_circle,
      _ => Icons.circle_outlined,
    };

Color projectTaskStatusColor(String status) => switch (status) {
      'IN_PROGRESS' => AppColors.info,
      'REVIEW' => AppColors.warning,
      'DONE' => AppColors.success,
      _ => AppColors.mutedForeground,
    };

class ProjectCard extends StatelessWidget {
  const ProjectCard({super.key, required this.project, required this.onTap});

  final ProjectEntity project;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final accent = projectColor(project.color);
    final (statusLabel, statusColor) = projectStatusMeta(project.status);
    final overdue = project.dueDate != null &&
        project.isActive &&
        project.dueDate!.isBefore(DateTime.now());

    return AppCard(
      onTap: onTap,
      padding: EdgeInsets.zero,
      child: IntrinsicHeight(
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Container(width: 4, color: accent),
            Expanded(
              child: Padding(
                padding: const EdgeInsets.all(14),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        Expanded(
                          child: Text(
                            project.name,
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                            style: AppTextStyles.bodyMedium.copyWith(fontWeight: FontWeight.w600),
                          ),
                        ),
                        const SizedBox(width: 8),
                        _StatusPill(label: statusLabel, color: statusColor),
                      ],
                    ),
                    if (project.client != null) ...[
                      const SizedBox(height: 2),
                      Text(
                        project.client!,
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        style: AppTextStyles.bodySmall.copyWith(color: AppColors.mutedForeground),
                      ),
                    ],
                    const SizedBox(height: 12),
                    Row(
                      children: [
                        Expanded(
                          child: AppProgressBar(value: project.progress, color: accent),
                        ),
                        const SizedBox(width: 10),
                        Text(
                          '${project.doneCount}/${project.taskCount}',
                          style: AppTextStyles.labelSmall.copyWith(color: AppColors.mutedForeground),
                        ),
                      ],
                    ),
                    if (project.recentTasks.isNotEmpty) ...[
                      const SizedBox(height: 10),
                      ...project.recentTasks.map((t) => Padding(
                            padding: const EdgeInsets.only(bottom: 4),
                            child: Row(
                              children: [
                                Icon(
                                  projectTaskStatusIcon(t.status),
                                  size: 11,
                                  color: projectTaskStatusColor(t.status),
                                ),
                                const SizedBox(width: 6),
                                Expanded(
                                  child: Text(
                                    t.title,
                                    maxLines: 1,
                                    overflow: TextOverflow.ellipsis,
                                    style: AppTextStyles.labelSmall.copyWith(
                                      color: AppColors.mutedForeground,
                                      decoration: t.isDone ? TextDecoration.lineThrough : null,
                                    ),
                                  ),
                                ),
                              ],
                            ),
                          )),
                    ],
                    if (project.dueDate != null) ...[
                      const SizedBox(height: 10),
                      Row(
                        children: [
                          Icon(
                            Icons.event_outlined,
                            size: 13,
                            color: overdue ? AppColors.destructive : AppColors.mutedForeground,
                          ),
                          const SizedBox(width: 5),
                          Text(
                            '${overdue ? 'Overdue · ' : 'Due '}${DateFormat('d MMM y').format(project.dueDate!)}',
                            style: AppTextStyles.labelSmall.copyWith(
                              color: overdue ? AppColors.destructive : AppColors.mutedForeground,
                              fontWeight: overdue ? FontWeight.w600 : FontWeight.w400,
                            ),
                          ),
                        ],
                      ),
                    ],
                  ],
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _StatusPill extends StatelessWidget {
  const _StatusPill({required this.label, required this.color});
  final String label;
  final Color color;

  @override
  Widget build(BuildContext context) => Container(
        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
        decoration: BoxDecoration(
          color: color.withValues(alpha: 0.14),
          borderRadius: BorderRadius.circular(6),
        ),
        child: Text(
          label,
          style: AppTextStyles.labelSmall.copyWith(color: color, fontWeight: FontWeight.w600),
        ),
      );
}
