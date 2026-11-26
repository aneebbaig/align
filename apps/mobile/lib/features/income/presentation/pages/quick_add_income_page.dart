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
import '../../../budget/presentation/providers/budget_provider.dart';
import '../../../expenses/data/models/quick_picks_model.dart';
import '../../../expenses/presentation/providers/quick_picks_provider.dart';
import '../../../expenses/presentation/widgets/quick_add_helpers.dart';
import '../../../routines/data/log_nudge.dart';
import '../../../expenses/presentation/providers/categories_provider.dart';
import '../../../expenses/presentation/widgets/category_chip_list.dart';
import '../../../expenses/domain/entities/expense_entity.dart';
import '../../data/datasources/income_datasource.dart';
import '../providers/income_list_provider.dart';
import '../../../../core/providers/funding_context_provider.dart';

/// Adds an income entry, or edits [existing] (the month's available income is recalculated).
class QuickAddIncomePage extends ConsumerStatefulWidget {
  const QuickAddIncomePage({this.existing, super.key});
  final ExpenseEntity? existing;

  @override
  ConsumerState<QuickAddIncomePage> createState() => _QuickAddIncomePageState();
}

class _QuickAddIncomePageState extends ConsumerState<QuickAddIncomePage> {
  final _amountCtrl = TextEditingController();
  final _descCtrl = TextEditingController();
  final _amountFocus = FocusNode();
  final _descFocus = FocusNode();
  DateTime? _lastUsed;
  String? _selectedCategoryId;
  DateTime _date = DateTime.now();
  bool _fileUnderDateBudget = false;
  bool _loading = false;

  ExpenseEntity? get _existing => widget.existing;
  bool get _editing => _existing != null;
  // Entered in another currency, or owned by a loan/investment: the amount is changed there.
  bool get _locked => _existing?.locked ?? false;

  @override
  void initState() {
    super.initState();
    final e = _existing;
    if (e != null) {
      final v = e.amountPaisas / 100;
      _amountCtrl.text = v == v.roundToDouble() ? v.toStringAsFixed(0) : v.toStringAsFixed(2);
      _descCtrl.text = e.description;
      _selectedCategoryId = e.category.id;
      _date = e.date;
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
    final open = ref.read(budgetProvider).asData?.value;
    return needsBudgetChoice(_date, openMonth: open?.month, openYear: open?.year);
  }

  bool get _fileUnder => _showBudgetChoice && _fileUnderDateBudget;

  void _applyRepeat(QuickRepeat r) {
    HapticFeedback.selectionClick();
    final cats = ref.read(incomeCategoriesProvider).asData?.value ?? [];
    setState(() {
      _descCtrl.text = r.description;
      if (cats.any((c) => c.id == r.categoryId)) _selectedCategoryId = r.categoryId;
      _amountCtrl.text = amountFieldText(r.lastAmountPaisas);
    });
    _amountFocus.requestFocus();
    _amountCtrl.selection = TextSelection(baseOffset: 0, extentOffset: _amountCtrl.text.length);
  }

  void _resetForAnother() {
    setState(() {
      _loading = false;
      _amountCtrl.clear();
      _descCtrl.clear();
      _selectedCategoryId = null;
    });
    _amountFocus.requestFocus();
  }

  Future<void> _submit({bool another = false}) async {
    final paisas = _amountPaisas;
    if (paisas == null || _selectedCategoryId == null) return;
    _amountFocus.unfocus();
    HapticFeedback.mediumImpact();

    final category = ref
        .read(incomeCategoriesProvider)
        .asData?.value
        .firstWhere((c) => c.id == _selectedCategoryId);
    final description = _descCtrl.text.trim().isNotEmpty
        ? _descCtrl.text.trim()
        : (category?.name ?? 'Income');
    setState(() => _loading = true);

    try {
      final ds = ref.read(incomeDatasourceProvider);
      if (_editing) {
        await ds.updateIncome(
          id: _existing!.id,
          amountPaisas: paisas,
          categoryId: _selectedCategoryId!,
          description: description,
          notes: _existing!.notes,
          date: _date,
          budgetMonth: _fileUnder ? _date.month : null,
          budgetYear: _fileUnder ? _date.year : null,
        );
      } else {
        await ds.createIncome(
          amountPaisas: paisas,
          categoryId: _selectedCategoryId!,
          description: description,
          date: _date,
          budgetMonth: _fileUnder ? _date.month : null,
          budgetYear: _fileUnder ? _date.year : null,
        );
      }

      if (!mounted) return;
      ref.invalidate(incomeListProvider);
      ref.invalidate(fundingContextProvider);
      if (!_editing) {
        await LastEntryStore.record(_date);
        unawaited(LogNudge.reschedule());
      }
      if (!mounted) return;
      ref.read(toastServiceProvider).success(
          context, _editing ? 'Income updated' : (another ? 'Added $description' : 'Income added'));
      HapticFeedback.lightImpact();
      if (another) {
        _resetForAnother();
      } else {
        _close();
      }
    } catch (e) {
      if (!mounted) return;
      setState(() => _loading = false);
      final msg = e is AppException ? e.message : (_editing ? 'Failed to update income' : 'Failed to add income');
      ref.read(toastServiceProvider).error(context, msg);
    }
  }

  @override
  Widget build(BuildContext context) {
    final categoriesAsync = ref.watch(incomeCategoriesProvider);
    final creating = _loading;
    final picks = ref.watch(quickPicksProvider('INCOME')).asData?.value;
    ref.watch(budgetProvider);

    return Scaffold(
      backgroundColor: AppColors.background,
      resizeToAvoidBottomInset: true,
      appBar: AppBar(
        backgroundColor: AppColors.background,
        elevation: 0,
        title: Text(_editing ? 'Edit Income' : 'Add Income', style: AppTextStyles.headlineSmall),
        leading: IconButton(
          icon: const Icon(Icons.close, color: AppColors.foreground),
          onPressed: _close,
        ),
      ),
      bottomNavigationBar: QuickAddActions(
        primaryLabel: _editing ? 'Save changes' : 'Add income',
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
                  'Entered in another currency, or owned by a loan or investment - its amount is changed there.',
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
                color: const Color(0xFF4CAF50),
                letterSpacing: -1,
              ),
              decoration: InputDecoration(
                prefixText: '+ Rs ',
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
                  const [],
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
                  final cats = ref.read(incomeCategoriesProvider).asData?.value ?? [];
                  if (cats.any((c) => c.id == d.categoryId)) setState(() => _selectedCategoryId = d.categoryId);
                }
              },
            ),

            if (_showBudgetChoice) ...[
              const SizedBox(height: 20),
              Divider(color: AppColors.border.withValues(alpha: 0.4), height: 1),
              const SizedBox(height: 16),
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
          ],
        ),
      ),
    );
  }
}

