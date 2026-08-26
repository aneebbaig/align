// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'expense_remote_datasource.dart';

// **************************************************************************
// RiverpodGenerator
// **************************************************************************

// GENERATED CODE - DO NOT MODIFY BY HAND
// ignore_for_file: type=lint, type=warning

@ProviderFor(expenseRemoteDatasource)
final expenseRemoteDatasourceProvider = ExpenseRemoteDatasourceProvider._();

final class ExpenseRemoteDatasourceProvider
    extends
        $FunctionalProvider<
          ExpenseRemoteDatasource,
          ExpenseRemoteDatasource,
          ExpenseRemoteDatasource
        >
    with $Provider<ExpenseRemoteDatasource> {
  ExpenseRemoteDatasourceProvider._()
    : super(
        from: null,
        argument: null,
        retry: null,
        name: r'expenseRemoteDatasourceProvider',
        isAutoDispose: true,
        dependencies: null,
        $allTransitiveDependencies: null,
      );

  @override
  String debugGetCreateSourceHash() => _$expenseRemoteDatasourceHash();

  @$internal
  @override
  $ProviderElement<ExpenseRemoteDatasource> $createElement(
    $ProviderPointer pointer,
  ) => $ProviderElement(pointer);

  @override
  ExpenseRemoteDatasource create(Ref ref) {
    return expenseRemoteDatasource(ref);
  }

  /// {@macro riverpod.override_with_value}
  Override overrideWithValue(ExpenseRemoteDatasource value) {
    return $ProviderOverride(
      origin: this,
      providerOverride: $SyncValueProvider<ExpenseRemoteDatasource>(value),
    );
  }
}

String _$expenseRemoteDatasourceHash() =>
    r'eb8f9278ce1eb9f726cb06b3c114be9fb90a95a2';
