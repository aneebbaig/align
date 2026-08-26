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
import '../../../../core/widgets/app_text_field.dart';
import '../../data/datasources/projects_datasource.dart';
import '../providers/projects_provider.dart';

const _projectColors = [
  '#6366F1', '#8B5CF6', '#EC4899', '#EF4444',
  '#F59E0B', '#10B981', '#06B6D4', '#3B82F6',
];

Color _hex(String h) => Color(0xFF000000 | int.parse(h.replaceFirst('#', ''), radix: 16));

class QuickAddProjectPage extends ConsumerStatefulWidget {
  const QuickAddProjectPage({super.key});

  @override
  ConsumerState<QuickAddProjectPage> createState() => _QuickAddProjectPageState();
}

class _QuickAddProjectPageState extends ConsumerState<QuickAddProjectPage> {
  final _nameCtrl = TextEditingController();
  final _clientCtrl = TextEditingController();
  final _nameFocus = FocusNode();
  String _color = _projectColors.first;
  DateTime? _dueDate;
  bool _loading = false;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) => _nameFocus.requestFocus());
  }

  @override
  void dispose() {
    _nameCtrl.dispose();
    _clientCtrl.dispose();
    _nameFocus.dispose();
    super.dispose();
  }

  void _close() {
    if (Navigator.of(context).canPop()) {
      Navigator.of(context).pop();
    } else {
      context.go('/projects');
    }
  }

  bool get _canSubmit => _nameCtrl.text.trim().isNotEmpty;

  Future<void> _pickDate() async {
    _nameFocus.unfocus();
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
    final name = _nameCtrl.text.trim();
    if (name.isEmpty) return;
    _nameFocus.unfocus();
    HapticFeedback.mediumImpact();
    setState(() => _loading = true);

    try {
      await ref.read(projectsDatasourceProvider).createProject(
            name: name,
            client: _clientCtrl.text.trim().isEmpty ? null : _clientCtrl.text.trim(),
            color: _color,
            dueDate: _dueDate?.toIso8601String().split('T').first,
          );
      if (!mounted) return;
      ref.invalidate(projectsProvider);
      ref.read(toastServiceProvider).success(context, 'Project created');
      HapticFeedback.lightImpact();
      _close();
    } catch (e) {
      if (!mounted) return;
      setState(() => _loading = false);
      final msg = e is AppException ? e.message : 'Failed to create project';
      ref.read(toastServiceProvider).error(context, msg);
    }
  }

  @override
  Widget build(BuildContext context) {
    final dateLabel = _dueDate != null ? DateFormat('EEE, d MMM y').format(_dueDate!) : null;

    return Scaffold(
      backgroundColor: AppColors.background,
      resizeToAvoidBottomInset: true,
      appBar: AppBar(
        backgroundColor: AppColors.background,
        elevation: 0,
        title: const Text('New Project', style: AppTextStyles.headlineSmall),
        leading: IconButton(
          icon: const Icon(Icons.close, color: AppColors.foreground),
          onPressed: _close,
        ),
        actions: [
          Padding(
            padding: const EdgeInsets.only(right: 12),
            child: TextButton(
              onPressed: _canSubmit && !_loading ? _submit : null,
              child: _loading
                  ? const SizedBox(
                      width: 18,
                      height: 18,
                      child: CircularProgressIndicator(strokeWidth: 2, color: AppColors.primary),
                    )
                  : Text(
                      'Create',
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
            AppTextField(
              controller: _nameCtrl,
              focusNode: _nameFocus,
              label: 'Project name',
              hint: 'e.g. Acme website redesign',
              textCapitalization: TextCapitalization.sentences,
              onChanged: (_) => setState(() {}),
            ),
            const SizedBox(height: 16),
            AppTextField(
              controller: _clientCtrl,
              label: 'Client (optional)',
              hint: 'Who is this for?',
              textCapitalization: TextCapitalization.words,
            ),
            const SizedBox(height: 20),
            Text('Accent colour',
                style: AppTextStyles.labelMedium.copyWith(color: AppColors.mutedForeground)),
            const SizedBox(height: 10),
            Wrap(
              spacing: 12,
              runSpacing: 12,
              children: [
                for (final c in _projectColors)
                  GestureDetector(
                    onTap: () {
                      HapticFeedback.selectionClick();
                      setState(() => _color = c);
                    },
                    child: Container(
                      width: 32,
                      height: 32,
                      decoration: BoxDecoration(
                        color: _hex(c),
                        shape: BoxShape.circle,
                        border: _color == c
                            ? Border.all(color: AppColors.foreground, width: 2)
                            : null,
                      ),
                      child: _color == c
                          ? const Icon(Icons.check, size: 16, color: Colors.white)
                          : null,
                    ),
                  ),
              ],
            ),
            const SizedBox(height: 20),
            GestureDetector(
              onTap: _pickDate,
              child: AppCard(
                radius: 8,
                padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 14),
                child: Row(
                  children: [
                    const Icon(Icons.event_outlined, size: 16, color: AppColors.mutedForeground),
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
                      ),
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
