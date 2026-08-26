import 'package:riverpod_annotation/riverpod_annotation.dart';

import '../../data/datasources/cashflow_datasource.dart';
import '../../domain/entities/cashflow_summary_entity.dart';

part 'cashflow_summary_provider.g.dart';

@riverpod
Future<CashflowSummaryEntity> cashflowSummary(Ref ref) =>
    ref.watch(cashflowDatasourceProvider).getSummary();
