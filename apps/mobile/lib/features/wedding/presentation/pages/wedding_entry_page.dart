import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';

import '../../../../core/theme/app_colors.dart';
import '../../../../core/theme/app_text_styles.dart';
import '../../../../core/widgets/app_card.dart';
import '../../../../core/widgets/app_empty_state.dart';
import '../../domain/wedding_logic.dart';
import '../../domain/wedding_models.dart';
import '../providers/wedding_provider.dart';
import '../widgets/wedding_common.dart';
import '../widgets/wedding_sheets.dart';
import 'wedding_page.dart';

/// /wedding. With exactly one wedding that is not done, opens it directly;
/// otherwise lists every wedding with its budget meter (FAB creates one).
class WeddingEntryPage extends ConsumerStatefulWidget {
  const WeddingEntryPage({super.key});

  @override
  ConsumerState<WeddingEntryPage> createState() => _WeddingEntryPageState();
}

class _WeddingEntryPageState extends ConsumerState<WeddingEntryPage> {
  bool _showList = false;

  Future<void> _create() async {
    final id = await showCreateWeddingSheet(context);
    if (id == null) return;
    ref.invalidate(weddingListProvider);
    if (mounted) context.push('/wedding/$id');
  }

  @override
  Widget build(BuildContext context) {
    final async = ref.watch(weddingListProvider);
    final all = async.asData?.value;
    final sole = all == null ? null : soleActiveWedding(all);
    if (sole != null && !_showList) {
      return WeddingPage(
        planId: sole.id,
        onShowAll: all!.length > 1 ? () => setState(() => _showList = true) : null,
      );
    }

    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        backgroundColor: AppColors.background,
        elevation: 0,
        title: const Text('Wedding', style: AppTextStyles.headlineSmall),
      ),
      floatingActionButton: all == null
          ? null
          : FloatingActionButton(
              onPressed: _create,
              backgroundColor: AppColors.primary,
              foregroundColor: AppColors.primaryForeground,
              tooltip: 'New wedding',
              child: const Icon(Icons.add),
            ),
      body: async.when(
        skipLoadingOnReload: true,
        loading: () => const Center(child: CircularProgressIndicator(color: AppColors.primary)),
        error: (e, _) => AppEmptyState(
          title: 'Could not load weddings',
          subtitle: errorText(e),
          onRetry: () => ref.invalidate(weddingListProvider),
        ),
        data: (list) => list.isEmpty
            ? const AppEmptyState(
                title: 'No wedding yet',
                subtitle: 'Tap + to start planning one.',
                icon: Icons.favorite_border,
              )
            : RefreshIndicator(
                color: AppColors.primary,
                backgroundColor: AppColors.card,
                onRefresh: () => ref.refresh(weddingListProvider.future),
                child: ListView(
                  physics: const AlwaysScrollableScrollPhysics(),
                  padding: const EdgeInsets.fromLTRB(16, 8, 16, 96),
                  children: [for (final w in list) _WeddingCard(w: w)],
                ),
              ),
      ),
    );
  }
}

class _WeddingCard extends StatelessWidget {
  const _WeddingCard({required this.w});
  final WeddingSummary w;

  @override
  Widget build(BuildContext context) {
    final st = budgetStatus(w.totals.projected, w.totalBudget);
    return Padding(
      padding: const EdgeInsets.only(bottom: 10),
      child: AppCard(
        onTap: () => context.push('/wedding/${w.id}'),
        child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Row(children: [
            Expanded(child: Text(w.title, style: AppTextStyles.bodyLarge.copyWith(fontWeight: FontWeight.w600))),
            if (w.isDone) Text('Done', style: AppTextStyles.labelSmall.copyWith(color: AppColors.success)),
          ]),
          Text(
            w.weddingDate == null ? 'No date yet' : DateFormat('d MMM yyyy').format(w.weddingDate!),
            style: AppTextStyles.bodySmall.copyWith(color: AppColors.mutedForeground),
          ),
          const SizedBox(height: 10),
          BudgetMeter(projected: w.totals.projected, paid: w.totals.paid, budget: w.totalBudget),
          const SizedBox(height: 8),
          Text(
            w.totalBudget > 0
                ? '${money(w.totals.projected)} of ${money(w.totalBudget)} planned · ${money(w.totals.paid)} paid'
                : '${money(w.totals.projected)} planned · ${money(w.totals.paid)} paid',
            style: AppTextStyles.bodySmall.copyWith(
              color: st.state == BudgetState.over ? AppColors.destructive : AppColors.mutedForeground,
            ),
          ),
        ]),
      ),
    );
  }
}
