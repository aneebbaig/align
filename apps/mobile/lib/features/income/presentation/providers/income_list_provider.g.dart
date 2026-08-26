// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'income_list_provider.dart';

// **************************************************************************
// RiverpodGenerator
// **************************************************************************

// GENERATED CODE - DO NOT MODIFY BY HAND
// ignore_for_file: type=lint, type=warning

@ProviderFor(CreateIncome)
final createIncomeProvider = CreateIncomeProvider._();

final class CreateIncomeProvider
    extends $NotifierProvider<CreateIncome, AsyncValue<void>> {
  CreateIncomeProvider._()
    : super(
        from: null,
        argument: null,
        retry: null,
        name: r'createIncomeProvider',
        isAutoDispose: true,
        dependencies: null,
        $allTransitiveDependencies: null,
      );

  @override
  String debugGetCreateSourceHash() => _$createIncomeHash();

  @$internal
  @override
  CreateIncome create() => CreateIncome();

  /// {@macro riverpod.override_with_value}
  Override overrideWithValue(AsyncValue<void> value) {
    return $ProviderOverride(
      origin: this,
      providerOverride: $SyncValueProvider<AsyncValue<void>>(value),
    );
  }
}

String _$createIncomeHash() => r'fe92cd0d232e6f6a1416b1161c83edb477873364';

abstract class _$CreateIncome extends $Notifier<AsyncValue<void>> {
  AsyncValue<void> build();
  @$mustCallSuper
  @override
  void runBuild() {
    final ref = this.ref as $Ref<AsyncValue<void>, AsyncValue<void>>;
    final element =
        ref.element
            as $ClassProviderElement<
              AnyNotifier<AsyncValue<void>, AsyncValue<void>>,
              AsyncValue<void>,
              Object?,
              Object?
            >;
    element.handleCreate(ref, build);
  }
}

@ProviderFor(DeleteIncome)
final deleteIncomeProvider = DeleteIncomeProvider._();

final class DeleteIncomeProvider
    extends $NotifierProvider<DeleteIncome, AsyncValue<void>> {
  DeleteIncomeProvider._()
    : super(
        from: null,
        argument: null,
        retry: null,
        name: r'deleteIncomeProvider',
        isAutoDispose: true,
        dependencies: null,
        $allTransitiveDependencies: null,
      );

  @override
  String debugGetCreateSourceHash() => _$deleteIncomeHash();

  @$internal
  @override
  DeleteIncome create() => DeleteIncome();

  /// {@macro riverpod.override_with_value}
  Override overrideWithValue(AsyncValue<void> value) {
    return $ProviderOverride(
      origin: this,
      providerOverride: $SyncValueProvider<AsyncValue<void>>(value),
    );
  }
}

String _$deleteIncomeHash() => r'd23030933a8f174d75567dc3729398e175ff9dca';

abstract class _$DeleteIncome extends $Notifier<AsyncValue<void>> {
  AsyncValue<void> build();
  @$mustCallSuper
  @override
  void runBuild() {
    final ref = this.ref as $Ref<AsyncValue<void>, AsyncValue<void>>;
    final element =
        ref.element
            as $ClassProviderElement<
              AnyNotifier<AsyncValue<void>, AsyncValue<void>>,
              AsyncValue<void>,
              Object?,
              Object?
            >;
    element.handleCreate(ref, build);
  }
}

@ProviderFor(IncomeList)
final incomeListProvider = IncomeListProvider._();

final class IncomeListProvider
    extends $AsyncNotifierProvider<IncomeList, ExpensesListState> {
  IncomeListProvider._()
    : super(
        from: null,
        argument: null,
        retry: null,
        name: r'incomeListProvider',
        isAutoDispose: true,
        dependencies: null,
        $allTransitiveDependencies: null,
      );

  @override
  String debugGetCreateSourceHash() => _$incomeListHash();

  @$internal
  @override
  IncomeList create() => IncomeList();
}

String _$incomeListHash() => r'38993ae13ce46da44c8ef1c464554c3f1463cdb0';

abstract class _$IncomeList extends $AsyncNotifier<ExpensesListState> {
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
