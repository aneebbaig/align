import 'package:riverpod_annotation/riverpod_annotation.dart';

import '../../data/repositories/category_repository_impl.dart';
import '../../domain/entities/category_entity.dart';

part 'categories_provider.g.dart';

@riverpod
Future<List<CategoryEntity>> categories(Ref ref) =>
    ref.watch(categoryRepositoryProvider).getCategories();

@riverpod
Future<List<CategoryEntity>> incomeCategories(Ref ref) =>
    ref.watch(categoryRepositoryProvider).getCategories(type: 'INCOME');
