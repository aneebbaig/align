import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';

import '../../../../core/errors/app_exception.dart';
import '../../../../core/extensions/lucide_ext.dart';
import '../../../../core/services/toast_service.dart';
import '../../../../core/theme/app_colors.dart';
import '../../../../core/theme/app_text_styles.dart';
import '../../../../core/widgets/budget_period_field.dart';
import '../../../../core/widgets/form_section.dart';
import '../../../../core/widgets/funding_source_field.dart';
import '../../../expenses/presentation/providers/categories_provider.dart';
import '../../../expenses/presentation/widgets/category_chip_list.dart';
import '../../data/datasources/cashflow_datasource.dart';
import '../../domain/entities/planned_expense_entity.dart';
import '../providers/planned_expenses_provider.dart';

/// Books a real expense transaction for a planned-expense row ("Mark paid"),
/// pre-filled from the plan - lets the user adjust funding/category before
/// it's booked, instead of silently flipping a status flag.
class RecordPlannedExpensePage extends ConsumerStatefulWidget {
  const RecordPlannedExpensePage({required this.plannedExpense, super.key});
  final PlannedExpenseEntity plannedExpense;

  @override
  ConsumerState<RecordPlannedExpensePage> createState() => _RecordPlannedExpensePageState();
}

class _RecordPlannedExpensePageState extends ConsumerState<RecordPlannedExpensePage> {
  late final _amountCtrl = TextEditingController(
    text: (widget.plannedExpense.amountPaisas / 100).toStringAsFixed(2),
  );
  late final _descCtrl = TextEditingController(text: widget.plannedExpense.name);
  final _notesCtrl = TextEditingController();
  String? _selectedCategoryId;
  late DateTime _date = widget.plannedExpense.dueDate;
  bool _fileUnderDateBudget = false;
  String? _fundingPotId;
  bool _loading = false;

  @override
  void initState() {
    super.initState();
    _selectedCategoryId = widget.plannedExpense.categoryId;
  }

  @override
  void dispose() {
    _amountCtrl.dispose();
    _descCtrl.dispose();
    _notesCtrl.dispose();
    super.dispose();
  }

  int? get _amountPaisas {
    final v = double.tryParse(_amountCtrl.text.trim());
    if (v == null || v <= 0) return null;
    return (v * 100).round();
  }

  bool get _canSubmit => _amountPaisas != null && _selectedCategoryId != null;

  Future<void> _pickDate() async {
    final picked = await showDatePicker(
      context: context,
      initialDate: _date,
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
    if (picked != null) setState(() => _date = picked);
  }

  Future<void> _submit() async {
    final paisas = _amountPaisas;
    if (paisas == null || _selectedCategoryId == null) return;
    HapticFeedback.mediumImpact();
    setState(() => _loading = true);

    try {
      await ref.read(cashflowDatasourceProvider).recordPlannedExpense(
            id: widget.plannedExpense.id,
            amountPaisas: paisas,
            categoryId: _selectedCategoryId!,
            description: _descCtrl.text.trim().isNotEmpty ? _descCtrl.text.trim() : null,
            notes: _notesCtrl.text.trim().isNotEmpty ? _notesCtrl.text.trim() : null,
            date: _date,
            budgetMonth: _fileUnderDateBudget ? _date.month : null,
            budgetYear: _fileUnderDateBudget ? _date.year : null,
            fundingPotId: _fundingPotId,
          );

      if (!mounted) return;
      ref.invalidate(plannedExpensesProvider);
      ref.read(toastServiceProvider).success(context, 'Expense recorded');
      HapticFeedback.lightImpact();
      Navigator.of(context).pop();
    } catch (e) {
      if (!mounted) return;
      setState(() => _loading = false);
      final msg = e is AppException ? e.message : 'Failed to record expense';
      ref.read(toastServiceProvider).error(context, msg);
    }
  }

  @override
  Widget build(BuildContext context) {
    final categoriesAsync = ref.watch(categoriesProvider);
    final dateLabel = DateFormat('EEE, d MMM y').format(_date);

    return Scaffold(
      backgroundColor: AppColors.background,
      resizeToAvoidBottomInset: true,
      appBar: AppBar(
        backgroundColor: AppColors.background,
        elevation: 0,
        title: const Text('Record Payment', style: AppTextStyles.headlineSmall),
        leading: IconButton(
          icon: const Icon(Icons.close, color: AppColors.foreground),
          onPressed: () => Navigator.of(context).pop(),
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
                      'Record',
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
              keyboardType: const TextInputType.numberWithOptions(decimal: true),
              style: AppTextStyles.displayLarge.copyWith(color: AppColors.primary, letterSpacing: -1),
              decoration: InputDecoration(
                prefixText: 'Rs ',
                prefixStyle: AppTextStyles.headlineMedium.copyWith(color: AppColors.mutedForeground),
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

            categoriesAsync.when(
              data: (cats) => CategoryChipList(
                categories: cats,
                recentIds: const [],
                selectedId: _selectedCategoryId,
                onSelected: (cat) => setState(() => _selectedCategoryId = cat.id),
              ),
              loading: () => const SizedBox(
                height: 48,
                child: Center(child: CircularProgressIndicator(strokeWidth: 2, color: AppColors.mutedForeground)),
              ),
              error: (_, __) => Text('Could not load categories', style: AppTextStyles.bodySmall.copyWith(color: AppColors.destructive)),
            ),

            const SizedBox(height: 20),

            TextField(
              controller: _descCtrl,
              style: AppTextStyles.bodyMedium,
              decoration: InputDecoration(
                hintText: 'Description',
                filled: true,
                fillColor: AppColors.card,
                contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 12),
                border: OutlineInputBorder(borderRadius: BorderRadius.circular(8), borderSide: BorderSide(color: AppColors.border.withValues(alpha: 0.5))),
              ),
            ),

            const SizedBox(height: 20),
            Divider(color: AppColors.border.withValues(alpha: 0.4), height: 1),
            const SizedBox(height: 16),

            FormSection(
              title: 'When',
              children: [
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
                        Text(dateLabel, style: AppTextStyles.bodyMedium),
                        const Spacer(),
                        Icon('ChevronDown'.lucideIcon, size: 14, color: AppColors.mutedForeground),
                      ],
                    ),
                  ),
                ),
                BudgetPeriodField(
                  date: _date,
                  checked: _fileUnderDateBudget,
                  onChanged: (v) => setState(() => _fileUnderDateBudget = v),
                ),
              ],
            ),

            const SizedBox(height: 20),
            Divider(color: AppColors.border.withValues(alpha: 0.4), height: 1),
            const SizedBox(height: 16),

            FundingSourceField(
              potId: _fundingPotId,
              onChanged: (potId) => setState(() => _fundingPotId = potId),
              month: _fileUnderDateBudget ? _date.month : null,
              year: _fileUnderDateBudget ? _date.year : null,
            ),

            const SizedBox(height: 20),
            Divider(color: AppColors.border.withValues(alpha: 0.4), height: 1),
            const SizedBox(height: 16),

            MoreOptions(
              children: [
                TextField(
                  controller: _notesCtrl,
                  style: AppTextStyles.bodyMedium,
                  maxLines: 3,
                  decoration: InputDecoration(
                    hintText: 'Notes (optional)',
                    filled: true,
                    fillColor: AppColors.card,
                    contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 12),
                    border: OutlineInputBorder(borderRadius: BorderRadius.circular(8), borderSide: BorderSide(color: AppColors.border.withValues(alpha: 0.5))),
                  ),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}
