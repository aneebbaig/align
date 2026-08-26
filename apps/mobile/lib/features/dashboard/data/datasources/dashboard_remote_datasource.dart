import 'package:dio/dio.dart';
import 'package:riverpod_annotation/riverpod_annotation.dart';

import '../../../../core/constants/api_constants.dart';
import '../../../../core/errors/error_handler.dart';
import '../../../../core/network/api_client.dart';
import '../../domain/entities/dashboard_data.dart';
import '../../../expenses/domain/entities/category_entity.dart';

part 'dashboard_remote_datasource.g.dart';

@riverpod
DashboardRemoteDatasource dashboardRemoteDatasource(Ref ref) =>
    DashboardRemoteDatasource(ref.watch(apiClientProvider));

class DashboardRemoteDatasource {
  const DashboardRemoteDatasource(this._dio);
  final Dio _dio;

  Future<DashboardData> getDashboard() async {
    try {
      final res = await _dio.get(ApiConstants.dashboard);
      final d = res.data['data'] as Map<String, dynamic>;

      final period = d['period'] as Map<String, dynamic>;
      final summary = d['summary'] as Map<String, dynamic>;
      final budgetRaw = d['budget'] as Map<String, dynamic>?;
      final recentRaw = d['recentTransactions'] as List<dynamic>;

      return DashboardData(
        month: period['month'] as int,
        year: period['year'] as int,
        periodLabel: period['label'] as String,
        totalIncomePaisas: summary['totalIncomePaisas'] as int,
        totalExpensesPaisas: summary['totalExpensesPaisas'] as int,
        netSavingsPaisas: summary['netSavingsPaisas'] as int,
        budget: budgetRaw == null
            ? null
            : BudgetSummary(
                totalBudgetPaisas: budgetRaw['totalBudgetPaisas'] as int,
                totalSpentPaisas: budgetRaw['totalSpentPaisas'] as int,
                remainingPaisas: budgetRaw['remainingPaisas'] as int,
              ),
        recentTransactions: recentRaw
            .map((e) => _parseTransaction(e as Map<String, dynamic>))
            .toList(),
      );
    } catch (e) {
      throw ErrorHandler.handle(e);
    }
  }

  static RecentTransaction _parseTransaction(Map<String, dynamic> m) {
    final cat = m['category'] as Map<String, dynamic>;
    return RecentTransaction(
      id: m['id'] as String,
      amountPaisas: m['amountPaisas'] as int,
      type: m['type'] as String,
      description: m['description'] as String,
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
