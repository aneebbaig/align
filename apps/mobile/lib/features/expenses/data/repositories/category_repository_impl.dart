import 'package:riverpod_annotation/riverpod_annotation.dart';

import '../../domain/entities/category_entity.dart';
import '../../domain/repositories/category_repository.dart';
import '../datasources/category_remote_datasource.dart';
import '../models/category_model.dart';

part 'category_repository_impl.g.dart';

@riverpod
CategoryRepository categoryRepository(Ref ref) =>
    CategoryRepositoryImpl(ref.watch(categoryRemoteDatasourceProvider));

class CategoryRepositoryImpl implements CategoryRepository {
  const CategoryRepositoryImpl(this._datasource);
  final CategoryRemoteDatasource _datasource;

  @override
  Future<List<CategoryEntity>> getCategories({String? type}) async {
    final models = await _datasource.getCategories(type: type);
    return models.map((m) => m.toEntity()).toList();
  }
}
