import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:riverpod_annotation/riverpod_annotation.dart';

import '../constants/storage_keys.dart';

part 'storage_service.g.dart';

@Riverpod(keepAlive: true)
StorageService storageService(Ref ref) => StorageService();

/// better-auth uses a single bearer session token (no refresh token). It is
/// stored under the existing key; the legacy refresh key is cleared on logout.
class StorageService {
  StorageService()
      : _storage = const FlutterSecureStorage(
          aOptions: AndroidOptions(),
        );

  final FlutterSecureStorage _storage;

  Future<void> saveToken(String token) =>
      _storage.write(key: StorageKeys.accessToken, value: token);

  Future<String?> getToken() => _storage.read(key: StorageKeys.accessToken);

  Future<void> clearToken() async {
    await Future.wait([
      _storage.delete(key: StorageKeys.accessToken),
      _storage.delete(key: StorageKeys.refreshToken),
    ]);
  }

  Future<void> saveServerUrl(String origin) =>
      _storage.write(key: StorageKeys.serverUrl, value: origin);

  Future<String?> getServerUrl() => _storage.read(key: StorageKeys.serverUrl);

  Future<void> clearServerUrl() => _storage.delete(key: StorageKeys.serverUrl);

  Future<bool> hasToken() async {
    final token = await getToken();
    return token != null && token.isNotEmpty;
  }
}
