import 'package:dio/dio.dart';
import 'package:riverpod_annotation/riverpod_annotation.dart';

import '../../../../core/constants/api_constants.dart';
import '../../../../core/errors/error_handler.dart';
import '../../../../core/network/api_client.dart';
import '../../../expenses/domain/entities/category_entity.dart';
import '../../../expenses/domain/entities/expense_entity.dart';

part 'income_datasource.g.dart';

@riverpod
IncomeDatasource incomeDatasource(Ref ref) =>
    IncomeDatasource(ref.watch(apiClientProvider));

class IncomeDatasource {
  const IncomeDatasource(this._dio);
  final Dio _dio;

  Future<String> createIncome({
    required int amountPaisas,
    required String categoryId,
    required String description,
    String? notes,
    required DateTime date,
    int? budgetMonth,
    int? budgetYear,
  }) async {
    try {
      final res = await _dio.post(
        ApiConstants.income,
        data: {
          'amountPaisas': amountPaisas,
          'categoryId': categoryId,
          'description': description,
          if (notes != null && notes.isNotEmpty) 'notes': notes,
          'date': date.toIso8601String(),
          if (budgetMonth != null) 'budgetMonth': budgetMonth,
          if (budgetYear != null) 'budgetYear': budgetYear,
        },
      );
      return (res.data['data'] as Map<String, dynamic>)['id'] as String;
    } catch (e) {
      throw ErrorHandler.handle(e);
    }
  }

  Future<void> deleteIncome(String id) async {
    try {
      await _dio.delete(ApiConstants.incomeById(id));
    } catch (e) {
      throw ErrorHandler.handle(e);
    }
  }

  Future<ExpenseListPage> getIncome({
    int? month,
    int? year,
    int page = 1,
    int limit = 20,
  }) async {
    try {
      final res = await _dio.get(
        ApiConstants.income,
        queryParameters: {
          if (month != null) 'month': month,
          if (year != null) 'year': year,
          'page': page,
          'limit': limit,
        },
      );
      final d = res.data['data'] as Map<String, dynamic>;
      final items = (d['items'] as List<dynamic>)
          .map((e) => _parse(e as Map<String, dynamic>))
          .toList();
      return ExpenseListPage(
        items: items,
        total: d['total'] as int,
        page: d['page'] as int,
        hasMore: d['hasMore'] as bool,
      );
    } catch (e) {
      throw ErrorHandler.handle(e);
    }
  }

  static ExpenseEntity _parse(Map<String, dynamic> m) {
    final cat = m['category'] as Map<String, dynamic>;
    return ExpenseEntity(
      id: m['id'] as String,
      amountPaisas: m['amountPaisas'] as int,
      description: m['description'] as String,
      notes: m['notes'] as String?,
      date: DateTime.parse(m['date'] as String),
      category: CategoryEntity(
        id: cat['id'] as String,
        name: cat['name'] as String,
        icon: cat['icon'] as String,
        color: cat['color'] as String,
        isDefault: false,
      ),
    );
  }
}
