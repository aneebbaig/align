// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'investments_provider.dart';

// **************************************************************************
// RiverpodGenerator
// **************************************************************************

// GENERATED CODE - DO NOT MODIFY BY HAND
// ignore_for_file: type=lint, type=warning

@ProviderFor(investments)
final investmentsProvider = InvestmentsProvider._();

final class InvestmentsProvider
    extends
        $FunctionalProvider<
          AsyncValue<InvestmentsData>,
          InvestmentsData,
          FutureOr<InvestmentsData>
        >
    with $FutureModifier<InvestmentsData>, $FutureProvider<InvestmentsData> {
  InvestmentsProvider._()
    : super(
        from: null,
        argument: null,
        retry: null,
        name: r'investmentsProvider',
        isAutoDispose: true,
        dependencies: null,
        $allTransitiveDependencies: null,
      );

  @override
  String debugGetCreateSourceHash() => _$investmentsHash();

  @$internal
  @override
  $FutureProviderElement<InvestmentsData> $createElement(
    $ProviderPointer pointer,
  ) => $FutureProviderElement(pointer);

  @override
  FutureOr<InvestmentsData> create(Ref ref) {
    return investments(ref);
  }
}

String _$investmentsHash() => r'834871c2d7079f27b2ac77fd63193511856520dc';
