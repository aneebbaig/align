import 'package:riverpod_annotation/riverpod_annotation.dart';

import '../../data/datasources/expense_list_datasource.dart';
import '../../domain/entities/expense_entity.dart';

part 'expenses_list_provider.g.dart';

/// Holds all loaded items + pagination state for one period.
class ExpensesListState {
  const ExpensesListState({
    required this.items,
    required this.hasMore,
    required this.page,
    required this.isLoadingMore,
  });

  final List<ExpenseEntity> items;
  final bool hasMore;
  final int page;
  final bool isLoadingMore;

  ExpensesListState copyWith({
    List<ExpenseEntity>? items,
    bool? hasMore,
    int? page,
    bool? isLoadingMore,
  }) =>
      ExpensesListState(
        items: items ?? this.items,
        hasMore: hasMore ?? this.hasMore,
        page: page ?? this.page,
        isLoadingMore: isLoadingMore ?? this.isLoadingMore,
      );
}

@riverpod
class ExpensesList extends _$ExpensesList {
  int? _month;
  int? _year;

  @override
  Future<ExpensesListState> build() async {
    final result = await ref.watch(expenseListDatasourceProvider).getExpenses(
          month: _month,
          year: _year,
        );
    return ExpensesListState(
      items: result.items,
      hasMore: result.hasMore,
      page: result.page,
      isLoadingMore: false,
    );
  }

  Future<void> loadMore() async {
    final current = state.asData?.value;
    if (current == null || !current.hasMore || current.isLoadingMore) return;

    state = AsyncData(current.copyWith(isLoadingMore: true));

    try {
      final result = await ref
          .read(expenseListDatasourceProvider)
          .getExpenses(month: _month, year: _year, page: current.page + 1);
      state = AsyncData(current.copyWith(
        items: [...current.items, ...result.items],
        hasMore: result.hasMore,
        page: result.page,
        isLoadingMore: false,
      ));
    } catch (_) {
      state = AsyncData(current.copyWith(isLoadingMore: false));
    }
  }

  void setPeriod(int month, int year) {
    _month = month;
    _year = year;
    ref.invalidateSelf();
  }
}
