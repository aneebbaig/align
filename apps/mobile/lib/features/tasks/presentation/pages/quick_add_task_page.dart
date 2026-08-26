import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';

import '../../../../core/errors/app_exception.dart';
import '../../../../core/extensions/lucide_ext.dart';
import '../../../../core/services/toast_service.dart';
import '../../../../core/theme/app_colors.dart';
import '../../../../core/theme/app_text_styles.dart';
import '../../../../core/widgets/app_card.dart';
import '../../data/datasources/tasks_datasource.dart';
import '../providers/tasks_provider.dart';

class QuickAddTaskPage extends ConsumerStatefulWidget {
  const QuickAddTaskPage({super.key});

  @override
  ConsumerState<QuickAddTaskPage> createState() => _QuickAddTaskPageState();
}

class _QuickAddTaskPageState extends ConsumerState<QuickAddTaskPage> {
  final _titleCtrl = TextEditingController();
  final _titleFocus = FocusNode();
  String _priority = 'MEDIUM';
  DateTime? _dueDate;
  bool _loading = false;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) => _titleFocus.requestFocus());
  }

  @override
  void dispose() {
    _titleCtrl.dispose();
    _titleFocus.dispose();
    super.dispose();
  }

  void _close() {
    if (Navigator.of(context).canPop()) {
      Navigator.of(context).pop();
    } else {
      context.go('/dashboard');
    }
  }

  bool get _canSubmit => _titleCtrl.text.trim().isNotEmpty;

  Future<void> _pickDate() async {
    _titleFocus.unfocus();
    final picked = await showDatePicker(
      context: context,
      initialDate: _dueDate ?? DateTime.now(),
      firstDate: DateTime.now(),
      lastDate: DateTime(2030),
      builder: (ctx, child) => Theme(
        data: Theme.of(ctx).copyWith(
          colorScheme: const ColorScheme.dark(
            primary: AppColors.primary,
            surface: AppColors.card,
            onSurface: AppColors.foreground,
          ),
        ),
        child: child!,
      ),
    );
    if (picked != null) setState(() => _dueDate = picked);
  }

  Future<void> _submit() async {
    final title = _titleCtrl.text.trim();
    if (title.isEmpty) return;
    _titleFocus.unfocus();
    HapticFeedback.mediumImpact();
    setState(() => _loading = true);

    try {
      await ref.read(tasksDatasourceProvider).createTask(
            title: title,
            priority: _priority,
            dueDate: _dueDate?.toIso8601String().split('T').first,
          );

      if (!mounted) return;
      ref.invalidate(tasksProvider);
      ref.read(toastServiceProvider).success(context, 'Task added');
      HapticFeedback.lightImpact();
      _close();
    } catch (e) {
      if (!mounted) return;
      setState(() => _loading = false);
      final msg = e is AppException ? e.message : 'Failed to add task';
      ref.read(toastServiceProvider).error(context, msg);
    }
  }

  @override
  Widget build(BuildContext context) {
    final creating = _loading;
    final dateLabel = _dueDate != null
        ? DateFormat('EEE, d MMM y').format(_dueDate!)
        : null;

    return Scaffold(
      backgroundColor: AppColors.background,
      resizeToAvoidBottomInset: true,
      appBar: AppBar(
        backgroundColor: AppColors.background,
        elevation: 0,
        title: const Text('Add Task', style: AppTextStyles.headlineSmall),
        leading: IconButton(
          icon: const Icon(Icons.close, color: AppColors.foreground),
          onPressed: () => Navigator.of(context).pop(),
        ),
        actions: [
          Padding(
            padding: const EdgeInsets.only(right: 12),
            child: TextButton(
              onPressed: _canSubmit && !creating ? _submit : null,
              child: creating
                  ? const SizedBox(
                      width: 18,
                      height: 18,
                      child: CircularProgressIndicator(
                        strokeWidth: 2,
                        color: AppColors.primary,
                      ),
                    )
                  : Text(
                      'Add',
                      style: AppTextStyles.labelLarge.copyWith(
                        color: _canSubmit ? AppColors.primary : AppColors.mutedForeground,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
            ),
          ),
        ],
      ),
      body: SingleChildScrollView(
        keyboardDismissBehavior: ScrollViewKeyboardDismissBehavior.onDrag,
        padding: const EdgeInsets.fromLTRB(16, 8, 16, 32),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            TextField(
              controller: _titleCtrl,
              focusNode: _titleFocus,
              style: AppTextStyles.headlineMedium.copyWith(
                color: AppColors.foreground,
                letterSpacing: -0.5,
              ),
              maxLines: null,
              textCapitalization: TextCapitalization.sentences,
              textInputAction: TextInputAction.done,
              onSubmitted: (_) => _submit(),
              decoration: InputDecoration(
                hintText: 'What needs doing?',
                hintStyle: AppTextStyles.headlineMedium.copyWith(
                  color: AppColors.mutedForeground.withValues(alpha: 0.4),
                  letterSpacing: -0.5,
                ),
                border: InputBorder.none,
                enabledBorder: InputBorder.none,
                focusedBorder: InputBorder.none,
                contentPadding: const EdgeInsets.symmetric(vertical: 8),
              ),
              onChanged: (_) => setState(() {}),
            ),

            const SizedBox(height: 12),
            Divider(color: AppColors.border.withValues(alpha: 0.4), height: 1),
            const SizedBox(height: 16),

            Text(
              'Priority',
              style: AppTextStyles.labelMedium.copyWith(color: AppColors.mutedForeground),
            ),
            const SizedBox(height: 8),
            Row(
              children: [
                for (final p in ['LOW', 'MEDIUM', 'HIGH', 'URGENT'])
                  Expanded(
                    child: Padding(
                      padding: const EdgeInsets.only(right: 6),
                      child: _PriorityChip(
                        label: p[0] + p.substring(1).toLowerCase(),
                        selected: _priority == p,
                        color: _priorityColor(p),
                        onTap: () {
                          HapticFeedback.selectionClick();
                          setState(() => _priority = p);
                        },
                      ),
                    ),
                  ),
              ],
            ),

            const SizedBox(height: 16),

            GestureDetector(
              onTap: _pickDate,
              child: Container(
                padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 14),
                decoration: BoxDecoration(
                  color: AppColors.card,
                  borderRadius: BorderRadius.circular(8),
                  border: Border.all(color: AppColors.border.withValues(alpha: 0.5)),
                ),
                child: Row(
                  children: [
                    Icon('CalendarDays'.lucideIcon, size: 16, color: AppColors.mutedForeground),
                    const SizedBox(width: 10),
                    Text(
                      dateLabel ?? 'No due date',
                      style: AppTextStyles.bodyMedium.copyWith(
                        color: dateLabel != null ? AppColors.foreground : AppColors.mutedForeground,
                      ),
                    ),
                    const Spacer(),
                    if (_dueDate != null)
                      GestureDetector(
                        onTap: () => setState(() => _dueDate = null),
                        child: const Icon(Icons.close, size: 16, color: AppColors.mutedForeground),
                      )
                    else
                      Icon('ChevronDown'.lucideIcon, size: 14, color: AppColors.mutedForeground),
                  ],
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Color _priorityColor(String p) => switch (p) {
        'URGENT' => const Color(0xFFEF4444),
        'HIGH' => const Color(0xFFF97316),
        'MEDIUM' => AppColors.primary,
        _ => AppColors.mutedForeground,
      };
}

class _PriorityChip extends StatelessWidget {
  const _PriorityChip({
    required this.label,
    required this.selected,
    required this.color,
    required this.onTap,
  });
  final String label;
  final bool selected;
  final Color color;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) => GestureDetector(
        onTap: onTap,
        child: AppCard(
          padding: const EdgeInsets.symmetric(vertical: 10),
          color: selected ? color.withValues(alpha: 0.15) : null,
          borderColor: selected ? color : null,
          radius: 8,
          child: Center(
            child: Text(
              label,
              style: AppTextStyles.labelMedium.copyWith(
                color: selected ? color : AppColors.mutedForeground,
                fontWeight: selected ? FontWeight.w600 : FontWeight.w400,
              ),
            ),
          ),
        ),
      );
}
