// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'cashflow_summary_provider.dart';

// **************************************************************************
// RiverpodGenerator
// **************************************************************************

// GENERATED CODE - DO NOT MODIFY BY HAND
// ignore_for_file: type=lint, type=warning

@ProviderFor(cashflowSummary)
final cashflowSummaryProvider = CashflowSummaryProvider._();

final class CashflowSummaryProvider
    extends
        $FunctionalProvider<
          AsyncValue<CashflowSummaryEntity>,
          CashflowSummaryEntity,
          FutureOr<CashflowSummaryEntity>
        >
    with
        $FutureModifier<CashflowSummaryEntity>,
        $FutureProvider<CashflowSummaryEntity> {
  CashflowSummaryProvider._()
    : super(
        from: null,
        argument: null,
        retry: null,
        name: r'cashflowSummaryProvider',
        isAutoDispose: true,
        dependencies: null,
        $allTransitiveDependencies: null,
      );

  @override
  String debugGetCreateSourceHash() => _$cashflowSummaryHash();

  @$internal
  @override
  $FutureProviderElement<CashflowSummaryEntity> $createElement(
    $ProviderPointer pointer,
  ) => $FutureProviderElement(pointer);

  @override
  FutureOr<CashflowSummaryEntity> create(Ref ref) {
    return cashflowSummary(ref);
  }
}

String _$cashflowSummaryHash() => r'b7673a7ae60f07900055554a74d30b292927870a';
