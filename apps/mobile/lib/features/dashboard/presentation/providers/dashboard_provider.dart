import 'package:riverpod_annotation/riverpod_annotation.dart';

import '../../data/repositories/dashboard_repository_impl.dart';
import '../../domain/entities/dashboard_data.dart';

part 'dashboard_provider.g.dart';

@riverpod
Future<DashboardData> dashboard(Ref ref) =>
    ref.watch(dashboardRepositoryProvider).getDashboard();
