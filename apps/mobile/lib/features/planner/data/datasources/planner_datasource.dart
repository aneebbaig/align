import 'package:dio/dio.dart';
import 'package:riverpod_annotation/riverpod_annotation.dart';

import '../../../../core/constants/api_constants.dart';
import '../../../../core/errors/error_handler.dart';
import '../../../../core/network/api_client.dart';
import '../../domain/entities/planner_entity.dart';

part 'planner_datasource.g.dart';

@riverpod
PlannerDatasource plannerDatasource(Ref ref) =>
    PlannerDatasource(ref.watch(apiClientProvider));

class PlannerDatasource {
  const PlannerDatasource(this._dio);
  final Dio _dio;

  Future<PlannerData> getPlanner() async {
    try {
      final res = await _dio.get(ApiConstants.planner);
      return parsePlanner(res.data['data'] as Map<String, dynamic>);
    } catch (e) {
      throw ErrorHandler.handle(e);
    }
  }

  Future<void> updateSettings({
    int? startMonth,
    int? startYear,
    int? months,
    int? startingCashPaisas,
    double? usdRate,
  }) async {
    try {
      await _dio.patch(ApiConstants.plannerSettings, data: {
        if (startMonth != null) 'startMonth': startMonth,
        if (startYear != null) 'startYear': startYear,
        if (months != null) 'months': months,
        if (startingCashPaisas != null) 'startingCashPaisas': startingCashPaisas,
        if (usdRate != null) 'usdRate': usdRate,
      });
    } catch (e) {
      throw ErrorHandler.handle(e);
    }
  }

  Future<String> addLine({
    required String name,
    required String direction, // IN | OUT
    required String currency, // PKR | USD
  }) async {
    try {
      final res = await _dio.post(ApiConstants.plannerLines, data: {
        'name': name,
        'direction': direction,
        'currency': currency,
      });
      return (res.data['data'] as Map<String, dynamic>)['id'] as String;
    } catch (e) {
      throw ErrorHandler.handle(e);
    }
  }

  Future<void> updateLine({
    required String id,
    String? name,
    String? direction,
    String? currency,
  }) async {
    try {
      await _dio.patch(ApiConstants.plannerLine(id), data: {
        if (name != null) 'name': name,
        if (direction != null) 'direction': direction,
        if (currency != null) 'currency': currency,
      });
    } catch (e) {
      throw ErrorHandler.handle(e);
    }
  }

  Future<void> deleteLine(String id) async {
    try {
      await _dio.delete(ApiConstants.plannerLine(id));
    } catch (e) {
      throw ErrorHandler.handle(e);
    }
  }

  Future<void> reorderLines(List<String> ids) async {
    try {
      await _dio.put(ApiConstants.plannerLinesOrder, data: {'ids': ids});
    } catch (e) {
      throw ErrorHandler.handle(e);
    }
  }

  /// scope: FROM_HERE (from this month on) or THIS_MONTH (just this month).
  /// amount is in the line's own unit - paisas, or cents for USD lines.
  Future<void> setCell({
    required String lineId,
    required int month,
    required int year,
    required int amount,
    required String scope,
  }) async {
    try {
      await _dio.put(ApiConstants.plannerLineCells(lineId), data: {
        'month': month,
        'year': year,
        'amount': amount,
        'scope': scope,
      });
    } catch (e) {
      throw ErrorHandler.handle(e);
    }
  }

  /// Drops a "just this month" change - the month goes back to the line's steps.
  Future<void> removeOverride({required String lineId, required int month, required int year}) async {
    try {
      await _dio.delete(ApiConstants.plannerLineCells(lineId), queryParameters: {'month': month, 'year': year});
    } catch (e) {
      throw ErrorHandler.handle(e);
    }
  }

  Future<String> addGoal({
    required String name,
    required int month,
    required int year,
    required int amountPaisas,
    String? note,
  }) async {
    try {
      final res = await _dio.post(ApiConstants.plannerGoals, data: {
        'name': name,
        'month': month,
        'year': year,
        'amountPaisas': amountPaisas,
        if (note != null && note.isNotEmpty) 'note': note,
      });
      return (res.data['data'] as Map<String, dynamic>)['id'] as String;
    } catch (e) {
      throw ErrorHandler.handle(e);
    }
  }

  Future<void> updateGoal({
    required String id,
    String? name,
    int? amountPaisas,
    String? note, // '' clears it
  }) async {
    try {
      await _dio.patch(ApiConstants.plannerGoal(id), data: {
        if (name != null) 'name': name,
        if (amountPaisas != null) 'amountPaisas': amountPaisas,
        if (note != null) 'note': note.isEmpty ? null : note,
      });
    } catch (e) {
      throw ErrorHandler.handle(e);
    }
  }

  Future<void> deleteGoal(String id) async {
    try {
      await _dio.delete(ApiConstants.plannerGoal(id));
    } catch (e) {
      throw ErrorHandler.handle(e);
    }
  }

  static PlannerData parsePlanner(Map<String, dynamic> m) => PlannerData(
        settings: _parseSettings(m['settings'] as Map<String, dynamic>),
        lines: (m['lines'] as List<dynamic>).map((e) => _parseLine(e as Map<String, dynamic>)).toList(),
        rows: (m['rows'] as List<dynamic>).map((e) => _parseRow(e as Map<String, dynamic>)).toList(),
      );

  static PlannerSettingsEntity _parseSettings(Map<String, dynamic> m) => PlannerSettingsEntity(
        startMonth: m['startMonth'] as int,
        startYear: m['startYear'] as int,
        months: m['months'] as int,
        startingCashPaisas: m['startingCashPaisas'] as int,
        usdRate: (m['usdRate'] as num).toDouble(),
      );

  static PlannerLineEntity _parseLine(Map<String, dynamic> m) => PlannerLineEntity(
        id: m['id'] as String,
        name: m['name'] as String,
        direction: m['direction'] as String,
        currency: m['currency'] as String,
        order: m['order'] as int,
      );

  static PlannerCellEntity _parseCell(Map<String, dynamic> m) => PlannerCellEntity(
        lineId: m['lineId'] as String,
        native: m['native'] as int,
        pkr: m['pkr'] as int,
        signed: m['signed'] as int,
        isOverride: m['isOverride'] as bool,
      );

  static PlannerGoalEntity _parseGoal(Map<String, dynamic> m) => PlannerGoalEntity(
        id: m['id'] as String,
        name: m['name'] as String,
        amountPaisas: m['amountPaisas'] as int,
        note: m['note'] as String?,
      );

  static PlannerRowEntity _parseRow(Map<String, dynamic> m) => PlannerRowEntity(
        month: m['month'] as int,
        year: m['year'] as int,
        cells: (m['cells'] as List<dynamic>).map((e) => _parseCell(e as Map<String, dynamic>)).toList(),
        goals: (m['goals'] as List<dynamic>).map((e) => _parseGoal(e as Map<String, dynamic>)).toList(),
        goalsTotal: m['goalsTotal'] as int,
        net: m['net'] as int,
        available: m['available'] as int,
      );
}
