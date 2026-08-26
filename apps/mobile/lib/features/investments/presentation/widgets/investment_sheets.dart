import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../../core/errors/app_exception.dart';
import '../../../../core/extensions/currency_ext.dart';
import '../../../../core/services/toast_service.dart';
import '../../../../core/theme/app_colors.dart';
import '../../../../core/theme/app_text_styles.dart';
import '../../data/datasources/investments_datasource.dart';
import '../../domain/entities/investment_entity.dart';
import '../pages/investments_page.dart' show shortDate, typeIcon;
import '../providers/investments_provider.dart';

const _typeOptions = [
  ('MUTUAL_FUND', 'Mutual Fund'),
  ('STOCKS', 'Stocks'),
  ('GOLD', 'Gold'),
  ('CRYPTO', 'Crypto'),
  ('FIXED_DEPOSIT', 'Fixed Deposit'),
  ('OTHER', 'Other'),
];

int? _toPaisas(String s) {
  final v = double.tryParse(s.trim());
  if (v == null || v <= 0) return null;
  return (v * 100).round();
}

Future<void> _sheet(BuildContext context, Widget child) => showModalBottomSheet<void>(
      context: context,
      isScrollControlled: true,
      backgroundColor: AppColors.popover,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(16)),
      ),
      builder: (_) => Padding(
        padding: EdgeInsets.only(bottom: MediaQuery.of(context).viewInsets.bottom),
        child: child,
      ),
    );

void showLogContributionSheet(BuildContext context, WidgetRef ref, InvestmentEntity inv) =>
    _sheet(context, _AddMoneySheet(name: inv.name, investment: inv));

// Add money to a plan category that has no linked Investment yet - the
// datasource lazily creates one on the server. This is how "add to plan,
// then add money" is funded for the first time.
void showAddMoneyToCategorySheet(BuildContext context, WidgetRef ref, PlanCategoryEntity category) =>
    _sheet(context, _AddMoneySheet(name: category.name, category: category));

void showUpdateValueSheet(BuildContext context, WidgetRef ref, InvestmentEntity inv) =>
    _sheet(context, _UpdateValueSheet(inv: inv));

void showPlanEditorSheet(BuildContext context, WidgetRef ref, InvestmentPlanEntity? plan) =>
    _sheet(context, _PlanEditorSheet(plan: plan));

void showHistorySheet(BuildContext context, WidgetRef ref, InvestmentEntity inv) =>
    _sheet(context, _HistorySheet(inv: inv));

// ── shared field ─────────────────────────────────────────────────────────────

class _Field extends StatelessWidget {
  const _Field({
    required this.controller,
    required this.hint,
    this.keyboardType,
    this.prefix,
    this.autofocus = false,
    this.onChanged,
  });
  final TextEditingController controller;
  final String hint;
  final TextInputType? keyboardType;
  final String? prefix;
  final bool autofocus;
  final VoidCallback? onChanged;

  @override
  Widget build(BuildContext context) => TextField(
        controller: controller,
        autofocus: autofocus,
        keyboardType: keyboardType,
        style: AppTextStyles.bodyMedium,
        onChanged: onChanged != null ? (_) => onChanged!() : null,
        decoration: InputDecoration(
          hintText: hint,
          prefixText: prefix,
          prefixStyle: AppTextStyles.bodyMedium.copyWith(color: AppColors.mutedForeground),
          hintStyle: AppTextStyles.bodyMedium.copyWith(color: AppColors.mutedForeground),
          filled: true,
          fillColor: AppColors.card,
          contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 12),
          border: _border(0.5),
          enabledBorder: _border(0.5),
          focusedBorder: _border(0.6, AppColors.primary),
        ),
      );

  OutlineInputBorder _border(double a, [Color? c]) => OutlineInputBorder(
        borderRadius: BorderRadius.circular(8),
        borderSide: BorderSide(color: (c ?? AppColors.border).withValues(alpha: a)),
      );
}

class _SheetHeader extends StatelessWidget {
  const _SheetHeader({required this.title, required this.onSubmit, required this.canSubmit, required this.loading, this.submitLabel = 'Save'});
  final String title;
  final VoidCallback onSubmit;
  final bool canSubmit;
  final bool loading;
  final String submitLabel;

  @override
  Widget build(BuildContext context) => Row(
        children: [
          Expanded(child: Text(title, style: AppTextStyles.bodyLarge.copyWith(fontWeight: FontWeight.w600))),
          TextButton(
            onPressed: canSubmit && !loading ? onSubmit : null,
            child: loading
                ? const SizedBox(width: 16, height: 16, child: CircularProgressIndicator(strokeWidth: 2, color: AppColors.primary))
                : Text(submitLabel, style: AppTextStyles.labelLarge.copyWith(
                    color: canSubmit ? AppColors.primary : AppColors.mutedForeground,
                    fontWeight: FontWeight.w600,
                  )),
          ),
        ],
      );
}

