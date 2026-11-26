import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';

import '../../../../core/services/toast_service.dart';
import '../../../../core/theme/app_colors.dart';
import '../../../../core/theme/app_text_styles.dart';
import '../../../../core/utils/amount_expr.dart';
import '../../../../core/widgets/amount_expr_field.dart';
import '../../../../core/utils/money_format.dart';
import '../../../../core/widgets/app_sheet.dart';
import '../../../../core/widgets/app_text_field.dart';
import '../../../../core/widgets/sheet_header.dart';
import '../../data/wedding_datasource.dart';
import '../../domain/wedding_logic.dart';
import '../../domain/wedding_models.dart';
import 'wedding_common.dart';

/// Creates a wedding; resolves to the new id (or null if dismissed).
Future<String?> showCreateWeddingSheet(BuildContext context) => showAppSheet<String>(context, const _CreateWedding(), safeArea: true);

/// Edit the total budget.
Future<void> showBudgetSheet(BuildContext context, WeddingPlan plan) => showAppSheet<void>(context, _BudgetSheet(plan: plan), safeArea: true);

/// One-tap event types, plus a custom name.
Future<void> showAddEventSheet(BuildContext context, WeddingPlan plan) => showAppSheet<void>(context, _AddEventSheet(plan: plan), safeArea: true);

class _CreateWedding extends ConsumerStatefulWidget {
  const _CreateWedding();
  @override
  ConsumerState<_CreateWedding> createState() => _CreateWeddingState();
}

class _CreateWeddingState extends ConsumerState<_CreateWedding> {
  final _bride = TextEditingController();
  final _groom = TextEditingController();
  final _budget = TextEditingController();
  DateTime? _date;
  bool _busy = false;

  @override
  void dispose() {
    _bride.dispose();
    _groom.dispose();
    _budget.dispose();
    super.dispose();
  }

  Future<void> _pickDate() async {
    final now = DateTime.now();
    final d = await showDatePicker(
      context: context,
      initialDate: _date ?? now,
      firstDate: DateTime(now.year - 1),
      lastDate: DateTime(now.year + 10),
    );
    if (d != null) setState(() => _date = d);
  }

  Future<void> _create() async {
    if (_bride.text.trim().isEmpty || _groom.text.trim().isEmpty) {
      ref.read(toastServiceProvider).error(context, 'Enter both names');
      return;
    }
    final budget = parseOptionalAmount(_budget.text);
    if (budget == badAmount) {
      ref.read(toastServiceProvider).error(context, 'That budget is not a valid amount');
      return;
    }
    setState(() => _busy = true);
    try {
      final id = await ref.read(weddingDatasourceProvider).createWedding(
            brideName: _bride.text.trim(),
            groomName: _groom.text.trim(),
            weddingDate: _date,
            totalBudget: budget,
          );
      if (mounted) Navigator.pop(context, id);
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
          SheetHeader(title: 'New wedding', loading: _busy, canSubmit: true, onSubmit: _create, submit: 'Create'),
          const SizedBox(height: 8),
          AppTextField(controller: _bride, label: "Bride's name", dense: true, autofocus: true, textCapitalization: TextCapitalization.words),
          const SizedBox(height: 12),
          AppTextField(controller: _groom, label: "Groom's name", dense: true, textCapitalization: TextCapitalization.words),
          const SizedBox(height: 12),
          OutlinedButton.icon(
            onPressed: _pickDate,
            icon: const Icon(Icons.calendar_today_outlined, size: 18),
            label: Text(_date == null ? 'Wedding date (optional)' : DateFormat('d MMM yyyy').format(_date!)),
          ),
          const SizedBox(height: 12),
          Text('Total budget (optional)', style: AppTextStyles.bodySmall.copyWith(color: AppColors.mutedForeground)),
          const SizedBox(height: 4),
          AmountExprField(controller: _budget, prefix: 'PKR '),
        ],
      );
}

class _BudgetSheet extends ConsumerStatefulWidget {
  const _BudgetSheet({required this.plan});
  final WeddingPlan plan;
  @override
  ConsumerState<_BudgetSheet> createState() => _BudgetSheetState();
}

class _BudgetSheetState extends ConsumerState<_BudgetSheet> {
  late final _c = TextEditingController(text: widget.plan.totalBudget == 0 ? '' : paisasToFieldText(widget.plan.totalBudget));
  bool _busy = false;

  @override
  void dispose() {
    _c.dispose();
    super.dispose();
  }

  Future<void> _save() async {
    final v = parseOptionalAmount(_c.text);
    if (v == badAmount) {
      ref.read(toastServiceProvider).error(context, 'That is not a valid amount');
      return;
    }
    setState(() => _busy = true);
    try {
      await ref.read(weddingDatasourceProvider).updateWedding(widget.plan.id, {'totalBudget': v ?? 0});
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
          SheetHeader(title: 'Wedding budget', loading: _busy, canSubmit: true, onSubmit: _save),
          const SizedBox(height: 8),
          AmountExprField(controller: _c, prefix: 'PKR ', autofocus: true),
        ],
      );
}

class _AddEventSheet extends ConsumerStatefulWidget {
  const _AddEventSheet({required this.plan});
  final WeddingPlan plan;
  @override
  ConsumerState<_AddEventSheet> createState() => _AddEventSheetState();
}

class _AddEventSheetState extends ConsumerState<_AddEventSheet> {
  final _name = TextEditingController();
  bool _busy = false;

  @override
  void dispose() {
    _name.dispose();
    super.dispose();
  }

  Future<void> _add(String type, String name) async {
    if (name.trim().isEmpty || _busy) return;
    setState(() => _busy = true);
    try {
      final order = eventTypes.indexWhere((t) => t.$1 == type) + 1;
      await ref.read(weddingDatasourceProvider).addEvent(widget.plan.id, type: type, name: name.trim(), order: order);
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
  Widget build(BuildContext context) {
    final have = widget.plan.events.map((e) => e.type).toSet();
    return ListView(
      shrinkWrap: true,
      padding: const EdgeInsets.fromLTRB(16, 16, 16, 24),
      children: [
        Text('Add an event', style: AppTextStyles.bodyLarge.copyWith(fontWeight: FontWeight.w600)),
        const SizedBox(height: 12),
        Wrap(spacing: 8, runSpacing: 8, children: [
          for (final (type, label) in eventTypes)
            if (type != 'OTHER' && !have.contains(type)) PillChip(label: label, selected: false, onTap: () => _add(type, label)),
        ]),
        const SizedBox(height: 16),
        Row(children: [
          Expanded(child: AppTextField(controller: _name, hint: 'Custom event', dense: true, textCapitalization: TextCapitalization.words, onSubmitted: (v) => _add('OTHER', v))),
          IconButton(onPressed: _busy ? null : () => _add('OTHER', _name.text), icon: const Icon(Icons.add_circle, color: AppColors.primary)),
        ]),
      ],
    );
  }
}
