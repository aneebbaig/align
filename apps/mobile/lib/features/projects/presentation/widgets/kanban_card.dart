import 'package:flutter/material.dart';
import 'package:intl/intl.dart';

import '../../../../core/theme/app_colors.dart';
import '../../../../core/theme/app_text_styles.dart';
import '../../domain/entities/project_entity.dart';
import 'project_card.dart' show projectColor;

Color kanbanPriorityColor(String p) => switch (p) {
      'URGENT' => const Color(0xFFEF4444),
      'HIGH' => const Color(0xFFF59E0B),
      'MEDIUM' => const Color(0xFF3B82F6),
      _ => const Color(0xFF94A3B8),
    };

class KanbanCard extends StatelessWidget {
  const KanbanCard({
    super.key,
    required this.task,
    this.onTap,
    this.dragging = false,
  });

  final ProjectTaskEntity task;
  final VoidCallback? onTap;
  final bool dragging;

  @override
  Widget build(BuildContext context) {
    final overdue = task.dueDate != null &&
        !task.isDone &&
        task.dueDate!.isBefore(DateTime(
          DateTime.now().year,
          DateTime.now().month,
          DateTime.now().day,
        ));

    return Material(
      color: Colors.transparent,
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(10),
        child: Container(
          decoration: BoxDecoration(
            color: AppColors.card,
            borderRadius: BorderRadius.circular(10),
            border: Border.all(color: AppColors.border.withValues(alpha: 0.6)),
            boxShadow: dragging
                ? [BoxShadow(color: Colors.black.withValues(alpha: 0.25), blurRadius: 12, offset: const Offset(0, 4))]
                : null,
          ),
          child: IntrinsicHeight(
            child: Row(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                Container(
                  width: 3,
                  decoration: BoxDecoration(
                    color: kanbanPriorityColor(task.priority),
                    borderRadius: const BorderRadius.horizontal(left: Radius.circular(10)),
                  ),
                ),
                Expanded(
                  child: Padding(
                    padding: const EdgeInsets.fromLTRB(10, 9, 10, 9),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          task.title,
                          maxLines: 3,
                          overflow: TextOverflow.ellipsis,
                          style: AppTextStyles.bodySmall.copyWith(
                            height: 1.3,
                            decoration: task.isDone ? TextDecoration.lineThrough : null,
                            color: task.isDone ? AppColors.mutedForeground : AppColors.foreground,
                          ),
                        ),
                        if (task.dueDate != null) ...[
                          const SizedBox(height: 7),
                          Container(
                            padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                            decoration: BoxDecoration(
                              color: overdue
                                  ? AppColors.destructive.withValues(alpha: 0.12)
                                  : AppColors.mutedForeground.withValues(alpha: 0.1),
                              borderRadius: BorderRadius.circular(4),
                            ),
                            child: Row(
                              mainAxisSize: MainAxisSize.min,
                              children: [
                                Icon(
                                  Icons.event_outlined,
                                  size: 11,
                                  color: overdue ? AppColors.destructive : AppColors.mutedForeground,
                                ),
                                const SizedBox(width: 4),
                                Text(
                                  DateFormat('d MMM').format(task.dueDate!),
                                  style: AppTextStyles.labelSmall.copyWith(
                                    color: overdue ? AppColors.destructive : AppColors.mutedForeground,
                                    fontWeight: overdue ? FontWeight.w600 : FontWeight.w400,
                                  ),
                                ),
                              ],
                            ),
                          ),
                        ],
                        if (task.tags.isNotEmpty) ...[
                          const SizedBox(height: 7),
                          Wrap(
                            spacing: 4,
                            runSpacing: 4,
                            children: [
                              for (final tag in task.tags)
                                Container(
                                  padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                                  decoration: BoxDecoration(
                                    color: projectColor(tag.color).withValues(alpha: 0.15),
                                    borderRadius: BorderRadius.circular(4),
                                  ),
                                  child: Text(
                                    tag.name,
                                    style: AppTextStyles.labelSmall.copyWith(
                                      color: projectColor(tag.color),
                                      fontWeight: FontWeight.w600,
                                    ),
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
        ),
      ),
    );
  }
}
