import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';

import '../../../../core/errors/app_exception.dart';
import '../../../../core/services/toast_service.dart';
import '../../../../core/theme/app_colors.dart';
import '../../../../core/utils/amount_expr.dart';
import '../../../../core/widgets/amount_expr_field.dart';
import '../../../../core/theme/app_text_styles.dart';
import '../../../../core/services/last_entry_store.dart';
import '../../../../core/widgets/budget_period_field.dart';
import '../../../../core/widgets/day_strip.dart';
import '../../../../core/widgets/form_section.dart';
import '../../../routines/data/log_nudge.dart';
import '../../../../core/widgets/funding_source_field.dart';
import '../../../home_widget/widget_service.dart';
import '../../../savings/presentation/providers/savings_provider.dart';
import '../../data/repositories/expense_repository_impl.dart';
import '../../domain/entities/expense_entity.dart';
import '../providers/categories_provider.dart';
import '../providers/expenses_list_provider.dart';
import '../providers/recent_categories_provider.dart';
import '../../data/models/quick_picks_model.dart';
import '../providers/quick_picks_provider.dart';
import '../widgets/category_chip_list.dart';
import '../widgets/quick_add_helpers.dart';
import '../../../../core/providers/funding_context_provider.dart';
import '../../../budget/presentation/providers/budget_provider.dart';

/// Adds an expense, or edits [existing] (everything it feeds - budget, income
/// available, pot balances - is recalculated by the server).
class QuickAddExpensePage extends ConsumerStatefulWidget {
  const QuickAddExpensePage({this.existing, super.key});
  final ExpenseEntity? existing;

  @override
  ConsumerState<QuickAddExpensePage> createState() =>
      _QuickAddExpensePageState();
}

class _QuickAddExpensePageState extends ConsumerState<QuickAddExpensePage> {
  final _amountCtrl = TextEditingController();
  final _descCtrl = TextEditingController();
  final _notesCtrl = TextEditingController();
  final _amountFocus = FocusNode();
  final _descFocus = FocusNode();
  DateTime? _lastUsed;
  String? _selectedCategoryId;
  DateTime _date = DateTime.now();
  bool _fileUnderDateBudget = false;
  String? _fundingPotId;
  bool _loading = false;
  bool _isRegretPurchase = false;

  ExpenseEntity? get _existing => widget.existing;
  bool get _editing => _existing != null;
  // Owned by a loan/investment: only the descriptive fields change here.
  bool get _locked => _existing?.locked ?? false;

  @override
  void initState() {
    super.initState();
    final e = _existing;
    if (e != null) {
      final v = e.amountPaisas / 100;
      _amountCtrl.text = v == v.roundToDouble() ? v.toStringAsFixed(0) : v.toStringAsFixed(2);
      _descCtrl.text = e.description;
      _notesCtrl.text = e.notes ?? '';
      _selectedCategoryId = e.category.id;
      _date = e.date;
      _isRegretPurchase = e.isRegretPurchase;
      _fundingPotId = e.fundingSource == 'SAVINGS_POT' ? e.fundingPotId : null;
    } else {
      WidgetsBinding.instance.addPostFrameCallback((_) => _amountFocus.requestFocus());
      LastEntryStore.read().then((last) {
        final d = lastChipDate(last, DateTime.now());
        if (mounted && d != null) setState(() => _lastUsed = d);
      });
    }
  }

  @override
  void dispose() {
    _amountCtrl.dispose();
    _descCtrl.dispose();
    _notesCtrl.dispose();
    _amountFocus.dispose();
    _descFocus.dispose();
    super.dispose();
  }

  void _close() {
    if (Navigator.of(context).canPop()) {
      Navigator.of(context).pop();
    } else {
      context.go('/dashboard');
    }
  }

  // The field takes a plain number or a sum like "35+67"; null until it is a valid, positive amount.
  int? get _amountPaisas => parseAmount(_amountCtrl.text).paisas;

  bool get _canSubmit => _amountPaisas != null && _selectedCategoryId != null;

