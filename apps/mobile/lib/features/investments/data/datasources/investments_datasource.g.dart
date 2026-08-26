// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'investments_datasource.dart';

// **************************************************************************
// RiverpodGenerator
// **************************************************************************

// GENERATED CODE - DO NOT MODIFY BY HAND
// ignore_for_file: type=lint, type=warning

@ProviderFor(investmentsDatasource)
final investmentsDatasourceProvider = InvestmentsDatasourceProvider._();

final class InvestmentsDatasourceProvider
    extends
        $FunctionalProvider<
          InvestmentsDatasource,
          InvestmentsDatasource,
          InvestmentsDatasource
        >
    with $Provider<InvestmentsDatasource> {
  InvestmentsDatasourceProvider._()
    : super(
        from: null,
        argument: null,
        retry: null,
        name: r'investmentsDatasourceProvider',
        isAutoDispose: true,
        dependencies: null,
        $allTransitiveDependencies: null,
      );

  @override
  String debugGetCreateSourceHash() => _$investmentsDatasourceHash();

  @$internal
  @override
  $ProviderElement<InvestmentsDatasource> $createElement(
    $ProviderPointer pointer,
  ) => $ProviderElement(pointer);

  @override
  InvestmentsDatasource create(Ref ref) {
    return investmentsDatasource(ref);
  }

  /// {@macro riverpod.override_with_value}
  Override overrideWithValue(InvestmentsDatasource value) {
    return $ProviderOverride(
      origin: this,
      providerOverride: $SyncValueProvider<InvestmentsDatasource>(value),
    );
  }
}

String _$investmentsDatasourceHash() =>
    r'b5eb1e94146f1ff3e5c817586919fd2edfa39547';
