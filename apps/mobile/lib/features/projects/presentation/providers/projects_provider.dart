import 'package:riverpod_annotation/riverpod_annotation.dart';

import '../../data/datasources/projects_datasource.dart';
import '../../domain/entities/project_entity.dart';

part 'projects_provider.g.dart';

@riverpod
Future<List<ProjectEntity>> projects(Ref ref) =>
    ref.watch(projectsDatasourceProvider).getProjects();

@riverpod
Future<ProjectEntity> project(Ref ref, String id) =>
    ref.watch(projectsDatasourceProvider).getProject(id);
