// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'projects_provider.dart';

// **************************************************************************
// RiverpodGenerator
// **************************************************************************

// GENERATED CODE - DO NOT MODIFY BY HAND
// ignore_for_file: type=lint, type=warning

@ProviderFor(projects)
final projectsProvider = ProjectsProvider._();

final class ProjectsProvider
    extends
        $FunctionalProvider<
          AsyncValue<List<ProjectEntity>>,
          List<ProjectEntity>,
          FutureOr<List<ProjectEntity>>
        >
    with
        $FutureModifier<List<ProjectEntity>>,
        $FutureProvider<List<ProjectEntity>> {
  ProjectsProvider._()
    : super(
        from: null,
        argument: null,
        retry: null,
        name: r'projectsProvider',
        isAutoDispose: true,
        dependencies: null,
        $allTransitiveDependencies: null,
      );

  @override
  String debugGetCreateSourceHash() => _$projectsHash();

  @$internal
  @override
  $FutureProviderElement<List<ProjectEntity>> $createElement(
    $ProviderPointer pointer,
  ) => $FutureProviderElement(pointer);

  @override
  FutureOr<List<ProjectEntity>> create(Ref ref) {
    return projects(ref);
  }
}

String _$projectsHash() => r'cb5a77e058cfef1d7ae1df6facda5ffb81d47942';

@ProviderFor(project)
final projectProvider = ProjectFamily._();

final class ProjectProvider
    extends
        $FunctionalProvider<
          AsyncValue<ProjectEntity>,
          ProjectEntity,
          FutureOr<ProjectEntity>
        >
    with $FutureModifier<ProjectEntity>, $FutureProvider<ProjectEntity> {
  ProjectProvider._({
    required ProjectFamily super.from,
    required String super.argument,
  }) : super(
         retry: null,
         name: r'projectProvider',
         isAutoDispose: true,
         dependencies: null,
         $allTransitiveDependencies: null,
       );

  @override
  String debugGetCreateSourceHash() => _$projectHash();

  @override
  String toString() {
    return r'projectProvider'
        ''
        '($argument)';
  }

  @$internal
  @override
  $FutureProviderElement<ProjectEntity> $createElement(
    $ProviderPointer pointer,
  ) => $FutureProviderElement(pointer);

  @override
  FutureOr<ProjectEntity> create(Ref ref) {
    final argument = this.argument as String;
    return project(ref, argument);
  }

  @override
  bool operator ==(Object other) {
    return other is ProjectProvider && other.argument == argument;
  }

  @override
  int get hashCode {
    return argument.hashCode;
  }
}

String _$projectHash() => r'2f066cb0aa26cc89cd38194314070e045509c263';

final class ProjectFamily extends $Family
    with $FunctionalFamilyOverride<FutureOr<ProjectEntity>, String> {
  ProjectFamily._()
    : super(
        retry: null,
        name: r'projectProvider',
        dependencies: null,
        $allTransitiveDependencies: null,
        isAutoDispose: true,
      );

  ProjectProvider call(String id) =>
      ProjectProvider._(argument: id, from: this);

  @override
  String toString() => r'projectProvider';
}
