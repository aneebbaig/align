import 'package:riverpod_annotation/riverpod_annotation.dart';

import '../../data/datasources/cashflow_datasource.dart';
import '../../domain/entities/recurring_income_entity.dart';

part 'recurring_income_provider.g.dart';

@riverpod
Future<List<RecurringIncomeEntity>> recurringIncomes(Ref ref) =>
    ref.watch(cashflowDatasourceProvider).getRecurringIncomes();
