import 'package:riverpod_annotation/riverpod_annotation.dart';

import 'funding_context_datasource.dart';
import 'funding_context_entity.dart';

part 'funding_context_provider.g.dart';

/// Family provider keyed on the resolved target period - refetches whenever
/// the caller's month/year changes (e.g. the budget-period checkbox toggles
/// or the date field changes), so the income-available figure follows
/// whichever period the transaction will actually be filed under. Pass
/// null/null to let the server default to the user's current open period.
@riverpod
Future<FundingContextEntity> fundingContext(Ref ref, int? month, int? year) =>
    ref.watch(fundingContextDatasourceProvider).getFundingContext(month: month, year: year);
