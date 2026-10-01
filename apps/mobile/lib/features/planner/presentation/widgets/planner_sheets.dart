import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../../core/errors/app_exception.dart';
import '../../../../core/extensions/currency_ext.dart';
import '../../../../core/extensions/datetime_ext.dart';
import '../../../../core/services/toast_service.dart';
import '../../../../core/theme/app_colors.dart';
import '../../../../core/theme/app_text_styles.dart';
import '../../../../core/widgets/app_button.dart';
import '../../../../core/widgets/app_card.dart';
import '../../data/datasources/planner_datasource.dart';
import '../../domain/entities/planner_entity.dart';
import '../providers/planner_provider.dart';

/// User input in rupees/dollars → paisas/cents. 0 is allowed (it ends a line).
int? _toUnits(String s) {
  final v = double.tryParse(s.trim());
  if (v == null || v < 0) return null;
  return v.toPaisas;
}

/// Paisas/cents → plain input text, no grouping: 5000000 → "50000", 1250 → "12.5".
String _toInput(int units) {
  final v = units.toRupees;
  return v == v.truncateToDouble() ? v.toInt().toString() : v.toString();
}

Future<T?> _sheet<T>(BuildContext context, Widget child) => showModalBottomSheet<T>(
      context: context,
      isScrollControlled: true,
      backgroundColor: AppColors.popover,
      shape: const RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(16))),
      builder: (_) => Padding(
        padding: EdgeInsets.only(bottom: MediaQuery.of(context).viewInsets.bottom),
        child: SafeArea(child: child),
      ),
    );

void showCellSheet(BuildContext context, WidgetRef ref, PlannerLineEntity line, PlannerRowEntity row) =>
    _sheet(context, _CellSheet(line: line, row: row));
void showGoalsSheet(BuildContext context, WidgetRef ref, PlannerRowEntity row) =>
    _sheet(context, _GoalsSheet(row: row));
void showLineSheet(BuildContext context, WidgetRef ref, {PlannerLineEntity? line}) =>
    _sheet(context, _LineSheet(existing: line));
void showLinesSheet(BuildContext context, WidgetRef ref, List<PlannerLineEntity> lines) =>
    _sheet(context, _LinesSheet(lines: lines));
void showPlannerSettingsSheet(BuildContext context, WidgetRef ref, PlannerSettingsEntity settings) =>
    _sheet(context, _SettingsSheet(settings: settings));

/// Runs one planner change: haptic, call, refresh the table, short toast.
/// Returns whether it worked so the caller can close its sheet.
Future<bool> _apply(
  BuildContext context,
  WidgetRef ref,
  Future<void> Function(PlannerDatasource ds) action, {
  required String done,
}) async {
  try {
    HapticFeedback.mediumImpact();
    await action(ref.read(plannerDatasourceProvider));
    ref.invalidate(plannerProvider);
    if (context.mounted) ref.read(toastServiceProvider).success(context, done);
    return true;
  } catch (e) {
    if (context.mounted) ref.read(toastServiceProvider).error(context, e is AppException ? e.message : 'Failed');
    return false;
  }
}

class _Field extends StatelessWidget {
  const _Field({required this.controller, required this.hint, this.keyboardType, this.prefix, this.autofocus = false, this.onChanged});
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
        textCapitalization: TextCapitalization.sentences,
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
          border: _b(0.5),
          enabledBorder: _b(0.5),
          focusedBorder: _b(0.6, AppColors.primary),
        ),
      );

  OutlineInputBorder _b(double a, [Color? c]) => OutlineInputBorder(
        borderRadius: BorderRadius.circular(8),
        borderSide: BorderSide(color: (c ?? AppColors.border).withValues(alpha: a)),
      );
}

class _Header extends StatelessWidget {
  const _Header({required this.title, this.onSubmit, this.canSubmit = false, this.loading = false, this.submit = 'Save'});
  final String title;
  final VoidCallback? onSubmit;
  final bool canSubmit;
  final bool loading;
  final String submit;

