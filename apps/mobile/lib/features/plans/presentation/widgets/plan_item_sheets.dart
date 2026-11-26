import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../../core/errors/app_exception.dart';
import '../../../../core/services/toast_service.dart';
import '../../../../core/theme/app_colors.dart';
import '../../../../core/theme/app_text_styles.dart';
import '../../../../core/utils/amount_expr.dart';
import '../../../../core/utils/money_format.dart';
import '../../../../core/widgets/amount_expr_field.dart';
import '../../../../core/widgets/app_sheet.dart';
import '../../../../core/widgets/app_text_field.dart';
import '../../../../core/widgets/due_date_chips.dart';
import '../../../../core/widgets/sheet_header.dart';
import '../../../expenses/presentation/widgets/quick_add_helpers.dart';
import '../../data/datasources/plans_datasource.dart';
import '../../domain/entities/plan_entity.dart';
import '../providers/plans_provider.dart';

// ── Add item ─────────────────────────────────────────────────────────────────
//
// Only a name is needed; the estimate can come later. "Add another" keeps the
// sheet open for the next item. The server appends new items at the end.

class AddItemSheet extends ConsumerStatefulWidget {
  const AddItemSheet({required this.planId, super.key});
  final String planId;
  @override
  ConsumerState<AddItemSheet> createState() => _AddItemSheetState();
}

class _AddItemSheetState extends ConsumerState<AddItemSheet> {
  final _name = TextEditingController();
  final _cost = TextEditingController();
  final _nameFocus = FocusNode();
  bool _loading = false;

  // Blank is fine (no estimate yet); a filled-in estimate must be an amount.
  int? get _costPaisas => parseOptionalAmount(_cost.text);
  bool get _canSubmit => _name.text.trim().isNotEmpty && _costPaisas != badAmount;

  @override
  void dispose() {
    _name.dispose();
    _cost.dispose();
    _nameFocus.dispose();
    super.dispose();
  }

  Future<void> _submit({bool another = false}) async {
    if (!_canSubmit) return;
    setState(() => _loading = true);
    try {
      HapticFeedback.mediumImpact();
      await ref.read(plansDatasourceProvider).addItem(
            planId: widget.planId,
            name: _name.text.trim(),
            estimatedCostPaisas: _costPaisas ?? 0,
          );
      ref.invalidate(planDetailProvider(widget.planId));
      ref.invalidate(plansProvider);
      if (!mounted) return;
      ref.read(toastServiceProvider).success(context, 'Item added');
      if (another) {
        setState(() {
          _loading = false;
          _name.clear();
          _cost.clear();
        });
        _nameFocus.requestFocus();
      } else {
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
  Widget build(BuildContext context) => Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 16, 16, 8),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const SheetHeader(title: 'Add item'),
                const SizedBox(height: 16),
                AppTextField(
                  controller: _name,
                  focusNode: _nameFocus,
                  hint: 'Item name',
                  dense: true,
                  autofocus: true,
                  textCapitalization: TextCapitalization.sentences,
                  onChanged: (_) => setState(() {}),
                ),
                const SizedBox(height: 12),
                AmountExprField(controller: _cost, hint: 'Estimated cost (optional)', onChanged: () => setState(() {})),
              ],
            ),
          ),
          QuickAddActions(
            primaryLabel: 'Add',
            loading: _loading,
            onPrimary: _canSubmit ? _submit : null,
            onAddAnother: _canSubmit ? () => _submit(another: true) : null,
          ),
        ],
      );
}

// ── Item details ─────────────────────────────────────────────────────────────

String _asText(int? paisas) => paisas == null || paisas == 0 ? '' : paisasToFieldText(paisas);

String _actText(int? paisas) => paisas == null ? '' : (paisas == 0 ? '0' : _asText(paisas));

class ItemDetailSheet extends ConsumerStatefulWidget {
  const ItemDetailSheet({required this.planId, required this.item, super.key});
  final String planId;
  final PlanItemEntity item;
  @override
  ConsumerState<ItemDetailSheet> createState() => ItemDetailSheetState();
}

class ItemDetailSheetState extends ConsumerState<ItemDetailSheet> {
  late final _name = TextEditingController(text: widget.item.name);
  late final _est = TextEditingController(text: _asText(widget.item.estimatedPaisas));
  late final _act = TextEditingController(text: _actText(widget.item.actualPaisas));
  late final _notes = TextEditingController(text: widget.item.notes ?? '');
  late final _group = TextEditingController(text: widget.item.groupName ?? '');
  late DateTime? _due = widget.item.dueDate;
  bool _busy = false;

  PlanItemEntity get item => widget.item;

  @override
  void dispose() {
    _name.dispose();
    _est.dispose();
    _act.dispose();
    _notes.dispose();
    _group.dispose();
    super.dispose();
  }

  static bool _sameDay(DateTime? a, DateTime? b) =>
      a == null || b == null ? a == b : a.year == b.year && a.month == b.month && a.day == b.day;

