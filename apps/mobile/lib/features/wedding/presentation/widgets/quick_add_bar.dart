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
import 'wedding_sheets.dart';

/// Sticky add bar: event picker + name + estimate. Add keeps the name field
/// focused for the next one. Every expense belongs to an event: with [fixedEventId]
/// it always adds there and shows no picker; otherwise the picker remembers the
/// last event used for this wedding (first event by default). A wedding with no
/// events shows a prompt to add one instead.
class QuickAddBar extends ConsumerStatefulWidget {
  const QuickAddBar({required this.plan, this.fixedEventId, super.key});
  final WeddingPlan plan;
  final String? fixedEventId;

  @override
  ConsumerState<QuickAddBar> createState() => _QuickAddBarState();
}

class _QuickAddBarState extends ConsumerState<QuickAddBar> {
  final _name = TextEditingController();
  final _estimate = TextEditingController();
  final _nameFocus = FocusNode();
  final _estimateFocus = FocusNode();
  String? _pick; // remembered event id
  bool _busy = false;

  bool get _fixed => widget.fixedEventId != null;

  @override
  void initState() {
    super.initState();
    if (!_fixed) {
      WeddingLastEvent.read(widget.plan.id).then((saved) {
        if (!mounted) return;
        setState(() => _pick = saved);
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

  /// The event the next expense lands in (a deleted event falls back to the first one); null when there are none.
  String? get _eventId => _fixed ? widget.fixedEventId : resolveRememberedEvent(_pick, widget.plan.events);

  Future<void> _add() async {
    final name = _name.text.trim();
    final eventId = _eventId;
    if (eventId == null) return;
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
            eventId: eventId,
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
    setState(() => _pick = key);
    WeddingLastEvent.write(widget.plan.id, key);
    _nameFocus.requestFocus();
  }

  @override
  Widget build(BuildContext context) {
    final events = orderEvents(widget.plan.events);
    final eventId = _eventId;
    if (eventId == null) {
      return Container(
        padding: const EdgeInsets.fromLTRB(12, 8, 12, 8),
        decoration: const BoxDecoration(
          color: AppColors.popover,
          border: Border(top: BorderSide(color: AppColors.border)),
        ),
        child: SafeArea(
          top: false,
          child: Row(children: [
            Expanded(
              child: Text('Add an event first - every expense belongs to one.',
                  style: AppTextStyles.bodySmall.copyWith(color: AppColors.mutedForeground)),
            ),
            TextButton.icon(
              onPressed: () => showAddEventSheet(context, widget.plan),
              icon: const Icon(Icons.add, size: 16),
              label: const Text('Add event'),
            ),
          ]),
        ),
      );
    }
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
                  for (final ev in events) PopupMenuItem(value: ev.id, child: Text(ev.name, style: AppTextStyles.bodyMedium)),
                ],
                child: Padding(
                  padding: const EdgeInsets.only(bottom: 6),
                  child: Row(mainAxisSize: MainAxisSize.min, children: [
                    const Icon(Icons.event_outlined, size: 16, color: AppColors.primary),
                    const SizedBox(width: 6),
                    Text('Add to ${eventName(widget.plan.events, eventId)}',
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
