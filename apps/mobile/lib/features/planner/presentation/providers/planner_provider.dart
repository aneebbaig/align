import 'package:riverpod_annotation/riverpod_annotation.dart';

import '../../data/datasources/planner_datasource.dart';
import '../../domain/entities/planner_entity.dart';

part 'planner_provider.g.dart';

@riverpod
Future<PlannerData> planner(Ref ref) => ref.watch(plannerDatasourceProvider).getPlanner();
