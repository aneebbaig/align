import 'package:flutter/foundation.dart';
import 'package:riverpod_annotation/riverpod_annotation.dart';

import 'auth_provider.dart';

part 'router_notifier.g.dart';

/// Bridges Riverpod auth state → GoRouter [refreshListenable].
/// GoRouter calls redirect every time this notifier fires.
@Riverpod(keepAlive: true)
class RouterNotifier extends _$RouterNotifier implements Listenable {
  VoidCallback? _routerListener;

  @override
  Future<bool> build() async {
    final user = await ref.watch(authProvider.future);
    // Defer notification so Riverpod commits state before GoRouter reads it
    Future.microtask(() => _routerListener?.call());
    return user != null;
  }

  @override
  void addListener(VoidCallback listener) => _routerListener = listener;

  @override
  void removeListener(VoidCallback listener) {
    if (_routerListener == listener) _routerListener = null;
  }
}
