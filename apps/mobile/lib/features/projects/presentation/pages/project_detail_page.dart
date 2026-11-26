import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';

import '../../../../core/errors/app_exception.dart';
import '../../../../core/services/toast_service.dart';
import '../../../../core/theme/app_colors.dart';
import '../../../../core/theme/app_text_styles.dart';
import '../../../../core/widgets/app_card.dart';
import '../../../../core/widgets/app_sheet.dart';
import '../../../../core/widgets/undo_delete.dart';
import '../../data/datasources/projects_datasource.dart';
import '../../data/datasources/tags_datasource.dart';
import '../../domain/entities/project_entity.dart';
import '../providers/projects_provider.dart';
import '../providers/tags_provider.dart';
import '../widgets/kanban_board.dart';
import '../widgets/project_card.dart';
import '../widgets/project_details_sheet.dart';
import '../widgets/project_pickers.dart';
import '../widgets/task_edit_sheet.dart';

const _statusOrder = ['TODO', 'IN_PROGRESS', 'REVIEW', 'DONE'];
const _statusLabels = {
  'TODO': 'To Do',
  'IN_PROGRESS': 'In Progress',
  'REVIEW': 'Review',
  'DONE': 'Done',
};

Map<String, List<ProjectTaskEntity>> _bucket(List<ProjectTaskEntity> tasks) {
  final cols = {for (final s in _statusOrder) s: <ProjectTaskEntity>[]};
  for (final t in tasks) {
    (cols[t.status] ?? cols['TODO']!).add(t);
  }
  return cols;
}

class ProjectDetailPage extends ConsumerStatefulWidget {
  const ProjectDetailPage({super.key, required this.projectId});
  final String projectId;

  @override
  ConsumerState<ProjectDetailPage> createState() => _ProjectDetailPageState();
}

class _ProjectDetailPageState extends ConsumerState<ProjectDetailPage> {
  Map<String, List<ProjectTaskEntity>> _columns = _bucket(const []);
  String? _syncedSignature;

  void _syncColumns(ProjectEntity project) {
    final signature =
        '${project.updatedAt.toIso8601String()}|${project.tasks.map((t) => '${t.id}:${t.status}:${t.order}').join(',')}';
    if (signature == _syncedSignature) return;
    _syncedSignature = signature;
    _columns = _bucket(project.tasks);
  }

  void _refresh() {
    ref.invalidate(projectProvider(widget.projectId));
    ref.invalidate(projectsProvider);
  }

  Future<void> _persistColumn(String status) async {
    final list = _columns[status] ?? const [];
    final updates = [
      for (var i = 0; i < list.length; i++) {'id': list[i].id, 'order': i + 1, 'status': status},
    ];
    if (updates.isEmpty) return;
    try {
      await ref.read(projectsDatasourceProvider).reorderTasks(widget.projectId, updates);
      if (!mounted) return;
      _refresh();
    } catch (e) {
      if (!mounted) return;
      ref.read(toastServiceProvider).error(
          context, e is AppException ? e.message : 'Failed to move task');
      _refresh();
    }
  }

  // newIndex here is already adjusted for the removed item (onReorderItem).
  void _reorder(String status, int oldIndex, int newIndex) {
    HapticFeedback.lightImpact();
    final list = _columns[status];
    if (list == null || oldIndex < 0 || oldIndex >= list.length) return;
    setState(() {
      final item = list.removeAt(oldIndex);
      list.insert(newIndex.clamp(0, list.length), item);
    });
    _persistColumn(status);
  }

  Future<void> _addTask(String status, String title) async {
    try {
      await ref.read(projectsDatasourceProvider).createTask(
            widget.projectId,
            title: title,
            status: status,
          );
      if (!mounted) return;
      _refresh();
    } catch (e) {
      if (!mounted) return;
      ref.read(toastServiceProvider).error(
          context, e is AppException ? e.message : 'Failed to add task');
    }
  }

