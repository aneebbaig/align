import 'package:riverpod_annotation/riverpod_annotation.dart';

import '../../data/datasources/routines_datasource.dart';
import '../../domain/entities/routine_entity.dart';

part 'routines_provider.g.dart';

@riverpod
Future<List<RoutineEntity>> routines(Ref ref) => ref.watch(routinesDatasourceProvider).getRoutines();

@riverpod
Future<List<DayItemEntity>> routineDay(Ref ref, String date) => ref.watch(routinesDatasourceProvider).getDay(date);

@riverpod
Future<RoutineStatsEntity> routineStats(Ref ref, String from, String to) =>
    ref.watch(routinesDatasourceProvider).getStats(from, to);
