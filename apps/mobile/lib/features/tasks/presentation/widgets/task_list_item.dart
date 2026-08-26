import 'package:flutter/material.dart';
import 'package:intl/intl.dart';

import '../../../../../core/theme/app_colors.dart';
import '../../../../../core/theme/app_text_styles.dart';
import '../../../../../core/widgets/app_card.dart';
import '../../domain/entities/task_entity.dart';

class TaskListItem extends StatefulWidget {
  const TaskListItem({
    required this.task,
    required this.onToggle,
    required this.onDelete,
    required this.onEdit,
    this.selectionMode = false,
    this.selected = false,
    this.onToggleSelect,
    this.onLongPress,
    super.key,
  });

  final TaskEntity task;
  final VoidCallback onToggle;
  final VoidCallback onDelete;
  final VoidCallback onEdit;
  final bool selectionMode;
  final bool selected;
  final VoidCallback? onToggleSelect;
  final VoidCallback? onLongPress;

  @override
  State<TaskListItem> createState() => _TaskListItemState();
}

class _TaskListItemState extends State<TaskListItem>
    with SingleTickerProviderStateMixin {
  late final AnimationController _checkCtrl;
  late final Animation<double> _checkScale;
  bool _wasDone = false;

  @override
  void initState() {
    super.initState();
    _wasDone = widget.task.isDone;
    _checkCtrl = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 250),
    );
    _checkScale = TweenSequence([
      TweenSequenceItem(tween: Tween(begin: 1.0, end: 1.35), weight: 40),
      TweenSequenceItem(tween: Tween(begin: 1.35, end: 1.0), weight: 60),
    ]).animate(CurvedAnimation(parent: _checkCtrl, curve: Curves.easeOut));
  }

  @override
  void didUpdateWidget(TaskListItem old) {
    super.didUpdateWidget(old);
    if (widget.task.isDone != _wasDone) {
      _wasDone = widget.task.isDone;
      if (widget.task.isDone) {
        _checkCtrl.forward(from: 0);
      }
    }
  }

  @override
  void dispose() {
    _checkCtrl.dispose();
    super.dispose();
  }

  TaskEntity get task => widget.task;

  Color get _priorityColor => switch (task.priority) {
    'URGENT' => const Color(0xFFEF4444),
    'HIGH' => const Color(0xFFF97316),
    'MEDIUM' => AppColors.primary,
    _ => AppColors.mutedForeground,
  };

  @override
  Widget build(BuildContext context) => AppCard(
    padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
    child: Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        GestureDetector(
          onTap: widget.selectionMode ? widget.onToggleSelect : widget.onToggle,
          onLongPress: widget.selectionMode ? null : widget.onLongPress,
          child: ScaleTransition(
            scale: _checkScale,
            child: Container(
              width: 22,
              height: 22,
              margin: const EdgeInsets.only(top: 1),
              decoration: BoxDecoration(
                shape: widget.selectionMode
                    ? BoxShape.rectangle
                    : BoxShape.circle,
                borderRadius: widget.selectionMode
                    ? BorderRadius.circular(6)
                    : null,
                border: Border.all(
                  color: (widget.selectionMode ? widget.selected : task.isDone)
                      ? AppColors.primary
                      : AppColors.border,
                  width: 1.5,
                ),
                color: (widget.selectionMode ? widget.selected : task.isDone)
                    ? AppColors.primary.withValues(alpha: 0.15)
                    : Colors.transparent,
              ),
              child: (widget.selectionMode ? widget.selected : task.isDone)
                  ? const Icon(Icons.check, size: 13, color: AppColors.primary)
                  : null,
            ),
          ),
        ),
        const SizedBox(width: 12),
        Expanded(
          child: GestureDetector(
            onTap: widget.selectionMode ? widget.onToggleSelect : widget.onEdit,
            onLongPress: widget.selectionMode ? null : widget.onLongPress,
            behavior: HitTestBehavior.opaque,
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    Expanded(
                      child: Text(
                        task.title,
                        style: AppTextStyles.bodyMedium.copyWith(
                          decoration: task.isDone
                              ? TextDecoration.lineThrough
                              : null,
                          color: task.isDone
                              ? AppColors.mutedForeground
                              : AppColors.foreground,
                        ),
                      ),
                    ),
                    Container(
                      width: 6,
                      height: 6,
                      margin: const EdgeInsets.only(left: 8, top: 6),
                      decoration: BoxDecoration(
                        shape: BoxShape.circle,
                        color: _priorityColor,
                      ),
                    ),
                  ],
                ),
                if (task.description != null) ...[
                  const SizedBox(height: 2),
                  Text(
                    task.description!,
                    style: AppTextStyles.bodySmall.copyWith(
                      color: AppColors.mutedForeground,
                    ),
                    maxLines: 2,
                    overflow: TextOverflow.ellipsis,
                  ),
                ],
                if (task.dueDate != null) ...[
                  const SizedBox(height: 4),
                  Row(
                    children: [
                      Icon(
                        Icons.schedule,
                        size: 11,
                        color: _dueDateColor(task.dueDate!),
                      ),
                      const SizedBox(width: 3),
                      Text(
                        _formatDue(task.dueDate!, task.dueTime),
                        style: AppTextStyles.labelSmall.copyWith(
                          color: _dueDateColor(task.dueDate!),
                        ),
                      ),
                    ],
                  ),
                ],
                if (task.category != null) ...[
                  const SizedBox(height: 4),
                  Text(
                    task.category!,
                    style: AppTextStyles.labelSmall.copyWith(
                      color: AppColors.mutedForeground,
                    ),
                  ),
                ],
              ],
            ),
          ),
        ),
        const SizedBox(width: 8),
        if (!widget.selectionMode)
          GestureDetector(
            onTap: widget.onDelete,
            behavior: HitTestBehavior.opaque,
            child: Padding(
              padding: const EdgeInsets.all(4),
              child: Icon(
                Icons.delete_outline,
                size: 16,
                color: AppColors.destructive.withValues(alpha: 0.7),
              ),
            ),
          ),
      ],
    ),
  );

  Color _dueDateColor(DateTime due) {
    final now = DateTime.now();
    final today = DateTime(now.year, now.month, now.day);
    final dueDay = DateTime(due.year, due.month, due.day);
    if (dueDay.isBefore(today)) return AppColors.destructive;
    if (dueDay == today) return AppColors.primary;
    return AppColors.mutedForeground;
  }

  String _formatDue(DateTime due, String? time) {
    final now = DateTime.now();
    final today = DateTime(now.year, now.month, now.day);
    final dueDay = DateTime(due.year, due.month, due.day);

    String label;
    if (dueDay == today) {
      label = 'Today';
    } else if (dueDay == today.add(const Duration(days: 1))) {
      label = 'Tomorrow';
    } else if (dueDay.isBefore(today)) {
      label = 'Overdue · ${DateFormat('d MMM').format(due)}';
    } else {
      label = DateFormat('d MMM').format(due);
    }

    if (time != null && time.isNotEmpty) label += ' · $time';
    return label;
  }
}