  @override
  Widget build(BuildContext context) => Row(children: [
        Expanded(child: Text(title, style: AppTextStyles.bodyLarge.copyWith(fontWeight: FontWeight.w600))),
        if (onSubmit != null)
          TextButton(
            onPressed: canSubmit && !loading ? onSubmit : null,
            child: loading
                ? const SizedBox(width: 16, height: 16, child: CircularProgressIndicator(strokeWidth: 2, color: AppColors.primary))
                : Text(submit, style: AppTextStyles.labelLarge.copyWith(
                    color: canSubmit ? AppColors.primary : AppColors.mutedForeground, fontWeight: FontWeight.w600)),
          ),
      ]);
}

class _Choice extends StatelessWidget {
  const _Choice({required this.label, required this.selected, required this.onTap});
  final String label;
  final bool selected;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) => Expanded(
        child: GestureDetector(
          onTap: onTap,
          behavior: HitTestBehavior.opaque,
          child: Container(
            padding: const EdgeInsets.symmetric(vertical: 10),
            alignment: Alignment.center,
            decoration: BoxDecoration(
              color: selected ? AppColors.primary.withValues(alpha: 0.12) : AppColors.card,
              borderRadius: BorderRadius.circular(8),
              border: Border.all(color: selected ? AppColors.primary.withValues(alpha: 0.6) : AppColors.border.withValues(alpha: 0.5)),
            ),
            child: Text(label, style: AppTextStyles.labelMedium.copyWith(color: selected ? AppColors.primary : AppColors.foreground)),
          ),
        ),
      );
}

