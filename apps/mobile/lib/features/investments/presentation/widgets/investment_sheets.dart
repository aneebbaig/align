import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../../core/errors/app_exception.dart';
import '../../../../core/extensions/currency_ext.dart';
import '../../../../core/services/toast_service.dart';
import '../../../../core/theme/app_colors.dart';
import '../../../../core/theme/app_text_styles.dart';
import '../../../../core/utils/amount_expr.dart';
import '../../../../core/utils/money_format.dart';
import '../../../../core/widgets/amount_expr_field.dart';
import '../../../../core/widgets/app_sheet.dart';
import '../../../../core/widgets/app_text_field.dart';
import '../../../../core/widgets/sheet_header.dart';
import '../../../../core/providers/funding_context_provider.dart';
import '../../../../core/widgets/book_transaction_field.dart';
import '../../../../core/widgets/budget_period_field.dart';
import '../../../../core/widgets/day_strip.dart';
import '../../../budget/presentation/providers/budget_provider.dart';
import '../../../expenses/presentation/widgets/quick_add_helpers.dart';
import 'investment_history_sheet.dart';
import 'investment_plan_editor_sheet.dart';
import '../../data/datasources/investments_datasource.dart';
import '../../domain/entities/investment_entity.dart';
import '../providers/investments_provider.dart';

void showLogContributionSheet(BuildContext context, WidgetRef ref, InvestmentEntity inv) =>
    showAppSheet(context, _AddMoneySheet(name: inv.name, investment: inv));

void showWithdrawSheet(BuildContext context, WidgetRef ref, InvestmentEntity inv) =>
    showAppSheet(context, _AddMoneySheet(name: inv.name, investment: inv, isWithdrawal: true));

// Add money to a plan category that has no linked Investment yet - the
// datasource lazily creates one on the server. This is how "add to plan,
// then add money" is funded for the first time.
void showAddMoneyToCategorySheet(BuildContext context, WidgetRef ref, PlanCategoryEntity category) =>
    showAppSheet(context, _AddMoneySheet(name: category.name, category: category));

void showUpdateValueSheet(BuildContext context, WidgetRef ref, InvestmentEntity inv) =>
    showAppSheet(context, _UpdateValueSheet(inv: inv));

void showPlanEditorSheet(BuildContext context, WidgetRef ref, InvestmentPlanEntity? plan) =>
    showAppSheet(context, PlanEditorSheet(plan: plan));

void showHistorySheet(BuildContext context, WidgetRef ref, InvestmentEntity inv) =>
    showAppSheet(context, HistorySheet(inv: inv));

// ── Add money ─────────────────────────────────────────────────────────────
// Works whether the target already has a linked Investment (log a top-up)
// or is a plan category with no money in it yet (lazily creates the investment on
// the server via addMoneyToCategory).

class _AddMoneySheet extends ConsumerStatefulWidget {
  const _AddMoneySheet({required this.name, this.investment, this.category, this.isWithdrawal = false});
  final String name;
  final InvestmentEntity? investment;
  final PlanCategoryEntity? category;
  final bool isWithdrawal;
  @override
  ConsumerState<_AddMoneySheet> createState() => _AddMoneySheetState();
}

class _AddMoneySheetState extends ConsumerState<_AddMoneySheet> {
  final _amount = TextEditingController();
  final _notes = TextEditingController();
  DateTime _date = DateTime.now();
  bool _loading = false;
  bool _book = true;
  bool _fileUnderDate = false;

  bool get _showBudgetChoice {
    final open = ref.watch(budgetProvider).asData?.value;
    return _book && needsBudgetChoice(_date, openMonth: open?.month, openYear: open?.year);
  }

  bool get _fileUnder => _showBudgetChoice && _fileUnderDate;

  bool get _valid {
    final p = parseAmount(_amount.text).paisas;
    if (p == null) return false;
    if (widget.isWithdrawal) return p <= widget.investment!.currentValuePaisas;
    return true;
  }

