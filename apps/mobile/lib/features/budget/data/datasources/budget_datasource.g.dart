// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'budget_datasource.dart';

// **************************************************************************
// RiverpodGenerator
// **************************************************************************

// GENERATED CODE - DO NOT MODIFY BY HAND
// ignore_for_file: type=lint, type=warning

@ProviderFor(budgetDatasource)
final budgetDatasourceProvider = BudgetDatasourceProvider._();

final class BudgetDatasourceProvider
    extends
        $FunctionalProvider<
          BudgetDatasource,
          BudgetDatasource,
          BudgetDatasource
        >
    with $Provider<BudgetDatasource> {
  BudgetDatasourceProvider._()
    : super(
        from: null,
        argument: null,
        retry: null,
        name: r'budgetDatasourceProvider',
        isAutoDispose: true,
        dependencies: null,
        $allTransitiveDependencies: null,
      );

  @override
  String debugGetCreateSourceHash() => _$budgetDatasourceHash();

  @$internal
  @override
  $ProviderElement<BudgetDatasource> $createElement($ProviderPointer pointer) =>
      $ProviderElement(pointer);

  @override
  BudgetDatasource create(Ref ref) {
    return budgetDatasource(ref);
  }

  /// {@macro riverpod.override_with_value}
  Override overrideWithValue(BudgetDatasource value) {
    return $ProviderOverride(
      origin: this,
      providerOverride: $SyncValueProvider<BudgetDatasource>(value),
    );
  }
}

String _$budgetDatasourceHash() => r'7d6db62def35d6d9532dbd04fab6aad9fa6d13c8';