Future<DateTime?> _pickDate(BuildContext context, DateTime initial) => showDatePicker(
      context: context,
      initialDate: initial,
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

Widget _dateButton(BuildContext context, DateTime date, VoidCallback onTap) => GestureDetector(
      onTap: onTap,
      child: Container(
        width: double.infinity,
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 14),
        decoration: BoxDecoration(
          color: AppColors.card,
          borderRadius: BorderRadius.circular(8),
          border: Border.all(color: AppColors.border.withValues(alpha: 0.5)),
        ),
        child: Text(shortDate(date), style: AppTextStyles.bodyMedium),
      ),
    );

// ── Add money ─────────────────────────────────────────────────────────────
// Works whether the target already has a linked Investment (log a top-up)
// or is a plan category with no money in it yet (lazily creates the SIP on
// the server via addMoneyToCategory).

class _AddMoneySheet extends ConsumerStatefulWidget {
  const _AddMoneySheet({required this.name, this.investment, this.category});
  final String name;
  final InvestmentEntity? investment;
  final PlanCategoryEntity? category;
  @override
  ConsumerState<_AddMoneySheet> createState() => _AddMoneySheetState();
}

class _AddMoneySheetState extends ConsumerState<_AddMoneySheet> {
  final _amount = TextEditingController();
  final _notes = TextEditingController();
  DateTime _date = DateTime.now();
  bool _loading = false;

  @override
  void dispose() {
    _amount.dispose();
    _notes.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    final paisas = _toPaisas(_amount.text);
    if (paisas == null) return;
    setState(() => _loading = true);
    try {
      HapticFeedback.mediumImpact();
      final ds = ref.read(investmentsDatasourceProvider);
      if (widget.investment != null) {
        await ds.logContribution(
          investmentId: widget.investment!.id,
          amountPaisas: paisas,
          date: _date,
          notes: _notes.text.trim(),
        );
      } else {
        await ds.addMoneyToCategory(
          planCategoryId: widget.category!.id,
          amountPaisas: paisas,
          date: _date,
          notes: _notes.text.trim(),
        );
      }
      ref.invalidate(investmentsProvider);
      if (mounted) {
        ref.read(toastServiceProvider).success(context, 'Money added');
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
          _SheetHeader(
            title: 'Add money — ${widget.name}',
            onSubmit: _submit,
            canSubmit: _toPaisas(_amount.text) != null,
            loading: _loading,
            submitLabel: 'Add',
          ),
          const SizedBox(height: 16),
          _Field(controller: _amount, hint: '0', prefix: 'Rs ', autofocus: true,
              keyboardType: const TextInputType.numberWithOptions(decimal: true),
              onChanged: () => setState(() {})),
          const SizedBox(height: 12),
          _dateButton(context, _date, () async {
            final p = await _pickDate(context, _date);
            if (p != null) setState(() => _date = p);
          }),
          const SizedBox(height: 12),
          _Field(controller: _notes, hint: 'Notes (optional)'),
        ],
      ),
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
  late final _value = TextEditingController(text: (widget.inv.currentValuePaisas / 100).toStringAsFixed(0));
  bool _loading = false;

  @override
  void dispose() {
    _value.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    final paisas = _toPaisas(_value.text);
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
          _SheetHeader(
            title: 'Update value — ${widget.inv.name}',
            onSubmit: _submit,
            canSubmit: _toPaisas(_value.text) != null,
            loading: _loading,
          ),
          const SizedBox(height: 8),
          const Text('What it is worth now (mark-to-market)', style: AppTextStyles.bodySmall),
          const SizedBox(height: 12),
          _Field(controller: _value, hint: '0', prefix: 'Rs ', autofocus: true,
              keyboardType: const TextInputType.numberWithOptions(decimal: true),
              onChanged: () => setState(() {})),
        ],
      ),
    );
  }
}

// ── Plan editor ──────────────────────────────────────────────────────────────
// Add/edit/remove the investments in the plan (name + type + optional target
// %). This is the only way to add a new investment - money then gets added
// into it separately via _AddMoneySheet. Mirrors the web plan editor dialog.

class _EditableCategory {
  _EditableCategory({this.id, required this.name, required this.type, required this.percentage, this.actualPaisas = 0});
  final String? id;
  String name;
  String type;
  String percentage;
  final int actualPaisas;
}