  @override
  void dispose() {
    _amount.dispose();
    _notes.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    final paisas = parseAmount(_amount.text).paisas;
    if (paisas == null) return;
    setState(() => _loading = true);
    try {
      HapticFeedback.mediumImpact();
      final ds = ref.read(investmentsDatasourceProvider);
      final month = _fileUnder ? _date.month : null;
      final year = _fileUnder ? _date.year : null;
      if (widget.investment != null) {
        await ds.logContribution(
          investmentId: widget.investment!.id,
          amountPaisas: paisas,
          date: _date,
          notes: _notes.text.trim(),
          type: widget.isWithdrawal ? 'WITHDRAWAL' : 'DEPOSIT',
          skipTransaction: !_book,
          budgetMonth: month,
          budgetYear: year,
        );
      } else {
        await ds.addMoneyToCategory(
          planCategoryId: widget.category!.id,
          amountPaisas: paisas,
          date: _date,
          notes: _notes.text.trim(),
          skipTransaction: !_book,
          budgetMonth: month,
          budgetYear: year,
        );
      }
      ref.invalidate(investmentsProvider);
      if (mounted) {
        ref.read(toastServiceProvider).success(context, widget.isWithdrawal ? 'Withdrawal recorded' : 'Money added');
        Navigator.pop(context);
      }
    } catch (e) {
      if (mounted) {
        setState(() => _loading = false);
        ref.read(toastServiceProvider).error(context, e is AppException ? e.message : 'Failed');
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.fromLTRB(16, 16, 16, 24),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          SheetHeader(
            title: '${widget.isWithdrawal ? 'Withdraw' : 'Add money'} — ${widget.name}',
            onSubmit: _submit,
            canSubmit: _valid,
            loading: _loading,
            submit: widget.isWithdrawal ? 'Withdraw' : 'Add',
          ),
          const SizedBox(height: 16),
          AmountExprField(controller: _amount, autofocus: true, onChanged: () => setState(() {})),
          if (widget.isWithdrawal) ...[
            const SizedBox(height: 6),
            Text('Current value ${widget.investment!.currentValuePaisas.formatPKR()} - you can\'t take out more',
                style: AppTextStyles.bodySmall),
          ],
          const SizedBox(height: 12),
          DayStrip(
            selected: _date,
            onChanged: (d) => setState(() => _date = DateTime(d.year, d.month, d.day, _date.hour, _date.minute)),
          ),
          const SizedBox(height: 12),
          AppTextField(controller: _notes, hint: 'Notes (optional)', dense: true),
          const SizedBox(height: 8),
          BookTransactionField(
            label: widget.isWithdrawal ? 'income' : 'an expense',
            checked: _book,
            onChanged: (v) => setState(() => _book = v),
          ),
          if (_book) ...[
            if (_showBudgetChoice)
              BudgetPeriodField(
                date: _date,
                countIt: true,
                checked: _fileUnderDate,
                onChanged: (v) => setState(() => _fileUnderDate = v),
              ),
            if (!widget.isWithdrawal) _AvailableIncome(
              month: _fileUnder ? _date.month : null,
              year: _fileUnder ? _date.year : null,
            ),
          ],
        ],
      ),
    );
  }
}

// "Paid from income · Rs X available" for whichever period the entry targets.
class _AvailableIncome extends ConsumerWidget {
  const _AvailableIncome({this.month, this.year});
  final int? month;
  final int? year;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final ctx = ref.watch(fundingContextProvider(month, year));
    return ctx.maybeWhen(
      data: (c) => Padding(
        padding: const EdgeInsets.only(left: 12, top: 4),
        child: Text(
          'Paid from income · ${c.monthlyIncomeAvailablePaisas.formatPKR()} available',
          style: AppTextStyles.bodySmall.copyWith(
            color: c.monthlyIncomeAvailablePaisas >= 0 ? AppColors.mutedForeground : AppColors.destructive,
          ),
        ),
      ),
      orElse: () => const SizedBox.shrink(),
    );
  }
}

// ── Update value ─────────────────────────────────────────────────────────────

class _UpdateValueSheet extends ConsumerStatefulWidget {
  const _UpdateValueSheet({required this.inv});
  final InvestmentEntity inv;
  @override
  ConsumerState<_UpdateValueSheet> createState() => _UpdateValueSheetState();
}

class _UpdateValueSheetState extends ConsumerState<_UpdateValueSheet> {
  late final _value = TextEditingController(text: paisasToFieldText(widget.inv.currentValuePaisas));
  bool _loading = false;

  @override
  void dispose() {
    _value.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    final paisas = parseAmount(_value.text).paisas;
    if (paisas == null) return;
    setState(() => _loading = true);
    try {
      HapticFeedback.mediumImpact();
      await ref.read(investmentsDatasourceProvider).updateValue(id: widget.inv.id, currentValuePaisas: paisas);
      ref.invalidate(investmentsProvider);
      if (mounted) {
        ref.read(toastServiceProvider).success(context, 'Updated');
        Navigator.pop(context);
      }
    } catch (e) {
      if (mounted) {
        setState(() => _loading = false);
        ref.read(toastServiceProvider).error(context, e is AppException ? e.message : 'Failed');
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.fromLTRB(16, 16, 16, 24),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          SheetHeader(
            title: 'Update value — ${widget.inv.name}',
            onSubmit: _submit,
            canSubmit: parseAmount(_value.text).isValid,
            loading: _loading,
          ),
          const SizedBox(height: 8),
          const Text(
            "Only changes what it's worth today. Doesn't record money in or out - use Add money or Withdraw for that.",
            style: AppTextStyles.bodySmall,
          ),
          const SizedBox(height: 12),
          AmountExprField(controller: _value, autofocus: true, onChanged: () => setState(() {})),
        ],
      ),
    );
  }
}
