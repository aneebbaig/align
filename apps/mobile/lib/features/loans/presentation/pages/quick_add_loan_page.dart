import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../../core/errors/app_exception.dart';
import '../../../../core/services/toast_service.dart';
import '../../../../core/theme/app_colors.dart';
import '../../../../core/theme/app_text_styles.dart';
import '../../../../core/utils/amount_expr.dart';
import '../../../../core/widgets/amount_expr_field.dart';
import '../../../../core/widgets/app_text_field.dart';
import '../../../../core/widgets/book_transaction_field.dart';
import '../../../../core/widgets/due_date_chips.dart';
import '../../../../core/widgets/budget_period_field.dart';
import '../../../../core/widgets/day_strip.dart';
import '../../../budget/presentation/providers/budget_provider.dart';
import '../../../expenses/presentation/widgets/quick_add_helpers.dart';
import '../../../../core/widgets/form_section.dart';
import '../../../../core/extensions/async_value_ext.dart';
import '../../../../core/extensions/currency_ext.dart';
import '../../data/datasources/loans_datasource.dart';
import '../../domain/entities/loan_entity.dart';
import '../providers/loans_provider.dart';
import 'loan_entry_page.dart';

class QuickAddLoanPage extends ConsumerStatefulWidget {
  const QuickAddLoanPage({super.key});

  @override
  ConsumerState<QuickAddLoanPage> createState() => _QuickAddLoanPageState();
}

