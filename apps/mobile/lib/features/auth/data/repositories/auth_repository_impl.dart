import 'package:riverpod_annotation/riverpod_annotation.dart';

import '../../../../core/errors/app_exception.dart';
import '../../../../core/services/storage_service.dart';
import '../../domain/entities/user_entity.dart';
import '../../domain/repositories/auth_repository.dart';
import '../datasources/auth_remote_datasource.dart';
import '../models/user_model.dart';

part 'auth_repository_impl.g.dart';

@Riverpod(keepAlive: true)
AuthRepository authRepository(Ref ref) => AuthRepositoryImpl(
      datasource: ref.watch(authRemoteDatasourceProvider),
      storage: ref.watch(storageServiceProvider),
    );

class AuthRepositoryImpl implements AuthRepository {
  const AuthRepositoryImpl({
    required AuthRemoteDatasource datasource,
    required StorageService storage,
  })  : _datasource = datasource,
        _storage = storage;

  final AuthRemoteDatasource _datasource;
  final StorageService _storage;

  @override
  Future<UserEntity> login({
    required String email,
    required String password,
  }) async {
    final r = await _datasource.signIn(email: email, password: password);
    // Store the token (partial when 2FA is pending, so the verify call carries it).
    await _storage.saveToken(r.token);
    if (r.totpRequired) throw const TotpRequiredException();
    return r.user!.toEntity();
  }

  @override
  Future<UserEntity> verifyTotp(String code) async {
    final token = await _datasource.verifyTotp(code);
    await _storage.saveToken(token);
    final user = await _datasource.getMe();
    return user.toEntity();
  }

  @override
  Future<UserEntity> getMe() async {
    final model = await _datasource.getMe();
    return model.toEntity();
  }

  @override
  Future<void> logout() async {
    await _datasource.signOut();
    await _storage.clearToken();
  }
}
