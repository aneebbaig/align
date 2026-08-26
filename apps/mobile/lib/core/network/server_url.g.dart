// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'server_url.dart';

// **************************************************************************
// RiverpodGenerator
// **************************************************************************

// GENERATED CODE - DO NOT MODIFY BY HAND
// ignore_for_file: type=lint, type=warning
/// Seeded in main() from storage before the first frame, so the router knows
/// on its very first redirect whether a server is configured.

@ProviderFor(initialServerUrl)
final initialServerUrlProvider = InitialServerUrlProvider._();

/// Seeded in main() from storage before the first frame, so the router knows
/// on its very first redirect whether a server is configured.

final class InitialServerUrlProvider
    extends $FunctionalProvider<String?, String?, String?>
    with $Provider<String?> {
  /// Seeded in main() from storage before the first frame, so the router knows
  /// on its very first redirect whether a server is configured.
  InitialServerUrlProvider._()
    : super(
        from: null,
        argument: null,
        retry: null,
        name: r'initialServerUrlProvider',
        isAutoDispose: false,
        dependencies: null,
        $allTransitiveDependencies: null,
      );

  @override
  String debugGetCreateSourceHash() => _$initialServerUrlHash();

  @$internal
  @override
  $ProviderElement<String?> $createElement($ProviderPointer pointer) =>
      $ProviderElement(pointer);

  @override
  String? create(Ref ref) {
    return initialServerUrl(ref);
  }

  /// {@macro riverpod.override_with_value}
  Override overrideWithValue(String? value) {
    return $ProviderOverride(
      origin: this,
      providerOverride: $SyncValueProvider<String?>(value),
    );
  }
}

String _$initialServerUrlHash() => r'83d0a93cd31419b24e55cc25e93bb243ccc75bdf';

/// The configured server origin, or null when the app has never been set up.

@ProviderFor(ServerUrl)
final serverUrlProvider = ServerUrlProvider._();

/// The configured server origin, or null when the app has never been set up.
final class ServerUrlProvider extends $NotifierProvider<ServerUrl, String?> {
  /// The configured server origin, or null when the app has never been set up.
  ServerUrlProvider._()
    : super(
        from: null,
        argument: null,
        retry: null,
        name: r'serverUrlProvider',
        isAutoDispose: false,
        dependencies: null,
        $allTransitiveDependencies: null,
      );

  @override
  String debugGetCreateSourceHash() => _$serverUrlHash();

  @$internal
  @override
  ServerUrl create() => ServerUrl();

  /// {@macro riverpod.override_with_value}
  Override overrideWithValue(String? value) {
    return $ProviderOverride(
      origin: this,
      providerOverride: $SyncValueProvider<String?>(value),
    );
  }
}

String _$serverUrlHash() => r'365c4e27d9d3ab5d48c23cf3c2d08782e99fb413';

/// The configured server origin, or null when the app has never been set up.

abstract class _$ServerUrl extends $Notifier<String?> {
  String? build();
  @$mustCallSuper
  @override
  void runBuild() {
    final ref = this.ref as $Ref<String?, String?>;
    final element =
        ref.element
            as $ClassProviderElement<
              AnyNotifier<String?, String?>,
              String?,
              Object?,
              Object?
            >;
    element.handleCreate(ref, build);
  }
}
