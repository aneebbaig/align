// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'expenses_list_provider.dart';

// **************************************************************************
// RiverpodGenerator
// **************************************************************************

// GENERATED CODE - DO NOT MODIFY BY HAND
// ignore_for_file: type=lint, type=warning

@ProviderFor(ExpensesList)
final expensesListProvider = ExpensesListProvider._();

final class ExpensesListProvider
    extends $AsyncNotifierProvider<ExpensesList, ExpensesListState> {
  ExpensesListProvider._()
    : super(
        from: null,
        argument: null,
        retry: null,
        name: r'expensesListProvider',
        isAutoDispose: true,
        dependencies: null,
        $allTransitiveDependencies: null,
      );

  @override
  String debugGetCreateSourceHash() => _$expensesListHash();

  @$internal
  @override
  ExpensesList create() => ExpensesList();
}

String _$expensesListHash() => r'32059d29631d857d9a7e0bd392040dd7b31aa0fc';

abstract class _$ExpensesList extends $AsyncNotifier<ExpensesListState> {
  FutureOr<ExpensesListState> build();
  @$mustCallSuper
  @override
  void runBuild() {
    final ref =
        this.ref as $Ref<AsyncValue<ExpensesListState>, ExpensesListState>;
    final element =
        ref.element
            as $ClassProviderElement<
              AnyNotifier<AsyncValue<ExpensesListState>, ExpensesListState>,
              AsyncValue<ExpensesListState>,
              Object?,
              Object?
            >;
    element.handleCreate(ref, build);
  }
}