Future<bool> _confirm(BuildContext context, {required String title, required String body}) async =>
    await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        backgroundColor: AppColors.card,
        title: Text(title, style: AppTextStyles.bodyLarge),
        content: Text(body, style: AppTextStyles.bodySmall),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx, false), child: const Text('Cancel')),
          TextButton(onPressed: () => Navigator.pop(ctx, true), child: const Text('Delete', style: TextStyle(color: AppColors.destructive))),
        ],
      ),
    ) ==
    true;

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
  late final _amount = TextEditingController(text: _toInput(widget.initialNative));
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
    final amount = _toUnits(_amount.text);
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
            _Header(title: widget.title),
            const SizedBox(height: 12),
            _Field(
              controller: _amount,
              hint: '0',
              prefix: widget.isUsd ? '\$ ' : 'Rs ',
              autofocus: true,
              keyboardType: const TextInputType.numberWithOptions(decimal: true),
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
                  onPressed: _loading || _toUnits(_amount.text) == null ? null : () => _save('THIS_MONTH'),
                ),
              ),
              const SizedBox(width: 8),
              Expanded(
                child: AppButton(
                  label: 'From this month on',
                  onPressed: _loading || _toUnits(_amount.text) == null ? null : () => _save('FROM_HERE'),
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
        final ok = await _apply(
          context,
          ref,
          (ds) => ds.setCell(lineId: line.id, month: row.month, year: row.year, amount: amount, scope: scope),
          done: scope == 'FROM_HERE' ? 'Updated from ${row.date.toShortMonthLabel}' : 'Updated ${row.date.toShortMonthLabel}',
        );
        if (ok && context.mounted) Navigator.pop(context);
      },
      onRemoveOverride: () async {
        final ok = await _apply(
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

// ── Goals for one month ──────────────────────────────────────────────────────

class _GoalsSheet extends ConsumerStatefulWidget {
  const _GoalsSheet({required this.row});
  final PlannerRowEntity row;

  @override
  ConsumerState<_GoalsSheet> createState() => _GoalsSheetState();
}

class _GoalsSheetState extends ConsumerState<_GoalsSheet> {
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

  bool get _canSubmit => _name.text.trim().isNotEmpty && (_toUnits(_amount.text) ?? 0) > 0;

  void _edit(PlannerGoalEntity g) => setState(() {
        _editing = g;
        _month = widget.row.date;
        _name.text = g.name;
        _amount.text = _toInput(g.amountPaisas);
        _note.text = g.note ?? '';
      });

  Future<void> _submit() async {
    if (!_canSubmit) return;
    setState(() => _loading = true);
    final m = _month;
    final editing = _editing;
    final ok = await _apply(
      context,
      ref,
      (ds) => editing == null
          ? ds.addGoal(name: _name.text.trim(), month: m.month, year: m.year, amountPaisas: _toUnits(_amount.text)!, note: _note.text.trim())
          : ds.updateGoal(
              id: editing.id,
              name: _name.text.trim(),
              month: m.month,
              year: m.year,
              amountPaisas: _toUnits(_amount.text)!,
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
    if (!await _confirm(context, title: 'Delete goal?', body: 'This removes ${g.name} from ${widget.row.date.toShortMonthLabel}.')) return;
    if (!mounted) return;
    final ok = await _apply(context, ref, (ds) => ds.deleteGoal(g.id), done: 'Goal deleted');
    if (ok && mounted) Navigator.pop(context);
  }

  @override
  Widget build(BuildContext context) => Padding(
        padding: const EdgeInsets.fromLTRB(16, 16, 16, 24),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            _Header(
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
            _Field(controller: _name, hint: 'Name (e.g. Engine Swap)', onChanged: () => setState(() {})),
            const SizedBox(height: 8),
            _Field(
              controller: _amount,
              hint: '0',
              prefix: 'Rs ',
              keyboardType: const TextInputType.numberWithOptions(decimal: true),
              onChanged: () => setState(() {}),
            ),
            const SizedBox(height: 8),
            _Field(controller: _note, hint: 'Note (optional, e.g. reserved)'),
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

// ── Add / edit a line ────────────────────────────────────────────────────────

class _LineSheet extends ConsumerStatefulWidget {
  const _LineSheet({this.existing});
  final PlannerLineEntity? existing;

  @override
  ConsumerState<_LineSheet> createState() => _LineSheetState();
}

class _LineSheetState extends ConsumerState<_LineSheet> {
  late final _name = TextEditingController(text: widget.existing?.name ?? '');
  late String _direction = widget.existing?.direction ?? 'IN';
  late String _currency = widget.existing?.currency ?? 'PKR';
  bool _loading = false;

  @override
  void dispose() {
    _name.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    if (_name.text.trim().isEmpty) return;
    setState(() => _loading = true);
    final existing = widget.existing;
    final ok = await _apply(
      context,
      ref,
      (ds) => existing == null
          ? ds.addLine(name: _name.text.trim(), direction: _direction, currency: _currency)
          : ds.updateLine(id: existing.id, name: _name.text.trim(), direction: _direction, currency: _currency),
      done: existing == null ? 'Line added' : 'Line updated',
    );
    if (!mounted) return;
    if (ok) {
      Navigator.pop(context);
    } else {
      setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) => Padding(
        padding: const EdgeInsets.fromLTRB(16, 16, 16, 24),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            _Header(
              title: widget.existing == null ? 'New line' : 'Edit line',
              onSubmit: _submit,
              canSubmit: _name.text.trim().isNotEmpty,
              loading: _loading,
              submit: widget.existing == null ? 'Add' : 'Save',
            ),
            const SizedBox(height: 12),
            _Field(controller: _name, hint: 'e.g. Base Savings, Car Loan', autofocus: true, onChanged: () => setState(() {})),
            const SizedBox(height: 12),
            Row(children: [
              _Choice(label: 'Coming in (+)', selected: _direction == 'IN', onTap: () => setState(() => _direction = 'IN')),
              const SizedBox(width: 8),
              _Choice(label: 'Going out (−)', selected: _direction == 'OUT', onTap: () => setState(() => _direction = 'OUT')),
            ]),
            const SizedBox(height: 8),
            Row(children: [
              _Choice(label: 'Rupees', selected: _currency == 'PKR', onTap: () => setState(() => _currency = 'PKR')),
              const SizedBox(width: 8),
              _Choice(label: 'Dollars', selected: _currency == 'USD', onTap: () => setState(() => _currency = 'USD')),
            ]),
          ],
        ),
      );
}

// ── Manage lines ─────────────────────────────────────────────────────────────

class _LinesSheet extends ConsumerWidget {
  const _LinesSheet({required this.lines});
  final List<PlannerLineEntity> lines;

  Future<void> _move(BuildContext context, WidgetRef ref, int i, int dir) async {
    final ids = lines.map((l) => l.id).toList();
    final moved = ids.removeAt(i);
    ids.insert(i + dir, moved);
    final ok = await _apply(context, ref, (ds) => ds.reorderLines(ids), done: 'Order saved');
    if (ok && context.mounted) Navigator.pop(context);
  }

  Future<void> _delete(BuildContext context, WidgetRef ref, PlannerLineEntity line) async {
    if (!await _confirm(context, title: 'Delete line?', body: 'This removes ${line.name} and every amount set for it. Goals stay.')) return;
    if (!context.mounted) return;
    final ok = await _apply(context, ref, (ds) => ds.deleteLine(line.id), done: 'Line deleted');
    if (ok && context.mounted) Navigator.pop(context);
  }

  void _menu(BuildContext context, WidgetRef ref, int i) {
    final line = lines[i];
    showModalBottomSheet<void>(
      context: context,
      backgroundColor: AppColors.popover,
      shape: const RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(16))),
      builder: (ctx) => SafeArea(
        child: Column(mainAxisSize: MainAxisSize.min, children: [
          ListTile(
            leading: const Icon(Icons.edit_outlined, color: AppColors.foreground, size: 20),
            title: const Text('Edit line', style: AppTextStyles.bodyMedium),
            onTap: () {
              Navigator.pop(ctx);
              Navigator.pop(context);
              showLineSheet(context, ref, line: line);
            },
          ),
          if (i > 0)
            ListTile(
              leading: const Icon(Icons.arrow_back, color: AppColors.foreground, size: 20),
              title: const Text('Move left', style: AppTextStyles.bodyMedium),
              onTap: () {
                Navigator.pop(ctx);
                _move(context, ref, i, -1);
              },
            ),
          if (i < lines.length - 1)
            ListTile(
              leading: const Icon(Icons.arrow_forward, color: AppColors.foreground, size: 20),
              title: const Text('Move right', style: AppTextStyles.bodyMedium),
              onTap: () {
                Navigator.pop(ctx);
                _move(context, ref, i, 1);
              },
            ),
          ListTile(
            leading: const Icon(Icons.delete_outline, color: AppColors.destructive, size: 20),
            title: Text('Delete line', style: AppTextStyles.bodyMedium.copyWith(color: AppColors.destructive)),
            onTap: () {
              Navigator.pop(ctx);
              _delete(context, ref, line);
            },
          ),
        ]),
      ),
    );
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) => Padding(
        padding: const EdgeInsets.fromLTRB(16, 16, 16, 24),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            _Header(
              title: 'Lines',
              onSubmit: () {
                Navigator.pop(context);
                showLineSheet(context, ref);
              },
              canSubmit: true,
              submit: 'Add',
            ),
            const SizedBox(height: 8),
            if (lines.isEmpty) const Text('No lines yet.', style: AppTextStyles.bodySmall),
            for (var i = 0; i < lines.length; i++)
              Padding(
                padding: const EdgeInsets.only(bottom: 6),
                child: AppCard(
                  onTap: () => _menu(context, ref, i),
                  padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
                  child: Row(children: [
                    Expanded(child: Text(lines[i].name, style: AppTextStyles.bodyMedium.copyWith(fontWeight: FontWeight.w600))),
                    Text(
                      '${lines[i].isIn ? 'In' : 'Out'} · ${lines[i].isUsd ? 'Dollars' : 'Rupees'}',
                      style: AppTextStyles.bodySmall,
                    ),
                    const SizedBox(width: 6),
                    const Icon(Icons.more_horiz, size: 18, color: AppColors.mutedForeground),
                  ]),
                ),
              ),
          ],
        ),
      );
}

// ── Settings ─────────────────────────────────────────────────────────────────

class _SettingsSheet extends ConsumerStatefulWidget {
  const _SettingsSheet({required this.settings});
  final PlannerSettingsEntity settings;

  @override
  ConsumerState<_SettingsSheet> createState() => _SettingsSheetState();
}

class _SettingsSheetState extends ConsumerState<_SettingsSheet> {
  late DateTime _start = widget.settings.start;
  late final _months = TextEditingController(text: '${widget.settings.months}');
  late final _cash = TextEditingController(text: _toInput(widget.settings.startingCashPaisas));
  late final _rate = TextEditingController(text: '${widget.settings.usdRate}');
  bool _loading = false;

  @override
  void dispose() {
    _months.dispose();
    _cash.dispose();
    _rate.dispose();
    super.dispose();
  }

  int? get _monthsValue {
    final v = int.tryParse(_months.text.trim());
    return v != null && v >= 1 && v <= 120 ? v : null;
  }

  double? get _rateValue {
    final v = double.tryParse(_rate.text.trim());
    return v != null && v > 0 ? v : null;
  }

  // Starting cash may be negative (e.g. starting in debt).
  int? get _cashValue => double.tryParse(_cash.text.trim().isEmpty ? '0' : _cash.text.trim())?.toPaisas;

  bool get _canSubmit => _monthsValue != null && _rateValue != null && _cashValue != null;

  Future<void> _submit() async {
    if (!_canSubmit) return;
    setState(() => _loading = true);
    final ok = await _apply(
      context,
      ref,
      (ds) => ds.updateSettings(
        startMonth: _start.month,
        startYear: _start.year,
        months: _monthsValue,
        startingCashPaisas: _cashValue,
        usdRate: _rateValue,
      ),
      done: 'Planner updated',
    );
    if (!mounted) return;
    if (ok) {
      Navigator.pop(context);
    } else {
      setState(() => _loading = false);
    }
  }

  Widget _label(String text) => Padding(
        padding: const EdgeInsets.only(top: 12, bottom: 6),
        child: Text(text, style: AppTextStyles.labelSmall.copyWith(color: AppColors.mutedForeground)),
      );

  @override
  Widget build(BuildContext context) => Padding(
        padding: const EdgeInsets.fromLTRB(16, 16, 16, 24),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            _Header(title: 'Planner settings', onSubmit: _submit, canSubmit: _canSubmit, loading: _loading),
            _label('Starts'),
            AppCard(
              padding: const EdgeInsets.symmetric(horizontal: 4, vertical: 2),
              child: Row(children: [
                IconButton(
                  icon: const Icon(Icons.chevron_left, color: AppColors.foreground),
                  onPressed: () => setState(() => _start = DateTime(_start.year, _start.month - 1)),
                ),
                Expanded(child: Center(child: Text(_start.toShortMonthLabel, style: AppTextStyles.bodyMedium))),
                IconButton(
                  icon: const Icon(Icons.chevron_right, color: AppColors.foreground),
                  onPressed: () => setState(() => _start = DateTime(_start.year, _start.month + 1)),
                ),
              ]),
            ),
            _label('Months (1-120)'),
            _Field(controller: _months, hint: '24', keyboardType: TextInputType.number, onChanged: () => setState(() {})),
            _label('Starting cash'),
            _Field(
              controller: _cash,
              hint: '0',
              prefix: 'Rs ',
              keyboardType: const TextInputType.numberWithOptions(decimal: true, signed: true),
              onChanged: () => setState(() {}),
            ),
            _label('USD rate (Rs per \$)'),
            _Field(
              controller: _rate,
              hint: '278',
              keyboardType: const TextInputType.numberWithOptions(decimal: true),
              onChanged: () => setState(() {}),
            ),
            const SizedBox(height: 6),
            const Text("The planner's own rate - it doesn't change the real one in Settings.", style: AppTextStyles.bodySmall),
          ],
        ),
      );
}
