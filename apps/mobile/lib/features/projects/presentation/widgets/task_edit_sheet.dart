import 'package:flutter/material.dart';

import '../../../../core/theme/app_colors.dart';
import '../../../../core/theme/app_text_styles.dart';
import '../../../../core/theme/priority_color.dart';
import '../../../../core/widgets/app_sheet.dart';
import '../../../../core/widgets/app_text_field.dart';
import '../../../../core/widgets/due_date_chips.dart';
import '../../domain/entities/project_entity.dart';
import 'project_card.dart' show projectColor;

const _statuses = ['TODO', 'IN_PROGRESS', 'REVIEW', 'DONE'];
const _statusLabels = {'TODO': 'To Do', 'IN_PROGRESS': 'In Progress', 'REVIEW': 'Review', 'DONE': 'Done'};
const _priorities = ['LOW', 'MEDIUM', 'HIGH', 'URGENT'];
const _tagColorPalette = [
  '#6366f1', '#ef4444', '#f59e0b', '#10b981', '#3b82f6', '#a855f7', '#ec4899', '#94a3b8',
];

String _nextTagColor(String current) {
  final i = _tagColorPalette.indexOf(current);
  return _tagColorPalette[(i + 1) % _tagColorPalette.length];
}

/// Shows the task editor. Returns nothing; persistence happens through the
/// callbacks so the page owns the datasource + refresh.
Future<void> showTaskEditSheet(
  BuildContext context, {
  required ProjectTaskEntity task,
  required Future<void> Function(Map<String, dynamic> changes) onSave,
  required Future<void> Function() onDelete,
  List<TagEntity> allTags = const [],
  Future<TagEntity?> Function(String name, String color)? onCreateTag,
  Future<void> Function(String id)? onDeleteTag,
}) {
  return showAppSheet<void>(
    context,
    _TaskEditSheet(
      task: task,
      onSave: onSave,
      onDelete: onDelete,
      allTags: allTags,
      onCreateTag: onCreateTag,
      onDeleteTag: onDeleteTag,
    ),
  );
}

class _TaskEditSheet extends StatefulWidget {
  const _TaskEditSheet({
    required this.task,
    required this.onSave,
    required this.onDelete,
    required this.allTags,
    this.onCreateTag,
    this.onDeleteTag,
  });

  final ProjectTaskEntity task;
  final Future<void> Function(Map<String, dynamic> changes) onSave;
  final Future<void> Function() onDelete;
  final List<TagEntity> allTags;
  final Future<TagEntity?> Function(String name, String color)? onCreateTag;
  final Future<void> Function(String id)? onDeleteTag;

  @override
  State<_TaskEditSheet> createState() => _TaskEditSheetState();
}

class _TaskEditSheetState extends State<_TaskEditSheet> {
  late final TextEditingController _title;
  late final TextEditingController _description;
  late final TextEditingController _newTag;
  late String _status;
  late String _priority;
  DateTime? _dueDate;
  bool _saving = false;
  late List<TagEntity> _availableTags;
  late Set<String> _selectedTagIds;
  String _newTagColor = '#6366f1';
  bool _creatingTag = false;

  @override
  void initState() {
    super.initState();
    _title = TextEditingController(text: widget.task.title);
    _description = TextEditingController(text: widget.task.description ?? '');
    _newTag = TextEditingController();
    _status = widget.task.status;
    _priority = widget.task.priority;
    _dueDate = widget.task.dueDate;
    _availableTags = [...widget.allTags];
    _selectedTagIds = widget.task.tags.map((t) => t.id).toSet();
  }

  @override
  void dispose() {
    _title.dispose();
    _description.dispose();
    _newTag.dispose();
    super.dispose();
  }

  bool get _dirty {
    final t = widget.task;
    final desc = _description.text.trim();
    return _title.text.trim() != t.title ||
        desc != (t.description ?? '') ||
        _status != t.status ||
        _priority != t.priority ||
        _dueDate != t.dueDate ||
        !_selectedTagIds.containsAll(t.tags.map((x) => x.id)) ||
        _selectedTagIds.length != t.tags.length;
  }

