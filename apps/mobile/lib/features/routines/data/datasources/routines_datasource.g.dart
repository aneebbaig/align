// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'routines_datasource.dart';

// **************************************************************************
// RiverpodGenerator
// **************************************************************************

// GENERATED CODE - DO NOT MODIFY BY HAND
// ignore_for_file: type=lint, type=warning

@ProviderFor(routinesDatasource)
final routinesDatasourceProvider = RoutinesDatasourceProvider._();

final class RoutinesDatasourceProvider
    extends
        $FunctionalProvider<
          RoutinesDatasource,
          RoutinesDatasource,
          RoutinesDatasource
        >
    with $Provider<RoutinesDatasource> {
  RoutinesDatasourceProvider._()
    : super(
        from: null,
        argument: null,
        retry: null,
        name: r'routinesDatasourceProvider',
        isAutoDispose: true,
        dependencies: null,
        $allTransitiveDependencies: null,
      );

  @override
  String debugGetCreateSourceHash() => _$routinesDatasourceHash();

  @$internal
  @override
  $ProviderElement<RoutinesDatasource> $createElement(
    $ProviderPointer pointer,
  ) => $ProviderElement(pointer);

  @override
  RoutinesDatasource create(Ref ref) {
    return routinesDatasource(ref);
  }

  /// {@macro riverpod.override_with_value}
  Override overrideWithValue(RoutinesDatasource value) {
    return $ProviderOverride(
      origin: this,
      providerOverride: $SyncValueProvider<RoutinesDatasource>(value),
    );
  }
}

String _$routinesDatasourceHash() =>
    r'2305aaa18d7c8da80b03666956247367d3212278';
