// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'funding_context_datasource.dart';

// **************************************************************************
// RiverpodGenerator
// **************************************************************************

// GENERATED CODE - DO NOT MODIFY BY HAND
// ignore_for_file: type=lint, type=warning

@ProviderFor(fundingContextDatasource)
final fundingContextDatasourceProvider = FundingContextDatasourceProvider._();

final class FundingContextDatasourceProvider
    extends
        $FunctionalProvider<
          FundingContextDatasource,
          FundingContextDatasource,
          FundingContextDatasource
        >
    with $Provider<FundingContextDatasource> {
  FundingContextDatasourceProvider._()
    : super(
        from: null,
        argument: null,
        retry: null,
        name: r'fundingContextDatasourceProvider',
        isAutoDispose: true,
        dependencies: null,
        $allTransitiveDependencies: null,
      );

  @override
  String debugGetCreateSourceHash() => _$fundingContextDatasourceHash();

  @$internal
  @override
  $ProviderElement<FundingContextDatasource> $createElement(
    $ProviderPointer pointer,
  ) => $ProviderElement(pointer);

  @override
  FundingContextDatasource create(Ref ref) {
    return fundingContextDatasource(ref);
  }

  /// {@macro riverpod.override_with_value}
  Override overrideWithValue(FundingContextDatasource value) {
    return $ProviderOverride(
      origin: this,
      providerOverride: $SyncValueProvider<FundingContextDatasource>(value),
    );
  }
}

String _$fundingContextDatasourceHash() =>
    r'8c9dc53002a982622b41fe5465441c0d7fe4d31c';
