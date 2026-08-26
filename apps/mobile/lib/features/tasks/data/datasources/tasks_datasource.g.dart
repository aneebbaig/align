// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'tasks_datasource.dart';

// **************************************************************************
// RiverpodGenerator
// **************************************************************************

// GENERATED CODE - DO NOT MODIFY BY HAND
// ignore_for_file: type=lint, type=warning

@ProviderFor(tasksDatasource)
final tasksDatasourceProvider = TasksDatasourceProvider._();

final class TasksDatasourceProvider
    extends
        $FunctionalProvider<TasksDatasource, TasksDatasource, TasksDatasource>
    with $Provider<TasksDatasource> {
  TasksDatasourceProvider._()
    : super(
        from: null,
        argument: null,
        retry: null,
        name: r'tasksDatasourceProvider',
        isAutoDispose: true,
        dependencies: null,
        $allTransitiveDependencies: null,
      );

  @override
  String debugGetCreateSourceHash() => _$tasksDatasourceHash();

  @$internal
  @override
  $ProviderElement<TasksDatasource> $createElement($ProviderPointer pointer) =>
      $ProviderElement(pointer);

  @override
  TasksDatasource create(Ref ref) {
    return tasksDatasource(ref);
  }

  /// {@macro riverpod.override_with_value}
  Override overrideWithValue(TasksDatasource value) {
    return $ProviderOverride(
      origin: this,
      providerOverride: $SyncValueProvider<TasksDatasource>(value),
    );
  }
}

String _$tasksDatasourceHash() => r'6924974b81441c7bd949c0a9faa703bf7319c8cf';
