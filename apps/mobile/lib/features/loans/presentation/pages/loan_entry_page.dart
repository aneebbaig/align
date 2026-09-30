import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';

import '../../../../core/errors/app_exception.dart';
import '../../../../core/extensions/currency_ext.dart';
import '../../../../core/services/toast_service.dart';
import '../../../../core/theme/app_colors.dart';
import '../../../../core/theme/app_text_styles.dart';
import '../../../../core/widgets/app_text_field.dart';
import '../../../../core/widgets/book_transaction_field.dart';
import '../../../../core/widgets/budget_period_field.dart';
import '../../../../core/widgets/form_section.dart';
import '../../data/datasources/loans_datasource.dart';
import '../../domain/entities/loan_entity.dart';
import '../providers/loans_provider.dart';

enum LoanEntryMode { topUp, writeOff }

/// "Lend/borrow more" and "Write off / Mark as forgiven" for one loan.
class LoanEntryPage extends ConsumerStatefulWidget {
  const LoanEntryPage({required this.loan, required this.mode, this.prefillPaisas, this.prefillDate, super.key});
  final LoanEntity loan;
  final LoanEntryMode mode;
  final int? prefillPaisas;
  final DateTime? prefillDate;

  @override
  ConsumerState<LoanEntryPage> createState() => _LoanEntryPageState();
}

class _LoanEntryPageState extends ConsumerState<LoanEntryPage> {
  late final TextEditingController _amountCtrl;
  final _notesCtrl = TextEditingController();
  late DateTime _date = widget.prefillDate ?? DateTime.now();
  bool _fileUnderDateBudget = false;
  late bool _book = widget.mode == LoanEntryMode.topUp || widget.loan.offersWriteOffExpense;
  bool _loading = false;

  bool get _isTopUp => widget.mode == LoanEntryMode.topUp;
  bool get _isGiven => widget.loan.type == 'GIVEN';
  // Write-offs only offer an entry where it isn't already counted.
  bool get _offersEntry => _isTopUp || widget.loan.offersWriteOffExpense;

  String get _title => _isTopUp
      ? (_isGiven ? 'Lend more' : 'Borrow more')
      : (_isGiven ? 'Write off' : 'Mark as forgiven');

  @override
  void initState() {
    super.initState();
    final prefill = widget.prefillPaisas ?? (_isTopUp ? null : widget.loan.remainingPaisas);
    _amountCtrl = TextEditingController(
      text: prefill == null ? '' : (prefill % 100 == 0 ? '${prefill ~/ 100}' : (prefill / 100).toStringAsFixed(2)),
    );
  }

  @override
  void dispose() {
    _amountCtrl.dispose();
    _notesCtrl.dispose();
    super.dispose();
  }

  int? get _amountPaisas {
    final v = double.tryParse(_amountCtrl.text.trim());
    if (v == null || v <= 0) return null;
    return (v * 100).round();
  }

  bool get _canSubmit {
    final p = _amountPaisas;
    if (p == null) return false;
    return _isTopUp || p <= widget.loan.remainingPaisas;
  }

  Future<void> _pickDate() async {
    final picked = await showDatePicker(
      context: context,
      initialDate: _date,
      firstDate: DateTime(2020),
      lastDate: DateTime.now(),
    );
    if (picked != null) setState(() => _date = picked);
  }

  Future<void> _submit() async {
    final paisas = _amountPaisas;
    if (paisas == null) return;
    HapticFeedback.mediumImpact();
    setState(() => _loading = true);
    final ds = ref.read(loansDatasourceProvider);
    final notes = _notesCtrl.text.trim().isNotEmpty ? _notesCtrl.text.trim() : null;
    final month = _book && _fileUnderDateBudget ? _date.month : null;
    final year = _book && _fileUnderDateBudget ? _date.year : null;
    try {
      if (_isTopUp) {
        await ds.addToLoan(
          loanId: widget.loan.id, amountPaisas: paisas, date: _date, notes: notes,
          budgetMonth: month, budgetYear: year, skipTransaction: !_book,
        );
      } else {
        await ds.writeOff(
          loanId: widget.loan.id, amountPaisas: paisas, date: _date, notes: notes,
          budgetMonth: month, budgetYear: year, bookExpense: _offersEntry && _book,
        );
      }
      if (!mounted) return;
      ref.invalidate(loansProvider);
      ref.read(toastServiceProvider).success(context, _isTopUp ? 'Added to loan' : (_isGiven ? 'Written off' : 'Marked as forgiven'));
      Navigator.of(context).pop();
    } catch (e) {
      if (!mounted) return;
      setState(() => _loading = false);
      ref.read(toastServiceProvider).error(context, e is AppException ? e.message : 'Failed');
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        backgroundColor: AppColors.background,
        elevation: 0,
        title: Text('$_title - ${widget.loan.personName}', style: AppTextStyles.headlineSmall),
        leading: IconButton(
          icon: const Icon(Icons.close, color: AppColors.foreground),
          onPressed: () => Navigator.of(context).pop(),
        ),
        actions: [
          TextButton(
            onPressed: _canSubmit && !_loading ? _submit : null,
            child: Text('Save',
                style: AppTextStyles.labelLarge.copyWith(
                  color: _canSubmit ? AppColors.primary : AppColors.mutedForeground,
                  fontWeight: FontWeight.w600,
                )),
          ),
        ],
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.fromLTRB(16, 8, 16, 32),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              '${widget.loan.remainingPaisas.formatPKR()} left of ${widget.loan.principalPaisas.formatPKR()}',
              style: AppTextStyles.bodySmall.copyWith(color: AppColors.mutedForeground),
            ),
            const SizedBox(height: 12),
            AppTextField(
              controller: _amountCtrl,
              hint: '0',
              keyboardType: const TextInputType.numberWithOptions(decimal: true),
              onChanged: (_) => setState(() {}),
            ),
            if (!_isTopUp) ...[
              const SizedBox(height: 6),
              const Text('Lower it to write off only part.', style: AppTextStyles.bodySmall),
            ],
            const SizedBox(height: 16),
            FormSection(
              title: 'When',
              children: [
                GestureDetector(
                  onTap: _pickDate,
                  child: Text(DateFormat('EEE, d MMM y').format(_date), style: AppTextStyles.bodyMedium),
                ),
                if (_offersEntry && _book)
                  BudgetPeriodField(
                    date: _date,
                    checked: _fileUnderDateBudget,
                    onChanged: (v) => setState(() => _fileUnderDateBudget = v),
                  ),
              ],
            ),
            const SizedBox(height: 16),
            if (_offersEntry)
              BookTransactionField(
                label: (!_isTopUp || _isGiven) ? 'an expense' : 'income',
                checked: _book,
                onChanged: (v) => setState(() => _book = v),
              )
            else
              Text(
                'Already counted when you created this loan. Nothing new is recorded in Expenses or Income.',
                style: AppTextStyles.bodySmall.copyWith(color: AppColors.mutedForeground),
              ),
            const SizedBox(height: 16),
            AppTextField(controller: _notesCtrl, hint: 'Notes (optional)'),
          ],
        ),
      ),
    );
  }
}
