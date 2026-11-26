import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../../core/extensions/currency_ext.dart';
import '../../../../core/theme/app_colors.dart';
import '../../../../core/theme/app_text_styles.dart';
import '../../../../core/extensions/datetime_ext.dart';
import '../../../../core/widgets/app_card.dart';
import '../../../../core/widgets/app_sheet.dart';
import '../../../../core/widgets/app_text_field.dart';
import '../../../../core/widgets/amount_expr_field.dart';
import '../../../../core/widgets/sheet_header.dart';
import '../../domain/entities/planner_entity.dart';
import 'planner_sheet_common.dart';

class GoalsSheet extends ConsumerStatefulWidget {
  const GoalsSheet({required this.row, super.key});
  final PlannerRowEntity row;

  @override
  ConsumerState<GoalsSheet> createState() => GoalsSheetState();
}

class GoalsSheetState extends ConsumerState<GoalsSheet> {
  final _name = TextEditingController();
  final _amount = TextEditingController();
  final _note = TextEditingController();
  PlannerGoalEntity? _editing;
  // The month the goal is (or will be) in - change it to move a goal.
  late DateTime _month = widget.row.date;
  bool _loading = false;

  @override
  void dispose() {
    _name.dispose();
    _amount.dispose();
    _note.dispose();
    super.dispose();
  }

  bool get _canSubmit => _name.text.trim().isNotEmpty && (plannerUnits(_amount.text) ?? 0) > 0;

  void _edit(PlannerGoalEntity g) => setState(() {
        _editing = g;
        _month = widget.row.date;
        _name.text = g.name;
        _amount.text = plannerInput(g.amountPaisas);
        _note.text = g.note ?? '';
      });

  Future<void> _submit() async {
    if (!_canSubmit) return;
    setState(() => _loading = true);
    final m = _month;
    final editing = _editing;
    final ok = await applyPlannerChange(
      context,
      ref,
      (ds) => editing == null
          ? ds.addGoal(name: _name.text.trim(), month: m.month, year: m.year, amountPaisas: plannerUnits(_amount.text)!, note: _note.text.trim())
          : ds.updateGoal(
              id: editing.id,
              name: _name.text.trim(),
              month: m.month,
              year: m.year,
              amountPaisas: plannerUnits(_amount.text)!,
              note: _note.text.trim(),
            ),
      done: editing == null ? 'Goal added' : 'Goal updated',
    );
    if (!mounted) return;
    if (ok) {
      Navigator.pop(context);
    } else {
      setState(() => _loading = false);
    }
  }

  Future<void> _delete(PlannerGoalEntity g) async {
    if (!await confirmDestructive(context, title: 'Delete goal?', body: 'This removes ${g.name} from ${widget.row.date.toShortMonthLabel}.')) return;
    if (!mounted) return;
    final ok = await applyPlannerChange(context, ref, (ds) => ds.deleteGoal(g.id), done: 'Goal deleted');
    if (ok && mounted) Navigator.pop(context);
  }

  @override
  Widget build(BuildContext context) => Padding(
        padding: const EdgeInsets.fromLTRB(16, 16, 16, 24),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            SheetHeader(
              title: 'Goals · ${widget.row.date.toShortMonthLabel}',
              onSubmit: _submit,
              canSubmit: _canSubmit,
              loading: _loading,
              submit: _editing == null ? 'Add' : 'Save',
            ),
            const SizedBox(height: 8),
            for (final g in widget.row.goals)
              Padding(
                padding: const EdgeInsets.only(bottom: 6),
                child: AppCard(
                  onTap: () => _edit(g),
                  padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                  borderColor: _editing?.id == g.id ? AppColors.primary : null,
                  child: Row(children: [
                    Expanded(
                      child: Text('${g.name}${g.note != null ? ' · ${g.note}' : ''}', style: AppTextStyles.bodyMedium),
                    ),
                    Text('-${g.amountPaisas.formatAmount()}',
                        style: AppTextStyles.labelMedium.copyWith(color: AppColors.destructive)),
                    IconButton(
                      icon: const Icon(Icons.delete_outline, size: 18, color: AppColors.mutedForeground),
                      onPressed: () => _delete(g),
                    ),
                  ]),
                ),
              ),
            const SizedBox(height: 4),
            Text(_editing == null ? 'Add a goal for this month' : 'Editing ${_editing!.name}', style: AppTextStyles.bodySmall),
            const SizedBox(height: 8),
            AppTextField(dense: true, textCapitalization: TextCapitalization.sentences, controller: _name, hint: 'Name (e.g. Engine Swap)', onChanged: (_) => setState(() {})),
            const SizedBox(height: 8),
            AmountExprField(controller: _amount, onChanged: () => setState(() {})),
            const SizedBox(height: 8),
            AppTextField(dense: true, textCapitalization: TextCapitalization.sentences, controller: _note, hint: 'Note (optional, e.g. reserved)'),
            const SizedBox(height: 8),
            AppCard(
              padding: const EdgeInsets.symmetric(horizontal: 4, vertical: 2),
              child: Row(children: [
                IconButton(
                  icon: const Icon(Icons.chevron_left, color: AppColors.foreground),
                  onPressed: () => setState(() => _month = DateTime(_month.year, _month.month - 1)),
                ),
                Expanded(child: Center(child: Text('In ${_month.toShortMonthLabel}', style: AppTextStyles.bodyMedium))),
                IconButton(
                  icon: const Icon(Icons.chevron_right, color: AppColors.foreground),
                  onPressed: () => setState(() => _month = DateTime(_month.year, _month.month + 1)),
                ),
              ]),
            ),
          ],
        ),
      );
}