  Future<void> _openTaskEdit(ProjectTaskEntity task) async {
    await showTaskEditSheet(
      context,
      task: task,
      allTags: ref.read(tagsProvider).asData?.value ?? const [],
      onSave: (changes) async {
        try {
          await ref.read(projectsDatasourceProvider).updateTask(widget.projectId, task.id, changes);
          if (!mounted) return;
          _refresh();
        } catch (e) {
          if (!mounted) return;
          ref.read(toastServiceProvider).error(
              context, e is AppException ? e.message : 'Failed to save task');
        }
      },
      onDelete: () async => _deleteTask(task),
      onCreateTag: (name, color) async {
        try {
          final created = await ref.read(tagsDatasourceProvider).createTag(name: name, color: color);
          ref.invalidate(tagsProvider);
          return created;
        } catch (e) {
          if (!mounted) return null;
          ref.read(toastServiceProvider).error(
              context, e is AppException ? e.message : 'Failed to create tag');
          return null;
        }
      },
      onDeleteTag: (id) async {
        try {
          await ref.read(tagsDatasourceProvider).deleteTag(id);
          ref.invalidate(tagsProvider);
          if (mounted) _refresh();
        } catch (e) {
          if (!mounted) return;
          ref.read(toastServiceProvider).error(
              context, e is AppException ? e.message : 'Failed to delete tag');
        }
      },
    );
  }

  Future<void> _openDetails(ProjectEntity project) async {
    await showProjectDetailsSheet(
      context,
      notes: project.notes,
      links: project.links,
      onSaveNotes: (notes) async {
        await ref.read(projectsDatasourceProvider).updateProject(widget.projectId, {'notes': notes});
        if (mounted) _refresh();
      },
      onSaveLinks: (links) async {
        await ref.read(projectsDatasourceProvider).updateProject(
            widget.projectId, {'links': links.map((l) => l.toJson()).toList()});
        if (mounted) _refresh();
      },
      showError: (ctx, msg) => ref.read(toastServiceProvider).error(ctx, msg),
    );
  }

  /// Hides the task now; the real delete waits for the Undo snackbar to close.
  void _deleteTask(ProjectTaskEntity task) {
    HapticFeedback.mediumImpact();
    final ds = ref.read(projectsDatasourceProvider);
    final container = ProviderScope.containerOf(context);
    final toast = ref.read(toastServiceProvider);
    final ctx = context;
    final projectId = widget.projectId;
    setState(() => _columns[task.status]?.removeWhere((t) => t.id == task.id));
    deferDelete(
      context,
      message: 'Deleted · ${task.title}',
      onUndo: () {
        if (!mounted) return;
        // Rebuild the columns from the server copy, which still has the task.
        setState(() => _syncedSignature = null);
      },
      commit: () async {
        await ds.deleteTask(projectId, task.id);
        container.invalidate(projectProvider(projectId));
        container.invalidate(projectsProvider);
      },
      onError: (e) {
        if (ctx.mounted) toast.error(ctx, e is AppException ? e.message : 'Failed to delete task');
      },
    );
  }

  Future<void> _changeStatus(ProjectEntity project) async {
    final next = await pickProjectStatus(context, project.status);
    if (next == null || next == project.status) return;
    try {
      await ref.read(projectsDatasourceProvider).updateProject(widget.projectId, {'status': next});
      if (!mounted) return;
      _refresh();
    } catch (e) {
      if (!mounted) return;
      ref.read(toastServiceProvider).error(
          context, e is AppException ? e.message : 'Failed to update status');
    }
  }

  Future<void> _editName(ProjectEntity project) async {
    final newName = await askProjectName(context, project.name);
    if (newName == null || newName.isEmpty || newName == project.name) return;
    try {
      await ref.read(projectsDatasourceProvider).updateProject(widget.projectId, {'name': newName});
      if (!mounted) return;
      _refresh();
    } catch (e) {
      if (!mounted) return;
      ref.read(toastServiceProvider).error(
          context, e is AppException ? e.message : 'Failed to rename project');
    }
  }

  Future<void> _deleteProject() async {
    final confirm = await confirmDestructive(
      context,
      title: 'Delete project?',
      body: 'This deletes the project and all its tasks. This cannot be undone.',
    );
    if (!confirm) return;
    try {
      await ref.read(projectsDatasourceProvider).deleteProject(widget.projectId);
      if (!mounted) return;
      ref.invalidate(projectsProvider);
      ref.read(toastServiceProvider).success(context, 'Project deleted');
      context.pop();
    } catch (e) {
      if (!mounted) return;
      ref.read(toastServiceProvider).error(
          context, e is AppException ? e.message : 'Failed to delete project');
    }
  }

