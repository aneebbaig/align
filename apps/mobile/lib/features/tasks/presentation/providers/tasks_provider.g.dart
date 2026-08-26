// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'tasks_provider.dart';

// **************************************************************************
// RiverpodGenerator
// **************************************************************************

// GENERATED CODE - DO NOT MODIFY BY HAND
// ignore_for_file: type=lint, type=warning

@ProviderFor(tasks)
final tasksProvider = TasksProvider._();

final class TasksProvider
    extends
        $FunctionalProvider<
          AsyncValue<List<TaskEntity>>,
          List<TaskEntity>,
          FutureOr<List<TaskEntity>>
        >
    with $FutureModifier<List<TaskEntity>>, $FutureProvider<List<TaskEntity>> {
  TasksProvider._()
    : super(
        from: null,
        argument: null,
        retry: null,
        name: r'tasksProvider',
        isAutoDispose: true,
        dependencies: null,
        $allTransitiveDependencies: null,
      );

  @override
  String debugGetCreateSourceHash() => _$tasksHash();

  @$internal
  @override
  $FutureProviderElement<List<TaskEntity>> $createElement(
    $ProviderPointer pointer,
  ) => $FutureProviderElement(pointer);

  @override
  FutureOr<List<TaskEntity>> create(Ref ref) {
    return tasks(ref);
  }
}

String _$tasksHash() => r'b988cb11febd8ea2ea82c1f60b88965a733d1a77';

@ProviderFor(CreateTask)
final createTaskProvider = CreateTaskProvider._();

final class CreateTaskProvider
    extends $NotifierProvider<CreateTask, AsyncValue<String?>> {
  CreateTaskProvider._()
    : super(
        from: null,
        argument: null,
        retry: null,
        name: r'createTaskProvider',
        isAutoDispose: true,
        dependencies: null,
        $allTransitiveDependencies: null,
      );

  @override
  String debugGetCreateSourceHash() => _$createTaskHash();

  @$internal
  @override
  CreateTask create() => CreateTask();

  /// {@macro riverpod.override_with_value}
  Override overrideWithValue(AsyncValue<String?> value) {
    return $ProviderOverride(
      origin: this,
      providerOverride: $SyncValueProvider<AsyncValue<String?>>(value),
    );
  }
}

String _$createTaskHash() => r'e921df8c0941bc57097c1c6c8e09d84cb1705f7c';

abstract class _$CreateTask extends $Notifier<AsyncValue<String?>> {
  AsyncValue<String?> build();
  @$mustCallSuper
  @override
  void runBuild() {
    final ref = this.ref as $Ref<AsyncValue<String?>, AsyncValue<String?>>;
    final element =
        ref.element
            as $ClassProviderElement<
              AnyNotifier<AsyncValue<String?>, AsyncValue<String?>>,
              AsyncValue<String?>,
              Object?,
              Object?
            >;
    element.handleCreate(ref, build);
  }
}

@ProviderFor(UpdateTaskStatus)
final updateTaskStatusProvider = UpdateTaskStatusProvider._();

final class UpdateTaskStatusProvider
    extends $NotifierProvider<UpdateTaskStatus, AsyncValue<void>> {
  UpdateTaskStatusProvider._()
    : super(
        from: null,
        argument: null,
        retry: null,
        name: r'updateTaskStatusProvider',
        isAutoDispose: true,
        dependencies: null,
        $allTransitiveDependencies: null,
      );

  @override
  String debugGetCreateSourceHash() => _$updateTaskStatusHash();

  @$internal
  @override
  UpdateTaskStatus create() => UpdateTaskStatus();

  /// {@macro riverpod.override_with_value}
  Override overrideWithValue(AsyncValue<void> value) {
    return $ProviderOverride(
      origin: this,
      providerOverride: $SyncValueProvider<AsyncValue<void>>(value),
    );
  }
}

String _$updateTaskStatusHash() => r'ab7e26e4c427c9ed4a0b2d23cfb6301f43415ad2';

abstract class _$UpdateTaskStatus extends $Notifier<AsyncValue<void>> {
  AsyncValue<void> build();
  @$mustCallSuper
  @override
  void runBuild() {
    final ref = this.ref as $Ref<AsyncValue<void>, AsyncValue<void>>;
    final element =
        ref.element
            as $ClassProviderElement<
              AnyNotifier<AsyncValue<void>, AsyncValue<void>>,
              AsyncValue<void>,
              Object?,
              Object?
            >;
    element.handleCreate(ref, build);
  }
}

@ProviderFor(DeleteTask)
final deleteTaskProvider = DeleteTaskProvider._();

final class DeleteTaskProvider
    extends $NotifierProvider<DeleteTask, AsyncValue<void>> {
  DeleteTaskProvider._()
    : super(
        from: null,
        argument: null,
        retry: null,
        name: r'deleteTaskProvider',
        isAutoDispose: true,
        dependencies: null,
        $allTransitiveDependencies: null,
      );

  @override
  String debugGetCreateSourceHash() => _$deleteTaskHash();

  @$internal
  @override
  DeleteTask create() => DeleteTask();

  /// {@macro riverpod.override_with_value}
  Override overrideWithValue(AsyncValue<void> value) {
    return $ProviderOverride(
      origin: this,
      providerOverride: $SyncValueProvider<AsyncValue<void>>(value),
    );
  }
}

String _$deleteTaskHash() => r'1681cbd3d5f8bbd0cfbbafd4fbf96994d3fe059d';

abstract class _$DeleteTask extends $Notifier<AsyncValue<void>> {
  AsyncValue<void> build();
  @$mustCallSuper
  @override
  void runBuild() {
    final ref = this.ref as $Ref<AsyncValue<void>, AsyncValue<void>>;
    final element =
        ref.element
            as $ClassProviderElement<
              AnyNotifier<AsyncValue<void>, AsyncValue<void>>,
              AsyncValue<void>,
              Object?,
              Object?
            >;
    element.handleCreate(ref, build);
  }
}
