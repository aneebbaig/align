import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../../core/errors/app_exception.dart';
import '../../../../core/extensions/currency_ext.dart';
import '../../../../core/extensions/datetime_ext.dart';
import '../../../../core/utils/amount_expr.dart';
import '../../../../core/widgets/amount_expr_field.dart';
import '../../../../core/services/toast_service.dart';
import '../../../../core/theme/app_colors.dart';
import '../../../../core/theme/app_text_styles.dart';
import '../../../../core/widgets/app_card.dart';
import '../../data/datasources/plans_datasource.dart';
import '../../domain/entities/plan_entity.dart';
import '../providers/plans_provider.dart';
import '../widgets/plan_sheets.dart';

class PlanDetailPage extends ConsumerWidget {
  const PlanDetailPage({super.key, required this.planId});
  final String planId;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final async = ref.watch(planDetailProvider(planId));
    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        backgroundColor: AppColors.background,
        elevation: 0,
        title: Text(async.asData?.value.name ?? 'Plan', style: AppTextStyles.headlineSmall),
        actions: [
          if (async.asData != null)
            PopupMenuButton<String>(
              icon: const Icon(Icons.more_vert, color: AppColors.mutedForeground),
              color: AppColors.popover,
              onSelected: (v) {
                final plan = async.asData!.value;
                if (v == 'edit') {
                  showEditPlanSheet(context, ref, plan);
                } else if (v == 'delete') {
                  _confirmDeletePlan(context, ref, plan);
                }
              },
              itemBuilder: (_) => [
                const PopupMenuItem(value: 'edit', child: Text('Edit plan', style: AppTextStyles.bodyMedium)),
                PopupMenuItem(value: 'delete', child: Text('Delete plan', style: AppTextStyles.bodyMedium.copyWith(color: AppColors.destructive))),
              ],
            ),
        ],
      ),
      body: RefreshIndicator(
        color: AppColors.primary,
        backgroundColor: AppColors.card,
        onRefresh: () => ref.refresh(planDetailProvider(planId).future),
        child: async.when(
          // Inline edits refetch in the background; keep the rows (and any typing) on screen.
          skipLoadingOnReload: true,
          data: (plan) => _Content(plan: plan),
          loading: () => const Center(child: CircularProgressIndicator(color: AppColors.primary)),
          error: (_, __) => const Center(child: Text('Could not load plan', style: AppTextStyles.bodyMedium)),
        ),
      ),
    );
  }
}

class _Content extends ConsumerStatefulWidget {
  const _Content({required this.plan});
  final PlanDetailEntity plan;

  @override
  ConsumerState<_Content> createState() => _ContentState();
}

class _ContentState extends ConsumerState<_Content> {
  PlanDetailEntity get plan => widget.plan;

  /// Item order while a drag is being saved; cleared when fresh data arrives.
  List<PlanItemEntity>? _local;

  @override
  void didUpdateWidget(covariant _Content old) {
    super.didUpdateWidget(old);
    if (old.plan != widget.plan) _local = null;
  }

  Future<void> _reorder(int from, int to) async {
    final items = [...(_local ?? plan.items)];
    items.insert(to, items.removeAt(from));
    setState(() => _local = items);
    HapticFeedback.selectionClick();
    try {
      await ref.read(plansDatasourceProvider).reorderItems(planId: plan.id, ids: items.map((i) => i.id).toList());
      ref.invalidate(planDetailProvider(plan.id));
    } catch (e) {
      if (!mounted) return;
      setState(() => _local = null);
      ref.read(toastServiceProvider).error(context, e is AppException ? e.message : 'Failed to reorder');
    }
  }

  Future<void> _buy(BuildContext context, WidgetRef ref, PlanItemEntity item, {required bool log}) async {
    try {
      HapticFeedback.mediumImpact();
      await ref.read(plansDatasourceProvider).buyItem(planId: plan.id, itemId: item.id, log: log);
      ref.invalidate(planDetailProvider(plan.id));
      ref.invalidate(plansProvider);
      if (context.mounted) ref.read(toastServiceProvider).success(context, log ? 'Bought — expense logged' : 'Marked as bought');
    } catch (e) {
      if (context.mounted) {
        ref.read(toastServiceProvider).error(context, e is AppException ? e.message : 'Failed');
      }
    }
  }

