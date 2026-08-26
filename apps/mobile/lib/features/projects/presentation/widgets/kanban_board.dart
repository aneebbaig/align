import 'package:flutter/material.dart';

import '../../../../core/theme/app_colors.dart';
import '../../../../core/theme/app_text_styles.dart';
import '../../domain/entities/project_entity.dart';
import 'kanban_card.dart';

/// Mobile kanban: one status column per screen. Swipe (or tap the pills) to
/// switch columns; each column scrolls vertically and reorders with a
/// long-press drag. Moving a task to another status happens via the card's
/// edit sheet (tap a card), since dragging across full-screen pages is awkward.
class KanbanBoard extends StatefulWidget {
  const KanbanBoard({
    super.key,
    required this.columns,
    required this.statusOrder,
    required this.statusLabels,
    required this.onTapTask,
    required this.onReorder,
    required this.onAddTask,
  });

  final Map<String, List<ProjectTaskEntity>> columns;
  final List<String> statusOrder;
  final Map<String, String> statusLabels;
  final void Function(ProjectTaskEntity task) onTapTask;
  final void Function(String status, int oldIndex, int newIndex) onReorder;
  final Future<void> Function(String status, String title) onAddTask;

  @override
  State<KanbanBoard> createState() => _KanbanBoardState();
}

class _KanbanBoardState extends State<KanbanBoard> {
  late final PageController _pager;
  int _page = 0;

  @override
  void initState() {
    super.initState();
    _pager = PageController();
  }

  @override
  void dispose() {
    _pager.dispose();
    super.dispose();
  }

  void _goTo(int i) {
    _pager.animateToPage(i, duration: const Duration(milliseconds: 240), curve: Curves.easeOut);
  }

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        // Column selector pills
        SizedBox(
          height: 40,
          child: ListView.separated(
            scrollDirection: Axis.horizontal,
            padding: const EdgeInsets.symmetric(horizontal: 16),
            itemCount: widget.statusOrder.length,
            separatorBuilder: (_, __) => const SizedBox(width: 8),
            itemBuilder: (_, i) {
              final status = widget.statusOrder[i];
              final count = widget.columns[status]?.length ?? 0;
              final selected = i == _page;
              return GestureDetector(
                onTap: () => _goTo(i),
                child: Container(
                  padding: const EdgeInsets.symmetric(horizontal: 12),
                  alignment: Alignment.center,
                  decoration: BoxDecoration(
                    color: selected ? AppColors.primary.withValues(alpha: 0.15) : Colors.transparent,
                    borderRadius: BorderRadius.circular(20),
                    border: Border.all(
                      color: selected ? AppColors.primary : AppColors.border.withValues(alpha: 0.6),
                    ),
                  ),
                  child: Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Text(
                        widget.statusLabels[status] ?? status,
                        style: AppTextStyles.labelMedium.copyWith(
                          color: selected ? AppColors.primary : AppColors.mutedForeground,
                          fontWeight: selected ? FontWeight.w600 : FontWeight.w400,
                        ),
                      ),
                      const SizedBox(width: 6),
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 1),
                        decoration: BoxDecoration(
                          color: (selected ? AppColors.primary : AppColors.mutedForeground)
                              .withValues(alpha: 0.15),
                          borderRadius: BorderRadius.circular(10),
                        ),
                        child: Text(
                          '$count',
                          style: AppTextStyles.labelSmall.copyWith(
                            color: selected ? AppColors.primary : AppColors.mutedForeground,
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
              );
            },
          ),
        ),
        const SizedBox(height: 4),
        Expanded(
          child: PageView.builder(
            controller: _pager,
            onPageChanged: (i) => setState(() => _page = i),
            itemCount: widget.statusOrder.length,
            itemBuilder: (_, i) {
              final status = widget.statusOrder[i];
              final tasks = widget.columns[status] ?? const [];
              return _KanbanColumnPage(
                status: status,
                tasks: tasks,
                onTapTask: widget.onTapTask,
                onReorder: (oldIndex, newIndex) => widget.onReorder(status, oldIndex, newIndex),
                onAddTask: (title) => widget.onAddTask(status, title),
              );
            },
          ),
        ),
      ],
    );
  }
}

