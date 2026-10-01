import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../../core/errors/app_exception.dart';
import '../../../../core/extensions/currency_ext.dart';
import '../../../../core/services/toast_service.dart';
import '../../../../core/theme/app_colors.dart';
import '../../../../core/theme/app_text_styles.dart';
import '../../../../core/widgets/app_button.dart';
import '../../../../core/widgets/app_text_field.dart';
import '../../data/datasources/planner_datasource.dart';
import '../../domain/entities/planner_entity.dart';
import '../providers/planner_provider.dart';

const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
String monthLabel(int month, int year) => '${monthNames[month - 1]} $year';

int? _units(String s) {
  final v = double.tryParse(s.trim());
  if (v == null || v < 0) return null;
  return (v * 100).round();
}

String _plain(int units) {
  final v = units / 100;
  return v == v.truncateToDouble() ? v.toInt().toString() : v.toStringAsFixed(2);
}

Future<void> showPlannerSheet(BuildContext context, Widget child) => showModalBottomSheet<void>(
      context: context,
      isScrollControlled: true,
      backgroundColor: AppColors.popover,
      shape: const RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(16))),
      builder: (_) => Padding(
        padding: EdgeInsets.only(bottom: MediaQuery.of(context).viewInsets.bottom),
        child: SafeArea(child: child),
      ),
    );

// Runs a planner mutation: toast on failure, refresh the table on success.
Future<bool> runPlannerAction(BuildContext context, WidgetRef ref, Future<void> Function(PlannerDatasource ds) action) async {
  try {
    HapticFeedback.lightImpact();
    await action(ref.read(plannerDatasourceProvider));
    ref.invalidate(plannerProvider);
    return true;
  } catch (e) {
    if (context.mounted) ref.read(toastServiceProvider).error(context, e is AppException ? e.message : 'Failed');
    return false;
  }
}

// ── Line cell: this month or from here on ────────────────────────────────────

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
  final int initialNative;
  final bool isOverride;
  final Future<void> Function(int amount, String scope) onSave;
  final Future<void> Function()? onRemoveOverride;

  @override
  State<CellEditSheet> createState() => _CellEditSheetState();
}

class _CellEditSheetState extends State<CellEditSheet> {
  late final _ctrl = TextEditingController(text: _plain(widget.initialNative));
  bool _loading = false;

  @override
  void dispose() {
    _ctrl.dispose();
    super.dispose();
  }

  Future<void> _save(String scope) async {
    final amount = _units(_ctrl.text);
    if (amount == null || _loading) return;
    setState(() => _loading = true);
    await widget.onSave(amount, scope);
    if (mounted) setState(() => _loading = false);
  }

  @override
  Widget build(BuildContext context) => Padding(
        padding: const EdgeInsets.fromLTRB(16, 16, 16, 24),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Text(widget.title, style: AppTextStyles.bodyLarge.copyWith(fontWeight: FontWeight.w600)),
            const SizedBox(height: 12),
            AppTextField(
              controller: _ctrl,
              hint: '0',
              prefix: Text(widget.isUsd ? '\$ ' : 'Rs '),
              keyboardType: const TextInputType.numberWithOptions(decimal: true),
            ),
            const SizedBox(height: 16),
            Row(
              children: [
                Expanded(child: AppButton(label: 'Just this month', variant: AppButtonVariant.secondary, onPressed: _loading ? null : () => _save('THIS_MONTH'))),
                const SizedBox(width: 8),
                Expanded(child: AppButton(label: 'From this month on', onPressed: _loading ? null : () => _save('FROM_HERE'))),
              ],
            ),
            if (widget.isOverride && widget.onRemoveOverride != null) ...[
              const SizedBox(height: 8),
              TextButton(
                onPressed: _loading ? null : () => widget.onRemoveOverride!(),
                child: Text("Remove this month's change", style: AppTextStyles.labelMedium.copyWith(color: AppColors.mutedForeground)),
              ),
            ],
          ],
        ),
      );
}

// ── Goals for one month ──────────────────────────────────────────────────────

class GoalsSheet extends ConsumerStatefulWidget {
  const GoalsSheet({required this.row, super.key});
  final PlannerRowEntity row;

  @override
  ConsumerState<GoalsSheet> createState() => _GoalsSheetState();
}

