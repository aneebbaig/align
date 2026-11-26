import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';

import '../../../../core/theme/app_colors.dart';
import '../../../../core/theme/app_text_styles.dart';
import '../../../../core/widgets/app_card.dart';
import '../../../../core/widgets/app_empty_state.dart';
import '../../../../core/widgets/app_sheet.dart';
import '../../data/wedding_datasource.dart';
import '../../domain/wedding_logic.dart';
import '../../domain/wedding_models.dart';
import '../providers/wedding_provider.dart';
import '../widgets/expense_section.dart';
import '../widgets/expense_sheet.dart';
import '../widgets/quick_add_bar.dart';
import '../widgets/wedding_common.dart';
import '../widgets/wedding_edit_sheets.dart';
import '../widgets/wedding_sheets.dart';

/// One wedding: budget summary, events, what needs attention, and every expense.
/// [onShowAll] is set when the person has other weddings to switch to.
class WeddingPage extends ConsumerWidget {
  const WeddingPage({required this.planId, this.onShowAll, super.key});
  final String planId;
  final VoidCallback? onShowAll;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final async = ref.watch(weddingPlanProvider(planId));
    final plan = async.asData?.value;
    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        backgroundColor: AppColors.background,
        elevation: 0,
        title: Text(plan?.title ?? 'Wedding', style: AppTextStyles.headlineSmall),
        actions: [if (plan != null) _PlanMenu(plan: plan, onShowAll: onShowAll)],
      ),
      body: async.when(
        skipLoadingOnReload: true,
        loading: () => const Center(child: CircularProgressIndicator(color: AppColors.primary)),
        error: (e, _) => AppEmptyState(
          title: 'Could not load this wedding',
          subtitle: errorText(e),
          onRetry: () => ref.invalidate(weddingPlanProvider(planId)),
        ),
        data: (plan) => Column(children: [
          Expanded(
            child: RefreshIndicator(
              color: AppColors.primary,
              backgroundColor: AppColors.card,
              onRefresh: () => ref.refresh(weddingPlanProvider(planId).future),
              child: _Overview(plan: plan),
            ),
          ),
          QuickAddBar(plan: plan),
        ]),
      ),
    );
  }
}

class _PlanMenu extends ConsumerWidget {
  const _PlanMenu({required this.plan, this.onShowAll});
  final WeddingPlan plan;
  final VoidCallback? onShowAll;

  @override
  Widget build(BuildContext context, WidgetRef ref) => PopupMenuButton<String>(
        icon: const Icon(Icons.more_vert, color: AppColors.mutedForeground),
        color: AppColors.popover,
        onSelected: (v) async {
          final ds = ref.read(weddingDatasourceProvider);
          switch (v) {
            case 'details':
              showEditWeddingSheet(context, plan);
            case 'event':
              showAddEventSheet(context, plan);
            case 'all':
              onShowAll?.call();
            case 'status':
              try {
                await ds.updateWedding(plan.id, {'status': plan.status == 'DONE' ? 'IN_PROGRESS' : 'DONE'});
                refreshWedding(ref, plan.id);
              } catch (e) {
                if (context.mounted) toastError(context, ref, e);
              }
            case 'delete':
              final ok = await confirmDestructive(context,
                  title: 'Delete this wedding?', body: 'Its events, expenses and quotes are deleted too.');
              if (!ok) return;
              try {
                await ds.deleteWedding(plan.id);
                ref.invalidate(weddingListProvider);
                if (context.mounted) context.go('/wedding');
              } catch (e) {
                if (context.mounted) toastError(context, ref, e);
              }
          }
        },
        itemBuilder: (_) => [
          const PopupMenuItem(value: 'details', child: Text('Edit wedding details', style: AppTextStyles.bodyMedium)),
          const PopupMenuItem(value: 'event', child: Text('Add event', style: AppTextStyles.bodyMedium)),
          if (onShowAll != null) const PopupMenuItem(value: 'all', child: Text('All weddings', style: AppTextStyles.bodyMedium)),
          PopupMenuItem(
            value: 'status',
            child: Text(plan.status == 'DONE' ? 'Reopen' : 'Mark done', style: AppTextStyles.bodyMedium),
          ),
          PopupMenuItem(value: 'delete', child: Text('Delete wedding', style: AppTextStyles.bodyMedium.copyWith(color: AppColors.destructive))),
        ],
      );
}

