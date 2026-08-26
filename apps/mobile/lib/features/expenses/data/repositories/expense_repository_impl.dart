import 'package:riverpod_annotation/riverpod_annotation.dart';

import '../../domain/repositories/expense_repository.dart';
import '../datasources/expense_remote_datasource.dart';

part 'expense_repository_impl.g.dart';

@riverpod
ExpenseRepository expenseRepository(Ref ref) =>
    ExpenseRepositoryImpl(ref.watch(expenseRemoteDatasourceProvider));

class ExpenseRepositoryImpl implements ExpenseRepository {
  const ExpenseRepositoryImpl(this._datasource);
  final ExpenseRemoteDatasource _datasource;

  @override
  Future<void> deleteExpense(String id) => _datasource.deleteExpense(id);

  @override
  Future<String> createExpense({
    required int amountPaisas,
    required String categoryId,
    required String description,
    String? notes,
    required DateTime date,
    bool isRegretPurchase = false,
    int? budgetMonth,
    int? budgetYear,
    String? fundingPotId,
  }) =>
      _datasource.createExpense(
        amountPaisas: amountPaisas,
        categoryId: categoryId,
        description: description,
        notes: notes,
        date: date,
        isRegretPurchase: isRegretPurchase,
        budgetMonth: budgetMonth,
        budgetYear: budgetYear,
        fundingPotId: fundingPotId,
      );
}
