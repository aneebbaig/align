import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../../core/extensions/datetime_ext.dart';
import '../../../../core/theme/app_text_styles.dart';
import '../../../../core/widgets/amount_expr_field.dart';
import '../../../../core/widgets/app_button.dart';
import '../../../../core/widgets/app_sheet.dart';
import '../../../../core/widgets/sheet_header.dart';
import '../../domain/entities/planner_entity.dart';
import 'planner_goals_sheet.dart';
import 'planner_line_sheets.dart';

export 'planner_line_sheets.dart' show showLineSheet;
import 'planner_settings_sheet.dart';
import 'planner_sheet_common.dart';

void showCellSheet(BuildContext context, WidgetRef ref, PlannerLineEntity line, PlannerRowEntity row) =>
    showAppSheet(context, _CellSheet(line: line, row: row), safeArea: true);
void showGoalsSheet(BuildContext context, WidgetRef ref, PlannerRowEntity row) =>
    showAppSheet(context, GoalsSheet(row: row), safeArea: true);
void showLinesSheet(BuildContext context, WidgetRef ref, List<PlannerLineEntity> lines) =>
    showAppSheet(context, LinesSheet(lines: lines), safeArea: true);
void showPlannerSettingsSheet(BuildContext context, WidgetRef ref, PlannerSettingsEntity settings) =>
    showAppSheet(context, SettingsSheet(settings: settings), safeArea: true);

// ── Line cell: just this month, or from this month on ───────────────────────

/// The amount editor for one line in one month. Kept free of providers so it
/// can be tested on its own; [_CellSheet] wires it to the datasource.
class CellEditSheet extends StatefulWidget {
  const CellEditSheet({
    required this.title,
    required this.isUsd,
    required this.initialNative,
    required this.isOverride,
    required this.onSave,
    this.onRemoveOverride,
    super.key,
  });

  final String title;
  final bool isUsd;
  final int initialNative; // paisas, or cents for USD lines
  final bool isOverride;
  final Future<void> Function(int amount, String scope) onSave; // scope: THIS_MONTH | FROM_HERE
  final Future<void> Function()? onRemoveOverride;

  @override
  State<CellEditSheet> createState() => _CellEditSheetState();
}

class _CellEditSheetState extends State<CellEditSheet> {
  late final _amount = TextEditingController(text: plannerInput(widget.initialNative));
  bool _loading = false;

  @override
  void dispose() {
    _amount.dispose();
    super.dispose();
  }

  Future<void> _run(Future<void> Function() action) async {
    if (_loading) return;
    setState(() => _loading = true);
    await action();
    if (mounted) setState(() => _loading = false);
  }

  void _save(String scope) {
    final amount = plannerUnits(_amount.text);
    if (amount == null) return;
    _run(() => widget.onSave(amount, scope));
  }

  @override
  Widget build(BuildContext context) => Padding(
        padding: const EdgeInsets.fromLTRB(16, 16, 16, 24),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            SheetHeader(title: widget.title),
            const SizedBox(height: 12),
            AmountExprField(
              controller: _amount,
              prefix: widget.isUsd ? '\$ ' : 'Rs ',
              autofocus: true,
              onChanged: () => setState(() {}),
            ),
            const SizedBox(height: 6),
            const Text('0 stops this line from that month on.', style: AppTextStyles.bodySmall),
            const SizedBox(height: 16),
            Row(children: [
              Expanded(
                child: AppButton(
                  label: 'Just this month',
                  variant: AppButtonVariant.secondary,
                  onPressed: _loading || plannerUnits(_amount.text) == null ? null : () => _save('THIS_MONTH'),
                ),
              ),
              const SizedBox(width: 8),
              Expanded(
                child: AppButton(
                  label: 'From this month on',
                  onPressed: _loading || plannerUnits(_amount.text) == null ? null : () => _save('FROM_HERE'),
                ),
              ),
            ]),
            if (widget.isOverride && widget.onRemoveOverride != null) ...[
              const SizedBox(height: 8),
              AppButton(
                label: "Remove this month's change",
                variant: AppButtonVariant.ghost,
                onPressed: _loading ? null : () => _run(widget.onRemoveOverride!),
              ),
            ],
          ],
        ),
      );
}

class _CellSheet extends ConsumerWidget {
  const _CellSheet({required this.line, required this.row});
  final PlannerLineEntity line;
  final PlannerRowEntity row;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final cell = row.cellFor(line.id);
    return CellEditSheet(
      title: '${line.name} · ${row.date.toShortMonthLabel}',
      isUsd: line.isUsd,
      initialNative: cell?.native ?? 0,
      isOverride: cell?.isOverride ?? false,
      onSave: (amount, scope) async {
        final ok = await applyPlannerChange(
          context,
          ref,
          (ds) => ds.setCell(lineId: line.id, month: row.month, year: row.year, amount: amount, scope: scope),
          done: scope == 'FROM_HERE' ? 'Updated from ${row.date.toShortMonthLabel}' : 'Updated ${row.date.toShortMonthLabel}',
        );
        if (ok && context.mounted) Navigator.pop(context);
      },
      onRemoveOverride: () async {
        final ok = await applyPlannerChange(
          context,
          ref,
          (ds) => ds.removeOverride(lineId: line.id, month: row.month, year: row.year),
          done: 'Change removed',
        );
        if (ok && context.mounted) Navigator.pop(context);
      },
    );
  }
}
