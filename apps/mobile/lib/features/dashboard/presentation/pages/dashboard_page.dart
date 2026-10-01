import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../../core/theme/app_colors.dart';
import '../../../../core/theme/app_text_styles.dart';
import '../../../../core/widgets/app_empty_state.dart';
import '../providers/dashboard_provider.dart';
import '../widgets/budget_bar.dart';
import '../widgets/recent_transactions_list.dart';
import '../widgets/summary_cards.dart';

class DashboardPage extends ConsumerWidget {
  const DashboardPage({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final async = ref.watch(dashboardProvider);

    return Scaffold(
      backgroundColor: AppColors.background,
      body: RefreshIndicator(
        color: AppColors.primary,
        backgroundColor: AppColors.card,
        onRefresh: () => ref.refresh(dashboardProvider.future),
        child: CustomScrollView(
          slivers: [
            SliverAppBar(
              backgroundColor: AppColors.background,
              floating: true,
              snap: true,
              elevation: 0,
              title: async.when(
                data: (d) => Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(d.periodLabel, style: AppTextStyles.headlineSmall),
                    const Text('Budget period', style: AppTextStyles.bodySmall),
                  ],
                ),
                loading: () => const Text('Dashboard', style: AppTextStyles.headlineSmall),
                error: (_, __) => const Text('Dashboard', style: AppTextStyles.headlineSmall),
              ),
            ),
            async.when(
              data: (d) => SliverPadding(
                padding: const EdgeInsets.fromLTRB(16, 8, 16, 100),
                sliver: SliverList(
                  delegate: SliverChildListDelegate([
                    SummaryCards(
                      totalIncomePaisas: d.totalIncomePaisas,
                      totalExpensesPaisas: d.totalExpensesPaisas,
                      netSavingsPaisas: d.netSavingsPaisas,
                    ),
                    if (d.budget != null) ...[
                      const SizedBox(height: 16),
                      BudgetBar(budget: d.budget!),
                    ],
                    const SizedBox(height: 20),
                    RecentTransactionsList(items: d.recentTransactions),
                  ]),
                ),
              ),
              loading: () => const SliverFillRemaining(
                child: Center(
                  child: CircularProgressIndicator(color: AppColors.primary),
                ),
              ),
              error: (_, __) => SliverFillRemaining(
                child: AppEmptyState(
                  title: 'Could not load dashboard',
                  icon: Icons.wifi_off_outlined,
                  onRetry: () => ref.refresh(dashboardProvider.future),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
