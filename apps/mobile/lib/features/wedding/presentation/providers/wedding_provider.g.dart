// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'wedding_provider.dart';

// **************************************************************************
// RiverpodGenerator
// **************************************************************************

// GENERATED CODE - DO NOT MODIFY BY HAND
// ignore_for_file: type=lint, type=warning

@ProviderFor(weddingList)
final weddingListProvider = WeddingListProvider._();

final class WeddingListProvider
    extends
        $FunctionalProvider<
          AsyncValue<List<WeddingSummary>>,
          List<WeddingSummary>,
          FutureOr<List<WeddingSummary>>
        >
    with
        $FutureModifier<List<WeddingSummary>>,
        $FutureProvider<List<WeddingSummary>> {
  WeddingListProvider._()
    : super(
        from: null,
        argument: null,
        retry: null,
        name: r'weddingListProvider',
        isAutoDispose: true,
        dependencies: null,
        $allTransitiveDependencies: null,
      );

  @override
  String debugGetCreateSourceHash() => _$weddingListHash();

  @$internal
  @override
  $FutureProviderElement<List<WeddingSummary>> $createElement(
    $ProviderPointer pointer,
  ) => $FutureProviderElement(pointer);

  @override
  FutureOr<List<WeddingSummary>> create(Ref ref) {
    return weddingList(ref);
  }
}

String _$weddingListHash() => r'88b2134c6dc94859fced6a3663b79d3ec0591cac';

@ProviderFor(weddingPlan)
final weddingPlanProvider = WeddingPlanFamily._();

final class WeddingPlanProvider
    extends
        $FunctionalProvider<
          AsyncValue<WeddingPlan>,
          WeddingPlan,
          FutureOr<WeddingPlan>
        >
    with $FutureModifier<WeddingPlan>, $FutureProvider<WeddingPlan> {
  WeddingPlanProvider._({
    required WeddingPlanFamily super.from,
    required String super.argument,
  }) : super(
         retry: null,
         name: r'weddingPlanProvider',
         isAutoDispose: true,
         dependencies: null,
         $allTransitiveDependencies: null,
       );

  @override
  String debugGetCreateSourceHash() => _$weddingPlanHash();

  @override
  String toString() {
    return r'weddingPlanProvider'
        ''
        '($argument)';
  }

  @$internal
  @override
  $FutureProviderElement<WeddingPlan> $createElement(
    $ProviderPointer pointer,
  ) => $FutureProviderElement(pointer);

  @override
  FutureOr<WeddingPlan> create(Ref ref) {
    final argument = this.argument as String;
    return weddingPlan(ref, argument);
  }

  @override
  bool operator ==(Object other) {
    return other is WeddingPlanProvider && other.argument == argument;
  }

  @override
  int get hashCode {
    return argument.hashCode;
  }
}

String _$weddingPlanHash() => r'64dbb189f86c5a15f7c59d5ed12b9e26a1d9765d';

final class WeddingPlanFamily extends $Family
    with $FunctionalFamilyOverride<FutureOr<WeddingPlan>, String> {
  WeddingPlanFamily._()
    : super(
        retry: null,
        name: r'weddingPlanProvider',
        dependencies: null,
        $allTransitiveDependencies: null,
        isAutoDispose: true,
      );

  WeddingPlanProvider call(String id) =>
      WeddingPlanProvider._(argument: id, from: this);

  @override
  String toString() => r'weddingPlanProvider';
}
