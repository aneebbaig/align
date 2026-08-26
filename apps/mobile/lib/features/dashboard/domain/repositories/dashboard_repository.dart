import '../entities/dashboard_data.dart';

abstract interface class DashboardRepository {
  Future<DashboardData> getDashboard();
}
