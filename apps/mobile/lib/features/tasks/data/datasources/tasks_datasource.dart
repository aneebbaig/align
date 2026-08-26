import 'package:dio/dio.dart';
import 'package:riverpod_annotation/riverpod_annotation.dart';

import '../../../../core/constants/api_constants.dart';
import '../../../../core/errors/error_handler.dart';
import '../../../../core/network/api_client.dart';
import '../../domain/entities/task_entity.dart';

part 'tasks_datasource.g.dart';

@riverpod
TasksDatasource tasksDatasource(Ref ref) =>
    TasksDatasource(ref.watch(apiClientProvider));

class TasksDatasource {
  const TasksDatasource(this._dio);
  final Dio _dio;

  Future<List<TaskEntity>> getTasks({String? type, String? status}) async {
    try {
      final res = await _dio.get(
        ApiConstants.tasks,
        queryParameters: {
          if (type != null) 'type': type,
          if (status != null) 'status': status,
        },
      );
      final list = res.data['data'] as List<dynamic>;
      return list.map((e) => _parse(e as Map<String, dynamic>)).toList();
    } catch (e) {
      throw ErrorHandler.handle(e);
    }
  }

  Future<String> createTask({
    required String title,
    String? description,
    String type = 'ONE_TIME',
    String priority = 'MEDIUM',
    String? dueDate,
    String? dueTime,
    String? category,
  }) async {
    try {
      final res = await _dio.post(ApiConstants.tasks, data: {
        'title': title,
        if (description != null) 'description': description,
        'type': type,
        'priority': priority,
        if (dueDate != null) 'dueDate': dueDate,
        if (dueTime != null) 'dueTime': dueTime,
        if (category != null) 'category': category,
      });
      return (res.data['data'] as Map<String, dynamic>)['id'] as String;
    } catch (e) {
      throw ErrorHandler.handle(e);
    }
  }

  Future<void> updateTaskStatus(String id, String status) async {
    try {
      await _dio.patch(ApiConstants.taskById(id), data: {'status': status});
    } catch (e) {
      throw ErrorHandler.handle(e);
    }
  }

  Future<void> updateTask(String id, Map<String, dynamic> changes) async {
    try {
      await _dio.patch(ApiConstants.taskById(id), data: changes);
    } catch (e) {
      throw ErrorHandler.handle(e);
    }
  }

  Future<void> deleteTask(String id) async {
    try {
      await _dio.delete(ApiConstants.taskById(id));
    } catch (e) {
      throw ErrorHandler.handle(e);
    }
  }

  static TaskEntity _parse(Map<String, dynamic> m) => TaskEntity(
        id: m['id'] as String,
        title: m['title'] as String,
        description: m['description'] as String?,
        type: m['type'] as String,
        priority: m['priority'] as String,
        status: m['status'] as String,
        dueDate: m['dueDate'] != null ? DateTime.parse(m['dueDate'] as String) : null,
        dueTime: m['dueTime'] as String?,
        category: m['category'] as String?,
        order: m['order'] as int,
      );
}
