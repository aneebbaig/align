import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';

import '../../../../core/services/toast_service.dart';
import '../../../../core/theme/app_colors.dart';
import '../../../../core/theme/app_text_styles.dart';
import '../../../../core/utils/amount_expr.dart';
import '../../../../core/utils/money_format.dart';
import '../../../../core/widgets/amount_expr_field.dart';
import '../../../../core/widgets/app_sheet.dart';
import '../../../../core/widgets/app_text_field.dart';
import '../../../../core/widgets/sheet_header.dart';
import '../../data/wedding_datasource.dart';
import '../../domain/wedding_logic.dart';
import '../../domain/wedding_models.dart';
import '../providers/wedding_provider.dart';
import 'wedding_common.dart';

/// Edit an event's name, date and budget, or delete it. Resolves to true when deleted.
Future<bool?> showEditEventSheet(BuildContext context, String planId, WeddingEvent event) =>
    showAppSheet<bool>(context, _EditEvent(planId: planId, event: event), safeArea: true);

/// Edit the wedding's names, date, budget, haq mehr and notes.
Future<void> showEditWeddingSheet(BuildContext context, WeddingPlan plan) =>
    showAppSheet<void>(context, _EditWedding(plan: plan), safeArea: true);

/// A date button with a clear icon; null means no date.
class _DateField extends StatelessWidget {
  const _DateField({required this.label, required this.value, required this.onChanged});
  final String label;
  final DateTime? value;
  final ValueChanged<DateTime?> onChanged;

  Future<void> _pick(BuildContext context) async {
    final now = DateTime.now();
    final d = await showDatePicker(
      context: context,
      initialDate: value ?? now,
      firstDate: DateTime(now.year - 1),
      lastDate: DateTime(now.year + 10),
    );
    if (d != null) onChanged(d);
  }

  @override
  Widget build(BuildContext context) => Row(children: [
        Expanded(
          child: OutlinedButton.icon(
            onPressed: () => _pick(context),
            icon: const Icon(Icons.calendar_today_outlined, size: 18),
            label: Text(value == null ? label : DateFormat('d MMM yyyy').format(value!)),
          ),
        ),
        if (value != null)
          IconButton(onPressed: () => onChanged(null), icon: const Icon(Icons.close, size: 18, color: AppColors.mutedForeground)),
      ]);
}

Widget _caption(String text) => Padding(
      padding: const EdgeInsets.only(top: 12, bottom: 4),
      child: Text(text, style: AppTextStyles.bodySmall.copyWith(color: AppColors.mutedForeground)),
    );

String _amountText(int? paisas) => paisas == null || paisas == 0 ? '' : paisasToFieldText(paisas);

class _EditEvent extends ConsumerStatefulWidget {
  const _EditEvent({required this.planId, required this.event});
  final String planId;
  final WeddingEvent event;
  @override
  ConsumerState<_EditEvent> createState() => _EditEventState();
}

class _EditEventState extends ConsumerState<_EditEvent> {
  late final _name = TextEditingController(text: widget.event.name);
  late final _budget = TextEditingController(text: _amountText(widget.event.budgetAllocated));
  late DateTime? _date = widget.event.date;
  bool _busy = false;

  @override
  void dispose() {
    _name.dispose();
    _budget.dispose();
    super.dispose();
  }

  Future<void> _save() async {
    if (_name.text.trim().isEmpty) {
      ref.read(toastServiceProvider).error(context, 'Give the event a name');
      return;
    }
    final budget = parseOptionalAmount(_budget.text);
    if (budget == badAmount) {
      ref.read(toastServiceProvider).error(context, 'That budget is not a valid amount');
      return;
    }
    await _run(() => ref.read(weddingDatasourceProvider).updateEvent(widget.planId, widget.event.id, {
          'name': _name.text.trim(),
          'date': _date?.toIso8601String(),
          'budgetAllocated': budget ?? 0,
        }), false);
  }

