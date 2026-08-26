import 'package:riverpod_annotation/riverpod_annotation.dart';

import '../../data/datasources/tags_datasource.dart';
import '../../domain/entities/project_entity.dart';

part 'tags_provider.g.dart';

@riverpod
Future<List<TagEntity>> tags(Ref ref) => ref.watch(tagsDatasourceProvider).getTags();
