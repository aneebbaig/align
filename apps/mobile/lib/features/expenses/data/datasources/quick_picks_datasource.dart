import 'package:dio/dio.dart';
import 'package:riverpod_annotation/riverpod_annotation.dart';

import '../../../../core/constants/api_constants.dart';
import '../../../../core/errors/error_handler.dart';
import '../../../../core/network/api_client.dart';
import '../models/quick_picks_model.dart';

part 'quick_picks_datasource.g.dart';

@riverpod
QuickPicksDatasource quickPicksDatasource(Ref ref) =>
    QuickPicksDatasource(ref.watch(apiClientProvider));

class QuickPicksDatasource {
  const QuickPicksDatasource(this._dio);
  final Dio _dio;

  /// [type] is EXPENSE or INCOME.
  Future<QuickPicks> getQuickPicks(String type) async {
    try {
      final res = await _dio.get(ApiConstants.quickPicks, queryParameters: {'type': type});
      return QuickPicks.fromJson(res.data['data'] as Map<String, dynamic>);
    } catch (e) {
      throw ErrorHandler.handle(e);
    }
  }
}
