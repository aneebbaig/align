import 'package:dio/dio.dart';
import 'package:riverpod_annotation/riverpod_annotation.dart';

import '../../../../core/constants/api_constants.dart';
import '../../../../core/errors/error_handler.dart';
import '../../../../core/network/api_client.dart';
import '../../domain/entities/savings_pot_entity.dart';

part 'savings_datasource.g.dart';

@riverpod
SavingsDatasource savingsDatasource(Ref ref) =>
    SavingsDatasource(ref.watch(apiClientProvider));

class SavingsDatasource {
  const SavingsDatasource(this._dio);
  final Dio _dio;

  Future<({List<SavingsPotEntity> pots, int totalPaisas})> getSavings() async {
    try {
      final res = await _dio.get(ApiConstants.savings);
      final d = res.data['data'] as Map<String, dynamic>;
      final pots = (d['pots'] as List<dynamic>)
          .map((e) => _parsePot(e as Map<String, dynamic>))
          .toList();
      return (pots: pots, totalPaisas: d['totalPaisas'] as int);
    } catch (e) {
      throw ErrorHandler.handle(e);
    }
  }

  static SavingsPotEntity _parsePot(Map<String, dynamic> m) => SavingsPotEntity(
        id: m['id'] as String,
        name: m['name'] as String,
        icon: m['icon'] as String,
        color: m['color'] as String,
        type: m['type'] as String,
        targetPaisas: m['targetAmount'] as int,
        currentPaisas: m['currentAmount'] as int,
        currentUsdCents: m['currentAmountUsd'] as int,
        targetDate: m['targetDate'] != null
            ? DateTime.parse(m['targetDate'] as String)
            : null,
      );
}