  Future<void> _delete() async {
    final plan = ref.read(weddingPlanProvider(widget.planId)).asData?.value;
    final others = [for (final e in orderEvents(plan?.events ?? const []) ) if (e.id != widget.event.id) e];
    final count = plan?.expenses.where((x) => x.eventId == widget.event.id).length ?? 0;
    final choice = await _askRemoval(context, event: widget.event, others: others, expenseCount: count);
    if (choice == null) return;
    await _run(
      () => ref.read(weddingDatasourceProvider).deleteEvent(
            widget.planId,
            widget.event.id,
            moveTo: choice.moveTo,
            deleteExpenses: choice.deleteExpenses,
          ),
      true,
    );
  }

  Future<void> _run(Future<void> Function() call, bool deleted) async {
    setState(() => _busy = true);
    try {
      await call();
      refreshWedding(ref, widget.planId);
      if (mounted) Navigator.pop(context, deleted);
    } catch (e) {
      if (mounted) {
        setState(() => _busy = false);
        toastError(context, ref, e);
      }
    }
  }

  @override
  Widget build(BuildContext context) => ListView(
        shrinkWrap: true,
        padding: const EdgeInsets.fromLTRB(16, 16, 16, 24),
        children: [
          SheetHeader(title: 'Edit event', loading: _busy, canSubmit: true, onSubmit: _save),
          const SizedBox(height: 8),
          AppTextField(controller: _name, label: 'Name', dense: true, textCapitalization: TextCapitalization.words),
          const SizedBox(height: 12),
          _DateField(label: 'Event date (optional)', value: _date, onChanged: (d) => setState(() => _date = d)),
          _caption('Budget (optional)'),
          AmountExprField(controller: _budget, prefix: 'PKR '),
          const SizedBox(height: 12),
          TextButton.icon(
            onPressed: _busy ? null : _delete,
            icon: const Icon(Icons.delete_outline, size: 18, color: AppColors.destructive),
            label: const Text('Delete event', style: TextStyle(color: AppColors.destructive)),
          ),
        ],
      );
}

class _EditWedding extends ConsumerStatefulWidget {
  const _EditWedding({required this.plan});
  final WeddingPlan plan;
  @override
  ConsumerState<_EditWedding> createState() => _EditWeddingState();
}

class _EditWeddingState extends ConsumerState<_EditWedding> {
  late final _bride = TextEditingController(text: widget.plan.brideName);
  late final _groom = TextEditingController(text: widget.plan.groomName);
  late final _haq = TextEditingController(text: _amountText(widget.plan.haqMehr));
  late final _haqNote = TextEditingController(text: widget.plan.haqMehrNote ?? '');
  late final _notes = TextEditingController(text: widget.plan.notes ?? '');
  late DateTime? _date = widget.plan.weddingDate;
  bool _busy = false;

  @override
  void dispose() {
    for (final c in [_bride, _groom, _haq, _haqNote, _notes]) {
      c.dispose();
    }
    super.dispose();
  }

  Future<void> _save() async {
    if (_bride.text.trim().isEmpty || _groom.text.trim().isEmpty) {
      ref.read(toastServiceProvider).error(context, 'Enter both names');
      return;
    }
    final haq = parseOptionalAmount(_haq.text);
    if (haq == badAmount) {
      ref.read(toastServiceProvider).error(context, 'That is not a valid amount');
      return;
    }
    setState(() => _busy = true);
    try {
      await ref.read(weddingDatasourceProvider).updateWedding(widget.plan.id, {
        'brideName': _bride.text.trim(),
        'groomName': _groom.text.trim(),
        'weddingDate': _date?.toIso8601String(),
        'haqMehr': haq == null || haq == 0 ? null : haq,
        'haqMehrNote': _haqNote.text.trim().isEmpty ? null : _haqNote.text.trim(),
        'notes': _notes.text.trim().isEmpty ? null : _notes.text.trim(),
      });
      refreshWedding(ref, widget.plan.id);
      if (mounted) Navigator.pop(context);
    } catch (e) {
      if (mounted) {
        setState(() => _busy = false);
        toastError(context, ref, e);
      }
    }
  }