  Future<void> _undo(BuildContext context, WidgetRef ref, PlanItemEntity item) async {
    try {
      await ref.read(plansDatasourceProvider).setItemStatus(planId: plan.id, itemId: item.id, status: 'PENDING');
      ref.invalidate(planDetailProvider(plan.id));
      ref.invalidate(plansProvider);
    } catch (e) {
      if (context.mounted) {
        ref.read(toastServiceProvider).error(context, e is AppException ? e.message : 'Failed');
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final items = _local ?? plan.items;
    final paidCount = plan.items.where((i) => i.isBought).length;
    final pct = plan.items.isEmpty ? 0 : ((paidCount / plan.items.length) * 100).round();
    return ListView(
      padding: const EdgeInsets.fromLTRB(16, 8, 16, 100),
      children: [
        // Stat row — three single-value cards, all the same natural height.
        Row(
          children: [
            Expanded(child: _Stat(label: 'Estimated', value: plan.totalEstimatedPaisas.formatPKR())),
            const SizedBox(width: 8),
            Expanded(child: _Stat(label: 'Bought', value: plan.totalPaidPaisas.formatPKR(), color: AppColors.success)),
            const SizedBox(width: 8),
            Expanded(child: _Stat(label: 'Progress', value: '$pct%')),
          ],
        ),
        const SizedBox(height: 12),
        _Affordability(plan: plan),
        const SizedBox(height: 16),
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Text('Items & Checklist', style: AppTextStyles.bodyMedium.copyWith(fontWeight: FontWeight.w600)),
            Row(children: [
              Text('$paidCount/${plan.items.length} done', style: AppTextStyles.bodySmall),
              const SizedBox(width: 8),
              TextButton.icon(
                onPressed: () => showAddItemSheet(context, ref, plan.id),
                icon: const Icon(Icons.add, size: 16, color: AppColors.primary),
                label: const Text('Add', style: TextStyle(color: AppColors.primary)),
                style: TextButton.styleFrom(padding: const EdgeInsets.symmetric(horizontal: 6), minimumSize: Size.zero),
              ),
            ]),
          ],
        ),
        const SizedBox(height: 8),
        ReorderableListView.builder(
          shrinkWrap: true,
          physics: const NeverScrollableScrollPhysics(),
          buildDefaultDragHandles: false,
          itemCount: items.length,
          onReorderItem: _reorder,
          proxyDecorator: (child, _, __) => Material(color: Colors.transparent, child: child),
          itemBuilder: (context, index) {
            final item = items[index];
            return Padding(
              key: ValueKey(item.id),
              padding: const EdgeInsets.only(bottom: 8),
              child: _ItemRow(
                item: item,
                dragHandle: ReorderableDragStartListener(
                  index: index,
                  child: const Padding(
                    padding: EdgeInsets.only(right: 8),
                    child: Icon(Icons.drag_indicator, size: 20, color: AppColors.mutedForeground),
                  ),
                ),
                onSave: ({String? name, int? estimated, bool setActual = false, int? actual}) =>
                    _saveItem(item, name: name, estimated: estimated, setActual: setActual, actual: actual),
                onBuy: (log) => _buy(context, ref, item, log: log),
                onUndo: () => _undo(context, ref, item),
                onEdit: () => showEditItemSheet(context, ref, plan.id, item),
                onDelete: () => _deleteItem(context, ref, item),
              ),
            );
          },
        ),
      ],
    );
  }

  /// Inline edit from a tile. Returns whether it saved, so the tile can show it.
  Future<bool> _saveItem(PlanItemEntity item, {String? name, int? estimated, bool setActual = false, int? actual}) async {
    try {
      await ref.read(plansDatasourceProvider).updateItem(
            planId: plan.id,
            itemId: item.id,
            name: name,
            estimatedCostPaisas: estimated,
            setActual: setActual,
            actualCostPaisas: actual,
          );
      ref.invalidate(planDetailProvider(plan.id));
      ref.invalidate(plansProvider);
      return true;
    } catch (e) {
      if (mounted) ref.read(toastServiceProvider).error(context, e is AppException ? e.message : "Couldn't save");
      return false;
    }
  }

