import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../../core/errors/app_exception.dart';
import '../../../../core/services/toast_service.dart';
import '../../../../core/theme/app_colors.dart';
import '../../../../core/theme/app_text_styles.dart';
import '../../../../core/widgets/app_empty_state.dart';
import '../../data/datasources/tasks_datasource.dart';
import '../../domain/entities/task_entity.dart';
import '../providers/tasks_provider.dart';
import '../widgets/edit_task_sheet.dart';
import '../widgets/task_list_item.dart';

class TasksPage extends ConsumerStatefulWidget {
  const TasksPage({super.key});

  @override
  ConsumerState<TasksPage> createState() => _TasksPageState();
}

class _TasksPageState extends ConsumerState<TasksPage>
    with SingleTickerProviderStateMixin {
  static const _statuses = ['PENDING', 'IN_PROGRESS', 'DONE', 'SKIPPED'];

  late final TabController _tabs;
  final Map<String, TaskEntity> _optimistic = {};
  final Set<String> _selectedIds = {};

  bool get _selectionMode => _selectedIds.isNotEmpty;

  @override
  void initState() {
    super.initState();
    _tabs = TabController(length: 2, vsync: this, initialIndex: 1);
  }

  @override
  void dispose() {
    _tabs.dispose();
    super.dispose();
  }

  TaskEntity _resolve(TaskEntity task) => _optimistic[task.id] ?? task;

  void _startSelection(TaskEntity task) {
    HapticFeedback.mediumImpact();
    setState(() => _selectedIds.add(task.id));
  }

  void _toggleSelect(TaskEntity task) {
    HapticFeedback.selectionClick();
    setState(() {
      if (!_selectedIds.remove(task.id)) _selectedIds.add(task.id);
    });
  }

  void _clearSelection() => setState(_selectedIds.clear);

  Future<void> _bulkSetStatus(String status) async {
    final ids = _selectedIds.toList();
    _clearSelection();
    try {
      await Future.wait(
        ids.map(
          (id) =>
              ref.read(tasksDatasourceProvider).updateTaskStatus(id, status),
        ),
      );
      if (!mounted) return;
      ref.invalidate(tasksProvider);
    } catch (e) {
      if (!mounted) return;
      final msg = e is AppException ? e.message : 'Failed to update tasks';
      ref.read(toastServiceProvider).error(context, msg);
    }
  }

  Future<void> _toggleDone(TaskEntity task) async {
    HapticFeedback.lightImpact();
    final resolved = _resolve(task);
    final newStatus = resolved.isDone ? 'PENDING' : 'DONE';
    final optimistic = resolved.copyWith(status: newStatus);
    setState(() => _optimistic[task.id] = optimistic);
    try {
      await ref
          .read(tasksDatasourceProvider)
          .updateTaskStatus(task.id, newStatus);
      if (!mounted) return;
      ref.invalidate(tasksProvider);
      // optimistic entry cleaned up in data() when real status matches
    } catch (e) {
      if (!mounted) return;
      setState(() => _optimistic.remove(task.id));
      final msg = e is AppException ? e.message : 'Failed to update task';
      ref.read(toastServiceProvider).error(context, msg);
    }
  }

  Future<void> _delete(TaskEntity task) async {
    HapticFeedback.mediumImpact();
    try {
      await ref.read(tasksDatasourceProvider).deleteTask(task.id);
      if (!mounted) return;
      ref.invalidate(tasksProvider);
      ref.read(toastServiceProvider).success(context, 'Task deleted');
    } catch (e) {
      if (!mounted) return;
      final msg = e is AppException ? e.message : 'Failed to delete task';
      ref.read(toastServiceProvider).error(context, msg);
    }
  }

  Future<void> _edit(TaskEntity task) async {
    await showEditTaskSheet(
      context,
      task: task,
      onSave: (changes) async {
        try {
          await ref.read(tasksDatasourceProvider).updateTask(task.id, changes);
          if (!mounted) return;
          ref.invalidate(tasksProvider);
        } catch (e) {
          if (!mounted) return;
          final msg = e is AppException ? e.message : 'Failed to save task';
          ref.read(toastServiceProvider).error(context, msg);
        }
      },
    );
  }

  @override
  Widget build(BuildContext context) {
    final tasksAsync = ref.watch(tasksProvider);

    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        backgroundColor: AppColors.background,
        elevation: 0,
        leading: _selectionMode
            ? IconButton(
                icon: const Icon(Icons.close),
                onPressed: _clearSelection,
              )
            : null,
        title: Text(
          _selectionMode ? '${_selectedIds.length} selected' : 'Tasks',
          style: AppTextStyles.headlineSmall,
        ),
        bottom: TabBar(
          controller: _tabs,
          labelColor: AppColors.primary,
          unselectedLabelColor: AppColors.mutedForeground,
          indicatorColor: AppColors.primary,
          indicatorSize: TabBarIndicatorSize.label,
          labelStyle: AppTextStyles.labelMedium.copyWith(
            fontWeight: FontWeight.w600,
          ),
          unselectedLabelStyle: AppTextStyles.labelMedium,
          tabs: const [
            Tab(text: 'Daily'),
            Tab(text: 'One-Time'),
          ],
        ),
      ),
      floatingActionButton: _selectionMode
          ? null
          : FloatingActionButton(
              backgroundColor: AppColors.primary,
              foregroundColor: Colors.black,
              onPressed: () => context.push('/quick-add-task'),
              child: const Icon(Icons.add),
            ),
      bottomNavigationBar: _selectionMode ? _buildBulkBar() : null,
      body: tasksAsync.when(
        loading: () => const Center(
          child: CircularProgressIndicator(
            color: AppColors.primary,
            strokeWidth: 2,
          ),
        ),
        error: (e, _) => Center(
          child: Text(
            e is AppException ? e.message : 'Failed to load tasks',
            style: AppTextStyles.bodyMedium.copyWith(
              color: AppColors.mutedForeground,
            ),
          ),
        ),
        data: (all) {
          // Clean up stale optimistic entries when real data matches
          WidgetsBinding.instance.addPostFrameCallback((_) {
            if (!mounted) return;
            var dirty = false;
            for (final t in all) {
              final opt = _optimistic[t.id];
              if (opt != null && opt.status == t.status) {
                _optimistic.remove(t.id);
                dirty = true;
              }
            }
            if (dirty && mounted) setState(() {});
          });
          final resolved = all.map(_resolve).toList();
          final daily = resolved.where((t) => t.isDaily).toList();
          final oneTime = resolved.where((t) => t.isOneTime).toList();

          return TabBarView(
            controller: _tabs,
            children: [
              _TaskTab(
                tasks: daily,
                emptyTitle: 'No daily tasks',
                emptySubtitle:
                    'Daily tasks repeat every day - habits, reviews, routines.',
                onToggle: _toggleDone,
                onDelete: _delete,
                onEdit: _edit,
                selectedIds: _selectedIds,
                onLongPress: _startSelection,
                onToggleSelect: _toggleSelect,
              ),
              _TaskTab(
                tasks: oneTime,
                emptyTitle: 'Nothing to do',
                emptySubtitle: 'Tap + to add a task.',
                onToggle: _toggleDone,
                onDelete: _delete,
                onEdit: _edit,
                groupDone: true,
                selectedIds: _selectedIds,
                onLongPress: _startSelection,
                onToggleSelect: _toggleSelect,
              ),
            ],
          );
        },
      ),
    );
  }

  Widget _buildBulkBar() {
    return SafeArea(
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
        decoration: const BoxDecoration(
          color: AppColors.card,
          border: Border(top: BorderSide(color: AppColors.border)),
        ),
        child: Wrap(
          spacing: 8,
          runSpacing: 8,
          alignment: WrapAlignment.center,
          children: [
            for (final status in _statuses)
              OutlinedButton(
                onPressed: () => _bulkSetStatus(status),
                style: OutlinedButton.styleFrom(
                  foregroundColor: AppColors.foreground,
                  side: const BorderSide(color: AppColors.border),
                ),
                child: Text(
                  status[0] +
                      status.substring(1).toLowerCase().replaceAll('_', ' '),
                ),
              ),
          ],
        ),
      ),
    );
  }
}

