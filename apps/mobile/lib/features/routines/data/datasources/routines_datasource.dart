import 'package:dio/dio.dart';
import 'package:riverpod_annotation/riverpod_annotation.dart';

import '../../../../core/constants/api_constants.dart';
import '../../../../core/errors/error_handler.dart';
import '../../../../core/network/api_client.dart';
import '../../domain/entities/routine_entity.dart';

part 'routines_datasource.g.dart';

@riverpod
RoutinesDatasource routinesDatasource(Ref ref) => RoutinesDatasource(ref.watch(apiClientProvider));

class RoutinesDatasource {
  const RoutinesDatasource(this._dio);
  final Dio _dio;

  Future<List<RoutineEntity>> getRoutines() async {
    try {
      final res = await _dio.get(ApiConstants.routines);
      return (res.data['data'] as List<dynamic>).map((e) => RoutineEntity.fromJson(e as Map<String, dynamic>)).toList();
    } catch (e) {
      throw ErrorHandler.handle(e);
    }
  }

  Future<String> createRoutine(Map<String, dynamic> body) async {
    try {
      final res = await _dio.post(ApiConstants.routines, data: body);
      return (res.data['data'] as Map<String, dynamic>)['id'] as String;
    } catch (e) {
      throw ErrorHandler.handle(e);
    }
  }

  Future<void> updateRoutine(String id, Map<String, dynamic> changes) async {
    try {
      await _dio.patch(ApiConstants.routineById(id), data: changes);
    } catch (e) {
      throw ErrorHandler.handle(e);
    }
  }

  Future<void> deleteRoutine(String id) async {
    try {
      await _dio.delete(ApiConstants.routineById(id));
    } catch (e) {
      throw ErrorHandler.handle(e);
    }
  }

  Future<List<DayItemEntity>> getDay(String date) async {
    try {
      final res = await _dio.get(ApiConstants.routinesDay, queryParameters: {'date': date});
      return (res.data['data'] as List<dynamic>).map((e) => DayItemEntity.fromJson(e as Map<String, dynamic>)).toList();
    } catch (e) {
      throw ErrorHandler.handle(e);
    }
  }

  /// Marks a routine done for [date]. The server keeps the first tick time, so
  /// replaying a queued tick is safe.
  Future<void> setCompletion(String id, String date, DateTime at) async {
    try {
      await _dio.put(ApiConstants.routineCompletion(id), data: {'date': date, 'completedAt': at.toUtc().toIso8601String()});
    } catch (e) {
      throw ErrorHandler.handle(e);
    }
  }

  Future<void> clearCompletion(String id, String date) async {
    try {
      await _dio.delete(ApiConstants.routineCompletion(id), queryParameters: {'date': date});
    } catch (e) {
      throw ErrorHandler.handle(e);
    }
  }

  Future<RoutineStatsEntity> getStats(String from, String to) async {
    try {
      final res = await _dio.get(ApiConstants.routinesStats, queryParameters: {'from': from, 'to': to});
      return RoutineStatsEntity.fromJson(res.data['data'] as Map<String, dynamic>);
    } catch (e) {
      throw ErrorHandler.handle(e);
    }
  }
}