  Future<void> _deleteItem(BuildContext context, WidgetRef ref, PlanItemEntity item) async {
    try {
      await ref.read(plansDatasourceProvider).deleteItem(planId: plan.id, itemId: item.id);
      ref.invalidate(planDetailProvider(plan.id));
      ref.invalidate(plansProvider);
    } catch (e) {
      if (context.mounted) ref.read(toastServiceProvider).error(context, e is AppException ? e.message : 'Failed');
    }
  }
}

Future<void> _confirmDeletePlan(BuildContext context, WidgetRef ref, PlanDetailEntity plan) async {
  final ok = await showDialog<bool>(
    context: context,
    builder: (ctx) => AlertDialog(
      backgroundColor: AppColors.card,
      title: const Text('Delete plan?', style: AppTextStyles.bodyLarge),
      content: Text('This removes ${plan.name} and all its items.', style: AppTextStyles.bodySmall),
      actions: [
        TextButton(onPressed: () => Navigator.pop(ctx, false), child: const Text('Cancel')),
        TextButton(onPressed: () => Navigator.pop(ctx, true), child: const Text('Delete', style: TextStyle(color: AppColors.destructive))),
      ],
    ),
  );
  if (ok != true || !context.mounted) return;
  try {
    HapticFeedback.mediumImpact();
    await ref.read(plansDatasourceProvider).deletePlan(plan.id);
    ref.invalidate(plansProvider);
    if (context.mounted) {
      ref.read(toastServiceProvider).success(context, 'Deleted');
      context.pop();
    }
  } catch (e) {
    if (context.mounted) ref.read(toastServiceProvider).error(context, e is AppException ? e.message : 'Failed');
  }
}

class _Stat extends StatelessWidget {
  const _Stat({required this.label, required this.value, this.color});
  final String label;
  final String value;
  final Color? color;

  @override
  Widget build(BuildContext context) => AppCard(
        padding: const EdgeInsets.all(12),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(label, style: AppTextStyles.labelSmall),
            const SizedBox(height: 4),
            Text(value,
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
                style: AppTextStyles.bodyLarge.copyWith(fontWeight: FontWeight.w700, color: color ?? AppColors.foreground)),
          ],
        ),
      );
}

class _Affordability extends StatelessWidget {
  const _Affordability({required this.plan});
  final PlanDetailEntity plan;

  @override
  Widget build(BuildContext context) {
    final a = plan.affordability;
    final ok = a.canAfford;
    final warn = a.coveragePct >= 50;
    final color = ok ? AppColors.success : warn ? AppColors.warning : AppColors.destructive;
    final shortfall = plan.remainingPaisas - a.liquidAvailablePaisas;
    return AppCard(
      color: color.withValues(alpha: 0.08),
      borderColor: color.withValues(alpha: 0.4),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(children: [
            Icon(ok ? Icons.check_circle_outline : Icons.warning_amber_rounded, size: 16, color: color),
            const SizedBox(width: 8),
            Text(ok ? 'You can cover this plan' : '${a.coveragePct}% of remaining cost is covered',
                style: AppTextStyles.bodyMedium.copyWith(fontWeight: FontWeight.w600)),
          ]),
          const SizedBox(height: 10),
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              _Mini(label: 'Still to pay', value: plan.remainingPaisas.formatPKR()),
              _Mini(label: 'Available (liquid)', value: a.liquidAvailablePaisas.formatPKR()),
            ],
          ),
          if (!ok && shortfall > 0) ...[
            const SizedBox(height: 8),
            Text('Shortfall: ${shortfall.formatPKR()}. Build your savings before committing.',
                style: AppTextStyles.bodySmall.copyWith(color: AppColors.mutedForeground)),
          ],
        ],
      ),
    );
  }
}