class _Overview extends ConsumerWidget {
  const _Overview({required this.plan});
  final WeddingPlan plan;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final events = orderEvents(plan.events);
    final totals = sumTotals(plan.expenses);
    final attention = attentionItems(plan, DateTime.now(), money: moneyShort);

    return ListView(
      padding: const EdgeInsets.fromLTRB(16, 4, 16, 24),
      physics: const AlwaysScrollableScrollPhysics(),
      children: [
        BudgetCard(plan: plan, totals: totals),
        SectionTitle(
          'Events',
          trailing: TextButton.icon(
            onPressed: () => showAddEventSheet(context, plan),
            icon: const Icon(Icons.add, size: 16),
            label: const Text('Add event'),
          ),
        ),
        if (events.isEmpty)
          AppCard(
            onTap: () => showAddEventSheet(context, plan),
            child: Row(children: [
              const Icon(Icons.event_outlined, color: AppColors.primary),
              const SizedBox(width: 12),
              Expanded(
                child: Text('Every expense belongs to an event. Add your events first (Nikkah, Barat, Valima...).',
                    style: AppTextStyles.bodyMedium.copyWith(color: AppColors.mutedForeground)),
              ),
            ]),
          )
        else
          SizedBox(
            height: 112,
            child: ListView(
              scrollDirection: Axis.horizontal,
              children: [
                for (final ev in events)
                  _EventCard(planId: plan.id, event: ev, rows: plan.expenses.where((e) => e.eventId == ev.id).toList()),
              ],
            ),
          ),
        if (attention.isNotEmpty) ...[
          const SectionTitle('Needs attention'),
          for (final a in attention.take(5)) _AttentionTile(planId: plan.id, item: a),
          if (attention.length > 5)
            Padding(
              padding: const EdgeInsets.only(top: 4),
              child: Text('and ${attention.length - 5} more',
                  style: AppTextStyles.bodySmall.copyWith(color: AppColors.mutedForeground)),
            ),
        ],
        const SectionTitle('All expenses'),
        ExpenseSection(plan: plan, rows: plan.expenses, showEvent: true),
      ],
    );
  }
}

/// Budget summary: Planned, Paid, To pay, Left, with the planned/paid meter.
/// The budget is the sum of the events' budgets.
class BudgetCard extends StatelessWidget {
  const BudgetCard({required this.plan, required this.totals, super.key});
  final WeddingPlan plan;
  final WeddingTotals totals;

  @override
  Widget build(BuildContext context) {
    final budget = plan.budget;
    final st = budgetStatus(totals.projected, budget);
    final hasBudget = budget > 0;
    final color = budgetColor(st.state);
    final left = hasBudget ? (st.overBy > 0 ? '${money(st.overBy)} over' : money(st.left)) : '-';
    final days = plan.weddingDate == null
        ? null
        : DateTime(plan.weddingDate!.year, plan.weddingDate!.month, plan.weddingDate!.day)
            .difference(DateTime(DateTime.now().year, DateTime.now().month, DateTime.now().day))
            .inDays;

    return AppCard(
      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Text(
          plan.weddingDate == null
              ? 'Budget'
              : '${DateFormat('d MMM yyyy').format(plan.weddingDate!)}${days != null && days >= 0 ? ' · $days days to go' : ''}',
          style: AppTextStyles.bodySmall.copyWith(color: AppColors.mutedForeground),
        ),
        const SizedBox(height: 6),
        if (hasBudget)
          Text(
            '${money(totals.projected)} of ${money(budget)}',
            style: AppTextStyles.headlineSmall.copyWith(color: color),
          )
        else
          Text('Give your events a budget to see where you stand', style: AppTextStyles.bodyMedium.copyWith(color: AppColors.warning)),
        const SizedBox(height: 10),
        BudgetMeter(projected: totals.projected, paid: totals.paid, budget: budget),
        const SizedBox(height: 14),
        Row(children: [
          _Stat('Planned', money(totals.projected)),
          _Stat('Paid', money(totals.paid)),
          _Stat('To pay', money(totals.outstanding)),
          _Stat('Left', left, color: hasBudget ? color : null),
        ]),
        if (plan.haqMehr != null && plan.haqMehr! > 0)
          Padding(
            padding: const EdgeInsets.only(top: 10),
            child: Text(
              'Haq Mehr ${money(plan.haqMehr!)}${plan.haqMehrNote != null ? ' · ${plan.haqMehrNote}' : ''} - kept separate',
              style: AppTextStyles.bodySmall.copyWith(color: AppColors.mutedForeground),
            ),
          ),
      ]),
    );
  }
}

