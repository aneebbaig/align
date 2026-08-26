import 'package:riverpod_annotation/riverpod_annotation.dart';

import '../../data/datasources/investments_datasource.dart';
import '../../domain/entities/investment_entity.dart';

part 'investments_provider.g.dart';

@riverpod
Future<InvestmentsData> investments(Ref ref) =>
    ref.watch(investmentsDatasourceProvider).getInvestments();