class _PlanEditorSheet extends ConsumerStatefulWidget {
  const _PlanEditorSheet({required this.plan});
  final InvestmentPlanEntity? plan;
  @override
  ConsumerState<_PlanEditorSheet> createState() => _PlanEditorSheetState();
}

class _PlanEditorSheetState extends ConsumerState<_PlanEditorSheet> {
  late final _target = TextEditingController(
    text: widget.plan != null ? (widget.plan!.monthlyTargetPaisas / 100).toStringAsFixed(0) : '',
  );
  late bool _autoFromSurplus = widget.plan?.autoFromSurplus ?? true;
  late final List<_EditableCategory> _categories = widget.plan != null && widget.plan!.categories.isNotEmpty
      ? widget.plan!.categories
          .map((c) => _EditableCategory(
                id: c.id,
                name: c.name,
                type: c.investmentType ?? 'OTHER',
                percentage: c.percentage.toString(),
                actualPaisas: c.actualPaisas,
              ))
          .toList()
      : [];
  bool _loading = false;

  @override
  void dispose() {
    _target.dispose();
    super.dispose();
  }

  int get _pctTotal => _categories.fold(0, (s, c) => s + (int.tryParse(c.percentage) ?? 0));

  Future<void> _removeCategory(int i) async {
    final cat = _categories[i];
    if (cat.actualPaisas > 0) {
      final ok = await showDialog<bool>(
        context: context,
        builder: (ctx) => AlertDialog(
          backgroundColor: AppColors.card,
          title: const Text('Remove this investment?', style: AppTextStyles.bodyLarge),
          content: Text(
            'It already has ${cat.actualPaisas.formatPKR()} logged against it - removing it on save also clears its full contribution history.',
            style: AppTextStyles.bodySmall,
          ),
          actions: [
            TextButton(onPressed: () => Navigator.pop(ctx, false), child: const Text('Cancel')),
            TextButton(
              onPressed: () => Navigator.pop(ctx, true),
              child: const Text('Remove', style: TextStyle(color: AppColors.destructive)),
            ),
          ],
        ),
      );
      if (ok != true) return;
    }
    setState(() => _categories.removeAt(i));
  }

