import 'package:riverpod_annotation/riverpod_annotation.dart';

import '../../data/repositories/expense_repository_impl.dart';
import 'expenses_list_provider.dart';

part 'create_expense_provider.g.dart';

@riverpod
class DeleteExpense extends _$DeleteExpense {
  @override
  AsyncValue<void> build() => const AsyncData(null);

  Future<void> call(String id) async {
    state = const AsyncLoading();
    try {
      await ref.read(expenseRepositoryProvider).deleteExpense(id);
      ref.invalidate(expensesListProvider);
      state = const AsyncData(null);
    } catch (e, st) {
      state = AsyncError(e, st);
      rethrow;
    }
  }
}

@riverpod
class CreateExpense extends _$CreateExpense {
  @override
  AsyncValue<String?> build() => const AsyncData(null);

  Future<String?> submit({
    required int amountPaisas,
    required String categoryId,
    required String description,
    String? notes,
    required DateTime date,
    bool isRegretPurchase = false,
  }) async {
    state = const AsyncLoading();
    try {
      final id = await ref.read(expenseRepositoryProvider).createExpense(
            amountPaisas: amountPaisas,
            categoryId: categoryId,
            description: description,
            notes: notes,
            date: date,
            isRegretPurchase: isRegretPurchase,
          );
      state = AsyncData(id);
      return id;
    } catch (e, st) {
      state = AsyncError(e, st);
      rethrow;
    }
  }
}
