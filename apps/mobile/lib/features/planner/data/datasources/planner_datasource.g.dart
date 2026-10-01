// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'planner_datasource.dart';

// **************************************************************************
// RiverpodGenerator
// **************************************************************************

// GENERATED CODE - DO NOT MODIFY BY HAND
// ignore_for_file: type=lint, type=warning

@ProviderFor(plannerDatasource)
final plannerDatasourceProvider = PlannerDatasourceProvider._();

final class PlannerDatasourceProvider
    extends
        $FunctionalProvider<
          PlannerDatasource,
          PlannerDatasource,
          PlannerDatasource
        >
    with $Provider<PlannerDatasource> {
  PlannerDatasourceProvider._()
    : super(
        from: null,
        argument: null,
        retry: null,
        name: r'plannerDatasourceProvider',
        isAutoDispose: true,
        dependencies: null,
        $allTransitiveDependencies: null,
      );

  @override
  String debugGetCreateSourceHash() => _$plannerDatasourceHash();

  @$internal
  @override
  $ProviderElement<PlannerDatasource> $createElement(
    $ProviderPointer pointer,
  ) => $ProviderElement(pointer);

  @override
  PlannerDatasource create(Ref ref) {
    return plannerDatasource(ref);
  }

  /// {@macro riverpod.override_with_value}
  Override overrideWithValue(PlannerDatasource value) {
    return $ProviderOverride(
      origin: this,
      providerOverride: $SyncValueProvider<PlannerDatasource>(value),
    );
  }
}

String _$plannerDatasourceHash() => r'31dd6e5300d57be4564610a37913faeeef26cba2';