class _GoalsSheetState extends ConsumerState<GoalsSheet> {
  final _name = TextEditingController();
  final _amount = TextEditingController();
  final _note = TextEditingController();
  PlannerGoalEntity? _editing;
  bool _loading = false;

  @override
  void dispose() {
    _name.dispose();
    _amount.dispose();
    _note.dispose();
    super.dispose();
  }

  void _edit(PlannerGoalEntity? g) => setState(() {
        _editing = g;
        _name.text = g?.name ?? '';
        _amount.text = g == null ? '' : _plain(g.amountPaisas);
        _note.text = g?.note ?? '';
      });

  Future<void> _save() async {
    final amount = _units(_amount.text);
    if (_name.text.trim().isEmpty || amount == null || amount == 0 || _loading) return;
    setState(() => _loading = true);
    final r = widget.row;
    final ok = await runPlannerAction(context, ref, (ds) => _editing == null
        ? ds.addGoal(name: _name.text.trim(), month: r.month, year: r.year, amountPaisas: amount, note: _note.text.trim())
        : ds.updateGoal(_editing!.id, name: _name.text.trim(), amountPaisas: amount, note: _note.text.trim()));
    if (!mounted) return;
    setState(() => _loading = false);
    if (ok) Navigator.pop(context);
  }

  @override
  Widget build(BuildContext context) => Padding(
        padding: const EdgeInsets.fromLTRB(16, 16, 16, 24),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Text('Goals · ${monthLabel(widget.row.month, widget.row.year)}',
                style: AppTextStyles.bodyLarge.copyWith(fontWeight: FontWeight.w600)),
            const SizedBox(height: 8),
            for (final g in widget.row.goals)
              Row(
                children: [
                  Expanded(
                    child: GestureDetector(
                      onTap: () => _edit(g),
                      child: Text('${g.name} −${g.amountPaisas.formatPKR()}${g.note != null ? ' · ${g.note}' : ''}',
                          style: AppTextStyles.bodyMedium),
                    ),
                  ),
                  IconButton(
                    icon: const Icon(Icons.delete_outline, size: 18, color: AppColors.mutedForeground),
                    onPressed: () async {
                      final ok = await runPlannerAction(context, ref, (ds) => ds.deleteGoal(g.id));
                      if (ok && context.mounted) Navigator.pop(context);
                    },
                  ),
                ],
              ),
            const SizedBox(height: 8),
            Text(_editing == null ? 'Add a goal' : 'Edit "${_editing!.name}"', style: AppTextStyles.bodySmall),
            const SizedBox(height: 6),
            AppTextField(controller: _name, hint: 'Name (e.g. Engine Swap)'),
            const SizedBox(height: 8),
            AppTextField(controller: _amount, hint: 'Amount', prefix: const Text('Rs '),
                keyboardType: const TextInputType.numberWithOptions(decimal: true)),
            const SizedBox(height: 8),
            AppTextField(controller: _note, hint: 'Note (optional, e.g. reserved)'),
            const SizedBox(height: 12),
            AppButton(label: _editing == null ? 'Add goal' : 'Save', onPressed: _loading ? null : _save),
          ],
        ),
      );
}

// ── Add / edit a line ────────────────────────────────────────────────────────

class LineFormSheet extends ConsumerStatefulWidget {
  const LineFormSheet({this.line, super.key});
  final PlannerLineEntity? line;

  @override
  ConsumerState<LineFormSheet> createState() => _LineFormSheetState();
}

class _LineFormSheetState extends ConsumerState<LineFormSheet> {
  late final _name = TextEditingController(text: widget.line?.name ?? '');
  late String _direction = widget.line?.direction ?? 'IN';
  late String _currency = widget.line?.currency ?? 'PKR';
  bool _loading = false;

  @override
  void dispose() {
    _name.dispose();
    super.dispose();
  }

  Future<void> _save() async {
    if (_name.text.trim().isEmpty || _loading) return;
    setState(() => _loading = true);
    final l = widget.line;
    final ok = await runPlannerAction(context, ref, (ds) => l == null
        ? ds.addLine(name: _name.text.trim(), direction: _direction, currency: _currency)
        : ds.updateLine(l.id, name: _name.text.trim(), direction: _direction, currency: _currency));
    if (!mounted) return;
    setState(() => _loading = false);
    if (ok) Navigator.pop(context);
  }

