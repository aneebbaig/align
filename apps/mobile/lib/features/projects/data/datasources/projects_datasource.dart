import 'package:dio/dio.dart';
import 'package:riverpod_annotation/riverpod_annotation.dart';

import '../../../../core/constants/api_constants.dart';
import '../../../../core/errors/error_handler.dart';
import '../../../../core/network/api_client.dart';
import '../../domain/entities/project_entity.dart';

part 'projects_datasource.g.dart';

@riverpod
ProjectsDatasource projectsDatasource(Ref ref) =>
    ProjectsDatasource(ref.watch(apiClientProvider));

class ProjectsDatasource {
  const ProjectsDatasource(this._dio);
  final Dio _dio;

  Future<List<ProjectEntity>> getProjects({String? status}) async {
    try {
      final res = await _dio.get(
        ApiConstants.projects,
        queryParameters: {if (status != null) 'status': status},
      );
      final list = res.data['data'] as List<dynamic>;
      return list
          .map((e) => ProjectEntity.fromSummaryJson(e as Map<String, dynamic>))
          .toList();
    } catch (e) {
      throw ErrorHandler.handle(e);
    }
  }

  Future<ProjectEntity> getProject(String id) async {
    try {
      final res = await _dio.get(ApiConstants.projectById(id));
      return ProjectEntity.fromDetailJson(res.data['data'] as Map<String, dynamic>);
    } catch (e) {
      throw ErrorHandler.handle(e);
    }
  }

  Future<String> createProject({
    required String name,
    String? client,
    String? description,
    String color = '#6366F1',
    String status = 'ACTIVE',
    String? dueDate,
  }) async {
    try {
      final res = await _dio.post(ApiConstants.projects, data: {
        'name': name,
        if (client != null) 'client': client,
        if (description != null) 'description': description,
        'color': color,
        'status': status,
        if (dueDate != null) 'dueDate': dueDate,
      });
      return (res.data['data'] as Map<String, dynamic>)['id'] as String;
    } catch (e) {
      throw ErrorHandler.handle(e);
    }
  }

  Future<void> updateProject(String id, Map<String, dynamic> changes) async {
    try {
      await _dio.patch(ApiConstants.projectById(id), data: changes);
    } catch (e) {
      throw ErrorHandler.handle(e);
    }
  }

  Future<void> deleteProject(String id) async {
    try {
      await _dio.delete(ApiConstants.projectById(id));
    } catch (e) {
      throw ErrorHandler.handle(e);
    }
  }

  Future<void> createTask(
    String projectId, {
    required String title,
    String priority = 'MEDIUM',
    String status = 'TODO',
    String? dueDate,
    List<String>? tagIds,
  }) async {
    try {
      await _dio.post(ApiConstants.projectTasks(projectId), data: {
        'title': title,
        'priority': priority,
        'status': status,
        if (dueDate != null) 'dueDate': dueDate,
        if (tagIds != null && tagIds.isNotEmpty) 'tagIds': tagIds,
      });
    } catch (e) {
      throw ErrorHandler.handle(e);
    }
  }

  Future<void> updateTask(
    String projectId,
    String taskId,
    Map<String, dynamic> changes,
  ) async {
    try {
      await _dio.patch(ApiConstants.projectTaskById(projectId, taskId), data: changes);
    } catch (e) {
      throw ErrorHandler.handle(e);
    }
  }

  Future<void> deleteTask(String projectId, String taskId) async {
    try {
      await _dio.delete(ApiConstants.projectTaskById(projectId, taskId));
    } catch (e) {
      throw ErrorHandler.handle(e);
    }
  }

  Future<void> reorderTasks(String projectId, List<Map<String, dynamic>> updates) async {
    try {
      await Future.wait(updates.map((u) => _dio.patch(
            ApiConstants.projectTaskById(projectId, u['id'] as String),
            data: {
              'order': u['order'],
              if (u['status'] != null) 'status': u['status'],
            },
          )));
    } catch (e) {
      throw ErrorHandler.handle(e);
    }
  }
}
