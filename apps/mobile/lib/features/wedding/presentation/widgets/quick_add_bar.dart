import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../../core/services/toast_service.dart';
import '../../../../core/theme/app_colors.dart';
import '../../../../core/theme/app_text_styles.dart';
import '../../../../core/utils/amount_expr.dart';
import '../../../../core/widgets/amount_expr_field.dart';
import '../../../../core/widgets/app_text_field.dart';
import '../../data/wedding_datasource.dart';
import '../../domain/wedding_logic.dart';
import '../../domain/wedding_models.dart';
import '../providers/wedding_provider.dart';
import 'wedding_common.dart';

/// Sticky add bar: event picker + name + estimate. Add keeps the name field
/// focused for the next one. With [fixedEventKey] (an event id or [generalKey])
/// it always adds there and shows no picker; otherwise the picker remembers the
/// last event used for this wedding.
class QuickAddBar extends ConsumerStatefulWidget {
  const QuickAddBar({required this.plan, this.fixedEventKey, super.key});
  final WeddingPlan plan;
  final String? fixedEventKey;

  @override
  ConsumerState<QuickAddBar> createState() => _QuickAddBarState();
}

class _QuickAddBarState extends ConsumerState<QuickAddBar> {
  final _name = TextEditingController();
  final _estimate = TextEditingController();
  final _nameFocus = FocusNode();
  final _estimateFocus = FocusNode();
  String? _pick; // event id, null = whole wedding
  bool _busy = false;

  bool get _fixed => widget.fixedEventKey != null;

  @override
  void initState() {
    super.initState();
    if (!_fixed) {
      WeddingLastEvent.read(widget.plan.id).then((saved) {
        if (!mounted) return;
        setState(() => _pick = resolveRememberedEvent(saved, widget.plan.events));
      });
    }
  }

  @override
  void dispose() {
    _name.dispose();
    _estimate.dispose();
    _nameFocus.dispose();
    _estimateFocus.dispose();
    super.dispose();
  }

  /// The event the next expense lands in (a deleted event falls back to whole wedding).
  String? get _eventId {
    final id = _fixed ? (widget.fixedEventKey == generalKey ? null : widget.fixedEventKey) : _pick;
    return id != null && widget.plan.events.any((e) => e.id == id) ? id : null;
  }

  Future<void> _add() async {
    final name = _name.text.trim();
    if (name.isEmpty || _busy) {
      _nameFocus.requestFocus();
      return;
    }
    final estimate = parseOptionalAmount(_estimate.text);
    if (estimate == badAmount) {
      ref.read(toastServiceProvider).error(context, 'That estimate is not a valid amount');
      return;
    }
    setState(() => _busy = true);
    try {
      await ref.read(weddingDatasourceProvider).addExpense(
            widget.plan.id,
            name: name,
            eventId: _eventId,
            estimatedAmount: estimate ?? 0,
          );
      _name.clear();
      _estimate.clear();
      refreshWedding(ref, widget.plan.id);
    } catch (e) {
      if (mounted) toastError(context, ref, e);
    } finally {
      if (mounted) setState(() => _busy = false);
    }
    if (mounted) _nameFocus.requestFocus();
  }

  void _choose(String key) {
    setState(() => _pick = key == generalKey ? null : key);
    WeddingLastEvent.write(widget.plan.id, key);
    _nameFocus.requestFocus();
  }

  @override
  Widget build(BuildContext context) {
    final events = orderEvents(widget.plan.events);
    return Container(
      padding: const EdgeInsets.fromLTRB(12, 8, 12, 8),
      decoration: const BoxDecoration(
        color: AppColors.popover,
        border: Border(top: BorderSide(color: AppColors.border)),
      ),
      child: SafeArea(
        top: false,
        child: Column(mainAxisSize: MainAxisSize.min, children: [
          if (!_fixed)
            Align(
              alignment: Alignment.centerLeft,
              child: PopupMenuButton<String>(
                color: AppColors.popover,
                onSelected: _choose,
                itemBuilder: (_) => [
                  const PopupMenuItem(value: generalKey, child: Text(generalLabel, style: AppTextStyles.bodyMedium)),
                  for (final ev in events) PopupMenuItem(value: ev.id, child: Text(ev.name, style: AppTextStyles.bodyMedium)),
                ],
                child: Padding(
                  padding: const EdgeInsets.only(bottom: 6),
                  child: Row(mainAxisSize: MainAxisSize.min, children: [
                    const Icon(Icons.event_outlined, size: 16, color: AppColors.primary),
                    const SizedBox(width: 6),
                    Text('Add to ${eventName(widget.plan.events, _eventId)}',
                        style: AppTextStyles.labelMedium.copyWith(color: AppColors.primary)),
                    const Icon(Icons.arrow_drop_down, size: 18, color: AppColors.primary),
                  ]),
                ),
              ),
            ),
          Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
            Expanded(
              flex: 5,
              child: AppTextField(
                controller: _name,
                focusNode: _nameFocus,
                hint: 'New expense',
                dense: true,
                textInputAction: TextInputAction.next,
                textCapitalization: TextCapitalization.sentences,
                onSubmitted: (_) => _estimateFocus.requestFocus(),
              ),
            ),
            const SizedBox(width: 8),
            Expanded(
              flex: 3,
              child: AppTextField(
                controller: _estimate,
                focusNode: _estimateFocus,
                hint: 'Estimate',
                dense: true,
                keyboardType: const TextInputType.numberWithOptions(decimal: true),
                textInputAction: TextInputAction.done,
                inputFormatters: [AmountExprFormatter()],
                onSubmitted: (_) => _add(),
              ),
            ),
            const SizedBox(width: 4),
            IconButton.filled(
              onPressed: _busy ? null : _add,
              style: IconButton.styleFrom(backgroundColor: AppColors.primary, foregroundColor: AppColors.primaryForeground),
              icon: const Icon(Icons.add),
              tooltip: 'Add',
            ),
          ]),
        ]),
      ),
    );
  }
}
