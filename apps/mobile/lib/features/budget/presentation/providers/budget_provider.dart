import 'package:riverpod_annotation/riverpod_annotation.dart';

import '../../data/datasources/budget_datasource.dart';
import '../../domain/entities/budget_data.dart';

part 'budget_provider.g.dart';

@riverpod
Future<BudgetData> budget(Ref ref) =>
    ref.watch(budgetDatasourceProvider).getBudget();
