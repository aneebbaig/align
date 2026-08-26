import 'package:riverpod_annotation/riverpod_annotation.dart';

import '../../domain/entities/dashboard_data.dart';
import '../../domain/repositories/dashboard_repository.dart';
import '../datasources/dashboard_remote_datasource.dart';

part 'dashboard_repository_impl.g.dart';

@riverpod
DashboardRepository dashboardRepository(Ref ref) =>
    DashboardRepositoryImpl(ref.watch(dashboardRemoteDatasourceProvider));

class DashboardRepositoryImpl implements DashboardRepository {
  const DashboardRepositoryImpl(this._ds);
  final DashboardRemoteDatasource _ds;

  @override
  Future<DashboardData> getDashboard() => _ds.getDashboard();
}
