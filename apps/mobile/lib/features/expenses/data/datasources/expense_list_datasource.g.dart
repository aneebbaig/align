// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'expense_list_datasource.dart';

// **************************************************************************
// RiverpodGenerator
// **************************************************************************

// GENERATED CODE - DO NOT MODIFY BY HAND
// ignore_for_file: type=lint, type=warning

@ProviderFor(expenseListDatasource)
final expenseListDatasourceProvider = ExpenseListDatasourceProvider._();

final class ExpenseListDatasourceProvider
    extends
        $FunctionalProvider<
          ExpenseListDatasource,
          ExpenseListDatasource,
          ExpenseListDatasource
        >
    with $Provider<ExpenseListDatasource> {
  ExpenseListDatasourceProvider._()
    : super(
        from: null,
        argument: null,
        retry: null,
        name: r'expenseListDatasourceProvider',
        isAutoDispose: true,
        dependencies: null,
        $allTransitiveDependencies: null,
      );

  @override
  String debugGetCreateSourceHash() => _$expenseListDatasourceHash();

  @$internal
  @override
  $ProviderElement<ExpenseListDatasource> $createElement(
    $ProviderPointer pointer,
  ) => $ProviderElement(pointer);

  @override
  ExpenseListDatasource create(Ref ref) {
    return expenseListDatasource(ref);
  }

  /// {@macro riverpod.override_with_value}
  Override overrideWithValue(ExpenseListDatasource value) {
    return $ProviderOverride(
      origin: this,
      providerOverride: $SyncValueProvider<ExpenseListDatasource>(value),
    );
  }
}

String _$expenseListDatasourceHash() =>
    r'a59169c349032fa2dbcfc54a9a8fd020d3e2b8c4';