  @override
  Widget build(BuildContext context) => ListView(
        shrinkWrap: true,
        padding: const EdgeInsets.fromLTRB(16, 16, 16, 24),
        children: [
          SheetHeader(title: 'Wedding details', loading: _busy, canSubmit: true, onSubmit: _save),
          const SizedBox(height: 8),
          AppTextField(controller: _bride, label: "Bride's name", dense: true, textCapitalization: TextCapitalization.words),
          const SizedBox(height: 12),
          AppTextField(controller: _groom, label: "Groom's name", dense: true, textCapitalization: TextCapitalization.words),
          const SizedBox(height: 12),
          _DateField(label: 'Wedding date (optional)', value: _date, onChanged: (d) => setState(() => _date = d)),
          _caption('Haq Mehr (kept separate from the budget)'),
          AmountExprField(controller: _haq, prefix: 'PKR '),
          const SizedBox(height: 12),
          AppTextField(controller: _haqNote, label: 'Haq Mehr note', dense: true),
          const SizedBox(height: 12),
          AppTextField(controller: _notes, label: 'Notes', dense: true, maxLines: 4, textCapitalization: TextCapitalization.sentences),
        ],
      );
}

/// What to do with an event's expenses when it is deleted: move them to another event, or delete them too.
class _Removal {
  const _Removal({this.moveTo, this.deleteExpenses = false});
  final String? moveTo;
  final bool deleteExpenses;
}

Future<_Removal?> _askRemoval(
  BuildContext context, {
  required WeddingEvent event,
  required List<WeddingEvent> others,
  required int expenseCount,
}) =>
    showDialog<_Removal>(
      context: context,
      builder: (_) => _RemovalDialog(event: event, others: others, expenseCount: expenseCount),
    );

class _RemovalDialog extends StatefulWidget {
  const _RemovalDialog({required this.event, required this.others, required this.expenseCount});
  final WeddingEvent event;
  final List<WeddingEvent> others;
  final int expenseCount;
  @override
  State<_RemovalDialog> createState() => _RemovalDialogState();
}

class _RemovalDialogState extends State<_RemovalDialog> {
  bool _move = true;
  late String? _target = widget.others.isEmpty ? null : widget.others.first.id;

  @override
  Widget build(BuildContext context) {
    final n = widget.expenseCount;
    final canMove = widget.others.isNotEmpty;
    final move = _move && canMove;
    return AlertDialog(
      backgroundColor: AppColors.popover,
      title: Text('Delete ${widget.event.name}?', style: AppTextStyles.headlineSmall),
      content: Column(mainAxisSize: MainAxisSize.min, crossAxisAlignment: CrossAxisAlignment.start, children: [
        if (n == 0)
          const Text("It has no expenses. This can't be undone.", style: AppTextStyles.bodyMedium)
        else ...[
          Text(
            'This event has $n expense${n == 1 ? '' : 's'}.${canMove ? '' : ' It is your only event, so they are deleted with it.'}',
            style: AppTextStyles.bodyMedium,
          ),
          if (canMove) ...[
            const SizedBox(height: 12),
            Wrap(spacing: 8, children: [
              PillChip(label: 'Move them', selected: _move, onTap: () => setState(() => _move = true)),
              PillChip(label: 'Delete them too', selected: !_move, onTap: () => setState(() => _move = false)),
            ]),
            if (_move) ...[
              const SizedBox(height: 12),
              Text('Move them to:', style: AppTextStyles.bodySmall.copyWith(color: AppColors.mutedForeground)),
              DropdownButton<String>(
                isExpanded: true,
                dropdownColor: AppColors.popover,
                value: _target,
                items: [for (final e in widget.others) DropdownMenuItem(value: e.id, child: Text(e.name, style: AppTextStyles.bodyMedium))],
                onChanged: (v) => setState(() => _target = v),
              ),
            ],
          ],
        ],
      ]),
      actions: [
        TextButton(onPressed: () => Navigator.pop(context), child: const Text('Cancel')),
        TextButton(
          onPressed: () => Navigator.pop(
            context,
            n == 0 ? const _Removal() : (move ? _Removal(moveTo: _target) : const _Removal(deleteExpenses: true)),
          ),
          child: Text(n > 0 && !move ? 'Delete event and expenses' : 'Delete event',
              style: const TextStyle(color: AppColors.destructive)),
        ),
      ],
    );
  }
}