  /// Whether the "Count it in {month}'s budget" choice applies to the chosen date.
  bool get _showBudgetChoice {
    if (_locked) return false;
    final open = ref.read(budgetProvider).asData?.value;
    return needsBudgetChoice(_date, openMonth: open?.month, openYear: open?.year);
  }

  bool get _fileUnder => _showBudgetChoice && _fileUnderDateBudget;

  void _applyRepeat(QuickRepeat r) {
    HapticFeedback.selectionClick();
    final cats = ref.read(categoriesProvider).asData?.value ?? [];
    final pots = ref.read(savingsProvider).asData?.value.pots ?? [];
    setState(() {
      _descCtrl.text = r.description;
      if (cats.any((c) => c.id == r.categoryId)) _selectedCategoryId = r.categoryId;
      _amountCtrl.text = amountFieldText(r.lastAmountPaisas);
      if (r.fundingSource == 'SAVINGS_POT' && pots.any((p) => p.id == r.fundingPotId)) {
        _fundingPotId = r.fundingPotId;
      } else if (r.fundingSource == 'INCOME') {
        _fundingPotId = null;
      }
    });
    _amountFocus.requestFocus();
    _amountCtrl.selection = TextSelection(baseOffset: 0, extentOffset: _amountCtrl.text.length);
  }

  void _resetForAnother() {
    setState(() {
      _loading = false;
      _amountCtrl.clear();
      _descCtrl.clear();
      _notesCtrl.clear();
      _selectedCategoryId = null;
      _isRegretPurchase = false;
    });
    _amountFocus.requestFocus();
  }