class _Stat extends StatelessWidget {
  const _Stat(this.label, this.value, {this.color});
  final String label;
  final String value;
  final Color? color;

  @override
  Widget build(BuildContext context) => Expanded(
        child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Text(label, style: AppTextStyles.labelSmall.copyWith(color: AppColors.mutedForeground)),
          const SizedBox(height: 2),
          Text(
            value,
            style: AppTextStyles.labelLarge.copyWith(color: color ?? AppColors.foreground),
            maxLines: 1,
            overflow: TextOverflow.ellipsis,
          ),
        ]),
      );
}

class _EventCard extends StatelessWidget {
  const _EventCard({required this.planId, required this.event, required this.rows});
  final String planId;
  final WeddingEvent event;
  final List<WeddingExpense> rows;

  @override
  Widget build(BuildContext context) {
    final t = sumTotals(rows);
    final budget = event.budgetAllocated;
    final over = budget > 0 && t.projected > budget;
    return Padding(
      padding: const EdgeInsets.only(right: 10),
      child: SizedBox(
        width: 168,
        child: AppCard(
          onTap: () => context.push('/wedding/$planId/event/${event.id}'),
          onLongPress: () => showEditEventSheet(context, planId, event),
          padding: const EdgeInsets.all(12),
          borderColor: over ? AppColors.destructive.withValues(alpha: 0.6) : null,
          child: Column(crossAxisAlignment: CrossAxisAlignment.start, mainAxisAlignment: MainAxisAlignment.spaceBetween, children: [
            Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              Text(event.name, style: AppTextStyles.bodyMedium.copyWith(fontWeight: FontWeight.w600), maxLines: 1, overflow: TextOverflow.ellipsis),
              Text(
                event.date == null ? 'No date' : DateFormat('d MMM yyyy').format(event.date!),
                style: AppTextStyles.labelSmall.copyWith(color: AppColors.mutedForeground),
              ),
            ]),
            BudgetMeter(projected: t.projected, paid: t.paid, budget: budget, height: 6),
            Text(
              '${moneyShort(t.paid)} paid of ${moneyShort(t.projected)}',
              style: AppTextStyles.labelSmall.copyWith(color: AppColors.mutedForeground),
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
            ),
          ]),
        ),
      ),
    );
  }
}

class _AttentionTile extends StatelessWidget {
  const _AttentionTile({required this.planId, required this.item});
  final String planId;
  final Attention item;

  @override
  Widget build(BuildContext context) {
    final (icon, color) = switch (item.kind) {
      AttentionKind.over => (Icons.error_outline, AppColors.destructive),
      AttentionKind.quote => (Icons.balance_outlined, AppColors.warning),
      AttentionKind.price => (Icons.sell_outlined, AppColors.warning),
      AttentionKind.unpaidSoon => (Icons.schedule, AppColors.warning),
    };
    return InkWell(
      onTap: () {
        if (item.expenseId != null) {
          showExpenseSheet(context, planId: planId, expenseId: item.expenseId!);
        } else if (item.eventId != null) {
          context.push('/wedding/$planId/event/${item.eventId}');
        }
      },
      child: Padding(
        padding: const EdgeInsets.symmetric(vertical: 8),
        child: Row(children: [
          Icon(icon, size: 18, color: color),
          const SizedBox(width: 10),
          Expanded(child: Text(item.text, style: AppTextStyles.bodyMedium, maxLines: 2, overflow: TextOverflow.ellipsis)),
          const Icon(Icons.chevron_right, size: 18, color: AppColors.mutedForeground),
        ]),
      ),
    );
  }
}