class _KanbanColumnPage extends StatelessWidget {
  const _KanbanColumnPage({
    required this.status,
    required this.tasks,
    required this.onTapTask,
    required this.onReorder,
    required this.onAddTask,
  });

  final String status;
  final List<ProjectTaskEntity> tasks;
  final void Function(ProjectTaskEntity task) onTapTask;
  final void Function(int oldIndex, int newIndex) onReorder;
  final Future<void> Function(String title) onAddTask;

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        Expanded(
          child: tasks.isEmpty
              ? ListView(
                  padding: const EdgeInsets.fromLTRB(16, 24, 16, 12),
                  children: [
                    Center(
                      child: Text(
                        'No tasks here yet.',
                        style: AppTextStyles.bodySmall
                            .copyWith(color: AppColors.mutedForeground.withValues(alpha: 0.7)),
                      ),
                    ),
                  ],
                )
              : ReorderableListView.builder(
                  padding: const EdgeInsets.fromLTRB(16, 8, 16, 12),
                  itemCount: tasks.length,
                  onReorderItem: onReorder,
                  proxyDecorator: (child, index, animation) => Material(
                    color: Colors.transparent,
                    child: child,
                  ),
                  itemBuilder: (_, i) => Padding(
                    key: ValueKey(tasks[i].id),
                    padding: const EdgeInsets.only(bottom: 8),
                    child: KanbanCard(task: tasks[i], onTap: () => onTapTask(tasks[i])),
                  ),
                ),
        ),
        _AddTaskField(onAdd: onAddTask),
      ],
    );
  }
}

class _AddTaskField extends StatefulWidget {
  const _AddTaskField({required this.onAdd});
  final Future<void> Function(String title) onAdd;

  @override
  State<_AddTaskField> createState() => _AddTaskFieldState();
}

class _AddTaskFieldState extends State<_AddTaskField> {
  final _ctrl = TextEditingController();
  final _focus = FocusNode();
  bool _busy = false;

  @override
  void dispose() {
    _ctrl.dispose();
    _focus.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    final title = _ctrl.text.trim();
    if (title.isEmpty) return;
    setState(() => _busy = true);
    _focus.unfocus(); // close the keyboard after adding
    await widget.onAdd(title);
    if (mounted) {
      _ctrl.clear();
      setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.fromLTRB(16, 4, 16, 12),
      child: Row(
        children: [
          Expanded(
            child: TextField(
              controller: _ctrl,
              focusNode: _focus,
              style: AppTextStyles.bodyMedium,
              textCapitalization: TextCapitalization.sentences,
              textInputAction: TextInputAction.done,
              onSubmitted: (_) => _submit(),
              decoration: InputDecoration(
                hintText: 'Add a task…',
                hintStyle: AppTextStyles.bodyMedium.copyWith(color: AppColors.mutedForeground),
                isDense: true,
                filled: true,
                fillColor: AppColors.card,
                contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 12),
                border: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(10),
                  borderSide: BorderSide(color: AppColors.border.withValues(alpha: 0.5)),
                ),
                enabledBorder: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(10),
                  borderSide: BorderSide(color: AppColors.border.withValues(alpha: 0.5)),
                ),
                focusedBorder: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(10),
                  borderSide: const BorderSide(color: AppColors.primary),
                ),
              ),
            ),
          ),
          const SizedBox(width: 8),
          SizedBox(
            width: 44,
            height: 44,
            child: IconButton(
              onPressed: _busy ? null : _submit,
              style: IconButton.styleFrom(
                backgroundColor: AppColors.primary,
                foregroundColor: Colors.black,
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
              ),
              icon: _busy
                  ? const SizedBox(
                      width: 16, height: 16,
                      child: CircularProgressIndicator(strokeWidth: 2, color: Colors.black))
                  : const Icon(Icons.add),
            ),
          ),
        ],
      ),
    );
  }
}
