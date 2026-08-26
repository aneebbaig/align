// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'plans_datasource.dart';

// **************************************************************************
// RiverpodGenerator
// **************************************************************************

// GENERATED CODE - DO NOT MODIFY BY HAND
// ignore_for_file: type=lint, type=warning

@ProviderFor(plansDatasource)
final plansDatasourceProvider = PlansDatasourceProvider._();

final class PlansDatasourceProvider
    extends
        $FunctionalProvider<PlansDatasource, PlansDatasource, PlansDatasource>
    with $Provider<PlansDatasource> {
  PlansDatasourceProvider._()
    : super(
        from: null,
        argument: null,
        retry: null,
        name: r'plansDatasourceProvider',
        isAutoDispose: true,
        dependencies: null,
        $allTransitiveDependencies: null,
      );

  @override
  String debugGetCreateSourceHash() => _$plansDatasourceHash();

  @$internal
  @override
  $ProviderElement<PlansDatasource> $createElement($ProviderPointer pointer) =>
      $ProviderElement(pointer);

  @override
  PlansDatasource create(Ref ref) {
    return plansDatasource(ref);
  }

  /// {@macro riverpod.override_with_value}
  Override overrideWithValue(PlansDatasource value) {
    return $ProviderOverride(
      origin: this,
      providerOverride: $SyncValueProvider<PlansDatasource>(value),
    );
  }
}

String _$plansDatasourceHash() => r'2261b1cfacb54cab49f38a6f1685640dc6dd9e5c';