  Widget _choice(String label, bool selected, VoidCallback onTap) => Expanded(
        child: GestureDetector(
          onTap: onTap,
          child: Container(
            padding: const EdgeInsets.symmetric(vertical: 10),
            alignment: Alignment.center,
            decoration: BoxDecoration(
              color: selected ? AppColors.primary.withValues(alpha: 0.15) : AppColors.card,
              borderRadius: BorderRadius.circular(8),
              border: Border.all(color: selected ? AppColors.primary : AppColors.border),
            ),
            child: Text(label, style: AppTextStyles.labelMedium.copyWith(color: selected ? AppColors.primary : AppColors.foreground)),
          ),
        ),
      );

  @override
  Widget build(BuildContext context) => Padding(
        padding: const EdgeInsets.fromLTRB(16, 16, 16, 24),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Text(widget.line == null ? 'Add a line' : 'Edit line', style: AppTextStyles.bodyLarge.copyWith(fontWeight: FontWeight.w600)),
            const SizedBox(height: 12),
            AppTextField(controller: _name, hint: 'e.g. Base Savings, Car Loan'),
            const SizedBox(height: 12),
            Row(children: [
              _choice('Coming in (+)', _direction == 'IN', () => setState(() => _direction = 'IN')),
              const SizedBox(width: 8),
              _choice('Going out (−)', _direction == 'OUT', () => setState(() => _direction = 'OUT')),
            ]),
            const SizedBox(height: 8),
            Row(children: [
              _choice('Rupees', _currency == 'PKR', () => setState(() => _currency = 'PKR')),
              const SizedBox(width: 8),
              _choice('Dollars', _currency == 'USD', () => setState(() => _currency = 'USD')),
            ]),
            const SizedBox(height: 16),
            AppButton(label: widget.line == null ? 'Add line' : 'Save', onPressed: _loading ? null : _save),
          ],
        ),
      );
}

// ── Manage lines: edit, reorder, delete ──────────────────────────────────────

class LinesSheet extends ConsumerWidget {
  const LinesSheet({required this.lines, super.key});
  final List<PlannerLineEntity> lines;

  Future<void> _move(BuildContext context, WidgetRef ref, int i, int dir) async {
    final ids = lines.map((l) => l.id).toList();
    final j = i + dir;
    if (j < 0 || j >= ids.length) return;
    final t = ids[i];
    ids[i] = ids[j];
    ids[j] = t;
    final ok = await runPlannerAction(context, ref, (ds) => ds.reorderLines(ids));
    if (ok && context.mounted) Navigator.pop(context);
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) => Padding(
        padding: const EdgeInsets.fromLTRB(16, 16, 16, 24),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Text('Lines', style: AppTextStyles.bodyLarge.copyWith(fontWeight: FontWeight.w600)),
            const SizedBox(height: 8),
            for (var i = 0; i < lines.length; i++)
              Row(
                children: [
                  Expanded(
                    child: Text('${lines[i].name}  ${lines[i].isIn ? '+' : '−'}${lines[i].isUsd ? ' \$' : ''}',
                        style: AppTextStyles.bodyMedium),
                  ),
                  IconButton(icon: const Icon(Icons.arrow_upward, size: 18), onPressed: i == 0 ? null : () => _move(context, ref, i, -1)),
                  IconButton(icon: const Icon(Icons.arrow_downward, size: 18), onPressed: i == lines.length - 1 ? null : () => _move(context, ref, i, 1)),
                  IconButton(
                    icon: const Icon(Icons.edit_outlined, size: 18),
                    onPressed: () {
                      Navigator.pop(context);
                      showPlannerSheet(context, LineFormSheet(line: lines[i]));
                    },
                  ),
                  IconButton(
                    icon: const Icon(Icons.delete_outline, size: 18, color: AppColors.destructive),
                    onPressed: () async {
                      final yes = await showDialog<bool>(
                        context: context,
                        builder: (ctx) => AlertDialog(
                          backgroundColor: AppColors.card,
                          title: Text('Delete "${lines[i].name}"?', style: AppTextStyles.headlineSmall),
                          content: Text('Removes this line and every amount you set for it.',
                              style: AppTextStyles.bodyMedium.copyWith(color: AppColors.mutedForeground)),
                          actions: [
                            TextButton(onPressed: () => Navigator.pop(ctx, false), child: const Text('Cancel')),
                            TextButton(onPressed: () => Navigator.pop(ctx, true),
                                child: const Text('Delete', style: TextStyle(color: AppColors.destructive))),
                          ],
                        ),
                      );
                      if (yes != true || !context.mounted) return;
                      final ok = await runPlannerAction(context, ref, (ds) => ds.deleteLine(lines[i].id));
                      if (ok && context.mounted) Navigator.pop(context);
                    },
                  ),
                ],
              ),
            const SizedBox(height: 8),
            AppButton(
              label: 'Add a line',
              onPressed: () {
                Navigator.pop(context);
                showPlannerSheet(context, const LineFormSheet());
              },
            ),
          ],
        ),
      );
}

