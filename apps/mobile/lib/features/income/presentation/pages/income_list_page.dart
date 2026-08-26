import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../../core/errors/app_exception.dart';
import '../../../../core/extensions/currency_ext.dart';
import '../../../../core/extensions/datetime_ext.dart';
import '../../../../core/extensions/lucide_ext.dart';
import '../../../../core/services/toast_service.dart';
import '../../../../core/theme/app_colors.dart';
import '../../../../core/theme/app_text_styles.dart';
import '../../../../core/widgets/app_empty_state.dart';
import '../../../../core/widgets/app_icon_box.dart';
import '../../../../core/widgets/app_list_row.dart';
import '../../../cashflow/presentation/widgets/recurring_income_section.dart';
import '../../../expenses/domain/entities/expense_entity.dart';
import '../../data/datasources/income_datasource.dart';
import '../providers/income_list_provider.dart';

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

  Future<void> _delete(ExpenseEntity item) async {
    try {
      await ref.read(incomeDatasourceProvider).deleteIncome(item.id);
      if (!mounted) return;
      ref.invalidate(incomeListProvider);
      ref.read(toastServiceProvider).success(context, 'Income deleted');
    } catch (e) {
      if (!mounted) return;
      final msg = e is AppException ? e.message : 'Could not delete income';
      ref.read(toastServiceProvider).error(context, msg);
    }
  }

  @override
  Widget build(BuildContext context) {
    final async = ref.watch(incomeListProvider);

    return Scaffold(
      backgroundColor: AppColors.background,
      body: RefreshIndicator(
        color: AppColors.primary,
        backgroundColor: AppColors.card,
        onRefresh: () => ref.refresh(incomeListProvider.future),
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
                child: RecurringIncomeSection(),
              ),
            ),
            async.when(
              data: (state) => state.items.isEmpty
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
                                  child: _IncomeRow(
                                    item: item,
                                    onDelete: () => _delete(item),
                                  ),
                                ),
                              ],
                            );
                          },
                          childCount: state.items.length + 1,
                        ),
                      ),
                    ),
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
  const _IncomeRow({required this.item, this.onDelete});
  final ExpenseEntity item;
  final VoidCallback? onDelete;

  @override
  Widget build(BuildContext context) => AppListRow(
        leading: AppIconBox(icon: item.category.icon.lucideIcon, size: 36),
        title: item.description,
        subtitle: item.category.name,
        trailing: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Text(
              '+${item.amountPaisas.formatPKR()}',
              style: AppTextStyles.currencySmall.copyWith(
                color: const Color(0xFF4CAF50),
                fontWeight: FontWeight.w600,
              ),
            ),
            if (onDelete != null) ...[
              const SizedBox(width: 10),
              GestureDetector(
                onTap: onDelete,
                behavior: HitTestBehavior.opaque,
                child: Padding(
                  padding: const EdgeInsets.all(4),
                  child: Icon(
                    Icons.delete_outline,
                    size: 16,
                    color: AppColors.destructive.withValues(alpha: 0.7),
                  ),
                ),
              ),
            ],
          ],
        ),
      );
}
