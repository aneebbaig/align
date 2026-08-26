import '../entities/user_entity.dart';

abstract interface class AuthRepository {
  /// Signs in with a password. Throws [TotpRequiredException] when the account
  /// has 2FA enabled — call [verifyTotp] next with the code.
  Future<UserEntity> login({required String email, required String password});

  /// Completes 2FA after [login] threw TotpRequiredException.
  Future<UserEntity> verifyTotp(String code);

  Future<UserEntity> getMe();
  Future<void> logout();
}