class _Mini extends StatelessWidget {
  const _Mini({required this.label, required this.value});
  final String label;
  final String value;
  @override
  Widget build(BuildContext context) => Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(label, style: AppTextStyles.labelSmall),
          Text(value, style: AppTextStyles.bodyMedium.copyWith(fontWeight: FontWeight.w600)),
        ],
      );
}

typedef _ItemSave = Future<bool> Function({String? name, int? estimated, bool setActual, int? actual});

/// One checklist tile. Name and the two prices edit in place and save by
/// themselves after a short pause; everything else is behind the menu so the
/// tile stays calm.
class _ItemRow extends StatefulWidget {
  const _ItemRow({
    required this.item,
    required this.dragHandle,
    required this.onSave,
    required this.onBuy,
    required this.onUndo,
    required this.onEdit,
    required this.onDelete,
  });
  final PlanItemEntity item;
  final Widget dragHandle;
  final _ItemSave onSave;

  /// Called with whether to also log an expense.
  final void Function(bool log) onBuy;
  final VoidCallback onUndo;
  final VoidCallback onEdit;
  final VoidCallback onDelete;

  @override
  State<_ItemRow> createState() => _ItemRowState();
}

enum _SaveState { idle, saving, saved }

class _ItemRowState extends State<_ItemRow> {
  static const _delay = Duration(milliseconds: 700);

  late final _name = TextEditingController(text: widget.item.name);
  late final _est = TextEditingController(text: _fmt(widget.item.estimatedPaisas));
  late final _act = TextEditingController(text: _fmt(widget.item.actualPaisas));
  final _nameFocus = FocusNode();
  final _estFocus = FocusNode();
  final _actFocus = FocusNode();
  Timer? _nameTimer, _estTimer, _actTimer, _fade;
  bool _estBad = false, _actBad = false;
  _SaveState _state = _SaveState.idle;

  static String _fmt(int? paisas) {
    if (paisas == null) return '';
    final v = paisas / 100;
    return v == v.roundToDouble() ? v.toStringAsFixed(0) : v.toStringAsFixed(2);
  }

  @override
  void initState() {
    super.initState();
    _nameFocus.addListener(() { if (!_nameFocus.hasFocus) _saveName(); });
    _estFocus.addListener(() { if (!_estFocus.hasFocus) _saveEst(); });
    _actFocus.addListener(() { if (!_actFocus.hasFocus) _saveAct(); });
  }

  @override
  void didUpdateWidget(covariant _ItemRow old) {
    super.didUpdateWidget(old);
    // Follow server changes only for a field that isn't being typed in.
    if (!_nameFocus.hasFocus && _name.text != widget.item.name) _name.text = widget.item.name;
    if (!_estFocus.hasFocus && _estTimer == null) _est.text = _fmt(widget.item.estimatedPaisas);
    if (!_actFocus.hasFocus && _actTimer == null) _act.text = _fmt(widget.item.actualPaisas);
  }

  @override
  void dispose() {
    for (final t in [_nameTimer, _estTimer, _actTimer, _fade]) { t?.cancel(); }
    _name.dispose(); _est.dispose(); _act.dispose();
    _nameFocus.dispose(); _estFocus.dispose(); _actFocus.dispose();
    super.dispose();
  }

  Future<void> _run(Future<bool> Function() save) async {
    setState(() => _state = _SaveState.saving);
    final ok = await save();
    if (!mounted) return;
    setState(() => _state = ok ? _SaveState.saved : _SaveState.idle);
    _fade?.cancel();
    if (ok) _fade = Timer(const Duration(milliseconds: 1500), () { if (mounted) setState(() => _state = _SaveState.idle); });
  }

  void _saveName() {
    _nameTimer?.cancel();
    final v = _name.text.trim();
    if (v.isEmpty) { _name.text = widget.item.name; return; }
    if (v != widget.item.name) _run(() => widget.onSave(name: v));
  }

