import 'package:dio/dio.dart';
import 'package:riverpod_annotation/riverpod_annotation.dart';

import '../../../../core/constants/api_constants.dart';
import '../../../../core/errors/error_handler.dart';
import '../../../../core/network/api_client.dart';
import '../../domain/entities/cashflow_summary_entity.dart';
import '../../domain/entities/planned_expense_entity.dart';
import '../../domain/entities/recurring_income_entity.dart';

part 'cashflow_datasource.g.dart';

@riverpod
CashflowDatasource cashflowDatasource(Ref ref) =>
    CashflowDatasource(ref.watch(apiClientProvider));

class CashflowDatasource {
  const CashflowDatasource(this._dio);
  final Dio _dio;

  // ── Recurring income ──────────────────────────────────────────────────

  Future<List<RecurringIncomeEntity>> getRecurringIncomes() async {
    try {
      final res = await _dio.get(ApiConstants.recurringIncome);
      final list = res.data['data'] as List<dynamic>;
      return list.map((e) => _parseIncome(e as Map<String, dynamic>)).toList();
    } catch (e) {
      throw ErrorHandler.handle(e);
    }
  }

  Future<String> createRecurringIncome({
    required String label,
    required String kind,
    required int amountPaisas,
    bool? variable,
    bool? countsTowardFloor,
    int? dayOfMonth,
    DateTime? startDate,
    DateTime? endDate,
  }) async {
    try {
      final res = await _dio.post(
        ApiConstants.recurringIncome,
        data: {
          'label': label,
          'kind': kind,
          'amountPaisas': amountPaisas,
          if (variable != null) 'variable': variable,
          if (countsTowardFloor != null) 'countsTowardFloor': countsTowardFloor,
          if (dayOfMonth != null) 'dayOfMonth': dayOfMonth,
          if (startDate != null) 'startDate': startDate.toIso8601String(),
          if (endDate != null) 'endDate': endDate.toIso8601String(),
        },
      );
      return (res.data['data'] as Map<String, dynamic>)['id'] as String;
    } catch (e) {
      throw ErrorHandler.handle(e);
    }
  }

  Future<void> updateRecurringIncomeActive({
    required String id,
    required bool active,
  }) async {
    try {
      await _dio.patch(ApiConstants.recurringIncomeById(id), data: {'active': active});
    } catch (e) {
      throw ErrorHandler.handle(e);
    }
  }

  Future<void> deleteRecurringIncome(String id) async {
    try {
      await _dio.delete(ApiConstants.recurringIncomeById(id));
    } catch (e) {
      throw ErrorHandler.handle(e);
    }
  }