// ── Settings ─────────────────────────────────────────────────────────────────

class PlannerSettingsSheet extends ConsumerStatefulWidget {
  const PlannerSettingsSheet({required this.settings, super.key});
  final PlannerSettingsEntity settings;

  @override
  ConsumerState<PlannerSettingsSheet> createState() => _PlannerSettingsSheetState();
}

class _PlannerSettingsSheetState extends ConsumerState<PlannerSettingsSheet> {
  late DateTime _start = DateTime(widget.settings.startYear, widget.settings.startMonth);
  late final _months = TextEditingController(text: '${widget.settings.months}');
  late final _cash = TextEditingController(text: _plain(widget.settings.startingCashPaisas));
  late final _rate = TextEditingController(text: '${widget.settings.usdRate}');
  bool _loading = false;

  @override
  void dispose() {
    _months.dispose();
    _cash.dispose();
    _rate.dispose();
    super.dispose();
  }

  Future<void> _save() async {
    final months = int.tryParse(_months.text.trim());
    final rate = double.tryParse(_rate.text.trim());
    final cash = double.tryParse(_cash.text.trim().isEmpty ? '0' : _cash.text.trim());
    if (months == null || months < 1 || months > 120 || rate == null || rate <= 0 || cash == null || _loading) return;
    setState(() => _loading = true);
    final ok = await runPlannerAction(context, ref, (ds) => ds.updateSettings(
          startMonth: _start.month,
          startYear: _start.year,
          months: months,
          startingCashPaisas: (cash * 100).round(),
          usdRate: rate,
        ));
    if (!mounted) return;
    setState(() => _loading = false);
    if (ok) Navigator.pop(context);
  }

  @override
  Widget build(BuildContext context) => Padding(
        padding: const EdgeInsets.fromLTRB(16, 16, 16, 24),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Text('Planner settings', style: AppTextStyles.bodyLarge.copyWith(fontWeight: FontWeight.w600)),
            const SizedBox(height: 12),
            Row(
              children: [
                IconButton(onPressed: () => setState(() => _start = DateTime(_start.year, _start.month - 1)), icon: const Icon(Icons.chevron_left)),
                Expanded(child: Center(child: Text('Starts ${monthLabel(_start.month, _start.year)}', style: AppTextStyles.bodyMedium))),
                IconButton(onPressed: () => setState(() => _start = DateTime(_start.year, _start.month + 1)), icon: const Icon(Icons.chevron_right)),
              ],
            ),
            const SizedBox(height: 8),
            AppTextField(controller: _months, label: 'Months (1-120)', keyboardType: TextInputType.number),
            const SizedBox(height: 8),
            AppTextField(controller: _cash, label: 'Starting cash (Rs)', keyboardType: const TextInputType.numberWithOptions(decimal: true, signed: true)),
            const SizedBox(height: 8),
            AppTextField(controller: _rate, label: 'USD rate (Rs per \$)', keyboardType: const TextInputType.numberWithOptions(decimal: true)),
            const SizedBox(height: 4),
            const Text("The planner's own rate - it doesn't change the real one.", style: AppTextStyles.bodySmall),
            const SizedBox(height: 12),
            AppButton(label: 'Save', onPressed: _loading ? null : _save),
          ],
        ),
      );
}