class _TaskTab extends StatelessWidget {
  const _TaskTab({
    required this.tasks,
    required this.emptyTitle,
    required this.emptySubtitle,
    required this.onToggle,
    required this.onDelete,
    required this.onEdit,
    required this.selectedIds,
    required this.onLongPress,
    required this.onToggleSelect,
    this.groupDone = false,
  });

  final List<TaskEntity> tasks;
  final String emptyTitle;
  final String emptySubtitle;
  final Future<void> Function(TaskEntity) onToggle;
  final Future<void> Function(TaskEntity) onDelete;
  final Future<void> Function(TaskEntity) onEdit;
  final Set<String> selectedIds;
  final void Function(TaskEntity) onLongPress;
  final void Function(TaskEntity) onToggleSelect;
  final bool groupDone;

  @override
  Widget build(BuildContext context) {
    if (tasks.isEmpty) {
      return Center(
        child: AppEmptyState(
          icon: Icons.checklist_rounded,
          title: emptyTitle,
          subtitle: emptySubtitle,
        ),
      );
    }

    if (!groupDone) {
      return RefreshIndicator(
        color: AppColors.primary,
        backgroundColor: AppColors.card,
        onRefresh: () async {},
        child: ListView.separated(
          padding: const EdgeInsets.fromLTRB(16, 12, 16, 100),
          itemCount: tasks.length,
          separatorBuilder: (_, __) => const SizedBox(height: 8),
          itemBuilder: (_, i) => TaskListItem(
            task: tasks[i],
            onToggle: () => onToggle(tasks[i]),
            onDelete: () => onDelete(tasks[i]),
            onEdit: () => onEdit(tasks[i]),
            selectionMode: selectedIds.isNotEmpty,
            selected: selectedIds.contains(tasks[i].id),
            onToggleSelect: () => onToggleSelect(tasks[i]),
            onLongPress: () => onLongPress(tasks[i]),
          ),
        ),
      );
    }

    final pending = tasks.where((t) => !t.isDone).toList();
    final done = tasks.where((t) => t.isDone).toList();

    return RefreshIndicator(
      color: AppColors.primary,
      backgroundColor: AppColors.card,
      onRefresh: () async {},
      child: ListView(
        padding: const EdgeInsets.fromLTRB(16, 12, 16, 100),
        children: [
          if (pending.isNotEmpty) ...[
            ...pending.map(
              (t) => Padding(
                padding: const EdgeInsets.only(bottom: 8),
                child: TaskListItem(
                  task: t,
                  onToggle: () => onToggle(t),
                  onDelete: () => onDelete(t),
                  onEdit: () => onEdit(t),
                  selectionMode: selectedIds.isNotEmpty,
                  selected: selectedIds.contains(t.id),
                  onToggleSelect: () => onToggleSelect(t),
                  onLongPress: () => onLongPress(t),
                ),
              ),
            ),
          ],
          if (done.isNotEmpty) ...[
            if (pending.isNotEmpty) const SizedBox(height: 8),
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 2, vertical: 4),
              child: Text(
                'Completed',
                style: AppTextStyles.labelSmall.copyWith(
                  color: AppColors.mutedForeground,
                  letterSpacing: 0.5,
                ),
              ),
            ),
            ...done.map(
              (t) => Padding(
                padding: const EdgeInsets.only(bottom: 8),
                child: Opacity(
                  opacity: 0.5,
                  child: TaskListItem(
                    task: t,
                    onToggle: () => onToggle(t),
                    onDelete: () => onDelete(t),
                    onEdit: () => onEdit(t),
                    selectionMode: selectedIds.isNotEmpty,
                    selected: selectedIds.contains(t.id),
                    onToggleSelect: () => onToggleSelect(t),
                    onLongPress: () => onLongPress(t),
                  ),
                ),
              ),
            ),
          ],
        ],
      ),
    );
  }
}
