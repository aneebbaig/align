import 'package:dio/dio.dart';
import 'package:riverpod_annotation/riverpod_annotation.dart';

import '../../../../core/constants/api_constants.dart';
import '../../../../core/errors/error_handler.dart';
import '../../../../core/network/api_client.dart';
import '../../domain/entities/planner_entity.dart';

part 'planner_datasource.g.dart';

@riverpod
PlannerDatasource plannerDatasource(Ref ref) => PlannerDatasource(ref.watch(apiClientProvider));

class PlannerDatasource {
  const PlannerDatasource(this._dio);
  final Dio _dio;

  Future<T> _call<T>(Future<T> Function() f) async {
    try {
      return await f();
    } catch (e) {
      throw ErrorHandler.handle(e);
    }
  }

  Future<PlannerData> getPlanner() => _call(() async {
        final res = await _dio.get(ApiConstants.planner);
        return PlannerData.fromJson(res.data['data'] as Map<String, dynamic>);
      });

  Future<void> updateSettings({int? startMonth, int? startYear, int? months, int? startingCashPaisas, double? usdRate}) =>
      _call(() => _dio.patch(ApiConstants.plannerSettings, data: {
            if (startMonth != null) 'startMonth': startMonth,
            if (startYear != null) 'startYear': startYear,
            if (months != null) 'months': months,
            if (startingCashPaisas != null) 'startingCashPaisas': startingCashPaisas,
            if (usdRate != null) 'usdRate': usdRate,
          }));

  Future<void> addLine({required String name, required String direction, required String currency}) =>
      _call(() => _dio.post(ApiConstants.plannerLines, data: {'name': name, 'direction': direction, 'currency': currency}));

  Future<void> updateLine(String id, {String? name, String? direction, String? currency}) =>
      _call(() => _dio.patch(ApiConstants.plannerLine(id), data: {
            if (name != null) 'name': name,
            if (direction != null) 'direction': direction,
            if (currency != null) 'currency': currency,
          }));

  Future<void> deleteLine(String id) => _call(() => _dio.delete(ApiConstants.plannerLine(id)));

  Future<void> reorderLines(List<String> ids) => _call(() => _dio.put(ApiConstants.plannerLinesOrder, data: {'ids': ids}));

  // scope: FROM_HERE (step) or THIS_MONTH (override). amount in the line's own unit.
  Future<void> setCell({required String lineId, required int month, required int year, required int amount, required String scope}) =>
      _call(() => _dio.put(ApiConstants.plannerLineCells(lineId),
          data: {'month': month, 'year': year, 'amount': amount, 'scope': scope}));

  Future<void> removeOverride({required String lineId, required int month, required int year}) =>
      _call(() => _dio.delete(ApiConstants.plannerLineCells(lineId), queryParameters: {'month': month, 'year': year}));

  Future<void> addGoal({required String name, required int month, required int year, required int amountPaisas, String? note}) =>
      _call(() => _dio.post(ApiConstants.plannerGoals, data: {
            'name': name,
            'month': month,
            'year': year,
            'amountPaisas': amountPaisas,
            'note': (note == null || note.isEmpty) ? null : note,
          }));

  Future<void> updateGoal(String id, {String? name, int? month, int? year, int? amountPaisas, String? note}) =>
      _call(() => _dio.patch(ApiConstants.plannerGoal(id), data: {
            if (name != null) 'name': name,
            if (month != null) 'month': month,
            if (year != null) 'year': year,
            if (amountPaisas != null) 'amountPaisas': amountPaisas,
            if (note != null) 'note': note.isEmpty ? null : note,
          }));

  Future<void> deleteGoal(String id) => _call(() => _dio.delete(ApiConstants.plannerGoal(id)));
}