  void _saveEst() {
    _estTimer?.cancel();
    _estTimer = null;
    final raw = _est.text.trim();
    int? paisas = raw.isEmpty ? 0 : parseAmount(raw).paisas;
    if (raw.isNotEmpty && RegExp(r'^0+(\.0*)?$').hasMatch(raw)) paisas = 0;
    if (paisas == null) { setState(() => _estBad = true); return; }
    setState(() => _estBad = false);
    if (paisas != widget.item.estimatedPaisas) _run(() => widget.onSave(estimated: paisas));
  }

  void _saveAct() {
    _actTimer?.cancel();
    _actTimer = null;
    final raw = _act.text.trim();
    int? paisas;
    if (raw.isNotEmpty) {
      paisas = RegExp(r'^0+(\.0*)?$').hasMatch(raw) ? 0 : parseAmount(raw).paisas;
      if (paisas == null) { setState(() => _actBad = true); return; }
    }
    setState(() => _actBad = false);
    if (paisas != widget.item.actualPaisas) _run(() => widget.onSave(setActual: true, actual: paisas));
  }

  void _buyMenu() {
    showModalBottomSheet<void>(
      context: context,
      backgroundColor: AppColors.popover,
      shape: const RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(16))),
      builder: (ctx) => SafeArea(
        child: Column(mainAxisSize: MainAxisSize.min, children: [
          ListTile(
            leading: const Icon(Icons.receipt_long_outlined, color: AppColors.primary, size: 20),
            title: const Text('Buy & log expense', style: AppTextStyles.bodyMedium),
            subtitle: const Text('Marks it bought and books an expense', style: AppTextStyles.bodySmall),
            onTap: () { Navigator.pop(ctx); widget.onBuy(true); },
          ),
          ListTile(
            leading: const Icon(Icons.check_circle_outline, color: AppColors.foreground, size: 20),
            title: const Text('Mark bought only', style: AppTextStyles.bodyMedium),
            subtitle: const Text('No expense is logged', style: AppTextStyles.bodySmall),
            onTap: () { Navigator.pop(ctx); widget.onBuy(false); },
          ),
        ]),
      ),
    );
  }

  Widget _amountField(String label, TextEditingController c, FocusNode f, bool bad, {required String hint, required VoidCallback onChanged}) {
    return Expanded(
      child: TextField(
        controller: c,
        focusNode: f,
        keyboardType: const TextInputType.numberWithOptions(decimal: true),
        inputFormatters: [AmountExprFormatter()],
        style: AppTextStyles.bodyMedium.copyWith(fontWeight: FontWeight.w600),
        onChanged: (_) => onChanged(),
        onSubmitted: (_) => f.unfocus(),
        decoration: InputDecoration(
          isDense: true,
          labelText: label,
          labelStyle: AppTextStyles.labelSmall,
          floatingLabelBehavior: FloatingLabelBehavior.always,
          hintText: hint,
          hintStyle: AppTextStyles.bodyMedium.copyWith(color: AppColors.mutedForeground.withValues(alpha: 0.5)),
          prefixText: 'Rs ',
          prefixStyle: AppTextStyles.bodySmall.copyWith(color: AppColors.mutedForeground),
          filled: true,
          fillColor: AppColors.card,
          contentPadding: const EdgeInsets.symmetric(horizontal: 10, vertical: 10),
          border: _border(bad ? AppColors.destructive : AppColors.border, 0.5),
          enabledBorder: _border(bad ? AppColors.destructive : AppColors.border, 0.5),
          focusedBorder: _border(bad ? AppColors.destructive : AppColors.primary, 0.8),
        ),
      ),
    );
  }

  OutlineInputBorder _border(Color c, double a) => OutlineInputBorder(
        borderRadius: BorderRadius.circular(8),
        borderSide: BorderSide(color: c.withValues(alpha: a)),
      );

  @override
  Widget build(BuildContext context) {
    final item = widget.item;
    final diff = item.actualPaisas != null && item.estimatedPaisas > 0 ? item.actualPaisas! - item.estimatedPaisas : 0;
    return AppCard(
      padding: const EdgeInsets.fromLTRB(12, 10, 6, 12),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              widget.dragHandle,
              Expanded(
                child: TextField(
                  controller: _name,
                  focusNode: _nameFocus,
                  textCapitalization: TextCapitalization.sentences,
                  style: AppTextStyles.bodyMedium.copyWith(color: item.isBought ? AppColors.mutedForeground : AppColors.foreground),
                  decoration: const InputDecoration(isDense: true, border: InputBorder.none, enabledBorder: InputBorder.none, focusedBorder: InputBorder.none, contentPadding: EdgeInsets.symmetric(vertical: 6)),
                  onChanged: (_) {
                    _nameTimer?.cancel();
                    _nameTimer = Timer(_delay, _saveName);
                  },
                  onSubmitted: (_) => _nameFocus.unfocus(),
                ),
              ),
              SizedBox(
                width: 18,
                child: switch (_state) {
                  _SaveState.saving => const Center(child: SizedBox(width: 12, height: 12, child: CircularProgressIndicator(strokeWidth: 1.5, color: AppColors.mutedForeground))),
                  _SaveState.saved => const Icon(Icons.check, size: 14, color: AppColors.success),
                  _SaveState.idle => null,
                },
              ),
              const SizedBox(width: 4),
              if (item.isBought)
                TextButton.icon(
                  onPressed: widget.onUndo,
                  icon: const Icon(Icons.check_circle, size: 16, color: AppColors.success),
                  label: const Text('Bought', style: TextStyle(color: AppColors.success)),
                  style: TextButton.styleFrom(padding: const EdgeInsets.symmetric(horizontal: 8), minimumSize: Size.zero),
                )
              else
                OutlinedButton(
                  onPressed: _buyMenu,
                  style: OutlinedButton.styleFrom(
                    foregroundColor: AppColors.primary,
                    side: BorderSide(color: AppColors.primary.withValues(alpha: 0.4)),
                    padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                    minimumSize: Size.zero,
                  ),
                  child: const Text('Buy'),
                ),
              PopupMenuButton<String>(
                icon: const Icon(Icons.more_vert, size: 18, color: AppColors.mutedForeground),
                padding: EdgeInsets.zero,
                color: AppColors.popover,
                onSelected: (v) => v == 'edit' ? widget.onEdit() : widget.onDelete(),
                itemBuilder: (_) => [
                  const PopupMenuItem(value: 'edit', child: Text('Edit details', style: AppTextStyles.bodyMedium)),
                  PopupMenuItem(value: 'delete', child: Text('Delete', style: AppTextStyles.bodyMedium.copyWith(color: AppColors.destructive))),
                ],
              ),
            ],
          ),
          const SizedBox(height: 10),
          Padding(
            padding: const EdgeInsets.only(left: 28, right: 6),
            child: Row(
              children: [
                _amountField('Estimate', _est, _estFocus, _estBad, hint: '0', onChanged: () {
                  _estTimer?.cancel();
                  _estTimer = Timer(_delay, _saveEst);
                }),
                const SizedBox(width: 10),
                _amountField('Actual', _act, _actFocus, _actBad, hint: 'not yet', onChanged: () {
                  _actTimer?.cancel();
                  _actTimer = Timer(_delay, _saveAct);
                }),
              ],
            ),
          ),
          if (diff != 0 || item.dueDate != null || (item.notes ?? '').isNotEmpty)
            Padding(
              padding: const EdgeInsets.only(left: 28, top: 8, right: 6),
              child: Wrap(
                spacing: 12,
                runSpacing: 2,
                children: [
                  if (diff != 0)
                    Text(
                      '${diff > 0 ? '▲' : '▼'} ${diff.abs().formatPKR()} ${diff > 0 ? 'over' : 'under'} estimate',
                      style: AppTextStyles.labelSmall.copyWith(color: diff > 0 ? AppColors.destructive : AppColors.success),
                    ),
                  if (item.dueDate != null)
                    Text('Due ${item.dueDate!.toShortDate}', style: AppTextStyles.labelSmall),
                  if ((item.notes ?? '').isNotEmpty)
                    Text(item.notes!, style: AppTextStyles.labelSmall.copyWith(fontStyle: FontStyle.italic)),
                ],
              ),
            ),
        ],
      ),
    );
  }
}