class _QuickAddLoanPageState extends ConsumerState<QuickAddLoanPage> {
  final _nameCtrl = TextEditingController();
  final _amountCtrl = TextEditingController();
  final _descCtrl = TextEditingController();
  final _nameFocus = FocusNode();
  String _type = 'RECEIVED';
  DateTime _date = DateTime.now();
  DateTime? _dueDate;
  bool _fileUnderDateBudget = false;
  bool _bookTransaction = true;
  bool _loading = false;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) => _nameFocus.requestFocus());
  }

  @override
  void dispose() {
    _nameCtrl.dispose();
    _amountCtrl.dispose();
    _descCtrl.dispose();
    _nameFocus.dispose();
    super.dispose();
  }

  int? get _amountPaisas => parseAmount(_amountCtrl.text).paisas;

  String _norm(String s) => s.trim().replaceAll(RegExp(r'\s+'), ' ').toLowerCase();

  LoanEntity? _findOpenLoanForSamePerson() {
    final loans = ref.read(loansProvider).valueOrNull ?? const <LoanEntity>[];
    final name = _norm(_nameCtrl.text);
    for (final l in loans) {
      if (!l.isClosed && l.type == _type && _norm(l.personName) == name) return l;
    }
    return null;
  }

  void _close() {
    if (Navigator.of(context).canPop()) {
      Navigator.of(context).pop();
    } else {
      context.go('/money');
    }
  }

  bool get _canSubmit =>
      _nameCtrl.text.trim().isNotEmpty && _amountPaisas != null;

  bool get _showBudgetChoice {
    final open = ref.read(budgetProvider).asData?.value;
    return needsBudgetChoice(_date, openMonth: open?.month, openYear: open?.year);
  }

  bool get _fileUnder => _showBudgetChoice && _fileUnderDateBudget;

  Future<void> _submit({bool another = false}) async {
    final paisas = _amountPaisas;
    if (paisas == null || _nameCtrl.text.trim().isEmpty) return;
    final existing = _findOpenLoanForSamePerson();
    if (existing != null) {
      final addInstead = await showDialog<bool>(
        context: context,
        builder: (ctx) => AlertDialog(
          backgroundColor: AppColors.card,
          title: const Text('Add to the existing loan?', style: AppTextStyles.headlineSmall),
          content: Text(
            'You already have an open loan ${existing.type == 'GIVEN' ? 'to' : 'from'} ${existing.personName} '
            '(${existing.remainingPaisas.formatPKR()} left).',
            style: AppTextStyles.bodyMedium.copyWith(color: AppColors.mutedForeground),
          ),
          actions: [
            TextButton(onPressed: () => Navigator.of(ctx).pop(false), child: const Text('Create separate loan')),
            TextButton(onPressed: () => Navigator.of(ctx).pop(true), child: const Text('Add to it')),
          ],
        ),
      );
      if (!mounted || addInstead == null) return;
      if (addInstead) {
        final added = await Navigator.of(context).push<bool>(MaterialPageRoute(
          fullscreenDialog: true,
          builder: (_) => LoanEntryPage(loan: existing, mode: LoanEntryMode.topUp, prefillPaisas: paisas, prefillDate: _date),
        ));
        // Cancelled on the entry page: stay here with what was typed.
        if (mounted && added == true) _close();
        return;
      }
    }
    HapticFeedback.mediumImpact();

    setState(() => _loading = true);
    try {
      await ref.read(loansDatasourceProvider).createLoan(
            personName: _nameCtrl.text.trim(),
            type: _type,
            principalPaisas: paisas,
            date: _date,
            description: _descCtrl.text.trim().isNotEmpty
                ? _descCtrl.text.trim()
                : null,
            dueDate: _dueDate,
            budgetMonth: _fileUnder ? _date.month : null,
            budgetYear: _fileUnder ? _date.year : null,
            skipTransaction: !_bookTransaction,
          );

      if (!mounted) return;
      ref.invalidate(loansProvider);
      ref.read(toastServiceProvider).success(context, 'Loan created');
      HapticFeedback.lightImpact();
      if (another) {
        // Keep the type and date; the next loan is usually a different person.
        setState(() {
          _loading = false;
          _nameCtrl.clear();
          _amountCtrl.clear();
          _descCtrl.clear();
          _dueDate = null;
        });
        _nameFocus.requestFocus();
      } else {
        _close();
      }
    } catch (e) {
      if (!mounted) return;
      setState(() => _loading = false);
      final msg = e is AppException ? e.message : 'Failed to create loan';
      ref.read(toastServiceProvider).error(context, msg);
    }
  }

  @override
  Widget build(BuildContext context) {
    // Keep the loans list loaded for the same-person check in _submit.
    ref.watch(loansProvider);
    final creating = _loading;

    return Scaffold(
      backgroundColor: AppColors.background,
      resizeToAvoidBottomInset: true,
      appBar: AppBar(
        backgroundColor: AppColors.background,
        elevation: 0,
        title: const Text('New Loan', style: AppTextStyles.headlineSmall),
        leading: IconButton(
          icon: const Icon(Icons.close, color: AppColors.foreground),
          onPressed: _close,
        ),
      ),
      bottomNavigationBar: QuickAddActions(
        primaryLabel: 'Create loan',
        loading: creating,
        onPrimary: _canSubmit ? _submit : null,
        onAddAnother: _canSubmit ? () => _submit(another: true) : null,
      ),
      body: SingleChildScrollView(
        keyboardDismissBehavior: ScrollViewKeyboardDismissBehavior.onDrag,
        padding: const EdgeInsets.fromLTRB(16, 8, 16, 32),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Type toggle
            Container(
              decoration: BoxDecoration(
                color: AppColors.card,
                borderRadius: BorderRadius.circular(8),
                border: Border.all(color: AppColors.border.withValues(alpha: 0.5)),
              ),
              child: Row(
                children: [
                  _TypeTab(
                    label: 'I Borrowed',
                    active: _type == 'RECEIVED',
                    onTap: () => setState(() => _type = 'RECEIVED'),
                  ),
                  _TypeTab(
                    label: 'I Lent',
                    active: _type == 'GIVEN',
                    onTap: () => setState(() => _type = 'GIVEN'),
                  ),
                ],
              ),
            ),

            const SizedBox(height: 20),

            // Amount
            BigAmountField(
              controller: _amountCtrl,
              color: _type == 'RECEIVED' ? AppColors.destructive : AppColors.warning,
              onChanged: () => setState(() {}),
            ),

            const SizedBox(height: 12),
            Divider(color: AppColors.border.withValues(alpha: 0.4), height: 1),
            const SizedBox(height: 16),

            // Person name
            AppTextField(
              controller: _nameCtrl,
              focusNode: _nameFocus,
              hint: 'Person name',
              dense: true,
              textCapitalization: TextCapitalization.words,
              onChanged: (_) => setState(() {}),
            ),

            const SizedBox(height: 20),
            Divider(color: AppColors.border.withValues(alpha: 0.4), height: 1),
            const SizedBox(height: 16),

            FormSection(
              title: 'When',
              children: [
                DayStrip(
                  selected: _date,
                  onChanged: (d) => setState(() => _date = DateTime(d.year, d.month, d.day, _date.hour, _date.minute)),
                ),
                if (_showBudgetChoice)
                  BudgetPeriodField(
                    date: _date,
                    countIt: true,
                    checked: _fileUnderDateBudget,
                    onChanged: (v) => setState(() => _fileUnderDateBudget = v),
                  ),
              ],
            ),

            const SizedBox(height: 20),
            Divider(color: AppColors.border.withValues(alpha: 0.4), height: 1),
            const SizedBox(height: 16),

            BookTransactionField(
              label: _type == 'GIVEN' ? 'an expense' : 'income',
              checked: _bookTransaction,
              onChanged: (v) => setState(() => _bookTransaction = v),
            ),

            const SizedBox(height: 20),
            Divider(color: AppColors.border.withValues(alpha: 0.4), height: 1),
            const SizedBox(height: 16),

            MoreOptions(
              children: [
                AppTextField(
                  controller: _descCtrl,
                  hint: 'Description (optional)',
                  dense: true,
                  textCapitalization: TextCapitalization.words,
                ),
                Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text('Due date (optional)',
                        style: AppTextStyles.labelMedium.copyWith(color: AppColors.mutedForeground)),
                    const SizedBox(height: 8),
                    DueDateChips(value: _dueDate, onChanged: (d) => setState(() => _dueDate = d)),
                  ],
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}

class _TypeTab extends StatelessWidget {
  const _TypeTab({
    required this.label,
    required this.active,
    required this.onTap,
  });
  final String label;
  final bool active;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) => Expanded(
        child: GestureDetector(
          onTap: onTap,
          child: AnimatedContainer(
            duration: const Duration(milliseconds: 150),
            margin: const EdgeInsets.all(3),
            padding: const EdgeInsets.symmetric(vertical: 10),
            decoration: BoxDecoration(
              color: active ? AppColors.primary : Colors.transparent,
              borderRadius: BorderRadius.circular(6),
            ),
            alignment: Alignment.center,
            child: Text(
              label,
              style: AppTextStyles.labelMedium.copyWith(
                color: active ? Colors.black : AppColors.mutedForeground,
                fontWeight: FontWeight.w600,
              ),
            ),
          ),
        ),
      );
}
