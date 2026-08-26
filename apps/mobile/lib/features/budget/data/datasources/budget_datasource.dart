import 'package:dio/dio.dart';
import 'package:riverpod_annotation/riverpod_annotation.dart';

import '../../../../core/constants/api_constants.dart';
import '../../../../core/errors/error_handler.dart';
import '../../../../core/network/api_client.dart';
import '../../../expenses/domain/entities/category_entity.dart';
import '../../domain/entities/budget_data.dart';

part 'budget_datasource.g.dart';

@riverpod
BudgetDatasource budgetDatasource(Ref ref) =>
    BudgetDatasource(ref.watch(apiClientProvider));

class BudgetDatasource {
  const BudgetDatasource(this._dio);
  final Dio _dio;

  Future<BudgetData> getBudget() async {
    try {
      final res = await _dio.get(ApiConstants.budget);
      final d = res.data['data'] as Map<String, dynamic>;
      final period = d['period'] as Map<String, dynamic>;

      return BudgetData(
        month: period['month'] as int,
        year: period['year'] as int,
        periodLabel: period['label'] as String,
        totalBudgetPaisas: d['totalBudgetPaisas'] as int?,
        totalSpentPaisas: d['totalSpentPaisas'] as int,
        remainingPaisas: d['remainingPaisas'] as int?,
        categories: (d['categories'] as List<dynamic>)
            .map((e) => _parseCategory(e as Map<String, dynamic>))
            .toList(),
      );
    } catch (e) {
      throw ErrorHandler.handle(e);
    }
  }

  static BudgetCategoryData _parseCategory(Map<String, dynamic> m) {
    final cat = m['category'] as Map<String, dynamic>;
    return BudgetCategoryData(
      id: m['id'] as String,
      categoryId: m['categoryId'] as String,
      category: CategoryEntity(
        id: cat['id'] as String,
        name: cat['name'] as String,
        icon: cat['icon'] as String,
        color: cat['color'] as String,
        isDefault: false,
      ),
      allocatedPaisas: m['allocatedPaisas'] as int,
      spentPaisas: m['spentPaisas'] as int,
      remainingPaisas: m['remainingPaisas'] as int,
      pct: m['pct'] as int,
    );
  }
}
