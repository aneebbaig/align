// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'server_probe.dart';

// **************************************************************************
// RiverpodGenerator
// **************************************************************************

// GENERATED CODE - DO NOT MODIFY BY HAND
// ignore_for_file: type=lint, type=warning

@ProviderFor(serverProbe)
final serverProbeProvider = ServerProbeProvider._();

final class ServerProbeProvider
    extends $FunctionalProvider<ServerProbe, ServerProbe, ServerProbe>
    with $Provider<ServerProbe> {
  ServerProbeProvider._()
    : super(
        from: null,
        argument: null,
        retry: null,
        name: r'serverProbeProvider',
        isAutoDispose: false,
        dependencies: null,
        $allTransitiveDependencies: null,
      );

  @override
  String debugGetCreateSourceHash() => _$serverProbeHash();

  @$internal
  @override
  $ProviderElement<ServerProbe> $createElement($ProviderPointer pointer) =>
      $ProviderElement(pointer);

  @override
  ServerProbe create(Ref ref) {
    return serverProbe(ref);
  }

  /// {@macro riverpod.override_with_value}
  Override overrideWithValue(ServerProbe value) {
    return $ProviderOverride(
      origin: this,
      providerOverride: $SyncValueProvider<ServerProbe>(value),
    );
  }
}

String _$serverProbeHash() => r'a84afcce61d5af06af0b1be37f22df9f1d8b6f39';
