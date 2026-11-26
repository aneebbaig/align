import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../../core/errors/app_exception.dart';
import '../../../../core/extensions/currency_ext.dart';
import '../../../../core/extensions/async_value_ext.dart';
import '../../../../core/providers/funding_context_provider.dart';
import '../../../../core/widgets/app_summary_card.dart';
import '../../../budget/presentation/providers/budget_provider.dart';
import '../../../../core/extensions/datetime_ext.dart';
import '../../../../core/extensions/lucide_ext.dart';
import '../../../../core/services/toast_service.dart';
import '../../../../core/theme/app_colors.dart';
import '../../../../core/theme/app_text_styles.dart';
import '../../../../core/widgets/app_empty_state.dart';
import '../../../../core/widgets/app_icon_box.dart';
import '../../../../core/widgets/app_list_row.dart';
import '../../../../core/widgets/undo_delete.dart';
import '../../data/repositories/expense_repository_impl.dart';
import '../../domain/entities/expense_entity.dart';
import '../../../savings/presentation/providers/savings_provider.dart';
import '../providers/expenses_list_provider.dart';
import 'quick_add_expense_page.dart';

class ExpensesListPage extends ConsumerStatefulWidget {
  const ExpensesListPage({this.showAppBar = true, super.key});
  final bool showAppBar;

  @override
  ConsumerState<ExpensesListPage> createState() => _ExpensesListPageState();
}

class _ExpensesListPageState extends ConsumerState<ExpensesListPage> {
  final _scrollCtrl = ScrollController();

  @override
  void initState() {
    super.initState();
    _scrollCtrl.addListener(_onScroll);
  }

  @override
  void dispose() {
    _scrollCtrl.removeListener(_onScroll);
    _scrollCtrl.dispose();
    super.dispose();
  }

  void _onScroll() {
    if (_scrollCtrl.position.pixels >=
        _scrollCtrl.position.maxScrollExtent - 200) {
      ref.read(expensesListProvider.notifier).loadMore();
    }
  }

  void _edit(ExpenseEntity item) {
    Navigator.of(context).push(
      MaterialPageRoute(fullscreenDialog: true, builder: (_) => QuickAddExpensePage(existing: item)),
    );
  }

  // Swiped away but not yet deleted on the server (Undo is still possible).
  final _pendingDelete = <String>{};

  void _swipeDelete(ExpenseEntity item) {
    final repo = ref.read(expenseRepositoryProvider);
    final container = ProviderScope.containerOf(context);
    final toast = ref.read(toastServiceProvider);
    final ctx = context;
    setState(() => _pendingDelete.add(item.id));
    deferDelete(
      context,
      message: 'Deleted · ${item.description}',
      onUndo: () {
        if (mounted) setState(() => _pendingDelete.remove(item.id));
      },
      commit: () async {
        await repo.deleteExpense(item.id);
        container.invalidate(expensesListProvider);
        container.invalidate(budgetProvider);
        container.invalidate(fundingContextProvider);
        container.invalidate(savingsProvider); // a pot-funded expense gives its money back
        if (mounted) setState(() => _pendingDelete.remove(item.id));
      },
      onError: (e) {
        if (ctx.mounted) toast.error(ctx, e is AppException ? e.message : 'Could not delete expense');
      },
    );
  }

