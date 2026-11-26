// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'wedding_datasource.dart';

// **************************************************************************
// RiverpodGenerator
// **************************************************************************

// GENERATED CODE - DO NOT MODIFY BY HAND
// ignore_for_file: type=lint, type=warning

@ProviderFor(weddingDatasource)
final weddingDatasourceProvider = WeddingDatasourceProvider._();

final class WeddingDatasourceProvider
    extends
        $FunctionalProvider<
          WeddingDatasource,
          WeddingDatasource,
          WeddingDatasource
        >
    with $Provider<WeddingDatasource> {
  WeddingDatasourceProvider._()
    : super(
        from: null,
        argument: null,
        retry: null,
        name: r'weddingDatasourceProvider',
        isAutoDispose: true,
        dependencies: null,
        $allTransitiveDependencies: null,
      );

  @override
  String debugGetCreateSourceHash() => _$weddingDatasourceHash();

  @$internal
  @override
  $ProviderElement<WeddingDatasource> $createElement(
    $ProviderPointer pointer,
  ) => $ProviderElement(pointer);

  @override
  WeddingDatasource create(Ref ref) {
    return weddingDatasource(ref);
  }

  /// {@macro riverpod.override_with_value}
  Override overrideWithValue(WeddingDatasource value) {
    return $ProviderOverride(
      origin: this,
      providerOverride: $SyncValueProvider<WeddingDatasource>(value),
    );
  }
}

String _$weddingDatasourceHash() => r'a5348d15186e226a86de93a4c85b0edc25fe63f3';
