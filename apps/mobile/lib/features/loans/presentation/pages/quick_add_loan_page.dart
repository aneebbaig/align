import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';

import '../../../../core/errors/app_exception.dart';
import '../../../../core/services/toast_service.dart';
import '../../../../core/theme/app_colors.dart';
import '../../../../core/theme/app_text_styles.dart';
import '../../../../core/widgets/book_transaction_field.dart';
import '../../../../core/widgets/budget_period_field.dart';
import '../../../../core/widgets/form_section.dart';
import '../../data/datasources/loans_datasource.dart';
import '../providers/loans_provider.dart';

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

  int? get _amountPaisas {
    final v = double.tryParse(_amountCtrl.text.trim());
    if (v == null || v <= 0) return null;
    return (v * 100).round();
  }

  void _close() {
    if (Navigator.of(context).canPop()) {
      Navigator.of(context).pop();
    } else {
      context.go('/dashboard');
    }
  }

  bool get _canSubmit =>
      _nameCtrl.text.trim().isNotEmpty && _amountPaisas != null;

  Future<void> _pickDate(bool isDue) async {
    final now = DateTime.now();
    final picked = await showDatePicker(
      context: context,
      initialDate: isDue ? (_dueDate ?? now) : _date,
      firstDate: isDue ? now : DateTime(2020),
      lastDate: isDue ? DateTime(2030) : now,
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
      if (isDue) {
        _dueDate = picked;
      } else {
        _date = picked;
      }
    });
  }

  Future<void> _submit() async {
    final paisas = _amountPaisas;
    if (paisas == null || _nameCtrl.text.trim().isEmpty) return;
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
            budgetMonth: _fileUnderDateBudget ? _date.month : null,
            budgetYear: _fileUnderDateBudget ? _date.year : null,
            skipTransaction: !_bookTransaction,
          );

      if (!mounted) return;
      ref.invalidate(loansProvider);
      ref.read(toastServiceProvider).success(context, 'Loan created');
      HapticFeedback.lightImpact();
      _close();
    } catch (e) {
      if (!mounted) return;
      setState(() => _loading = false);
      final msg = e is AppException ? e.message : 'Failed to create loan';
      ref.read(toastServiceProvider).error(context, msg);
    }
  }

  @override
  Widget build(BuildContext context) {
    final creating = _loading;
    final dateLabel = DateFormat('d MMM y').format(_date);
    final isToday = _date.year == DateTime.now().year &&
        _date.month == DateTime.now().month &&
        _date.day == DateTime.now().day;

    return Scaffold(
      backgroundColor: AppColors.background,
      resizeToAvoidBottomInset: true,
      appBar: AppBar(
        backgroundColor: AppColors.background,
        elevation: 0,
        title: const Text('New Loan', style: AppTextStyles.headlineSmall),
        leading: IconButton(
          icon: const Icon(Icons.close, color: AppColors.foreground),
          onPressed: () => Navigator.of(context).pop(),
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
                      'Create',
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
            TextField(
              controller: _amountCtrl,
              keyboardType: const TextInputType.numberWithOptions(decimal: true),
              inputFormatters: [_DecimalFormatter()],
              style: AppTextStyles.displayLarge.copyWith(
                color: _type == 'RECEIVED'
                    ? AppColors.destructive
                    : const Color(0xFFE67E22),
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

            // Person name
            _Field(
              controller: _nameCtrl,
              focusNode: _nameFocus,
              hint: 'Person name',
              onChanged: () => setState(() {}),
            ),

            const SizedBox(height: 20),
            Divider(color: AppColors.border.withValues(alpha: 0.4), height: 1),
            const SizedBox(height: 16),

            FormSection(
              title: 'When',
              children: [
                _DateButton(
                  label: isToday ? 'Today' : dateLabel,
                  onTap: () => _pickDate(false),
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
                _Field(
                  controller: _descCtrl,
                  hint: 'Description (optional)',
                ),
                _DateButton(
                  label: _dueDate != null
                      ? 'Due ${DateFormat('d MMM y').format(_dueDate!)}'
                      : 'Due date (optional)',
                  muted: _dueDate == null,
                  onTap: () => _pickDate(true),
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

class _Field extends StatelessWidget {
  const _Field({
    required this.controller,
    required this.hint,
    this.focusNode,
    this.onChanged,
  });
  final TextEditingController controller;
  final String hint;
  final FocusNode? focusNode;
  final VoidCallback? onChanged;

  @override
  Widget build(BuildContext context) => TextField(
        controller: controller,
        focusNode: focusNode,
        style: AppTextStyles.bodyMedium,
        textCapitalization: TextCapitalization.words,
        onChanged: onChanged != null ? (_) => onChanged!() : null,
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

class _DateButton extends StatelessWidget {
  const _DateButton({required this.label, required this.onTap, this.muted = false});
  final String label;
  final VoidCallback onTap;
  final bool muted;

  @override
  Widget build(BuildContext context) => GestureDetector(
        onTap: onTap,
        child: Container(
          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 14),
          decoration: BoxDecoration(
            color: AppColors.card,
            borderRadius: BorderRadius.circular(8),
            border: Border.all(color: AppColors.border.withValues(alpha: 0.5)),
          ),
          child: Text(
            label,
            style: AppTextStyles.bodyMedium.copyWith(
              color: muted ? AppColors.mutedForeground : AppColors.foreground,
            ),
            overflow: TextOverflow.ellipsis,
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
