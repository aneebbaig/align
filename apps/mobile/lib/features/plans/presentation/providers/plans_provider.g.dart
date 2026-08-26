// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'plans_provider.dart';

// **************************************************************************
// RiverpodGenerator
// **************************************************************************

// GENERATED CODE - DO NOT MODIFY BY HAND
// ignore_for_file: type=lint, type=warning

@ProviderFor(plans)
final plansProvider = PlansProvider._();

final class PlansProvider
    extends
        $FunctionalProvider<
          AsyncValue<List<PlanEntity>>,
          List<PlanEntity>,
          FutureOr<List<PlanEntity>>
        >
    with $FutureModifier<List<PlanEntity>>, $FutureProvider<List<PlanEntity>> {
  PlansProvider._()
    : super(
        from: null,
        argument: null,
        retry: null,
        name: r'plansProvider',
        isAutoDispose: true,
        dependencies: null,
        $allTransitiveDependencies: null,
      );

  @override
  String debugGetCreateSourceHash() => _$plansHash();

  @$internal
  @override
  $FutureProviderElement<List<PlanEntity>> $createElement(
    $ProviderPointer pointer,
  ) => $FutureProviderElement(pointer);

  @override
  FutureOr<List<PlanEntity>> create(Ref ref) {
    return plans(ref);
  }
}

String _$plansHash() => r'7ca8f4671c5b143a2dd1933079c5cd529c87d8c4';

@ProviderFor(planDetail)
final planDetailProvider = PlanDetailFamily._();

final class PlanDetailProvider
    extends
        $FunctionalProvider<
          AsyncValue<PlanDetailEntity>,
          PlanDetailEntity,
          FutureOr<PlanDetailEntity>
        >
    with $FutureModifier<PlanDetailEntity>, $FutureProvider<PlanDetailEntity> {
  PlanDetailProvider._({
    required PlanDetailFamily super.from,
    required String super.argument,
  }) : super(
         retry: null,
         name: r'planDetailProvider',
         isAutoDispose: true,
         dependencies: null,
         $allTransitiveDependencies: null,
       );

  @override
  String debugGetCreateSourceHash() => _$planDetailHash();

  @override
  String toString() {
    return r'planDetailProvider'
        ''
        '($argument)';
  }

  @$internal
  @override
  $FutureProviderElement<PlanDetailEntity> $createElement(
    $ProviderPointer pointer,
  ) => $FutureProviderElement(pointer);

  @override
  FutureOr<PlanDetailEntity> create(Ref ref) {
    final argument = this.argument as String;
    return planDetail(ref, argument);
  }

  @override
  bool operator ==(Object other) {
    return other is PlanDetailProvider && other.argument == argument;
  }

  @override
  int get hashCode {
    return argument.hashCode;
  }
}

String _$planDetailHash() => r'9af1fc9eebbfe7b84bed720af86d13318ae162b3';

final class PlanDetailFamily extends $Family
    with $FunctionalFamilyOverride<FutureOr<PlanDetailEntity>, String> {
  PlanDetailFamily._()
    : super(
        retry: null,
        name: r'planDetailProvider',
        dependencies: null,
        $allTransitiveDependencies: null,
        isAutoDispose: true,
      );

  PlanDetailProvider call(String id) =>
      PlanDetailProvider._(argument: id, from: this);

  @override
  String toString() => r'planDetailProvider';
}
