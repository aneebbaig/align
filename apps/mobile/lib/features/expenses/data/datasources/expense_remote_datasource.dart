import 'package:dio/dio.dart';
import 'package:riverpod_annotation/riverpod_annotation.dart';

import '../../../../core/constants/api_constants.dart';
import '../../../../core/errors/error_handler.dart';
import '../../../../core/network/api_client.dart';

part 'expense_remote_datasource.g.dart';

@riverpod
ExpenseRemoteDatasource expenseRemoteDatasource(Ref ref) =>
    ExpenseRemoteDatasource(ref.watch(apiClientProvider));

class ExpenseRemoteDatasource {
  const ExpenseRemoteDatasource(this._dio);
  final Dio _dio;

  Future<void> deleteExpense(String id) async {
    try {
      await _dio.delete(ApiConstants.expenseById(id));
    } catch (e) {
      throw ErrorHandler.handle(e);
    }
  }

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
  }) async {
    try {
      final res = await _dio.post(
        ApiConstants.expenses,
        data: {
          'amountPaisas': amountPaisas,
          'categoryId': categoryId,
          'description': description,
          if (notes != null && notes.isNotEmpty) 'notes': notes,
          'date': date.toIso8601String(),
          'isRegretPurchase': isRegretPurchase,
          if (budgetMonth != null) 'budgetMonth': budgetMonth,
          if (budgetYear != null) 'budgetYear': budgetYear,
          if (fundingPotId != null) 'fundingSource': 'SAVINGS_POT',
          if (fundingPotId != null) 'fundingPotId': fundingPotId,
        },
      );
      return (res.data['data'] as Map<String, dynamic>)['id'] as String;
    } catch (e) {
      throw ErrorHandler.handle(e);
    }
  }
}
