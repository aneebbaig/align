import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../../core/errors/app_exception.dart';
import '../../../../core/services/toast_service.dart';
import '../../../../core/theme/app_colors.dart';
import '../../../../core/theme/app_text_styles.dart';
import '../../data/datasources/cashflow_datasource.dart';
import '../providers/recurring_income_provider.dart';

class AddRecurringIncomePage extends ConsumerStatefulWidget {
  const AddRecurringIncomePage({super.key});

  @override
  ConsumerState<AddRecurringIncomePage> createState() => _AddRecurringIncomePageState();
}

class _AddRecurringIncomePageState extends ConsumerState<AddRecurringIncomePage> {
  final _amountCtrl = TextEditingController();
  final _labelCtrl = TextEditingController();
  final _amountFocus = FocusNode();
  String _kind = 'SALARY';
  bool _countsTowardFloor = true;
  bool _loading = false;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) => _amountFocus.requestFocus());
  }

  @override
  void dispose() {
    _amountCtrl.dispose();
    _labelCtrl.dispose();
    _amountFocus.dispose();
    super.dispose();
  }

  int? get _amountPaisas {
    final v = double.tryParse(_amountCtrl.text.trim());
    if (v == null || v <= 0) return null;
    return (v * 100).round();
  }

  bool get _canSubmit => _amountPaisas != null && _labelCtrl.text.trim().isNotEmpty;

  Future<void> _submit() async {
    final paisas = _amountPaisas;
    final label = _labelCtrl.text.trim();
    if (paisas == null || label.isEmpty) return;
    HapticFeedback.mediumImpact();

    setState(() => _loading = true);
    try {
      await ref.read(cashflowDatasourceProvider).createRecurringIncome(
            label: label,
            kind: _kind,
            amountPaisas: paisas,
            variable: _kind == 'FREELANCE',
            countsTowardFloor: _countsTowardFloor,
          );

      if (!mounted) return;
      ref.invalidate(recurringIncomesProvider);
      ref.read(toastServiceProvider).success(context, 'Recurring income added');
      HapticFeedback.lightImpact();
      Navigator.of(context).pop();
    } catch (e) {
      if (!mounted) return;
      setState(() => _loading = false);
      final msg = e is AppException ? e.message : 'Failed to add recurring income';
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
        title: const Text('Recurring Income', style: AppTextStyles.headlineSmall),
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
                color: const Color(0xFF4CAF50),
                letterSpacing: -1,
              ),
              decoration: InputDecoration(
                prefixText: _kind == 'FREELANCE' ? '≥ Rs ' : '+ Rs ',
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
            Text(
              _kind == 'FREELANCE' ? 'Guaranteed floor per month' : 'Fixed amount per month',
              style: AppTextStyles.bodySmall.copyWith(color: AppColors.mutedForeground),
            ),

            const SizedBox(height: 16),
            Divider(color: AppColors.border.withValues(alpha: 0.4), height: 1),
            const SizedBox(height: 16),

            TextField(
              controller: _labelCtrl,
              style: AppTextStyles.bodyMedium,
              maxLines: 1,
              textCapitalization: TextCapitalization.sentences,
              decoration: InputDecoration(
                hintText: 'Label (e.g. Salary, Freelance)',
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

            const SizedBox(height: 16),

            Row(
              children: [
                Expanded(
                  child: _KindChip(
                    label: 'Salary',
                    selected: _kind == 'SALARY',
                    onTap: () => setState(() => _kind = 'SALARY'),
                  ),
                ),
                const SizedBox(width: 8),
                Expanded(
                  child: _KindChip(
                    label: 'Freelance',
                    selected: _kind == 'FREELANCE',
                    onTap: () => setState(() => _kind = 'FREELANCE'),
                  ),
                ),
                const SizedBox(width: 8),
                Expanded(
                  child: _KindChip(
                    label: 'Other',
                    selected: _kind == 'OTHER',
                    onTap: () => setState(() => _kind = 'OTHER'),
                  ),
                ),
              ],
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
                      const Text('Counts toward safety floor', style: AppTextStyles.bodyMedium),
                      Text(
                        'Included in the conservative debt-service baseline',
                        style: AppTextStyles.bodySmall.copyWith(color: AppColors.mutedForeground),
                      ),
                    ],
                  ),
                ),
                Switch(
                  value: _countsTowardFloor,
                  activeTrackColor: AppColors.primary,
                  onChanged: (v) => setState(() => _countsTowardFloor = v),
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

class _DecimalFormatter extends TextInputFormatter {
  @override
  TextEditingValue formatEditUpdate(TextEditingValue old, TextEditingValue val) {
    final text = val.text;
    if (text.isEmpty) return val;
    if (!RegExp(r'^\d{0,9}(\.\d{0,2})?$').hasMatch(text)) return old;
    return val;
  }
}
