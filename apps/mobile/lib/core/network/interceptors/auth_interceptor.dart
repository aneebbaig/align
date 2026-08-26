import 'package:dio/dio.dart';

import '../../services/storage_service.dart';

const _kSkipAuth = 'skip_auth';

/// Injects the better-auth bearer token on every request. better-auth has no
/// refresh token — the session token is long-lived — so on 401 we just clear
/// the token and let RouterNotifier redirect to login.
class AuthInterceptor extends QueuedInterceptorsWrapper {
  AuthInterceptor({required StorageService storage, required Dio dio})
      : _storage = storage;

  final StorageService _storage;

  @override
  Future<void> onRequest(
    RequestOptions options,
    RequestInterceptorHandler handler,
  ) async {
    if (options.extra[_kSkipAuth] == true) {
      handler.next(options);
      return;
    }
    final token = await _storage.getToken();
    if (token != null) {
      options.headers['Authorization'] = 'Bearer $token';
    }
    handler.next(options);
  }

  @override
  Future<void> onError(
    DioException err,
    ErrorInterceptorHandler handler,
  ) async {
    if (err.response?.statusCode == 401) {
      await _storage.clearToken();
    }
    handler.next(err);
  }
}
