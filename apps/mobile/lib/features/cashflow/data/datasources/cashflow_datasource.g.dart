// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'cashflow_datasource.dart';

// **************************************************************************
// RiverpodGenerator
// **************************************************************************

// GENERATED CODE - DO NOT MODIFY BY HAND
// ignore_for_file: type=lint, type=warning

@ProviderFor(cashflowDatasource)
final cashflowDatasourceProvider = CashflowDatasourceProvider._();

final class CashflowDatasourceProvider
    extends
        $FunctionalProvider<
          CashflowDatasource,
          CashflowDatasource,
          CashflowDatasource
        >
    with $Provider<CashflowDatasource> {
  CashflowDatasourceProvider._()
    : super(
        from: null,
        argument: null,
        retry: null,
        name: r'cashflowDatasourceProvider',
        isAutoDispose: true,
        dependencies: null,
        $allTransitiveDependencies: null,
      );

  @override
  String debugGetCreateSourceHash() => _$cashflowDatasourceHash();

  @$internal
  @override
  $ProviderElement<CashflowDatasource> $createElement(
    $ProviderPointer pointer,
  ) => $ProviderElement(pointer);

  @override
  CashflowDatasource create(Ref ref) {
    return cashflowDatasource(ref);
  }

  /// {@macro riverpod.override_with_value}
  Override overrideWithValue(CashflowDatasource value) {
    return $ProviderOverride(
      origin: this,
      providerOverride: $SyncValueProvider<CashflowDatasource>(value),
    );
  }
}

String _$cashflowDatasourceHash() =>
    r'0ad0debbeea23ed5c21ffcddbeb0f417373a22ed';
