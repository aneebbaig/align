import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../../core/errors/app_exception.dart';
import '../../../../core/extensions/currency_ext.dart';
import '../../../../core/services/toast_service.dart';
import '../../../../core/theme/app_colors.dart';
import '../../../../core/theme/app_text_styles.dart';
import '../../../../core/widgets/book_transaction_field.dart';
import '../../../../core/widgets/budget_period_field.dart';
import '../../../../core/widgets/day_strip.dart';
import '../../../budget/presentation/providers/budget_provider.dart';
import '../../../expenses/presentation/widgets/quick_add_helpers.dart';
import '../../../../core/widgets/form_section.dart';
import '../../../../core/widgets/funding_source_field.dart';
import '../../data/datasources/loans_datasource.dart';
import '../../domain/entities/loan_entity.dart';
import '../providers/loans_provider.dart';

class RecordPaymentPage extends ConsumerStatefulWidget {
  const RecordPaymentPage({required this.loan, this.editPayment, super.key});
  final LoanEntity loan;
  // When set, the page edits this existing payment instead of recording a new one.
  final LoanPaymentEntity? editPayment;

  @override
  ConsumerState<RecordPaymentPage> createState() => _RecordPaymentPageState();
}

class _RecordPaymentPageState extends ConsumerState<RecordPaymentPage> {
  late final TextEditingController _amountCtrl;
  late final _notesCtrl = TextEditingController(text: widget.editPayment?.notes ?? '');
  final _amountFocus = FocusNode();
  late DateTime _date = widget.editPayment?.date ?? DateTime.now();
  bool _fileUnderDateBudget = false;
  String? _fundingPotId;
  bool _bookTransaction = true;
  bool _loading = false;

  bool get _isEditing => widget.editPayment != null;

  @override
  void initState() {
    super.initState();
    // Pre-fill with the existing payment amount when editing, else the remaining balance.
    final prefill = (widget.editPayment?.amountPaisas ?? widget.loan.remainingPaisas) / 100;
    _amountCtrl = TextEditingController(
      text: prefill == prefill.truncateToDouble()
          ? prefill.toInt().toString()
          : prefill.toStringAsFixed(2),
    );
    WidgetsBinding.instance.addPostFrameCallback((_) {
      _amountFocus.requestFocus();
      _amountCtrl.selection = TextSelection(
        baseOffset: 0,
        extentOffset: _amountCtrl.text.length,
      );
    });
  }

  @override
  void dispose() {
    _amountCtrl.dispose();
    _notesCtrl.dispose();
    _amountFocus.dispose();
    super.dispose();
  }

  int? get _amountPaisas {
    final v = double.tryParse(_amountCtrl.text.trim());
    if (v == null || v <= 0) return null;
    return (v * 100).round();
  }

  bool get _canSubmit {
    final p = _amountPaisas;
    final cap = widget.loan.remainingPaisas + (widget.editPayment?.amountPaisas ?? 0);
    return p != null && p <= cap;
  }

  bool get _showBudgetChoice {
    final open = ref.read(budgetProvider).asData?.value;
    return needsBudgetChoice(_date, openMonth: open?.month, openYear: open?.year);
  }

  bool get _fileUnder => _showBudgetChoice && _fileUnderDateBudget;