  Future<bool> _confirm(String title, String body, String action) =>
      confirmDestructive(context, title: title, body: body, confirmLabel: action);

  Future<void> _save() async {
    final title = _title.text.trim();
    if (title.isEmpty) return;
    setState(() => _saving = true);
    await widget.onSave({
      'title': title,
      'description': _description.text.trim().isEmpty ? null : _description.text.trim(),
      'status': _status,
      'priority': _priority,
      'dueDate': _dueDate?.toIso8601String(),
      'tagIds': _selectedTagIds.toList(),
    });
    if (mounted) Navigator.pop(context);
  }

  Future<void> _createTag() async {
    final name = _newTag.text.trim();
    if (name.isEmpty || widget.onCreateTag == null) return;
    setState(() => _creatingTag = true);
    final created = await widget.onCreateTag!(name, _newTagColor);
    if (mounted) {
      setState(() {
        _creatingTag = false;
        if (created != null) {
          _availableTags = [..._availableTags, created];
          _selectedTagIds = {..._selectedTagIds, created.id};
          _newTag.clear();
        }
      });
    }
  }

  Future<void> _deleteTag(String id) async {
    if (widget.onDeleteTag == null) return;
    await widget.onDeleteTag!(id);
    if (mounted) {
      setState(() {
        _availableTags = _availableTags.where((t) => t.id != id).toList();
        _selectedTagIds = {..._selectedTagIds}..remove(id);
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    return PopScope(
      canPop: !_dirty || _saving,
      onPopInvokedWithResult: (didPop, _) async {
        if (didPop) return;
        final discard = await _confirm(
            'Discard changes?', 'Your edits to this task will be lost.', 'Discard');
        if (!discard) return;
        if (!context.mounted) return;
        Navigator.pop(context);
      },
      child: SafeArea(
      child: SingleChildScrollView(
        padding: const EdgeInsets.fromLTRB(20, 12, 20, 20),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Center(
              child: Container(
                width: 36,
                height: 4,
                margin: const EdgeInsets.only(bottom: 16),
                decoration: BoxDecoration(
                  color: AppColors.border,
                  borderRadius: BorderRadius.circular(2),
                ),
              ),
            ),
            _label('Title'),
            AppTextField(
              controller: _title,
              hint: 'Task title',
              dense: true,
              textCapitalization: TextCapitalization.sentences,
            ),
            const SizedBox(height: 16),
            _label('Details'),
            AppTextField(
              controller: _description,
              hint: 'Notes, links, acceptance criteria…',
              dense: true,
              maxLines: 3,
              textCapitalization: TextCapitalization.sentences,
            ),
            const SizedBox(height: 16),
            _label('Status'),
            Wrap(
              spacing: 8,
              runSpacing: 8,
              children: [
                for (final s in _statuses)
                  _chip(
                    label: _statusLabels[s]!,
                    selected: _status == s,
                    onTap: () => setState(() => _status = s),
                  ),
              ],
            ),
            const SizedBox(height: 16),
            _label('Priority'),
            Wrap(
              spacing: 8,
              runSpacing: 8,
              children: [
                for (final p in _priorities)
                  _chip(
                    label: p[0] + p.substring(1).toLowerCase(),
                    selected: _priority == p,
                    dotColor: priorityColor(p),
                    onTap: () => setState(() => _priority = p),
                  ),
              ],
            ),
            const SizedBox(height: 16),
            _label('Tags'),
            Wrap(
              spacing: 8,
              runSpacing: 8,
              children: [
                for (final tag in _availableTags)
                  GestureDetector(
                    onLongPress: () => _deleteTag(tag.id),
                    child: _chip(
                      label: tag.name,
                      selected: _selectedTagIds.contains(tag.id),
                      dotColor: projectColor(tag.color),
                      onTap: () => setState(() {
                        _selectedTagIds.contains(tag.id) ? _selectedTagIds.remove(tag.id) : _selectedTagIds.add(tag.id);
                      }),
                    ),
                  ),
              ],
            ),
            if (widget.onCreateTag != null) ...[
              const SizedBox(height: 8),
              Row(
                children: [
                  GestureDetector(
                    onTap: () => setState(() => _newTagColor = _nextTagColor(_newTagColor)),
                    child: Container(
                      width: 28,
                      height: 28,
                      decoration: BoxDecoration(
                        color: projectColor(_newTagColor),
                        shape: BoxShape.circle,
                        border: Border.all(color: AppColors.border.withValues(alpha: 0.5)),
                      ),
                    ),
                  ),
                  const SizedBox(width: 8),
                  Expanded(
                    child: AppTextField(
                      controller: _newTag,
                      hint: 'New tag',
                      dense: true,
                      textCapitalization: TextCapitalization.sentences,
                      onSubmitted: (_) => _createTag(),
                    ),
                  ),
                  const SizedBox(width: 8),
                  IconButton(
                    onPressed: _creatingTag ? null : _createTag,
                    icon: _creatingTag
                        ? const SizedBox(
                            width: 16, height: 16,
                            child: CircularProgressIndicator(strokeWidth: 2, color: AppColors.primary))
                        : const Icon(Icons.add, size: 20, color: AppColors.primary),
                  ),
                ],
              ),
              Text(
                'Long-press a tag to delete it.',
                style: AppTextStyles.labelSmall.copyWith(color: AppColors.mutedForeground),
              ),
            ],
            const SizedBox(height: 16),
            _label('Due date'),
            DueDateChips(value: _dueDate, onChanged: (d) => setState(() => _dueDate = d)),
            const SizedBox(height: 24),
            SizedBox(
              width: double.infinity,
              child: FilledButton(
                onPressed: _saving ? null : _save,
                style: FilledButton.styleFrom(
                  backgroundColor: AppColors.primary,
                  foregroundColor: Colors.black,
                  padding: const EdgeInsets.symmetric(vertical: 14),
                ),
                child: _saving
                    ? const SizedBox(
                        width: 18, height: 18,
                        child: CircularProgressIndicator(strokeWidth: 2, color: Colors.black))
                    : const Text('Save'),
              ),
            ),
            const SizedBox(height: 8),
            SizedBox(
              width: double.infinity,
              child: TextButton.icon(
                // No dialog: the page deletes it after an Undo snackbar.
                onPressed: () async {
                  Navigator.pop(context);
                  await widget.onDelete();
                },
                icon: const Icon(Icons.delete_outline, size: 18, color: AppColors.destructive),
                label: Text('Delete task',
                    style: AppTextStyles.bodyMedium.copyWith(color: AppColors.destructive)),
              ),
            ),
          ],
        ),
      ),
    ),
    );
  }

  Widget _label(String text) => Padding(
        padding: const EdgeInsets.only(bottom: 6),
        child: Text(text,
            style: AppTextStyles.labelMedium
                .copyWith(color: AppColors.mutedForeground, fontWeight: FontWeight.w600)),
      );

  Widget _chip({
    required String label,
    required bool selected,
    required VoidCallback onTap,
    Color? dotColor,
  }) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
        decoration: BoxDecoration(
          color: selected ? AppColors.primary.withValues(alpha: 0.15) : AppColors.background,
          borderRadius: BorderRadius.circular(8),
          border: Border.all(
            color: selected ? AppColors.primary : AppColors.border.withValues(alpha: 0.5),
          ),
        ),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            if (dotColor != null) ...[
              Container(width: 7, height: 7, decoration: BoxDecoration(color: dotColor, shape: BoxShape.circle)),
              const SizedBox(width: 6),
            ],
            Text(
              label,
              style: AppTextStyles.labelMedium.copyWith(
                color: selected ? AppColors.primary : AppColors.foreground,
                fontWeight: selected ? FontWeight.w600 : FontWeight.w400,
              ),
            ),
          ],
        ),
      ),
    );
  }
}
