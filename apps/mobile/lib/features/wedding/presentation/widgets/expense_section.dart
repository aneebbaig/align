import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../../core/theme/app_colors.dart';
import '../../../../core/theme/app_text_styles.dart';
import '../../../../core/widgets/app_card.dart';
import '../../../../core/widgets/app_empty_state.dart';
import '../../data/wedding_datasource.dart';
import '../../domain/wedding_logic.dart';
import '../../domain/wedding_models.dart';
import '../../../../core/widgets/undo_delete.dart';
import 'expense_sheet.dart';
import 'wedding_common.dart';

/// The expense list with search, status chips and grouping. Rows: tap = detail
/// sheet, swipe right = paid in full (Undo), swipe left = delete (Undo, the API
/// delete waits until the snackbar closes).
class ExpenseSection extends ConsumerStatefulWidget {
  const ExpenseSection({
    required this.plan,
    required this.rows,
    required this.showEvent,
    this.defaultGroup = GroupBy.none,
    super.key,
  });

  final WeddingPlan plan;

  /// Already scoped to the screen (whole wedding, or one event).
  final List<WeddingExpense> rows;
  final bool showEvent;
  final GroupBy defaultGroup;

  @override
  ConsumerState<ExpenseSection> createState() => _ExpenseSectionState();
}

class _ExpenseSectionState extends ConsumerState<ExpenseSection> {
  final _search = TextEditingController();
  StatusFilter _status = StatusFilter.all;
  late GroupBy _group = widget.defaultGroup;

  /// Rows swiped away and waiting for the delete to commit.
  final _hidden = <String>{};

  @override
  void dispose() {
    _search.dispose();
    super.dispose();
  }

  String get _planId => widget.plan.id;

  Future<void> _payInFull(WeddingExpense e) async {
    final ds = ref.read(weddingDatasourceProvider);
    try {
      final prev = await ds.payInFull(_planId, e.id);
      refreshWedding(ref, _planId);
      if (!mounted) return;
      showUndoBar(context, '${e.name} marked paid', onUndo: () async {
        try {
          await ds.restorePayment(_planId, e.id, prev);
          refreshWedding(ref, _planId);
        } catch (err) {
          if (mounted) toastError(context, ref, err);
        }
      });
    } catch (err) {
      if (mounted) toastError(context, ref, err);
    }
  }

  void _delete(WeddingExpense e) {
    final ds = ref.read(weddingDatasourceProvider);
    setState(() => _hidden.add(e.id));
    deferDelete(
      context,
      message: '${e.name} deleted',
      commit: () async {
        await ds.deleteExpense(_planId, e.id);
        // Stays hidden: the refetch drops the row for good.
        refreshWedding(ref, _planId);
      },
      onUndo: () {
        if (mounted) setState(() => _hidden.remove(e.id));
      },
      onError: (err) {
        if (mounted) toastError(context, ref, err);
      },
    );
  }

  @override
  Widget build(BuildContext context) {
    final visible = widget.rows.where((e) => !_hidden.contains(e.id)).toList();
    final counts = statusCounts(visible);
    final filtered = applyFilters(visible, _status, _search.text);
    final groups = groupExpenses(filtered, _group, widget.plan.events);

    return Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
      TextField(
        controller: _search,
        onChanged: (_) => setState(() {}),
        style: AppTextStyles.bodyMedium,
        decoration: InputDecoration(
          hintText: 'Search expenses or vendors',
          hintStyle: AppTextStyles.bodyMedium.copyWith(color: AppColors.mutedForeground),
          prefixIcon: const Icon(Icons.search, size: 20, color: AppColors.mutedForeground),
          suffixIcon: _search.text.isEmpty
              ? null
              : IconButton(
                  icon: const Icon(Icons.close, size: 18),
                  onPressed: () => setState(_search.clear),
                ),
          isDense: true,
          filled: true,
          fillColor: AppColors.card,
          border: OutlineInputBorder(borderRadius: BorderRadius.circular(10), borderSide: BorderSide.none),
        ),
      ),
      const SizedBox(height: 10),
      SingleChildScrollView(
        scrollDirection: Axis.horizontal,
        child: Row(children: [
          for (final f in StatusFilter.values)
            Padding(
              padding: const EdgeInsets.only(right: 8),
              child: PillChip(
                label: f == StatusFilter.all ? statusFilterLabels[f]! : '${statusFilterLabels[f]} ${counts[f]}',
                selected: _status == f,
                onTap: () => setState(() => _status = f),
              ),
            ),
        ]),
      ),
      const SizedBox(height: 8),
      Row(children: [
        Text('Group by', style: AppTextStyles.bodySmall.copyWith(color: AppColors.mutedForeground)),
        const SizedBox(width: 8),
        for (final (g, label) in const [(GroupBy.none, 'None'), (GroupBy.event, 'Event'), (GroupBy.category, 'Category')])
          Padding(
            padding: const EdgeInsets.only(right: 6),
            child: PillChip(label: label, selected: _group == g, onTap: () => setState(() => _group = g)),
          ),
      ]),
      const SizedBox(height: 12),
      if (filtered.isEmpty)
        Padding(
          padding: const EdgeInsets.symmetric(vertical: 24),
          child: AppEmptyState(
            title: widget.rows.isEmpty ? 'Nothing planned yet' : 'No expenses match',
            subtitle: widget.rows.isEmpty ? 'Add the first expense below.' : 'Try another filter or search.',
            icon: Icons.receipt_long_outlined,
          ),
        )
      else
        for (final g in groups) ...[
          if (g.label.isNotEmpty) _GroupHeader(group: g),
          for (final e in g.rows) _row(e),
        ],
    ]);
  }

  Widget _row(WeddingExpense e) {
    final paid = paymentStatus(e) == PaymentStatus.paid;
    return Padding(
      padding: const EdgeInsets.only(bottom: 8),
      child: ClipRRect(
        borderRadius: BorderRadius.circular(12),
        child: Dismissible(
          key: ValueKey('wx-${e.id}'),
          direction: paid ? DismissDirection.endToStart : DismissDirection.horizontal,
          background: const SwipeBackground(alignment: Alignment.centerLeft, color: AppColors.success, icon: Icons.check_circle_outline),
          secondaryBackground: const SwipeBackground(alignment: Alignment.centerRight, color: AppColors.destructive, icon: Icons.delete_outline),
          confirmDismiss: (dir) async {
            if (dir == DismissDirection.startToEnd) {
              _payInFull(e);
              return false; // the row stays; it just turns "paid"
            }
            return true;
          },
          onDismissed: (_) => _delete(e),
          child: _ExpenseRow(
            expense: e,
            events: widget.plan.events,
            showEvent: widget.showEvent,
            onTap: () => showExpenseSheet(context, planId: _planId, expenseId: e.id),
          ),
        ),
      ),
    );
  }
}