  Future<void> _submit() async {
    final paisas = _amountPaisas;
    if (paisas == null) return;
    HapticFeedback.mediumImpact();

    setState(() => _loading = true);
    try {
      if (_isEditing) {
        await ref.read(loansDatasourceProvider).updatePayment(
              loanId: widget.loan.id,
              paymentId: widget.editPayment!.id,
              amountPaisas: paisas,
              date: _date,
              notes: _notesCtrl.text.trim().isNotEmpty ? _notesCtrl.text.trim() : null,
              budgetMonth: _fileUnder ? _date.month : null,
              budgetYear: _fileUnder ? _date.year : null,
              fundingPotId: widget.loan.type == 'RECEIVED' ? _fundingPotId : null,
            );
      } else {
        await ref.read(loansDatasourceProvider).recordPayment(
              loanId: widget.loan.id,
              amountPaisas: paisas,
              date: _date,
              notes: _notesCtrl.text.trim().isNotEmpty ? _notesCtrl.text.trim() : null,
              budgetMonth: _fileUnder ? _date.month : null,
              budgetYear: _fileUnder ? _date.year : null,
              fundingPotId: widget.loan.type == 'RECEIVED' ? _fundingPotId : null,
              skipTransaction: !_bookTransaction,
            );
      }

      if (!mounted) return;
      ref.invalidate(loansProvider);
      ref.read(toastServiceProvider).success(context, _isEditing ? 'Payment updated' : 'Payment recorded');
      HapticFeedback.lightImpact();
      Navigator.of(context).pop();
    } catch (e) {
      if (!mounted) return;
      setState(() => _loading = false);
      final msg = e is AppException ? e.message : 'Failed to record payment';
      ref.read(toastServiceProvider).error(context, msg);
    }
  }

  @override
  Widget build(BuildContext context) {
    final submitting = _loading;

    return Scaffold(
      backgroundColor: AppColors.background,
      resizeToAvoidBottomInset: true,
      appBar: AppBar(
        backgroundColor: AppColors.background,
        elevation: 0,
        title: Text(
          _isEditing ? 'Edit Payment' : 'Pay - ${widget.loan.personName}',
          style: AppTextStyles.headlineSmall,
        ),
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
                      child: CircularProgressIndicator(
                        strokeWidth: 2,
                        color: AppColors.primary,
                      ),
                    )
                  : Text(
                      _isEditing ? 'Save' : 'Record',
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
            // Remaining balance hint
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
              decoration: BoxDecoration(
                color: AppColors.card,
                borderRadius: BorderRadius.circular(8),
                border: Border.all(color: AppColors.border.withValues(alpha: 0.4)),
              ),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Text(
                    'Remaining balance',
                    style: AppTextStyles.bodySmall.copyWith(
                      color: AppColors.mutedForeground,
                    ),
                  ),
                  Text(
                    widget.loan.remainingPaisas.formatPKR(),
                    style: AppTextStyles.labelMedium.copyWith(
                      color: widget.loan.type == 'RECEIVED'
                          ? AppColors.destructive
                          : const Color(0xFFE67E22),
                    ),
                  ),
                ],
              ),
            ),

            const SizedBox(height: 16),

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

            FormSection(
              title: 'When',
              children: [
                DayStrip(
                  selected: _date,
                  onChanged: (d) {
                    _amountFocus.unfocus();
                    setState(() => _date = DateTime(d.year, d.month, d.day, _date.hour, _date.minute));
                  },
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

            if (!_isEditing) ...[
              const SizedBox(height: 16),
              Divider(color: AppColors.border.withValues(alpha: 0.4), height: 1),
              const SizedBox(height: 16),
              BookTransactionField(
                label: widget.loan.type == 'RECEIVED' ? 'an expense' : 'income',
                checked: _bookTransaction,
                onChanged: (v) => setState(() => _bookTransaction = v),
              ),
            ],

            if (_bookTransaction && widget.loan.type == 'RECEIVED') ...[
              const SizedBox(height: 16),
              Divider(color: AppColors.border.withValues(alpha: 0.4), height: 1),
              const SizedBox(height: 16),
              FundingSourceField(
                potId: _fundingPotId,
                onChanged: (potId) => setState(() => _fundingPotId = potId),
                month: _fileUnder ? _date.month : null,
                year: _fileUnder ? _date.year : null,
              ),
            ],

            const SizedBox(height: 20),
            Divider(color: AppColors.border.withValues(alpha: 0.4), height: 1),
            const SizedBox(height: 16),

            MoreOptions(
              children: [
                TextField(
                  controller: _notesCtrl,
                  style: AppTextStyles.bodyMedium,
                  maxLines: 1,
                  textCapitalization: TextCapitalization.sentences,
                  decoration: InputDecoration(
                    hintText: 'Notes (optional)',
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
