import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';

import '../../../../core/errors/app_exception.dart';
import '../../../../core/services/toast_service.dart';
import '../../../../core/theme/app_colors.dart';
import '../../../../core/theme/app_text_styles.dart';
import '../../data/datasources/loans_datasource.dart';
import '../../domain/entities/loan_entity.dart';
import '../providers/loans_provider.dart';

class AddSchedulePage extends ConsumerStatefulWidget {
  const AddSchedulePage({required this.loan, super.key});
  final LoanEntity loan;

  @override
  ConsumerState<AddSchedulePage> createState() => _AddSchedulePageState();
}

class _AddSchedulePageState extends ConsumerState<AddSchedulePage> {
  final _amountCtrl = TextEditingController();
  final _amountFocus = FocusNode();
  String _kind = 'LUMP_SUM';
  String _flexibility = 'FIXED';
  DateTime _startDate = DateTime.now();
  DateTime? _endDate;
  bool _loading = false;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) => _amountFocus.requestFocus());
  }

  @override
  void dispose() {
    _amountCtrl.dispose();
    _amountFocus.dispose();
    super.dispose();
  }

  int? get _amountPaisas {
    final v = double.tryParse(_amountCtrl.text.trim());
    if (v == null || v <= 0) return null;
    return (v * 100).round();
  }

  bool get _canSubmit =>
      _amountPaisas != null && (_kind == 'LUMP_SUM' || _endDate != null);

  Future<void> _pickDate({required bool isStart}) async {
    _amountFocus.unfocus();
    final picked = await showDatePicker(
      context: context,
      initialDate: isStart ? _startDate : (_endDate ?? _startDate),
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
    if (picked == null) return;
    setState(() {
      if (isStart) {
        _startDate = picked;
      } else {
        _endDate = picked;
      }
    });
  }

  Future<void> _submit() async {
    final paisas = _amountPaisas;
    if (paisas == null) return;
    HapticFeedback.mediumImpact();

    setState(() => _loading = true);
    try {
      await ref.read(loansDatasourceProvider).createSchedule(
            loanId: widget.loan.id,
            kind: _kind,
            amountPaisas: paisas,
            startDate: _startDate,
            endDate: _kind == 'FIXED_INSTALLMENT' ? _endDate : null,
            flexibility: _flexibility,
          );

      if (!mounted) return;
      ref.invalidate(loansProvider);
      ref.read(toastServiceProvider).success(context, 'Repayment schedule added');
      HapticFeedback.lightImpact();
      Navigator.of(context).pop();
    } catch (e) {
      if (!mounted) return;
      setState(() => _loading = false);
      final msg = e is AppException ? e.message : 'Failed to add schedule';
      ref.read(toastServiceProvider).error(context, msg);
    }
  }

  @override
  Widget build(BuildContext context) {
    final submitting = _loading;
    final startLabel = DateFormat('EEE, d MMM y').format(_startDate);
    final endLabel = _endDate != null ? DateFormat('EEE, d MMM y').format(_endDate!) : 'Select';

    return Scaffold(
      backgroundColor: AppColors.background,
      resizeToAvoidBottomInset: true,
      appBar: AppBar(
        backgroundColor: AppColors.background,
        elevation: 0,
        title: Text(
          'Repayment Plan - ${widget.loan.personName}',
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
            Text(
              _kind == 'LUMP_SUM' ? 'One-time lump sum' : 'Amount per installment',
              style: AppTextStyles.bodySmall.copyWith(color: AppColors.mutedForeground),
            ),

            const SizedBox(height: 16),
            Divider(color: AppColors.border.withValues(alpha: 0.4), height: 1),
            const SizedBox(height: 16),

            Row(
              children: [
                Expanded(
                  child: _KindChip(
                    label: 'Lump sum',
                    selected: _kind == 'LUMP_SUM',
                    onTap: () => setState(() => _kind = 'LUMP_SUM'),
                  ),
                ),
                const SizedBox(width: 8),
                Expanded(
                  child: _KindChip(
                    label: 'Fixed installments',
                    selected: _kind == 'FIXED_INSTALLMENT',
                    onTap: () => setState(() => _kind = 'FIXED_INSTALLMENT'),
                  ),
                ),
              ],
            ),

            const SizedBox(height: 16),

            GestureDetector(
              onTap: () => _pickDate(isStart: true),
              child: _DateBox(label: _kind == 'LUMP_SUM' ? 'Due date' : 'Starts', dateLabel: startLabel),
            ),

            if (_kind == 'FIXED_INSTALLMENT') ...[
              const SizedBox(height: 10),
              GestureDetector(
                onTap: () => _pickDate(isStart: false),
                child: _DateBox(label: 'Ends', dateLabel: endLabel),
              ),
            ],

            const SizedBox(height: 16),
            Divider(color: AppColors.border.withValues(alpha: 0.4), height: 1),
            const SizedBox(height: 8),

            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text('Flexible timing', style: AppTextStyles.bodyMedium),
                    Text(
                      'Allow this to slide to a nearby month if cash is tight',
                      style: AppTextStyles.bodySmall.copyWith(color: AppColors.mutedForeground),
                    ),
                  ],
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

class _KindChip extends StatelessWidget {
  const _KindChip({required this.label, required this.selected, required this.onTap});
  final String label;
  final bool selected;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) => GestureDetector(
        onTap: onTap,
        child: Container(
          padding: const EdgeInsets.symmetric(vertical: 12),
          alignment: Alignment.center,
          decoration: BoxDecoration(
            color: selected ? AppColors.primary.withValues(alpha: 0.15) : AppColors.card,
            borderRadius: BorderRadius.circular(8),
            border: Border.all(
              color: selected ? AppColors.primary : AppColors.border.withValues(alpha: 0.5),
            ),
          ),
          child: Text(
            label,
            style: AppTextStyles.labelMedium.copyWith(
              color: selected ? AppColors.primary : AppColors.foreground,
              fontWeight: selected ? FontWeight.w600 : FontWeight.w400,
            ),
          ),
        ),
      );
}

class _DateBox extends StatelessWidget {
  const _DateBox({required this.label, required this.dateLabel});
  final String label;
  final String dateLabel;

  @override
  Widget build(BuildContext context) => Container(
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
            Text(label, style: AppTextStyles.bodyMedium.copyWith(color: AppColors.mutedForeground)),
            const Spacer(),
            Text(dateLabel, style: AppTextStyles.bodyMedium),
            const SizedBox(width: 6),
            const Icon(Icons.keyboard_arrow_down, size: 16, color: AppColors.mutedForeground),
          ],
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