  /// Books a real income transaction for "this month" of a recurring income
  /// stream, linked back so the same period can't be double-recorded.
  Future<String> recordRecurringIncome({
    required String id,
    required int amountPaisas,
    required String categoryId,
    String? description,
    String? notes,
    required DateTime date,
    int? budgetMonth,
    int? budgetYear,
  }) async {
    try {
      final res = await _dio.post(
        ApiConstants.recurringIncomeRecord(id),
        data: {
          'amountPaisas': amountPaisas,
          'categoryId': categoryId,
          if (description != null && description.isNotEmpty) 'description': description,
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

  // ── Planned expenses ──────────────────────────────────────────────────

  Future<List<PlannedExpenseEntity>> getPlannedExpenses() async {
    try {
      final res = await _dio.get(ApiConstants.plannedExpenses);
      final list = res.data['data'] as List<dynamic>;
      return list.map((e) => _parseExpense(e as Map<String, dynamic>)).toList();
    } catch (e) {
      throw ErrorHandler.handle(e);
    }
  }

  Future<String> createPlannedExpense({
    required String name,
    required int amountPaisas,
    required DateTime dueDate,
    String flexibility = 'FIXED',
    int priority = 0,
    int slideWindowMonths = 0,
    String? notes,
  }) async {
    try {
      final res = await _dio.post(
        ApiConstants.plannedExpenses,
        data: {
          'name': name,
          'amountPaisas': amountPaisas,
          'dueDate': dueDate.toIso8601String(),
          'flexibility': flexibility,
          'priority': priority,
          'slideWindowMonths': slideWindowMonths,
          if (notes != null && notes.isNotEmpty) 'notes': notes,
        },
      );
      return (res.data['data'] as Map<String, dynamic>)['id'] as String;
    } catch (e) {
      throw ErrorHandler.handle(e);
    }
  }

  Future<void> updatePlannedExpenseStatus({
    required String id,
    required String status,
  }) async {
    try {
      await _dio.patch(ApiConstants.plannedExpenseById(id), data: {'status': status});
    } catch (e) {
      throw ErrorHandler.handle(e);
    }
  }

  Future<void> deletePlannedExpense(String id) async {
    try {
      await _dio.delete(ApiConstants.plannedExpenseById(id));
    } catch (e) {
      throw ErrorHandler.handle(e);
    }
  }

  /// Books a real expense transaction for a planned-expense row ("Mark paid"),
  /// linked back so the row shows as actually paid, not just a status flip.
  Future<String> recordPlannedExpense({
    required String id,
    required int amountPaisas,
    required String categoryId,
    String? description,
    String? notes,
    required DateTime date,
    int? budgetMonth,
    int? budgetYear,
    String? fundingPotId,
  }) async {
    try {
      final res = await _dio.post(
        ApiConstants.plannedExpenseRecord(id),
        data: {
          'amountPaisas': amountPaisas,
          'categoryId': categoryId,
          if (description != null && description.isNotEmpty) 'description': description,
          if (notes != null && notes.isNotEmpty) 'notes': notes,
          'date': date.toIso8601String(),
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

  // ── Summary ────────────────────────────────────────────────────────────

  Future<CashflowSummaryEntity> getSummary() async {
    try {
      final res = await _dio.get(ApiConstants.cashflow);
      final d = res.data['data'] as Map<String, dynamic>;
      final summary = d['summary'] as Map<String, dynamic>;
      final alerts = d['alerts'] as List<dynamic>;
      return CashflowSummaryEntity(
        dueTotalPaisas: summary['dueTotalPaisas'] as int,
        leftAfterObligationsPaisas: summary['leftAfterObligationsPaisas'] as int,
        flagged: summary['flagged'] as bool,
        shortfallPaisas: summary['shortfallPaisas'] as int,
        soonest: summary['soonest'] != null
            ? _parseDue(summary['soonest'] as Map<String, dynamic>)
            : null,
        alerts: alerts.map((a) => _parseDue(a as Map<String, dynamic>)).toList(),
      );
    } catch (e) {
      throw ErrorHandler.handle(e);
    }
  }

  static UpcomingDueEntity _parseDue(Map<String, dynamic> m) => UpcomingDueEntity(
        sourceId: m['sourceId'] as String,
        payee: m['payee'] as String,
        category: m['category'] as String,
        amountPaisas: m['amountPaisas'] as int,
        dueDate: DateTime.parse(m['dueDate'] as String),
        daysUntil: m['daysUntil'] as int,
      );

  static RecurringIncomeEntity _parseIncome(Map<String, dynamic> m) => RecurringIncomeEntity(
        id: m['id'] as String,
        label: m['label'] as String,
        kind: m['kind'] as String,
        amountPaisas: m['amountPaisas'] as int,
        variable: m['variable'] as bool,
        countsTowardFloor: m['countsTowardFloor'] as bool,
        dayOfMonth: m['dayOfMonth'] as int?,
        startDate: DateTime.parse(m['startDate'] as String),
        endDate: m['endDate'] != null ? DateTime.parse(m['endDate'] as String) : null,
        active: m['active'] as bool,
        occurrences: ((m['occurrences'] as List<dynamic>?) ?? [])
            .map((o) => o as Map<String, dynamic>)
            .map((o) => RecurringIncomeOccurrence(month: o['month'] as int, year: o['year'] as int))
            .toList(),
      );

  static PlannedExpenseEntity _parseExpense(Map<String, dynamic> m) => PlannedExpenseEntity(
        id: m['id'] as String,
        name: m['name'] as String,
        amountPaisas: m['amountPaisas'] as int,
        dueDate: DateTime.parse(m['dueDate'] as String),
        flexibility: m['flexibility'] as String,
        priority: m['priority'] as int,
        slideWindowMonths: m['slideWindowMonths'] as int,
        categoryId: m['categoryId'] as String?,
        notes: m['notes'] as String?,
        status: m['status'] as String,
      );
}
