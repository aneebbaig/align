import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';

import '../../../../core/errors/app_exception.dart';
import '../../../../core/services/toast_service.dart';
import '../../../../core/theme/app_colors.dart';
import '../../../../core/theme/app_text_styles.dart';
import '../../data/datasources/cashflow_datasource.dart';
import '../providers/planned_expenses_provider.dart';

class AddPlannedExpensePage extends ConsumerStatefulWidget {
  const AddPlannedExpensePage({super.key});

  @override
  ConsumerState<AddPlannedExpensePage> createState() => _AddPlannedExpensePageState();
}

class _AddPlannedExpensePageState extends ConsumerState<AddPlannedExpensePage> {
  final _amountCtrl = TextEditingController();
  final _nameCtrl = TextEditingController();
  final _amountFocus = FocusNode();
  String _flexibility = 'FIXED';
  DateTime _dueDate = DateTime.now();
  bool _loading = false;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) => _amountFocus.requestFocus());
  }

  @override
  void dispose() {
    _amountCtrl.dispose();
    _nameCtrl.dispose();
    _amountFocus.dispose();
    super.dispose();
  }

  int? get _amountPaisas {
    final v = double.tryParse(_amountCtrl.text.trim());
    if (v == null || v <= 0) return null;
    return (v * 100).round();
  }

  bool get _canSubmit => _amountPaisas != null && _nameCtrl.text.trim().isNotEmpty;

  Future<void> _pickDate() async {
    _amountFocus.unfocus();
    final picked = await showDatePicker(
      context: context,
      initialDate: _dueDate,
      firstDate: DateTime(2020),
      lastDate: DateTime(2100),
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
    final paisas = _amountPaisas;
    final name = _nameCtrl.text.trim();
    if (paisas == null || name.isEmpty) return;
    HapticFeedback.mediumImpact();

    setState(() => _loading = true);
    try {
      await ref.read(cashflowDatasourceProvider).createPlannedExpense(
            name: name,
            amountPaisas: paisas,
            dueDate: _dueDate,
            flexibility: _flexibility,
          );

      if (!mounted) return;
      ref.invalidate(plannedExpensesProvider);
      ref.read(toastServiceProvider).success(context, 'Planned expense added');
      HapticFeedback.lightImpact();
      Navigator.of(context).pop();
    } catch (e) {
      if (!mounted) return;
      setState(() => _loading = false);
      final msg = e is AppException ? e.message : 'Failed to add planned expense';
      ref.read(toastServiceProvider).error(context, msg);
    }
  }

  @override
  Widget build(BuildContext context) {
    final submitting = _loading;
    final dateLabel = DateFormat('EEE, d MMM y').format(_dueDate);

    return Scaffold(
      backgroundColor: AppColors.background,
      resizeToAvoidBottomInset: true,
      appBar: AppBar(
        backgroundColor: AppColors.background,
        elevation: 0,
        title: const Text('Planned Expense', style: AppTextStyles.headlineSmall),
        leading: IconButton(
          icon: const Icon(Icons.close, color: AppColors.foreground),
          onPressed: () => Navigator.of(context).pop(),
        ),
        actions: [
          Padding(
            padding: const EdgeInsets.only(right: 12),
            child: TextButton(
              onPressed: _canSubmit && !submitting ? _submit : null,
              child: submitting
                  ? const SizedBox(
                      width: 18,
                      height: 18,
                      child: CircularProgressIndicator(strokeWidth: 2, color: AppColors.primary),
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
              controller: _amountCtrl,
              focusNode: _amountFocus,
              keyboardType: const TextInputType.numberWithOptions(decimal: true),
              inputFormatters: [_DecimalFormatter()],
              style: AppTextStyles.displayLarge.copyWith(
                color: AppColors.primary,
                letterSpacing: -1,
              ),
              decoration: InputDecoration(
                prefixText: 'Rs ',
                prefixStyle: AppTextStyles.headlineMedium.copyWith(color: AppColors.mutedForeground),
                hintText: '0',
                hintStyle: AppTextStyles.displayLarge.copyWith(
                  color: AppColors.mutedForeground.withValues(alpha: 0.4),
                  letterSpacing: -1,
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

            TextField(
              controller: _nameCtrl,
              style: AppTextStyles.bodyMedium,
              maxLines: 1,
              textCapitalization: TextCapitalization.sentences,
              decoration: InputDecoration(
                hintText: 'What is this for? (e.g. Tuition)',
                hintStyle: AppTextStyles.bodyMedium.copyWith(color: AppColors.mutedForeground),
                filled: true,
                fillColor: AppColors.card,
                contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 12),
                border: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(8),
                  borderSide: BorderSide(color: AppColors.border.withValues(alpha: 0.5)),
                ),
                enabledBorder: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(8),
                  borderSide: BorderSide(color: AppColors.border.withValues(alpha: 0.5)),
                ),
                focusedBorder: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(8),
                  borderSide: BorderSide(color: AppColors.primary.withValues(alpha: 0.6)),
                ),
              ),
              onChanged: (_) => setState(() {}),
            ),

            const SizedBox(height: 12),

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
                    const Icon(Icons.calendar_today_outlined, size: 16, color: AppColors.mutedForeground),
                    const SizedBox(width: 10),
                    Text('Due', style: AppTextStyles.bodyMedium.copyWith(color: AppColors.mutedForeground)),
                    const Spacer(),
                    Text(dateLabel, style: AppTextStyles.bodyMedium),
                    const SizedBox(width: 6),
                    const Icon(Icons.keyboard_arrow_down, size: 16, color: AppColors.mutedForeground),
                  ],
                ),
              ),
            ),

            const SizedBox(height: 16),
            Divider(color: AppColors.border.withValues(alpha: 0.4), height: 1),
            const SizedBox(height: 8),

            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Text('Flexible timing', style: AppTextStyles.bodyMedium),
                      Text(
                        'Allow this to slide to a nearby month if cash is tight',
                        style: AppTextStyles.bodySmall.copyWith(color: AppColors.mutedForeground),
                      ),
                    ],
                  ),
                ),
                Switch(
                  value: _flexibility == 'FLEXIBLE',
                  activeTrackColor: AppColors.primary,
                  onChanged: (v) => setState(() => _flexibility = v ? 'FLEXIBLE' : 'FIXED'),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}

class _DecimalFormatter extends TextInputFormatter {
  @override
  TextEditingValue formatEditUpdate(TextEditingValue old, TextEditingValue val) {
    final text = val.text;
    if (text.isEmpty) return val;
    if (!RegExp(r'^\d{0,9}(\.\d{0,2})?$').hasMatch(text)) return old;
    return val;
  }
}
