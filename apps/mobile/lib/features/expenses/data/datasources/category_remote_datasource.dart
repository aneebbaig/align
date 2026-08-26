import 'package:dio/dio.dart';
import 'package:riverpod_annotation/riverpod_annotation.dart';

import '../../../../core/constants/api_constants.dart';
import '../../../../core/errors/error_handler.dart';
import '../../../../core/network/api_client.dart';
import '../models/category_model.dart';

part 'category_remote_datasource.g.dart';

@riverpod
CategoryRemoteDatasource categoryRemoteDatasource(Ref ref) =>
    CategoryRemoteDatasource(ref.watch(apiClientProvider));

class CategoryRemoteDatasource {
  const CategoryRemoteDatasource(this._dio);
  final Dio _dio;

  Future<List<CategoryModel>> getCategories({String? type}) async {
    try {
      final res = await _dio.get(
        ApiConstants.categories,
        queryParameters: {if (type != null) 'type': type},
      );
      final list = res.data['data'] as List<dynamic>;
      return list
          .map((e) => CategoryModel.fromJson(e as Map<String, dynamic>))
          .toList();
    } catch (e) {
      throw ErrorHandler.handle(e);
    }
  }
}
