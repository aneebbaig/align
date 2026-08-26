// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'router_notifier.dart';

// **************************************************************************
// RiverpodGenerator
// **************************************************************************

// GENERATED CODE - DO NOT MODIFY BY HAND
// ignore_for_file: type=lint, type=warning
/// Bridges Riverpod auth state → GoRouter [refreshListenable].
/// GoRouter calls redirect every time this notifier fires.

@ProviderFor(RouterNotifier)
final routerProvider = RouterNotifierProvider._();

/// Bridges Riverpod auth state → GoRouter [refreshListenable].
/// GoRouter calls redirect every time this notifier fires.
final class RouterNotifierProvider
    extends $AsyncNotifierProvider<RouterNotifier, bool> {
  /// Bridges Riverpod auth state → GoRouter [refreshListenable].
  /// GoRouter calls redirect every time this notifier fires.
  RouterNotifierProvider._()
    : super(
        from: null,
        argument: null,
        retry: null,
        name: r'routerProvider',
        isAutoDispose: false,
        dependencies: null,
        $allTransitiveDependencies: null,
      );

  @override
  String debugGetCreateSourceHash() => _$routerNotifierHash();

  @$internal
  @override
  RouterNotifier create() => RouterNotifier();
}

String _$routerNotifierHash() => r'b55130c3724317a8a46fd1c82bfac55cca279c69';

/// Bridges Riverpod auth state → GoRouter [refreshListenable].
/// GoRouter calls redirect every time this notifier fires.

abstract class _$RouterNotifier extends $AsyncNotifier<bool> {
  FutureOr<bool> build();
  @$mustCallSuper
  @override
  void runBuild() {
    final ref = this.ref as $Ref<AsyncValue<bool>, bool>;
    final element =
        ref.element
            as $ClassProviderElement<
              AnyNotifier<AsyncValue<bool>, bool>,
              AsyncValue<bool>,
              Object?,
              Object?
            >;
    element.handleCreate(ref, build);
  }
}
