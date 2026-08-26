import 'package:riverpod_annotation/riverpod_annotation.dart';

import '../../../expenses/presentation/providers/expenses_list_provider.dart';
import '../../data/datasources/income_datasource.dart';

part 'income_list_provider.g.dart';

@riverpod
class CreateIncome extends _$CreateIncome {
  @override
  AsyncValue<void> build() => const AsyncData(null);

  Future<void> submit({
    required int amountPaisas,
    required String categoryId,
    required String description,
    String? notes,
    required DateTime date,
  }) async {
    state = const AsyncLoading();
    try {
      await ref.read(incomeDatasourceProvider).createIncome(
            amountPaisas: amountPaisas,
            categoryId: categoryId,
            description: description,
            notes: notes,
            date: date,
          );
      ref.invalidate(incomeListProvider);
      state = const AsyncData(null);
    } catch (e, st) {
      state = AsyncError(e, st);
      rethrow;
    }
  }
}

@riverpod
class DeleteIncome extends _$DeleteIncome {
  @override
  AsyncValue<void> build() => const AsyncData(null);

  Future<void> call(String id) async {
    state = const AsyncLoading();
    try {
      await ref.read(incomeDatasourceProvider).deleteIncome(id);
      ref.invalidate(incomeListProvider);
      state = const AsyncData(null);
    } catch (e, st) {
      state = AsyncError(e, st);
      rethrow;
    }
  }
}

@riverpod
class IncomeList extends _$IncomeList {
  int? _month;
  int? _year;

  @override
  Future<ExpensesListState> build() async {
    final result = await ref.watch(incomeDatasourceProvider).getIncome(
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
          .read(incomeDatasourceProvider)
          .getIncome(month: _month, year: _year, page: current.page + 1);
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
}
