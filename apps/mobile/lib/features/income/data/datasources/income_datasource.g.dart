// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'income_datasource.dart';

// **************************************************************************
// RiverpodGenerator
// **************************************************************************

// GENERATED CODE - DO NOT MODIFY BY HAND
// ignore_for_file: type=lint, type=warning

@ProviderFor(incomeDatasource)
final incomeDatasourceProvider = IncomeDatasourceProvider._();

final class IncomeDatasourceProvider
    extends
        $FunctionalProvider<
          IncomeDatasource,
          IncomeDatasource,
          IncomeDatasource
        >
    with $Provider<IncomeDatasource> {
  IncomeDatasourceProvider._()
    : super(
        from: null,
        argument: null,
        retry: null,
        name: r'incomeDatasourceProvider',
        isAutoDispose: true,
        dependencies: null,
        $allTransitiveDependencies: null,
      );

  @override
  String debugGetCreateSourceHash() => _$incomeDatasourceHash();

  @$internal
  @override
  $ProviderElement<IncomeDatasource> $createElement($ProviderPointer pointer) =>
      $ProviderElement(pointer);

  @override
  IncomeDatasource create(Ref ref) {
    return incomeDatasource(ref);
  }

  /// {@macro riverpod.override_with_value}
  Override overrideWithValue(IncomeDatasource value) {
    return $ProviderOverride(
      origin: this,
      providerOverride: $SyncValueProvider<IncomeDatasource>(value),
    );
  }
}

String _$incomeDatasourceHash() => r'141c9ec0de7d5d4888fcd2d97990f304c3bf7a40';
