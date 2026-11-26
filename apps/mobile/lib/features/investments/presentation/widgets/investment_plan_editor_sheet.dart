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
import '../../../../core/widgets/sheet_header.dart';
import '../../data/datasources/investments_datasource.dart';
import '../../domain/entities/investment_entity.dart';
import 'investment_cards.dart' show typeIcon;
import '../providers/investments_provider.dart';

const _typeOptions = [
  ('MUTUAL_FUND', 'Mutual Fund'),
  ('STOCKS', 'Stocks'),
  ('GOLD', 'Gold'),
  ('CRYPTO', 'Crypto'),
  ('FIXED_DEPOSIT', 'Fixed Deposit'),
  ('OTHER', 'Other'),
];

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

class PlanEditorSheet extends ConsumerStatefulWidget {
  const PlanEditorSheet({required this.plan, super.key});
  final InvestmentPlanEntity? plan;
  @override
  ConsumerState<PlanEditorSheet> createState() => PlanEditorSheetState();
}

class PlanEditorSheetState extends ConsumerState<PlanEditorSheet> {
  late final _target = TextEditingController(
    text: widget.plan != null ? paisasToFieldText(widget.plan!.monthlyTargetPaisas) : '',
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
      final ok = await confirmDestructive(
        context,
        title: 'Remove this investment?',
        body:
            'It already has ${cat.actualPaisas.formatPKR()} logged against it - removing it on save also clears its full contribution history.',
        confirmLabel: 'Remove',
      );
      if (!ok) return;
    }
    setState(() => _categories.removeAt(i));
  }

  Future<void> _submit() async {
    setState(() => _loading = true);
    try {
      HapticFeedback.mediumImpact();
      await ref.read(investmentsDatasourceProvider).savePlan(
            monthlyTargetPaisas: parseAmount(_target.text).paisas ?? 0,
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
            SheetHeader(title: 'Investment Plan', onSubmit: _submit, canSubmit: true, loading: _loading),
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
              AmountExprField(controller: _target, hint: 'Monthly target'),
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
