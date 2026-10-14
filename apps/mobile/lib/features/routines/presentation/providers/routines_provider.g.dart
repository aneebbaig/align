// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'routines_provider.dart';

// **************************************************************************
// RiverpodGenerator
// **************************************************************************

// GENERATED CODE - DO NOT MODIFY BY HAND
// ignore_for_file: type=lint, type=warning

@ProviderFor(routines)
final routinesProvider = RoutinesProvider._();

final class RoutinesProvider
    extends
        $FunctionalProvider<
          AsyncValue<List<RoutineEntity>>,
          List<RoutineEntity>,
          FutureOr<List<RoutineEntity>>
        >
    with
        $FutureModifier<List<RoutineEntity>>,
        $FutureProvider<List<RoutineEntity>> {
  RoutinesProvider._()
    : super(
        from: null,
        argument: null,
        retry: null,
        name: r'routinesProvider',
        isAutoDispose: true,
        dependencies: null,
        $allTransitiveDependencies: null,
      );

  @override
  String debugGetCreateSourceHash() => _$routinesHash();

  @$internal
  @override
  $FutureProviderElement<List<RoutineEntity>> $createElement(
    $ProviderPointer pointer,
  ) => $FutureProviderElement(pointer);

  @override
  FutureOr<List<RoutineEntity>> create(Ref ref) {
    return routines(ref);
  }
}

String _$routinesHash() => r'0ef6ca9072813b0132c94e47dcd97e115808949c';

@ProviderFor(routineDay)
final routineDayProvider = RoutineDayFamily._();

final class RoutineDayProvider
    extends
        $FunctionalProvider<
          AsyncValue<List<DayItemEntity>>,
          List<DayItemEntity>,
          FutureOr<List<DayItemEntity>>
        >
    with
        $FutureModifier<List<DayItemEntity>>,
        $FutureProvider<List<DayItemEntity>> {
  RoutineDayProvider._({
    required RoutineDayFamily super.from,
    required String super.argument,
  }) : super(
         retry: null,
         name: r'routineDayProvider',
         isAutoDispose: true,
         dependencies: null,
         $allTransitiveDependencies: null,
       );

  @override
  String debugGetCreateSourceHash() => _$routineDayHash();

  @override
  String toString() {
    return r'routineDayProvider'
        ''
        '($argument)';
  }

  @$internal
  @override
  $FutureProviderElement<List<DayItemEntity>> $createElement(
    $ProviderPointer pointer,
  ) => $FutureProviderElement(pointer);

  @override
  FutureOr<List<DayItemEntity>> create(Ref ref) {
    final argument = this.argument as String;
    return routineDay(ref, argument);
  }

  @override
  bool operator ==(Object other) {
    return other is RoutineDayProvider && other.argument == argument;
  }

  @override
  int get hashCode {
    return argument.hashCode;
  }
}

String _$routineDayHash() => r'd608cce58846742057da5838f30ff98fb2f4c713';

final class RoutineDayFamily extends $Family
    with $FunctionalFamilyOverride<FutureOr<List<DayItemEntity>>, String> {
  RoutineDayFamily._()
    : super(
        retry: null,
        name: r'routineDayProvider',
        dependencies: null,
        $allTransitiveDependencies: null,
        isAutoDispose: true,
      );

  RoutineDayProvider call(String date) =>
      RoutineDayProvider._(argument: date, from: this);

  @override
  String toString() => r'routineDayProvider';
}

@ProviderFor(routineStats)
final routineStatsProvider = RoutineStatsFamily._();

final class RoutineStatsProvider
    extends
        $FunctionalProvider<
          AsyncValue<RoutineStatsEntity>,
          RoutineStatsEntity,
          FutureOr<RoutineStatsEntity>
        >
    with
        $FutureModifier<RoutineStatsEntity>,
        $FutureProvider<RoutineStatsEntity> {
  RoutineStatsProvider._({
    required RoutineStatsFamily super.from,
    required (String, String) super.argument,
  }) : super(
         retry: null,
         name: r'routineStatsProvider',
         isAutoDispose: true,
         dependencies: null,
         $allTransitiveDependencies: null,
       );

  @override
  String debugGetCreateSourceHash() => _$routineStatsHash();

  @override
  String toString() {
    return r'routineStatsProvider'
        ''
        '$argument';
  }

  @$internal
  @override
  $FutureProviderElement<RoutineStatsEntity> $createElement(
    $ProviderPointer pointer,
  ) => $FutureProviderElement(pointer);

  @override
  FutureOr<RoutineStatsEntity> create(Ref ref) {
    final argument = this.argument as (String, String);
    return routineStats(ref, argument.$1, argument.$2);
  }

  @override
  bool operator ==(Object other) {
    return other is RoutineStatsProvider && other.argument == argument;
  }

  @override
  int get hashCode {
    return argument.hashCode;
  }
}

String _$routineStatsHash() => r'98380fc4d65794c50bd3586d0ab1e421a08840fe';

final class RoutineStatsFamily extends $Family
    with
        $FunctionalFamilyOverride<
          FutureOr<RoutineStatsEntity>,
          (String, String)
        > {
  RoutineStatsFamily._()
    : super(
        retry: null,
        name: r'routineStatsProvider',
        dependencies: null,
        $allTransitiveDependencies: null,
        isAutoDispose: true,
      );

  RoutineStatsProvider call(String from, String to) =>
      RoutineStatsProvider._(argument: (from, to), from: this);

  @override
  String toString() => r'routineStatsProvider';
}
