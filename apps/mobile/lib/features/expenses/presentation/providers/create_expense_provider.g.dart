// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'create_expense_provider.dart';

// **************************************************************************
// RiverpodGenerator
// **************************************************************************

// GENERATED CODE - DO NOT MODIFY BY HAND
// ignore_for_file: type=lint, type=warning

@ProviderFor(DeleteExpense)
final deleteExpenseProvider = DeleteExpenseProvider._();

final class DeleteExpenseProvider
    extends $NotifierProvider<DeleteExpense, AsyncValue<void>> {
  DeleteExpenseProvider._()
    : super(
        from: null,
        argument: null,
        retry: null,
        name: r'deleteExpenseProvider',
        isAutoDispose: true,
        dependencies: null,
        $allTransitiveDependencies: null,
      );

  @override
  String debugGetCreateSourceHash() => _$deleteExpenseHash();

  @$internal
  @override
  DeleteExpense create() => DeleteExpense();

  /// {@macro riverpod.override_with_value}
  Override overrideWithValue(AsyncValue<void> value) {
    return $ProviderOverride(
      origin: this,
      providerOverride: $SyncValueProvider<AsyncValue<void>>(value),
    );
  }
}

String _$deleteExpenseHash() => r'837ec0910fdb2a1e058f461fc5664023e4613043';

abstract class _$DeleteExpense extends $Notifier<AsyncValue<void>> {
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

@ProviderFor(CreateExpense)
final createExpenseProvider = CreateExpenseProvider._();

final class CreateExpenseProvider
    extends $NotifierProvider<CreateExpense, AsyncValue<String?>> {
  CreateExpenseProvider._()
    : super(
        from: null,
        argument: null,
        retry: null,
        name: r'createExpenseProvider',
        isAutoDispose: true,
        dependencies: null,
        $allTransitiveDependencies: null,
      );

  @override
  String debugGetCreateSourceHash() => _$createExpenseHash();

  @$internal
  @override
  CreateExpense create() => CreateExpense();

  /// {@macro riverpod.override_with_value}
  Override overrideWithValue(AsyncValue<String?> value) {
    return $ProviderOverride(
      origin: this,
      providerOverride: $SyncValueProvider<AsyncValue<String?>>(value),
    );
  }
}

String _$createExpenseHash() => r'fc43986a2b4ab1d8b7221dc1915b1aae83bdd7a7';

abstract class _$CreateExpense extends $Notifier<AsyncValue<String?>> {
  AsyncValue<String?> build();
  @$mustCallSuper
  @override
  void runBuild() {
    final ref = this.ref as $Ref<AsyncValue<String?>, AsyncValue<String?>>;
    final element =
        ref.element
            as $ClassProviderElement<
              AnyNotifier<AsyncValue<String?>, AsyncValue<String?>>,
              AsyncValue<String?>,
              Object?,
              Object?
            >;
    element.handleCreate(ref, build);
  }
}