  bool get _dirty =>
      _name.text != item.name ||
      _est.text != _asText(item.estimatedPaisas) ||
      _act.text != _actText(item.actualPaisas) ||
      _notes.text != (item.notes ?? '') ||
      _group.text != (item.groupName ?? '') ||
      !_sameDay(_due, item.dueDate);

  Future<void> _run(Future<void> Function() fn, String ok) async {
    setState(() => _busy = true);
    try {
      HapticFeedback.mediumImpact();
      await fn();
      ref.invalidate(planDetailProvider(widget.planId));
      ref.invalidate(plansProvider);
      if (mounted) {
        ref.read(toastServiceProvider).success(context, ok);
        Navigator.pop(context);
      }
    } catch (e) {
      if (mounted) {
        setState(() => _busy = false);
        ref.read(toastServiceProvider).error(context, e is AppException ? e.message : 'Failed');
      }
    }
  }

  void _save() {
    if (_name.text.trim().isEmpty) {
      ref.read(toastServiceProvider).error(context, "Name can't be empty");
      return;
    }
    final est = parseOptionalAmount(_est.text);
    final act = parseOptionalAmount(_act.text);
    if (est == badAmount) {
      ref.read(toastServiceProvider).error(context, 'Check the estimate');
      return;
    }
    if (act == badAmount) {
      ref.read(toastServiceProvider).error(context, 'Check the actual cost');
      return;
    }
    _run(
      () => ref.read(plansDatasourceProvider).updateItem(
            planId: widget.planId,
            itemId: item.id,
            name: _name.text.trim(),
            estimatedCostPaisas: est ?? 0,
            setActual: true,
            actualCostPaisas: act,
            setDueDate: true,
            dueDate: _due,
            setNotes: true,
            notes: _notes.text.trim().isEmpty ? null : _notes.text.trim(),
            setGroup: true,
            groupName: _group.text.trim().isEmpty ? null : _group.text.trim(),
          ),
      'Saved',
    );
  }

  Future<void> _delete() async {
    if (!await confirmDestructive(context, title: 'Delete this item?', body: 'This cannot be undone.') || !mounted) return;
    _run(() => ref.read(plansDatasourceProvider).deleteItem(planId: widget.planId, itemId: item.id), 'Item deleted');
  }

  Widget _field(TextEditingController c, String hint, {int maxLines = 1}) => AppTextField(
        controller: c,
        hint: hint,
        dense: true,
        maxLines: maxLines,
        textCapitalization: TextCapitalization.sentences,
        onChanged: (_) => setState(() {}),
      );

  Widget _labeled(String label, Widget child) => Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(label, style: AppTextStyles.labelSmall),
          const SizedBox(height: 4),
          child,
        ],
      );

  @override
  Widget build(BuildContext context) {
    final dirty = _dirty;
    final ds = ref.read(plansDatasourceProvider);
    final enabled = !_busy && !dirty;
    return SingleChildScrollView(
      padding: const EdgeInsets.fromLTRB(16, 16, 16, 24),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          _labeled('Name', _field(_name, 'Item name')),
          const SizedBox(height: 12),
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Expanded(
                child: _labeled('Estimate', AmountExprField(controller: _est, hint: '0', onChanged: () => setState(() {}))),
              ),
              const SizedBox(width: 10),
              Expanded(
                child: _labeled('Actual cost', AmountExprField(controller: _act, hint: 'Not known yet', onChanged: () => setState(() {}))),
              ),
            ],
          ),
          const SizedBox(height: 12),
          _labeled('Due date', DueDateChips(value: _due, onChanged: (d) => setState(() => _due = d))),
          const SizedBox(height: 12),
          _labeled('Group', _field(_group, 'e.g. Phase 1')),
          const SizedBox(height: 12),
          _labeled('Notes', _field(_notes, 'Quotes, who to call...', maxLines: 3)),
          const SizedBox(height: 16),
          FilledButton(
            onPressed: !_busy && dirty ? _save : null,
            child: const Text('Save'),
          ),
          if (dirty)
            const Padding(
              padding: EdgeInsets.only(top: 6),
              child: Text('Save your changes before buying or logging.', textAlign: TextAlign.center, style: AppTextStyles.labelSmall),
            ),
          const SizedBox(height: 8),
          if (!item.isBought)
            OutlinedButton(
              onPressed: enabled
                  ? () => _run(() => ds.buyItem(planId: widget.planId, itemId: item.id, log: true), 'Bought - expense logged')
                  : null,
              child: const Text('Log as expense'),
            ),
          TextButton(
            onPressed: enabled
                ? () => item.isBought
                    ? _run(() => ds.setItemStatus(planId: widget.planId, itemId: item.id, status: 'PENDING'), 'Marked not bought')
                    : _run(() => ds.buyItem(planId: widget.planId, itemId: item.id, log: false), 'Marked as bought')
                : null,
            child: Text(item.isBought ? 'Mark not bought' : 'Mark bought without an expense'),
          ),
          TextButton(
            onPressed: _busy ? null : _delete,
            child: const Text('Delete item', style: TextStyle(color: AppColors.destructive)),
          ),
        ],
      ),
    );
  }
}
