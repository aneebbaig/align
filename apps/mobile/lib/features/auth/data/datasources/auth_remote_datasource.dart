import 'package:dio/dio.dart';
import 'package:riverpod_annotation/riverpod_annotation.dart';

import '../../../../core/constants/api_constants.dart';
import '../../../../core/errors/error_handler.dart';
import '../../../../core/network/api_client.dart';
import '../../../../core/network/server_url.dart';
import '../models/user_model.dart';

part 'auth_remote_datasource.g.dart';

@riverpod
AuthRemoteDatasource authRemoteDatasource(Ref ref) => AuthRemoteDatasource(
      ref.watch(apiClientProvider),
      ref.watch(serverUrlProvider) ?? '',
    );

class AuthRemoteDatasource {
  const AuthRemoteDatasource(this._dio, this._origin);
  final Dio _dio;

  /// better-auth is not under /api/v1, so its calls are absolute against the
  /// configured origin rather than relative to the Dio base URL.
  final String _origin;

  String get _authBase => ApiConstants.authBase(_origin);

  /// Password sign-in. Returns the bearer token (from the `set-auth-token`
  /// header) plus the user, or `totpRequired: true` (with a partial token) when
  /// 2FA is on — the caller then collects a code and calls [verifyTotp].
  Future<({String token, UserModel? user, bool totpRequired})> signIn({
    required String email,
    required String password,
  }) async {
    try {
      final res = await _dio.post(
        '$_authBase${ApiConstants.signIn}',
        data: {'email': email, 'password': password},
      );
      final token = _token(res);
      final body = (res.data as Map?)?.cast<String, dynamic>() ?? {};
      if (body['twoFactorRedirect'] == true) {
        return (token: token, user: null, totpRequired: true);
      }
      return (
        token: token,
        user: UserModel.fromJson(body['user'] as Map<String, dynamic>),
        totpRequired: false,
      );
    } catch (e) {
      throw ErrorHandler.handle(e);
    }
  }

  /// Completes 2FA with a TOTP or backup code. The partial session token must
  /// already be stored (the interceptor sends it). Returns the full token.
  Future<String> verifyTotp(String code) async {
    try {
      final res = await _dio.post(
        '$_authBase${ApiConstants.verifyTotp}',
        data: {'code': code},
      );
      return _token(res);
    } catch (e) {
      throw ErrorHandler.handle(e);
    }
  }

  Future<UserModel> getMe() async {
    try {
      final res = await _dio.get('$_authBase${ApiConstants.getSession}');
      final data = res.data as Map<String, dynamic>;
      return UserModel.fromJson(data['user'] as Map<String, dynamic>);
    } catch (e) {
      throw ErrorHandler.handle(e);
    }
  }

  Future<void> signOut() async {
    try {
      await _dio.post('$_authBase${ApiConstants.signOut}');
    } catch (_) {
      // best effort — local token is cleared regardless
    }
  }

  String _token(Response res) {
    final header = res.headers.value('set-auth-token');
    if (header != null && header.isNotEmpty) return header;
    final body = res.data;
    if (body is Map && body['token'] is String) return body['token'] as String;
    return '';
  }
}
