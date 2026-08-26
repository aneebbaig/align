import 'package:dio/dio.dart';
import 'package:riverpod_annotation/riverpod_annotation.dart';

import '../constants/api_constants.dart';
import '../errors/error_handler.dart';
import '../network/api_client.dart';
import 'funding_context_entity.dart';

part 'funding_context_datasource.g.dart';

@riverpod
FundingContextDatasource fundingContextDatasource(Ref ref) =>
    FundingContextDatasource(ref.watch(apiClientProvider));

class FundingContextDatasource {
  const FundingContextDatasource(this._dio);
  final Dio _dio;

  Future<FundingContextEntity> getFundingContext({int? month, int? year}) async {
    try {
      final res = await _dio.get(
        ApiConstants.expenseFundingContext,
        queryParameters: {
          if (month != null) 'month': month,
          if (year != null) 'year': year,
        },
      );
      final d = res.data['data'] as Map<String, dynamic>;
      final pots = (d['pots'] as List<dynamic>).map((e) {
        final m = e as Map<String, dynamic>;
        final base = (m['balances'] as List<dynamic>)
            .map((b) => b as Map<String, dynamic>)
            .firstWhere(
              (b) => (b['currency'] as Map<String, dynamic>)['isBase'] == true,
              orElse: () => {'amountPaisas': 0},
            );
        return FundingContextPot(
          id: m['id'] as String,
          name: m['name'] as String,
          type: m['type'] as String,
          basePaisas: base['amountPaisas'] as int? ?? 0,
        );
      }).toList();
      return FundingContextEntity(
        monthlyIncomeAvailablePaisas: d['monthlyIncomeAvailablePaisas'] as int,
        pots: pots,
      );
    } catch (e) {
      throw ErrorHandler.handle(e);
    }
  }
}
