// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'loans_provider.dart';

// **************************************************************************
// RiverpodGenerator
// **************************************************************************

// GENERATED CODE - DO NOT MODIFY BY HAND
// ignore_for_file: type=lint, type=warning

@ProviderFor(loans)
final loansProvider = LoansProvider._();

final class LoansProvider
    extends
        $FunctionalProvider<
          AsyncValue<List<LoanEntity>>,
          List<LoanEntity>,
          FutureOr<List<LoanEntity>>
        >
    with $FutureModifier<List<LoanEntity>>, $FutureProvider<List<LoanEntity>> {
  LoansProvider._()
    : super(
        from: null,
        argument: null,
        retry: null,
        name: r'loansProvider',
        isAutoDispose: true,
        dependencies: null,
        $allTransitiveDependencies: null,
      );

  @override
  String debugGetCreateSourceHash() => _$loansHash();

  @$internal
  @override
  $FutureProviderElement<List<LoanEntity>> $createElement(
    $ProviderPointer pointer,
  ) => $FutureProviderElement(pointer);

  @override
  FutureOr<List<LoanEntity>> create(Ref ref) {
    return loans(ref);
  }
}

String _$loansHash() => r'3fcca005060695c80755bfb4805407e093c011ae';

@ProviderFor(CreateLoan)
final createLoanProvider = CreateLoanProvider._();

final class CreateLoanProvider
    extends $NotifierProvider<CreateLoan, AsyncValue<void>> {
  CreateLoanProvider._()
    : super(
        from: null,
        argument: null,
        retry: null,
        name: r'createLoanProvider',
        isAutoDispose: true,
        dependencies: null,
        $allTransitiveDependencies: null,
      );

  @override
  String debugGetCreateSourceHash() => _$createLoanHash();

  @$internal
  @override
  CreateLoan create() => CreateLoan();

  /// {@macro riverpod.override_with_value}
  Override overrideWithValue(AsyncValue<void> value) {
    return $ProviderOverride(
      origin: this,
      providerOverride: $SyncValueProvider<AsyncValue<void>>(value),
    );
  }
}

String _$createLoanHash() => r'9ebc8dae3332ba11b913bbccf28d0b370fc49a43';

abstract class _$CreateLoan extends $Notifier<AsyncValue<void>> {
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

@ProviderFor(RecordPayment)
final recordPaymentProvider = RecordPaymentProvider._();

final class RecordPaymentProvider
    extends $NotifierProvider<RecordPayment, AsyncValue<void>> {
  RecordPaymentProvider._()
    : super(
        from: null,
        argument: null,
        retry: null,
        name: r'recordPaymentProvider',
        isAutoDispose: true,
        dependencies: null,
        $allTransitiveDependencies: null,
      );

  @override
  String debugGetCreateSourceHash() => _$recordPaymentHash();

  @$internal
  @override
  RecordPayment create() => RecordPayment();

  /// {@macro riverpod.override_with_value}
  Override overrideWithValue(AsyncValue<void> value) {
    return $ProviderOverride(
      origin: this,
      providerOverride: $SyncValueProvider<AsyncValue<void>>(value),
    );
  }
}

String _$recordPaymentHash() => r'7798492132df321ce24bf889dabc0400d36337e6';

abstract class _$RecordPayment extends $Notifier<AsyncValue<void>> {
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
