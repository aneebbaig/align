import 'package:dio/dio.dart';
import 'package:riverpod_annotation/riverpod_annotation.dart';

import '../../../../core/constants/api_constants.dart';
import '../../../../core/errors/error_handler.dart';
import '../../../../core/network/api_client.dart';
import '../../domain/entities/project_entity.dart';

part 'tags_datasource.g.dart';

@riverpod
TagsDatasource tagsDatasource(Ref ref) =>
    TagsDatasource(ref.watch(apiClientProvider));

class TagsDatasource {
  const TagsDatasource(this._dio);
  final Dio _dio;

  Future<List<TagEntity>> getTags() async {
    try {
      final res = await _dio.get(ApiConstants.tags);
      final list = res.data['data'] as List<dynamic>;
      return list.map((e) => TagEntity.fromJson(e as Map<String, dynamic>)).toList();
    } catch (e) {
      throw ErrorHandler.handle(e);
    }
  }

  Future<TagEntity> createTag({required String name, String color = '#6366f1'}) async {
    try {
      final res = await _dio.post(ApiConstants.tags, data: {'name': name, 'color': color});
      return TagEntity.fromJson(res.data['data'] as Map<String, dynamic>);
    } catch (e) {
      throw ErrorHandler.handle(e);
    }
  }

  Future<void> deleteTag(String id) async {
    try {
      await _dio.delete(ApiConstants.tagById(id));
    } catch (e) {
      throw ErrorHandler.handle(e);
    }
  }
}
