import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../../core/errors/app_exception.dart';
import '../../../../core/extensions/async_value_ext.dart';
import '../../../../core/extensions/currency_ext.dart';
import '../../../../core/providers/funding_context_provider.dart';
import '../../../../core/widgets/app_summary_card.dart';
import '../../../../core/extensions/datetime_ext.dart';
import '../../../../core/extensions/lucide_ext.dart';
import '../../../../core/services/toast_service.dart';
import '../../../../core/theme/app_colors.dart';
import '../../../../core/theme/app_text_styles.dart';
import '../../../../core/widgets/app_empty_state.dart';
import '../../../../core/widgets/app_icon_box.dart';
import '../../../../core/widgets/app_list_row.dart';
import '../../../../core/widgets/undo_delete.dart';
import '../../../expenses/domain/entities/expense_entity.dart';
import '../../data/datasources/income_datasource.dart';
import '../providers/income_list_provider.dart';
import 'quick_add_income_page.dart';

class IncomeListPage extends ConsumerStatefulWidget {
  const IncomeListPage({this.showAppBar = true, super.key});
  final bool showAppBar;

  @override
  ConsumerState<IncomeListPage> createState() => _IncomeListPageState();
}

class _IncomeListPageState extends ConsumerState<IncomeListPage> {
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
      ref.read(incomeListProvider.notifier).loadMore();
    }
  }

  void _edit(ExpenseEntity item) {
    Navigator.of(context).push(
      MaterialPageRoute(fullscreenDialog: true, builder: (_) => QuickAddIncomePage(existing: item)),
    );
  }

  // Swiped away but not yet deleted on the server (Undo is still possible).
  final _pendingDelete = <String>{};

  void _swipeDelete(ExpenseEntity item) {
    final ds = ref.read(incomeDatasourceProvider);
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
        await ds.deleteIncome(item.id);
        container.invalidate(incomeListProvider);
        container.invalidate(fundingContextProvider);
        if (mounted) setState(() => _pendingDelete.remove(item.id));
      },
      onError: (e) {
        if (ctx.mounted) toast.error(ctx, e is AppException ? e.message : 'Could not delete income');
      },
    );
  }

  @override
  Widget build(BuildContext context) {
    final async = ref.watch(incomeListProvider);

    return Scaffold(
      backgroundColor: AppColors.background,
      body: RefreshIndicator(
        color: AppColors.primary,
        backgroundColor: AppColors.card,
        onRefresh: () {
          ref.invalidate(fundingContextProvider);
          return ref.refresh(incomeListProvider.future);
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
                title: Text('Income', style: AppTextStyles.headlineSmall),
              ),
            const SliverToBoxAdapter(
              child: Padding(
                padding: EdgeInsets.fromLTRB(16, 8, 16, 0),
                child: _IncomeSummary(),
              ),
            ),
            async.when(
              data: (full) {
                final state = full.copyWith(items: full.items.where((e) => !_pendingDelete.contains(e.id)).toList());
                return state.items.isEmpty
                  ? const SliverFillRemaining(
                      child: AppEmptyState(
                        title: 'No income this period',
                        icon: Icons.account_balance_outlined,
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
                                    child: _IncomeRow(item: item, onTap: () => _edit(item)),
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
                  title: 'Could not load income',
                  icon: Icons.wifi_off_outlined,
                  onRetry: () => ref.refresh(incomeListProvider.future),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _IncomeRow extends StatelessWidget {
  const _IncomeRow({required this.item, this.onTap});
  final ExpenseEntity item;
  final VoidCallback? onTap;

  @override
  Widget build(BuildContext context) => AppListRow(
        leading: AppIconBox(icon: item.category.icon.lucideIcon, size: 36),
        title: item.description,
        subtitle: item.category.name,
        onTap: onTap,
        trailing: Text(
          '+${item.amountPaisas.formatPKR()}',
          style: AppTextStyles.currencySmall.copyWith(color: AppColors.success, fontWeight: FontWeight.w600),
        ),
      );
}

// Income this period · Available.
class _IncomeSummary extends ConsumerWidget {
  const _IncomeSummary();

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final funding = ref.watch(fundingContextProvider(null, null)).valueOrNull;
    if (funding == null) return const SizedBox.shrink();
    final income = funding.monthlyIncomePaisas;
    final available = funding.monthlyIncomeAvailablePaisas;
    // Share of this month's income already spent or put into pots.
    final used = income > 0 ? (income - available) / income : null;

    return AppSummaryCard(
      label: 'Income this month',
      value: income.formatPKR(),
      valueColor: AppColors.success,
      progress: used,
      progressColor: available < 0 ? AppColors.destructive : AppColors.primary,
      progressLabel: used != null ? '${(used * 100).round()}% used' : null,
      caption: income > 0 ? null : 'No income yet',
      footerLabel: available < 0 ? 'Over-allocated' : 'Available',
      footerValue: available.abs().formatPKR(),
      footerColor: available < 0 ? AppColors.destructive : AppColors.success,
    );
  }
}
