import 'package:riverpod_annotation/riverpod_annotation.dart';

import '../../data/datasources/plans_datasource.dart';
import '../../domain/entities/plan_entity.dart';

part 'plans_provider.g.dart';

@riverpod
Future<List<PlanEntity>> plans(Ref ref) =>
    ref.watch(plansDatasourceProvider).getPlans();

@riverpod
Future<PlanDetailEntity> planDetail(Ref ref, String id) =>
    ref.watch(plansDatasourceProvider).getPlanDetail(id);
