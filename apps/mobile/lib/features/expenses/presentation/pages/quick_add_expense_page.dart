import 'dart:async';

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
import '../../../../core/widgets/budget_period_field.dart';
import '../../../../core/widgets/form_section.dart';
import '../../../../core/widgets/funding_source_field.dart';
import '../../../home_widget/widget_service.dart';
import '../../data/repositories/expense_repository_impl.dart';
import '../providers/categories_provider.dart';
import '../providers/expenses_list_provider.dart';
import '../providers/recent_categories_provider.dart';
import '../widgets/category_chip_list.dart';

class QuickAddExpensePage extends ConsumerStatefulWidget {
  const QuickAddExpensePage({super.key});

  @override
  ConsumerState<QuickAddExpensePage> createState() =>
      _QuickAddExpensePageState();
}

class _QuickAddExpensePageState extends ConsumerState<QuickAddExpensePage> {
  final _amountCtrl = TextEditingController();
  final _descCtrl = TextEditingController();
  final _notesCtrl = TextEditingController();
  final _amountFocus = FocusNode();
  String? _selectedCategoryId;
  DateTime _date = DateTime.now();
  bool _fileUnderDateBudget = false;
  String? _fundingPotId;
  bool _loading = false;
  bool _isRegretPurchase = false;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) => _amountFocus.requestFocus());
  }

  @override
  void dispose() {
    _amountCtrl.dispose();
    _descCtrl.dispose();
    _notesCtrl.dispose();
    _amountFocus.dispose();
    super.dispose();
  }

  void _close() {
    if (Navigator.of(context).canPop()) {
      Navigator.of(context).pop();
    } else {
      context.go('/dashboard');
    }
  }

  int? get _amountPaisas {
    final v = double.tryParse(_amountCtrl.text.trim());
    if (v == null || v <= 0) return null;
    return (v * 100).round();
  }

  bool get _canSubmit => _amountPaisas != null && _selectedCategoryId != null;

  Future<void> _pickDate() async {
    _amountFocus.unfocus();
    final picked = await showDatePicker(
      context: context,
      initialDate: _date,
      firstDate: DateTime(2020),
      lastDate: DateTime.now(),
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
    _amountFocus.unfocus();
    HapticFeedback.mediumImpact();

    final category = ref
        .read(categoriesProvider)
        .asData?.value
        .firstWhere((c) => c.id == _selectedCategoryId);
    final description = _descCtrl.text.trim().isNotEmpty
        ? _descCtrl.text.trim()
        : (category?.name ?? 'Expense');
    final notes = _notesCtrl.text.trim().isNotEmpty ? _notesCtrl.text.trim() : null;
    setState(() => _loading = true);

    try {
      await ref.read(expenseRepositoryProvider).createExpense(
            amountPaisas: paisas,
            categoryId: _selectedCategoryId!,
            description: description,
            notes: notes,
            date: _date,
            isRegretPurchase: _isRegretPurchase,
            budgetMonth: _fileUnderDateBudget ? _date.month : null,
            budgetYear: _fileUnderDateBudget ? _date.year : null,
            fundingPotId: _fundingPotId,
          );

      if (!mounted) return;
      ref.invalidate(expensesListProvider);
      await ref.read(recentCategoriesProvider.notifier).record(_selectedCategoryId!);
      unawaited(ref.read(widgetServiceProvider).update(todaySpendPaisas: 0));

      if (!mounted) return;
      ref.read(toastServiceProvider).success(context, 'Expense added');
      HapticFeedback.lightImpact();
      _close();
    } catch (e) {
      if (!mounted) return;
      setState(() => _loading = false);
      final msg = e is AppException ? e.message : 'Failed to add expense';
      ref.read(toastServiceProvider).error(context, msg);
    }
  }

  @override
  Widget build(BuildContext context) {
    final categoriesAsync = ref.watch(categoriesProvider);
    final recentAsync = ref.watch(recentCategoriesProvider);
    final creating = _loading;
    final dateLabel = DateFormat('EEE, d MMM y').format(_date);
    final isToday = _isSameDay(_date, DateTime.now());

    return Scaffold(
      backgroundColor: AppColors.background,
      resizeToAvoidBottomInset: true,
      appBar: AppBar(
        backgroundColor: AppColors.background,
        elevation: 0,
        title: const Text('Add Expense', style: AppTextStyles.headlineSmall),
        leading: IconButton(
          icon: const Icon(Icons.close, color: AppColors.foreground),
          onPressed: _close,
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
                        color: _canSubmit
                            ? AppColors.primary
                            : AppColors.mutedForeground,
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
                prefixStyle: AppTextStyles.headlineMedium.copyWith(
                  color: AppColors.mutedForeground,
                ),
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

            categoriesAsync.when(
              data: (cats) => CategoryChipList(
                categories: cats,
                recentIds: recentAsync.asData?.value ?? [],
                selectedId: _selectedCategoryId,
                onSelected: (cat) {
                  HapticFeedback.selectionClick();
                  setState(() => _selectedCategoryId = cat.id);
                },
              ),
              loading: () => const SizedBox(
                height: 48,
                child: Center(
                  child: SizedBox(
                    width: 20,
                    height: 20,
                    child: CircularProgressIndicator(
                      strokeWidth: 2,
                      color: AppColors.mutedForeground,
                    ),
                  ),
                ),
              ),
              error: (_, __) => Text(
                'Could not load categories',
                style: AppTextStyles.bodySmall.copyWith(color: AppColors.destructive),
              ),
            ),

            const SizedBox(height: 20),

            _FormField(
              controller: _descCtrl,
              hint: 'Description (optional)',
              maxLines: 1,
              textCapitalization: TextCapitalization.sentences,
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
                        Text(
                          isToday ? 'Today' : dateLabel,
                          style: AppTextStyles.bodyMedium.copyWith(
                            color: isToday ? AppColors.mutedForeground : AppColors.foreground,
                          ),
                        ),
                        if (!isToday) ...[
                          const SizedBox(width: 6),
                          Text(
                            dateLabel,
                            style: AppTextStyles.bodySmall.copyWith(color: AppColors.mutedForeground),
                          ),
                        ],
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

            const SizedBox(height: 16),
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
                _FormField(
                  controller: _notesCtrl,
                  hint: 'Notes (optional)',
                  maxLines: 3,
                  textCapitalization: TextCapitalization.sentences,
                ),
                GestureDetector(
                  onTap: () {
                    HapticFeedback.selectionClick();
                    setState(() => _isRegretPurchase = !_isRegretPurchase);
                  },
                  child: Container(
                    padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 14),
                    decoration: BoxDecoration(
                      color: _isRegretPurchase
                          ? AppColors.destructive.withValues(alpha: 0.12)
                          : AppColors.card,
                      borderRadius: BorderRadius.circular(8),
                      border: Border.all(
                        color: _isRegretPurchase
                            ? AppColors.destructive.withValues(alpha: 0.5)
                            : AppColors.border.withValues(alpha: 0.5),
                      ),
                    ),
                    child: Row(
                      children: [
                        Icon(
                          _isRegretPurchase ? Icons.sentiment_dissatisfied : Icons.sentiment_dissatisfied_outlined,
                          size: 16,
                          color: _isRegretPurchase ? AppColors.destructive : AppColors.mutedForeground,
                        ),
                        const SizedBox(width: 10),
                        Text(
                          'Regret buy - wish I hadn\'t',
                          style: AppTextStyles.bodyMedium.copyWith(
                            color: _isRegretPurchase ? AppColors.destructive : AppColors.mutedForeground,
                          ),
                        ),
                        const Spacer(),
                        if (_isRegretPurchase) const Icon(Icons.check, size: 16, color: AppColors.destructive),
                      ],
                    ),
                  ),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }

  bool _isSameDay(DateTime a, DateTime b) =>
      a.year == b.year && a.month == b.month && a.day == b.day;
}

class _FormField extends StatelessWidget {
  const _FormField({
    required this.controller,
    required this.hint,
    required this.maxLines,
    this.textCapitalization = TextCapitalization.none,
  });
  final TextEditingController controller;
  final String hint;
  final int maxLines;
  final TextCapitalization textCapitalization;

  @override
  Widget build(BuildContext context) => TextField(
        controller: controller,
        style: AppTextStyles.bodyMedium,
        maxLines: maxLines,
        textCapitalization: textCapitalization,
        decoration: InputDecoration(
          hintText: hint,
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
      );
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
