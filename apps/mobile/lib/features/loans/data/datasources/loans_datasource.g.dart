// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'loans_datasource.dart';

// **************************************************************************
// RiverpodGenerator
// **************************************************************************

// GENERATED CODE - DO NOT MODIFY BY HAND
// ignore_for_file: type=lint, type=warning

@ProviderFor(loansDatasource)
final loansDatasourceProvider = LoansDatasourceProvider._();

final class LoansDatasourceProvider
    extends
        $FunctionalProvider<LoansDatasource, LoansDatasource, LoansDatasource>
    with $Provider<LoansDatasource> {
  LoansDatasourceProvider._()
    : super(
        from: null,
        argument: null,
        retry: null,
        name: r'loansDatasourceProvider',
        isAutoDispose: true,
        dependencies: null,
        $allTransitiveDependencies: null,
      );

  @override
  String debugGetCreateSourceHash() => _$loansDatasourceHash();

  @$internal
  @override
  $ProviderElement<LoansDatasource> $createElement($ProviderPointer pointer) =>
      $ProviderElement(pointer);

  @override
  LoansDatasource create(Ref ref) {
    return loansDatasource(ref);
  }

  /// {@macro riverpod.override_with_value}
  Override overrideWithValue(LoansDatasource value) {
    return $ProviderOverride(
      origin: this,
      providerOverride: $SyncValueProvider<LoansDatasource>(value),
    );
  }
}

String _$loansDatasourceHash() => r'4c78876d5290c24ca77816f2e05ac04fb0932419';
