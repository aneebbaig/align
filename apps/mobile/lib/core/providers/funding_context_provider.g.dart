// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'funding_context_provider.dart';

// **************************************************************************
// RiverpodGenerator
// **************************************************************************

// GENERATED CODE - DO NOT MODIFY BY HAND
// ignore_for_file: type=lint, type=warning
/// Family provider keyed on the resolved target period - refetches whenever
/// the caller's month/year changes (e.g. the budget-period checkbox toggles
/// or the date field changes), so the income-available figure follows
/// whichever period the transaction will actually be filed under. Pass
/// null/null to let the server default to the user's current open period.

@ProviderFor(fundingContext)
final fundingContextProvider = FundingContextFamily._();

/// Family provider keyed on the resolved target period - refetches whenever
/// the caller's month/year changes (e.g. the budget-period checkbox toggles
/// or the date field changes), so the income-available figure follows
/// whichever period the transaction will actually be filed under. Pass
/// null/null to let the server default to the user's current open period.

final class FundingContextProvider
    extends
        $FunctionalProvider<
          AsyncValue<FundingContextEntity>,
          FundingContextEntity,
          FutureOr<FundingContextEntity>
        >
    with
        $FutureModifier<FundingContextEntity>,
        $FutureProvider<FundingContextEntity> {
  /// Family provider keyed on the resolved target period - refetches whenever
  /// the caller's month/year changes (e.g. the budget-period checkbox toggles
  /// or the date field changes), so the income-available figure follows
  /// whichever period the transaction will actually be filed under. Pass
  /// null/null to let the server default to the user's current open period.
  FundingContextProvider._({
    required FundingContextFamily super.from,
    required (int?, int?) super.argument,
  }) : super(
         retry: null,
         name: r'fundingContextProvider',
         isAutoDispose: true,
         dependencies: null,
         $allTransitiveDependencies: null,
       );

  @override
  String debugGetCreateSourceHash() => _$fundingContextHash();

  @override
  String toString() {
    return r'fundingContextProvider'
        ''
        '$argument';
  }

  @$internal
  @override
  $FutureProviderElement<FundingContextEntity> $createElement(
    $ProviderPointer pointer,
  ) => $FutureProviderElement(pointer);

  @override
  FutureOr<FundingContextEntity> create(Ref ref) {
    final argument = this.argument as (int?, int?);
    return fundingContext(ref, argument.$1, argument.$2);
  }

  @override
  bool operator ==(Object other) {
    return other is FundingContextProvider && other.argument == argument;
  }

  @override
  int get hashCode {
    return argument.hashCode;
  }
}

String _$fundingContextHash() => r'8a7fd1e279d952c91f4693a7b99cb746337e4fd4';

/// Family provider keyed on the resolved target period - refetches whenever
/// the caller's month/year changes (e.g. the budget-period checkbox toggles
/// or the date field changes), so the income-available figure follows
/// whichever period the transaction will actually be filed under. Pass
/// null/null to let the server default to the user's current open period.

final class FundingContextFamily extends $Family
    with
        $FunctionalFamilyOverride<
          FutureOr<FundingContextEntity>,
          (int?, int?)
        > {
  FundingContextFamily._()
    : super(
        retry: null,
        name: r'fundingContextProvider',
        dependencies: null,
        $allTransitiveDependencies: null,
        isAutoDispose: true,
      );

  /// Family provider keyed on the resolved target period - refetches whenever
  /// the caller's month/year changes (e.g. the budget-period checkbox toggles
  /// or the date field changes), so the income-available figure follows
  /// whichever period the transaction will actually be filed under. Pass
  /// null/null to let the server default to the user's current open period.

  FundingContextProvider call(int? month, int? year) =>
      FundingContextProvider._(argument: (month, year), from: this);

  @override
  String toString() => r'fundingContextProvider';
}