  @override
  Widget build(BuildContext context) {
    final async = ref.watch(expensesListProvider);

    return Scaffold(
      backgroundColor: AppColors.background,
      body: RefreshIndicator(
        color: AppColors.primary,
        backgroundColor: AppColors.card,
        onRefresh: () {
          ref.invalidate(budgetProvider);
          ref.invalidate(fundingContextProvider);
          return ref.refresh(expensesListProvider.future);
        },
        child: CustomScrollView(
          controller: _scrollCtrl,
          slivers: [
            if (widget.showAppBar)
              const SliverAppBar(
                backgroundColor: AppColors.background,
                floating: true,
                snap: true,
                elevation: 0,
                title: Text('Expenses', style: AppTextStyles.headlineSmall),
              ),
            const SliverToBoxAdapter(
              child: Padding(
                padding: EdgeInsets.fromLTRB(16, 8, 16, 0),
                child: _ExpensesSummary(),
              ),
            ),
            async.when(
              data: (full) {
                final state = full.copyWith(items: full.items.where((e) => !_pendingDelete.contains(e.id)).toList());
                return state.items.isEmpty
                  ? const SliverFillRemaining(
                      child: AppEmptyState(
                        title: 'No expenses this period',
                        icon: Icons.receipt_long_outlined,
                      ),
                    )
                  : SliverPadding(
                      padding: const EdgeInsets.fromLTRB(16, 4, 16, 100),
                      sliver: SliverList(
                        delegate: SliverChildBuilderDelegate(
                          (ctx, i) {
                            if (i == state.items.length) {
                              return state.isLoadingMore
                                  ? const Padding(
                                      padding: EdgeInsets.all(20),
                                      child: Center(
                                        child: CircularProgressIndicator(
                                          color: AppColors.primary,
                                          strokeWidth: 2,
                                        ),
                                      ),
                                    )
                                  : const SizedBox.shrink();
                            }
                            final item = state.items[i];
                            final showDate = i == 0 ||
                                !item.date.isSameDay(state.items[i - 1].date);
                            return Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                if (showDate)
                                  Padding(
                                    padding: const EdgeInsets.only(
                                        top: 16, bottom: 8),
                                    child: Text(
                                      item.date.toRelativeDay,
                                      style: AppTextStyles.labelSmall.copyWith(
                                        color: AppColors.mutedForeground,
                                        letterSpacing: 0.5,
                                      ),
                                    ),
                                  ),
                                Padding(
                                  padding: const EdgeInsets.only(bottom: 4),
                                  child: Dismissible(
                                    key: ValueKey(item.id),
                                    direction: DismissDirection.endToStart,
                                    background: const SwipeBackground(
                                      alignment: Alignment.centerRight,
                                      color: AppColors.destructive,
                                      icon: Icons.delete_outline,
                                    ),
                                    onDismissed: (_) => _swipeDelete(item),
                                    child: _ExpenseRow(item: item, onTap: () => _edit(item)),
                                  ),
                                ),
                              ],
                            );
                          },
                          childCount: state.items.length + 1,
                        ),
                      ),
                    );
              },
              loading: () => const SliverFillRemaining(
                child: Center(
                  child: CircularProgressIndicator(color: AppColors.primary),
                ),
              ),
              error: (_, __) => SliverFillRemaining(
                child: AppEmptyState(
                  title: 'Could not load expenses',
                  icon: Icons.wifi_off_outlined,
                  onRetry: () => ref.refresh(expensesListProvider.future),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _ExpenseRow extends StatelessWidget {
  const _ExpenseRow({required this.item, this.onTap});
  final ExpenseEntity item;
  final VoidCallback? onTap;

  @override
  Widget build(BuildContext context) => AppListRow(
        leading: AppIconBox(icon: item.category.icon.lucideIcon, size: 36),
        title: item.description,
        subtitle: item.category.name,
        onTap: onTap,
        trailing: Text(
          item.amountPaisas.formatPKR(),
          style: AppTextStyles.currencySmall.copyWith(fontWeight: FontWeight.w600),
        ),
      );
}

// Spent · Budget · Under/Over · Available for the open period.
class _ExpensesSummary extends ConsumerWidget {
  const _ExpensesSummary();

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final budget = ref.watch(budgetProvider).valueOrNull;
    final funding = ref.watch(fundingContextProvider(null, null)).valueOrNull;
    if (budget == null || funding == null) return const SizedBox.shrink();
    final spent = budget.totalSpentPaisas;
    final total = budget.totalBudgetPaisas;
    final available = funding.monthlyIncomeAvailablePaisas;
    final over = total != null && spent > total;

    String? caption;
    if (total == null || total == 0) {
      caption = 'No budget set';
    } else if (over) {
      caption = '${(spent - total).formatPKR()} over a ${total.formatPKR()} budget';
    } else {
      caption = 'of ${total.formatPKR()} budget · ${(total - spent).formatPKR()} left';
    }

    return AppSummaryCard(
      label: 'Spent this month',
      value: spent.formatPKR(),
      progress: total != null && total > 0 ? spent / total : null,
      progressColor: over ? AppColors.destructive : AppColors.primary,
      progressLabel: total != null && total > 0 ? '${(spent * 100 / total).round()}%' : null,
      caption: caption,
      captionColor: over ? AppColors.destructive : null,
      footerLabel: available < 0 ? 'Income over-allocated' : 'Available income',
      footerValue: available.abs().formatPKR(),
      footerColor: available < 0 ? AppColors.destructive : AppColors.success,
    );
  }
}