  Future<void> _submit({bool another = false}) async {
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
      final repo = ref.read(expenseRepositoryProvider);
      if (_editing) {
        await repo.updateExpense(
          id: _existing!.id,
          amountPaisas: paisas,
          categoryId: _selectedCategoryId!,
          description: description,
          notes: notes,
          date: _date,
          isRegretPurchase: _isRegretPurchase,
          budgetMonth: _fileUnder ? _date.month : null,
          budgetYear: _fileUnder ? _date.year : null,
          // A split (set up on the web) keeps its sources; a loan/investment keeps its own.
          changeFunding: !_locked && !_existing!.isSplit,
          fundingPotId: _fundingPotId,
        );
      } else {
        await repo.createExpense(
          amountPaisas: paisas,
          categoryId: _selectedCategoryId!,
          description: description,
          notes: notes,
          date: _date,
          isRegretPurchase: _isRegretPurchase,
          budgetMonth: _fileUnder ? _date.month : null,
          budgetYear: _fileUnder ? _date.year : null,
          fundingPotId: _fundingPotId,
        );
      }

      if (!mounted) return;
      ref.invalidate(expensesListProvider);
      ref.invalidate(budgetProvider);
      ref.invalidate(fundingContextProvider);
      if (_editing) ref.invalidate(savingsProvider);
      await ref.read(recentCategoriesProvider.notifier).record(_selectedCategoryId!);
      if (!_editing) {
        unawaited(ref.read(widgetServiceProvider).update(todaySpendPaisas: 0));
        await LastEntryStore.record(_date);
        unawaited(LogNudge.reschedule());
      }

      if (!mounted) return;
      ref.read(toastServiceProvider).success(
          context, _editing ? 'Expense updated' : (another ? 'Added $description' : 'Expense added'));
      HapticFeedback.lightImpact();
      if (another) {
        _resetForAnother();
      } else {
        _close();
      }
    } catch (e) {
      if (!mounted) return;
      setState(() => _loading = false);
      final msg = e is AppException ? e.message : (_editing ? 'Failed to update expense' : 'Failed to add expense');
      ref.read(toastServiceProvider).error(context, msg);
    }
  }

  @override
  Widget build(BuildContext context) {
    final categoriesAsync = ref.watch(categoriesProvider);
    final recentAsync = ref.watch(recentCategoriesProvider);
    final creating = _loading;
    final picks = ref.watch(quickPicksProvider('EXPENSE')).asData?.value;
    ref.watch(budgetProvider);

    return Scaffold(
      backgroundColor: AppColors.background,
      resizeToAvoidBottomInset: true,
      appBar: AppBar(
        backgroundColor: AppColors.background,
        elevation: 0,
        title: Text(_editing ? 'Edit Expense' : 'Add Expense', style: AppTextStyles.headlineSmall),
        leading: IconButton(
          icon: const Icon(Icons.close, color: AppColors.foreground),
          onPressed: _close,
        ),
      ),
      bottomNavigationBar: QuickAddActions(
        primaryLabel: _editing ? 'Save changes' : 'Add expense',
        loading: creating,
        onPrimary: _canSubmit ? _submit : null,
        onAddAnother: _editing ? null : (_canSubmit ? () => _submit(another: true) : null),
      ),
      body: SingleChildScrollView(
        keyboardDismissBehavior: ScrollViewKeyboardDismissBehavior.onDrag,
        padding: const EdgeInsets.fromLTRB(16, 8, 16, 32),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            if (_locked)
              Padding(
                padding: const EdgeInsets.only(bottom: 8),
                child: Text(
                  'This belongs to a loan or investment - its amount, funding and period are changed there.',
                  style: AppTextStyles.bodySmall.copyWith(color: AppColors.mutedForeground),
                ),
              ),
            if (!_locked && !_editing && (picks?.repeats.isNotEmpty ?? false)) ...[
              QuickRepeatChips(repeats: picks!.repeats, onTap: _applyRepeat),
              const SizedBox(height: 8),
            ],
            TextField(
              controller: _amountCtrl,
              focusNode: _amountFocus,
              enabled: !_locked,
              keyboardType: const TextInputType.numberWithOptions(decimal: true),
              inputFormatters: [AmountExprFormatter()],
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
            if (!_locked) AmountExprBar(controller: _amountCtrl, onChanged: () => setState(() {})),
            const SizedBox(height: 8),
            DayStrip(
              selected: _date,
              lastUsed: _lastUsed,
              onChanged: (d) => setState(() => _date = DateTime(d.year, d.month, d.day, _date.hour, _date.minute)),
            ),

            const SizedBox(height: 12),
            Divider(color: AppColors.border.withValues(alpha: 0.4), height: 1),
            const SizedBox(height: 16),

            categoriesAsync.when(
              data: (cats) => CategoryChipList(
                categories: cats,
                recentIds: orderedCategoryIds(
                  picks?.topCategoryIds ?? const [],
                  recentAsync.asData?.value ?? const [],
                  cats.map((c) => c.id).toSet(),
                ),
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

            DescriptionAutocomplete(
              controller: _descCtrl,
              focusNode: _descFocus,
              descriptions: picks?.descriptions ?? const [],
              onPicked: (d) {
                if (_selectedCategoryId == null && d.categoryId != null) {
                  final cats = ref.read(categoriesProvider).asData?.value ?? [];
                  if (cats.any((c) => c.id == d.categoryId)) setState(() => _selectedCategoryId = d.categoryId);
                }
              },
            ),

            const SizedBox(height: 20),
            Divider(color: AppColors.border.withValues(alpha: 0.4), height: 1),
            const SizedBox(height: 16),

            if (_showBudgetChoice) ...[
              BudgetPeriodField(
                date: _date,
                checked: _fileUnderDateBudget,
                countIt: true,
                onChanged: (v) => setState(() => _fileUnderDateBudget = v),
                otherwise: _existing?.budgetMonth != null
                    ? "Otherwise stays under ${DateFormat('MMMM y').format(DateTime(_existing!.budgetYear!, _existing!.budgetMonth!))}'s budget"
                    : null,
              ),
            ],
            const SizedBox(height: 16),
            Divider(color: AppColors.border.withValues(alpha: 0.4), height: 1),
            const SizedBox(height: 16),

            if (_existing?.isSplit ?? false)
              Text(
                'Funded from several sources - change the split on the web.',
                style: AppTextStyles.bodySmall.copyWith(color: AppColors.mutedForeground),
              )
            else if (!_locked)
              FundingSourceField(
                potId: _fundingPotId,
                onChanged: (potId) => setState(() => _fundingPotId = potId),
                month: _fileUnder ? _date.month : _existing?.budgetMonth,
                year: _fileUnder ? _date.year : _existing?.budgetYear,
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