  Future<void> _submit() async {
    setState(() => _loading = true);
    try {
      HapticFeedback.mediumImpact();
      await ref.read(investmentsDatasourceProvider).savePlan(
            monthlyTargetPaisas: _toPaisas(_target.text) ?? 0,
            autoFromSurplus: _autoFromSurplus,
            categories: _categories
                .where((c) => c.name.trim().isNotEmpty)
                .map((c) => (
                      id: c.id,
                      name: c.name.trim(),
                      investmentType: c.type,
                      percentage: int.tryParse(c.percentage) ?? 0,
                    ))
                .toList(),
          );
      ref.invalidate(investmentsProvider);
      if (mounted) {
        ref.read(toastServiceProvider).success(context, 'Plan saved');
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
      child: SingleChildScrollView(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            _SheetHeader(title: 'Investment Plan', onSubmit: _submit, canSubmit: true, loading: _loading),
            const SizedBox(height: 16),
            Row(
              children: [
                const Expanded(child: Text('Auto-suggest from surplus', style: AppTextStyles.bodyMedium)),
                Switch(
                  value: _autoFromSurplus,
                  activeThumbColor: AppColors.primary,
                  onChanged: (v) => setState(() => _autoFromSurplus = v),
                ),
              ],
            ),
            if (!_autoFromSurplus) ...[
              const SizedBox(height: 8),
              _Field(controller: _target, hint: 'Monthly target', prefix: 'Rs ',
                  keyboardType: const TextInputType.numberWithOptions(decimal: true)),
            ],
            const SizedBox(height: 16),
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                const Text('Investments', style: AppTextStyles.bodyMedium),
                Text(
                  '$_pctTotal% of 100%${_pctTotal != 100 ? ' (FYI only)' : ''}',
                  style: AppTextStyles.labelSmall.copyWith(
                    color: _pctTotal == 100 ? AppColors.mutedForeground : AppColors.warning,
                  ),
                ),
              ],
            ),
            const SizedBox(height: 8),
            ..._categories.asMap().entries.map((e) => Padding(
                  padding: const EdgeInsets.only(bottom: 10),
                  child: _CategoryRow(
                    category: e.value,
                    onChanged: (patch) => setState(() {
                      if (patch.name != null) e.value.name = patch.name!;
                      if (patch.type != null) e.value.type = patch.type!;
                      if (patch.percentage != null) e.value.percentage = patch.percentage!;
                    }),
                    onRemove: () => _removeCategory(e.key),
                  ),
                )),
            OutlinedButton.icon(
              onPressed: () => setState(() => _categories.add(_EditableCategory(name: '', type: 'MUTUAL_FUND', percentage: '0'))),
              icon: const Icon(Icons.add, size: 16),
              label: const Text('Add investment'),
              style: OutlinedButton.styleFrom(
                foregroundColor: AppColors.primary,
                side: BorderSide(color: AppColors.primary.withValues(alpha: 0.4)),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _CategoryPatch {
  const _CategoryPatch({this.name, this.type, this.percentage});
  final String? name;
  final String? type;
  final String? percentage;
}

class _CategoryRow extends StatelessWidget {
  const _CategoryRow({required this.category, required this.onChanged, required this.onRemove});
  final _EditableCategory category;
  final ValueChanged<_CategoryPatch> onChanged;
  final VoidCallback onRemove;

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        Expanded(
          flex: 2,
          child: TextFormField(
            initialValue: category.name,
            style: AppTextStyles.bodySmall,
            decoration: const InputDecoration(hintText: 'Name', isDense: true),
            onChanged: (v) => onChanged(_CategoryPatch(name: v)),
          ),
        ),
        const SizedBox(width: 8),
        Expanded(child: _TypeDropdown(value: category.type, onChanged: (v) => onChanged(_CategoryPatch(type: v)))),
        const SizedBox(width: 8),
        SizedBox(
          width: 56,
          child: TextFormField(
            initialValue: category.percentage,
            style: AppTextStyles.bodySmall,
            keyboardType: TextInputType.number,
            decoration: const InputDecoration(hintText: '%', isDense: true),
            onChanged: (v) => onChanged(_CategoryPatch(percentage: v)),
          ),
        ),
        IconButton(
          onPressed: onRemove,
          icon: const Icon(Icons.close, size: 16, color: AppColors.mutedForeground),
        ),
      ],
    );
  }
}

class _TypeDropdown extends StatelessWidget {
  const _TypeDropdown({required this.value, required this.onChanged});
  final String value;
  final ValueChanged<String> onChanged;

  @override
  Widget build(BuildContext context) => Container(
        padding: const EdgeInsets.symmetric(horizontal: 12),
        decoration: BoxDecoration(
          color: AppColors.card,
          borderRadius: BorderRadius.circular(8),
          border: Border.all(color: AppColors.border.withValues(alpha: 0.5)),
        ),
        child: DropdownButtonHideUnderline(
          child: DropdownButton<String>(
            value: value,
            isExpanded: true,
            dropdownColor: AppColors.popover,
            style: AppTextStyles.bodyMedium,
            icon: const Icon(Icons.expand_more, color: AppColors.mutedForeground),
            items: _typeOptions
                .map((t) => DropdownMenuItem(
                      value: t.$1,
                      child: Row(children: [
                        Icon(typeIcon(t.$1), size: 16, color: AppColors.mutedForeground),
                        const SizedBox(width: 10),
                        Text(t.$2),
                      ]),
                    ))
                .toList(),
            onChanged: (v) => v != null ? onChanged(v) : null,
          ),
        ),
      );
}

// ── History ──────────────────────────────────────────────────────────────────

class _HistorySheet extends ConsumerWidget {
  const _HistorySheet({required this.inv});
  final InvestmentEntity inv;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    return Padding(
      padding: const EdgeInsets.fromLTRB(16, 16, 16, 24),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text('History — ${inv.name}', style: AppTextStyles.bodyLarge.copyWith(fontWeight: FontWeight.w600)),
          const SizedBox(height: 12),
          ...inv.contributions.map((c) => Padding(
                padding: const EdgeInsets.symmetric(vertical: 6),
                child: Row(
                  children: [
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(c.amountPaisas.formatPKR(),
                              style: AppTextStyles.bodyMedium.copyWith(fontWeight: FontWeight.w600)),
                          Text(shortDate(c.date) + (c.notes != null && c.notes!.isNotEmpty ? ' · ${c.notes}' : ''),
                              style: AppTextStyles.bodySmall),
                        ],
                      ),
                    ),
                    IconButton(
                      icon: const Icon(Icons.delete_outline, size: 18, color: AppColors.mutedForeground),
                      onPressed: () async {
                        try {
                          await ref.read(investmentsDatasourceProvider).deleteContribution(
                                investmentId: inv.id,
                                contributionId: c.id,
                              );
                          ref.invalidate(investmentsProvider);
                          if (context.mounted) Navigator.pop(context);
                        } catch (e) {
                          if (context.mounted) {
                            ref.read(toastServiceProvider).error(
                                context, e is AppException ? e.message : 'Failed');
                          }
                        }
                      },
                    ),
                  ],
                ),
              )),
        ],
      ),
    );
  }
}
