import 'package:dio/dio.dart';
import 'package:riverpod_annotation/riverpod_annotation.dart';

import '../../../core/constants/api_constants.dart';
import '../../../core/errors/error_handler.dart';
import '../../../core/network/api_client.dart';
import '../domain/wedding_models.dart';

part 'wedding_datasource.g.dart';

@riverpod
WeddingDatasource weddingDatasource(Ref ref) => WeddingDatasource(ref.watch(apiClientProvider));

/// Wedding planner API. Money is paisas in and out.
class WeddingDatasource {
  const WeddingDatasource(this._dio);
  final Dio _dio;

  Future<T> _run<T>(Future<T> Function() call) async {
    try {
      return await call();
    } catch (e) {
      throw ErrorHandler.handle(e);
    }
  }

  Map<String, dynamic> _data(Response res) => (res.data['data'] as Map).cast<String, dynamic>();

  Future<List<WeddingSummary>> list() => _run(() async {
        final res = await _dio.get(ApiConstants.wedding);
        return [
          for (final j in res.data['data'] as List) WeddingSummary.fromJson((j as Map).cast<String, dynamic>()),
        ];
      });

  Future<WeddingPlan> plan(String id) => _run(() async {
        final res = await _dio.get(ApiConstants.weddingById(id));
        return WeddingPlan.fromJson(_data(res));
      });

  Future<String> createWedding({
    required String brideName,
    required String groomName,
    DateTime? weddingDate,
  }) =>
      _run(() async {
        final res = await _dio.post(ApiConstants.wedding, data: {
          'brideName': brideName,
          'groomName': groomName,
          if (weddingDate != null) 'weddingDate': weddingDate.toIso8601String(),
        });
        return _data(res)['id'] as String;
      });

  Future<void> updateWedding(String id, Map<String, dynamic> patch) =>
      _run(() => _dio.patch(ApiConstants.weddingById(id), data: patch));

  Future<void> deleteWedding(String id) => _run(() => _dio.delete(ApiConstants.weddingById(id)));

  // events
  Future<void> addEvent(String id, {required String type, required String name, int order = 0}) =>
      _run(() => _dio.post(ApiConstants.weddingEvents(id), data: {'type': type, 'name': name, 'order': order}));

  Future<void> updateEvent(String id, String eventId, Map<String, dynamic> patch) =>
      _run(() => _dio.patch(ApiConstants.weddingEvent(id, eventId), data: patch));

  /// An event with expenses needs [moveTo] (another event's id) or [deleteExpenses]; the server answers 409 otherwise.
  Future<void> deleteEvent(String id, String eventId, {String? moveTo, bool deleteExpenses = false}) =>
      _run(() => _dio.delete(
            ApiConstants.weddingEvent(id, eventId),
            queryParameters: {
              if (moveTo != null) 'moveTo': moveTo,
              if (deleteExpenses) 'deleteExpenses': '1',
            },
          ));

  // expenses
  Future<void> addExpense(
    String id, {
    required String name,
    required String eventId,
    int estimatedAmount = 0,
    String category = 'MISC',
  }) =>
      _run(() => _dio.post(ApiConstants.weddingExpenses(id), data: {
            'name': name,
            'category': category,
            'eventId': eventId,
            'estimatedAmount': estimatedAmount,
          }));

  /// Partial edit. Only keys present in [patch] change; `actualAmount: null` clears the real cost.
  Future<void> updateExpense(String id, String expenseId, Map<String, dynamic> patch) =>
      _run(() => _dio.patch(ApiConstants.weddingExpense(id, expenseId), data: patch));

  Future<void> deleteExpense(String id, String expenseId) =>
      _run(() => _dio.delete(ApiConstants.weddingExpense(id, expenseId)));

  Future<PreviousPayment> payInFull(String id, String expenseId) => _run(() async {
        final res = await _dio.post(ApiConstants.weddingExpensePay(id, expenseId));
        return PreviousPayment.fromJson(_data(res));
      });

  /// Undo for [payInFull].
  Future<void> restorePayment(String id, String expenseId, PreviousPayment prev) =>
      updateExpense(id, expenseId, {'actualAmount': prev.actualAmount, 'paidAmount': prev.paidAmount});

  // quotes
  Future<void> addQuote(String id, String expenseId, {required String vendorName, required int amount}) =>
      _run(() => _dio.post(ApiConstants.weddingQuotes(id, expenseId), data: {'vendorName': vendorName, 'amount': amount}));

  Future<void> deleteQuote(String id, String expenseId, String quoteId) =>
      _run(() => _dio.delete(ApiConstants.weddingQuote(id, expenseId, quoteId)));

  Future<void> chooseQuote(String id, String expenseId, String quoteId) =>
      _run(() => _dio.post(ApiConstants.weddingQuoteChoose(id, expenseId, quoteId)));

  Future<void> clearQuoteChoice(String id, String expenseId) =>
      _run(() => _dio.post(ApiConstants.weddingQuotesClear(id, expenseId)));
}
