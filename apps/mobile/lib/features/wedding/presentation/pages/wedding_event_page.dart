import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';

import '../../../../core/theme/app_colors.dart';
import '../../../../core/theme/app_text_styles.dart';
import '../../../../core/widgets/app_card.dart';
import '../../../../core/widgets/app_empty_state.dart';
import '../../domain/wedding_logic.dart';
import '../providers/wedding_provider.dart';
import '../widgets/expense_section.dart';
import '../widgets/quick_add_bar.dart';
import '../widgets/wedding_common.dart';
import '../widgets/wedding_edit_sheets.dart';

/// One event's expenses. [eventId] is an event id, or 'general' for the whole wedding.
class WeddingEventPage extends ConsumerWidget {
  const WeddingEventPage({required this.planId, required this.eventId, super.key});
  final String planId;
  final String eventId;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final async = ref.watch(weddingPlanProvider(planId));
    final plan = async.asData?.value;
    final isGeneral = eventId == generalKey;
    final event = plan == null || isGeneral ? null : plan.events.where((e) => e.id == eventId).firstOrNull;
    final title = isGeneral ? generalLabel : (event?.name ?? 'Event');

    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        backgroundColor: AppColors.background,
        elevation: 0,
        title: Text(title, style: AppTextStyles.headlineSmall),
        actions: [
          if (event != null)
            IconButton(
              tooltip: 'Edit event',
              icon: const Icon(Icons.edit_outlined, color: AppColors.mutedForeground),
              onPressed: () async {
                final deleted = await showEditEventSheet(context, planId, event);
                if (deleted == true && context.mounted) context.pop();
              },
            ),
        ],
      ),
      body: async.when(
        skipLoadingOnReload: true,
        loading: () => const Center(child: CircularProgressIndicator(color: AppColors.primary)),
        error: (e, _) => AppEmptyState(
          title: 'Could not load this event',
          subtitle: errorText(e),
          onRetry: () => ref.invalidate(weddingPlanProvider(planId)),
        ),
        data: (plan) {
          if (!isGeneral && event == null) {
            return const AppEmptyState(title: 'This event no longer exists', icon: Icons.event_busy_outlined);
          }
          final rows = plan.expenses.where((e) => eventKey(e.eventId) == eventId).toList();
          final t = sumTotals(rows);
          final budget = isGeneral ? 0 : event!.budgetAllocated;
          final st = budgetStatus(t.projected, budget);
          return Column(children: [
            Expanded(
              child: RefreshIndicator(
                color: AppColors.primary,
                backgroundColor: AppColors.card,
                onRefresh: () => ref.refresh(weddingPlanProvider(planId).future),
                child: ListView(
                  physics: const AlwaysScrollableScrollPhysics(),
                  padding: const EdgeInsets.fromLTRB(16, 4, 16, 24),
                  children: [
                    AppCard(
                      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                        if (event?.date != null)
                          Text(DateFormat('EEE d MMM yyyy').format(event!.date!),
                              style: AppTextStyles.bodySmall.copyWith(color: AppColors.mutedForeground)),
                        if (budget > 0)
                          Padding(
                            padding: const EdgeInsets.only(top: 4),
                            child: Text('${money(t.projected)} of ${money(budget)}',
                                style: AppTextStyles.bodyLarge.copyWith(color: budgetColor(st.state), fontWeight: FontWeight.w600)),
                          ),
                        const SizedBox(height: 10),
                        BudgetMeter(projected: t.projected, paid: t.paid, budget: budget),
                        const SizedBox(height: 10),
                        Text(
                          'Planned ${money(t.projected)} · Paid ${money(t.paid)} · To pay ${money(t.outstanding)}',
                          style: AppTextStyles.bodySmall.copyWith(color: AppColors.mutedForeground),
                        ),
                      ]),
                    ),
                    const SectionTitle('Expenses'),
                    ExpenseSection(plan: plan, rows: rows, showEvent: false, defaultGroup: GroupBy.category),
                  ],
                ),
              ),
            ),
            QuickAddBar(plan: plan, fixedEventKey: eventId),
          ]);
        },
      ),
    );
  }
}