class _GroupHeader extends StatelessWidget {
  const _GroupHeader({required this.group});
  final ExpenseGroup group;

  @override
  Widget build(BuildContext context) {
    final t = sumTotals(group.rows);
    return Padding(
      padding: const EdgeInsets.only(top: 8, bottom: 8),
      child: Row(children: [
        Expanded(child: Text(group.label, style: AppTextStyles.labelLarge)),
        Text(
          '${moneyShort(t.projected)} · paid ${moneyShort(t.paid)}',
          style: AppTextStyles.bodySmall.copyWith(color: AppColors.mutedForeground),
        ),
      ]),
    );
  }
}

class _ExpenseRow extends StatelessWidget {
  const _ExpenseRow({required this.expense, required this.events, required this.showEvent, required this.onTap});
  final WeddingExpense expense;
  final List<WeddingEvent> events;
  final bool showEvent;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final e = expense;
    final status = paymentStatus(e);
    final cost = costOf(e);
    final subtitle = [
      if (showEvent) eventName(events, e.eventId),
      categoryLabel(e.category),
      if (e.vendorName != null) e.vendorName!,
    ].join(' · ');
    final needsQuote = e.quotes.length >= 2 && !e.hasChosenQuote;

    final (statusText, statusColor) = switch (status) {
      PaymentStatus.paid => ('Paid', AppColors.success),
      PaymentStatus.partPaid => ('${moneyShort(e.paidAmount)} paid', AppColors.warning),
      PaymentStatus.unpaid => ('To pay', AppColors.mutedForeground),
    };

    return AppCard(
      onTap: onTap,
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
      child: Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Expanded(
          child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            Text(e.name, style: AppTextStyles.bodyMedium.copyWith(fontWeight: FontWeight.w600), maxLines: 1, overflow: TextOverflow.ellipsis),
            const SizedBox(height: 2),
            Text(subtitle, style: AppTextStyles.bodySmall.copyWith(color: AppColors.mutedForeground), maxLines: 1, overflow: TextOverflow.ellipsis),
            if (needsQuote)
              Padding(
                padding: const EdgeInsets.only(top: 4),
                child: Text('${e.quotes.length} quotes - choose one',
                    style: AppTextStyles.labelSmall.copyWith(color: AppColors.warning)),
              ),
          ]),
        ),
        const SizedBox(width: 12),
        Column(crossAxisAlignment: CrossAxisAlignment.end, children: [
          Text(
            cost == 0 ? 'No price' : money(cost),
            style: AppTextStyles.bodyMedium.copyWith(
              fontWeight: FontWeight.w600,
              color: cost == 0 ? AppColors.mutedForeground : AppColors.foreground,
            ),
          ),
          const SizedBox(height: 2),
          Text(
            e.actualAmount == null && cost > 0 ? 'est. · $statusText' : statusText,
            style: AppTextStyles.labelSmall.copyWith(color: statusColor),
          ),
        ]),
      ]),
    );
  }
}
