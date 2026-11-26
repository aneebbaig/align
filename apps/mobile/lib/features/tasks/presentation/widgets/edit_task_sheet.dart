import 'package:flutter/material.dart';

import '../../../../core/theme/app_colors.dart';
import '../../../../core/theme/app_text_styles.dart';
import '../../../../core/theme/priority_color.dart';
import '../../../../core/widgets/app_sheet.dart';
import '../../../../core/widgets/app_text_field.dart';
import '../../../../core/widgets/due_date_chips.dart';
import '../../domain/entities/task_entity.dart';

const _priorities = ['LOW', 'MEDIUM', 'HIGH', 'URGENT'];

/// Edit sheet for a personal task. Persistence is handled by [onSave] so the
/// page owns the datasource + refresh.
Future<void> showEditTaskSheet(
  BuildContext context, {
  required TaskEntity task,
  required Future<void> Function(Map<String, dynamic> changes) onSave,
}) {
  return showAppSheet<void>(context, _EditTaskSheet(task: task, onSave: onSave));
}

class _EditTaskSheet extends StatefulWidget {
  const _EditTaskSheet({required this.task, required this.onSave});
  final TaskEntity task;
  final Future<void> Function(Map<String, dynamic> changes) onSave;

  @override
  State<_EditTaskSheet> createState() => _EditTaskSheetState();
}

class _EditTaskSheetState extends State<_EditTaskSheet> {
  late final TextEditingController _title;
  late final TextEditingController _description;
  late String _priority;
  DateTime? _dueDate;
  bool _saving = false;

  @override
  void initState() {
    super.initState();
    _title = TextEditingController(text: widget.task.title);
    _description = TextEditingController(text: widget.task.description ?? '');
    _priority = widget.task.priority;
    _dueDate = widget.task.dueDate;
  }

  @override
  void dispose() {
    _title.dispose();
    _description.dispose();
    super.dispose();
  }

  Future<void> _save() async {
    final title = _title.text.trim();
    if (title.isEmpty) return;
    setState(() => _saving = true);
    await widget.onSave({
      'title': title,
      'description': _description.text.trim().isEmpty ? null : _description.text.trim(),
      'priority': _priority,
      'dueDate': _dueDate?.toIso8601String().split('T').first,
    });
    if (mounted) Navigator.pop(context);
  }

  @override
  Widget build(BuildContext context) {
    return SafeArea(
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
                decoration: BoxDecoration(color: AppColors.border, borderRadius: BorderRadius.circular(2)),
              ),
            ),
            Text('Edit task', style: AppTextStyles.headlineSmall.copyWith(fontWeight: FontWeight.w700)),
            const SizedBox(height: 16),
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
              hint: 'Notes, links…',
              dense: true,
              maxLines: 3,
              textCapitalization: TextCapitalization.sentences,
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
          ],
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
          color: selected ? AppColors.primary.withValues(alpha: 0.15) : AppColors.card,
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
