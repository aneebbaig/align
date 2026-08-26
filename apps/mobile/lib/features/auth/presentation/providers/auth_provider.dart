import 'package:riverpod_annotation/riverpod_annotation.dart';

import '../../data/repositories/auth_repository_impl.dart';
import '../../domain/entities/user_entity.dart';

part 'auth_provider.g.dart';

@Riverpod(keepAlive: true)
class AuthNotifier extends _$AuthNotifier {
  @override
  Future<UserEntity?> build() async {
    final repo = ref.watch(authRepositoryProvider);
    try {
      return await repo.getMe();
    } catch (_) {
      // No valid session - return null, router redirects to login
      return null;
    }
  }

  /// Throws TotpRequiredException when 2FA is on; the form then calls [verifyTotp].
  Future<void> login({required String email, required String password}) async {
    state = const AsyncLoading();
    try {
      final user = await ref.read(authRepositoryProvider).login(email: email, password: password);
      state = AsyncData(user);
    } catch (e, st) {
      state = AsyncError(e, st);
      rethrow; // let LoginForm handle the 2FA prompt / error toast
    }
  }

  Future<void> verifyTotp(String code) async {
    state = const AsyncLoading();
    try {
      final user = await ref.read(authRepositoryProvider).verifyTotp(code);
      state = AsyncData(user);
    } catch (e, st) {
      state = AsyncError(e, st);
      rethrow;
    }
  }

  Future<void> logout() async {
    await ref.read(authRepositoryProvider).logout();
    state = const AsyncData(null);
  }
}
