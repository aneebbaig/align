import 'package:riverpod_annotation/riverpod_annotation.dart';

import '../../data/datasources/cashflow_datasource.dart';
import '../../domain/entities/planned_expense_entity.dart';

part 'planned_expenses_provider.g.dart';

@riverpod
Future<List<PlannedExpenseEntity>> plannedExpenses(Ref ref) =>
    ref.watch(cashflowDatasourceProvider).getPlannedExpenses();