  @override
  Widget build(BuildContext context) {
    final projectAsync = ref.watch(projectProvider(widget.projectId));
    ref.watch(tagsProvider); // keep the tag list warm for the task-edit sheet

    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        backgroundColor: AppColors.background,
        elevation: 0,
        title: projectAsync.when(
          data: (project) => Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(project.name,
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: AppTextStyles.headlineSmall),
              if (project.client != null && project.client!.isNotEmpty)
                Text(project.client!,
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: AppTextStyles.labelSmall
                        .copyWith(color: AppColors.mutedForeground)),
            ],
          ),
          loading: () => const Text('Project', style: AppTextStyles.headlineSmall),
          error: (_, __) => const Text('Project', style: AppTextStyles.headlineSmall),
        ),
        actions: [
          IconButton(
            icon: const Icon(Icons.edit_outlined, color: AppColors.mutedForeground),
            tooltip: 'Rename',
            onPressed: projectAsync.hasValue
                ? () => _editName(projectAsync.value!)
                : null,
          ),
          IconButton(
            icon: const Icon(Icons.notes_outlined, color: AppColors.mutedForeground),
            tooltip: 'Details',
            onPressed: projectAsync.hasValue
                ? () => _openDetails(projectAsync.value!)
                : null,
          ),
          IconButton(
            icon: const Icon(Icons.delete_outline, color: AppColors.mutedForeground),
            onPressed: projectAsync.hasValue ? _deleteProject : null,
          ),
        ],
      ),
      body: projectAsync.when(
        loading: () => const Center(
          child: CircularProgressIndicator(color: AppColors.primary, strokeWidth: 2),
        ),
        error: (e, _) => Center(
          child: Text(
            e is AppException ? e.message : 'Failed to load project',
            style: AppTextStyles.bodyMedium.copyWith(color: AppColors.mutedForeground),
          ),
        ),
        data: (project) {
          _syncColumns(project);
          final accent = projectColor(project.color);
          final (statusLabel, statusColor) = projectStatusMeta(project.status);

          return Column(
            children: [
              Padding(
                padding: const EdgeInsets.fromLTRB(16, 8, 16, 16),
                child: AppCard(
                  padding: EdgeInsets.zero,
                  child: IntrinsicHeight(
                    child: Row(
                      crossAxisAlignment: CrossAxisAlignment.stretch,
                      children: [
                        Container(width: 4, color: accent),
                        Expanded(
                          child: Padding(
                            padding: const EdgeInsets.all(16),
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(project.name,
                                    style: AppTextStyles.headlineSmall.copyWith(fontWeight: FontWeight.w700)),
                                if (project.client != null) ...[
                                  const SizedBox(height: 3),
                                  Text(project.client!,
                                      style: AppTextStyles.bodySmall
                                          .copyWith(color: AppColors.mutedForeground)),
                                ],
                                const SizedBox(height: 12),
                                Row(
                                  children: [
                                    GestureDetector(
                                      onTap: () => _changeStatus(project),
                                      child: Container(
                                        padding:
                                            const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
                                        decoration: BoxDecoration(
                                          color: statusColor.withValues(alpha: 0.14),
                                          borderRadius: BorderRadius.circular(6),
                                        ),
                                        child: Row(
                                          mainAxisSize: MainAxisSize.min,
                                          children: [
                                            Text(statusLabel,
                                                style: AppTextStyles.labelSmall.copyWith(
                                                    color: statusColor, fontWeight: FontWeight.w600)),
                                            const SizedBox(width: 4),
                                            Icon(Icons.expand_more, size: 14, color: statusColor),
                                          ],
                                        ),
                                      ),
                                    ),
                                    const Spacer(),
                                    if (project.dueDate != null)
                                      Text(
                                        'Due ${DateFormat('d MMM y').format(project.dueDate!)}',
                                        style: AppTextStyles.labelSmall
                                            .copyWith(color: AppColors.mutedForeground),
                                      ),
                                  ],
                                ),
                                if (project.description != null) ...[
                                  const SizedBox(height: 12),
                                  Text(project.description!,
                                      style: AppTextStyles.bodySmall
                                          .copyWith(color: AppColors.mutedForeground, height: 1.4)),
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
              Expanded(
                child: KanbanBoard(
                  columns: _columns,
                  statusOrder: _statusOrder,
                  statusLabels: _statusLabels,
                  onTapTask: _openTaskEdit,
                  onReorder: _reorder,
                  onAddTask: _addTask,
                ),
              ),
            ],
          );
        },
      ),
    );
  }
}
