import 'package:dio/dio.dart';
import 'package:riverpod_annotation/riverpod_annotation.dart';

import '../../../../core/constants/api_constants.dart';
import '../../../../core/errors/error_handler.dart';
import '../../../../core/network/api_client.dart';
import '../../domain/entities/category_entity.dart';
import '../../domain/entities/expense_entity.dart';

part 'expense_list_datasource.g.dart';

@riverpod
ExpenseListDatasource expenseListDatasource(Ref ref) =>
    ExpenseListDatasource(ref.watch(apiClientProvider));

class ExpenseListDatasource {
  const ExpenseListDatasource(this._dio);
  final Dio _dio;

  Future<ExpenseListPage> getExpenses({
    int? month,
    int? year,
    int page = 1,
    int limit = 20,
  }) async {
    try {
      final res = await _dio.get(
        ApiConstants.expenses,
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

  /// What was spent today, for the home-screen widget. Newest first, so the
  /// first page of this month already holds all of today's expenses.
  Future<int> todaySpendPaisas({DateTime? now}) async {
    final n = now ?? DateTime.now();
    final page = await getExpenses(month: n.month, year: n.year, limit: 50);
    var total = 0;
    for (final e in page.items) {
      final d = e.date.toLocal();
      if (d.year == n.year && d.month == n.month && d.day == n.day) total += e.amountPaisas;
    }
    return total;
  }

  static ExpenseEntity _parse(Map<String, dynamic> m) {
    final cat = m['category'] as Map<String, dynamic>;
    return ExpenseEntity(
      id: m['id'] as String,
      amountPaisas: m['amountPaisas'] as int,
      description: m['description'] as String,
      notes: m['notes'] as String?,
      date: DateTime.parse(m['date'] as String),
      isRegretPurchase: m['isRegretPurchase'] as bool? ?? false,
      budgetMonth: m['budgetMonth'] as int?,
      budgetYear: m['budgetYear'] as int?,
      fundingSource: m['fundingSource'] as String? ?? 'INCOME',
      fundingPotId: m['fundingPotId'] as String?,
      locked: m['locked'] as bool? ?? false,
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
