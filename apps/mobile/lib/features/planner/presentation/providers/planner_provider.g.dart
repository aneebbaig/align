// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'planner_provider.dart';

// **************************************************************************
// RiverpodGenerator
// **************************************************************************

// GENERATED CODE - DO NOT MODIFY BY HAND
// ignore_for_file: type=lint, type=warning

@ProviderFor(planner)
final plannerProvider = PlannerProvider._();

final class PlannerProvider
    extends
        $FunctionalProvider<
          AsyncValue<PlannerData>,
          PlannerData,
          FutureOr<PlannerData>
        >
    with $FutureModifier<PlannerData>, $FutureProvider<PlannerData> {
  PlannerProvider._()
    : super(
        from: null,
        argument: null,
        retry: null,
        name: r'plannerProvider',
        isAutoDispose: true,
        dependencies: null,
        $allTransitiveDependencies: null,
      );

  @override
  String debugGetCreateSourceHash() => _$plannerHash();

  @$internal
  @override
  $FutureProviderElement<PlannerData> $createElement(
    $ProviderPointer pointer,
  ) => $FutureProviderElement(pointer);

  @override
  FutureOr<PlannerData> create(Ref ref) {
    return planner(ref);
  }
}

String _$plannerHash() => r'9f153fa00cc1d1808c6b3838a8ebcd27d060a3b6';
