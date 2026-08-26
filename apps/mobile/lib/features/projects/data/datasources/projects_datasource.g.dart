// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'projects_datasource.dart';

// **************************************************************************
// RiverpodGenerator
// **************************************************************************

// GENERATED CODE - DO NOT MODIFY BY HAND
// ignore_for_file: type=lint, type=warning

@ProviderFor(projectsDatasource)
final projectsDatasourceProvider = ProjectsDatasourceProvider._();

final class ProjectsDatasourceProvider
    extends
        $FunctionalProvider<
          ProjectsDatasource,
          ProjectsDatasource,
          ProjectsDatasource
        >
    with $Provider<ProjectsDatasource> {
  ProjectsDatasourceProvider._()
    : super(
        from: null,
        argument: null,
        retry: null,
        name: r'projectsDatasourceProvider',
        isAutoDispose: true,
        dependencies: null,
        $allTransitiveDependencies: null,
      );

  @override
  String debugGetCreateSourceHash() => _$projectsDatasourceHash();

  @$internal
  @override
  $ProviderElement<ProjectsDatasource> $createElement(
    $ProviderPointer pointer,
  ) => $ProviderElement(pointer);

  @override
  ProjectsDatasource create(Ref ref) {
    return projectsDatasource(ref);
  }

  /// {@macro riverpod.override_with_value}
  Override overrideWithValue(ProjectsDatasource value) {
    return $ProviderOverride(
      origin: this,
      providerOverride: $SyncValueProvider<ProjectsDatasource>(value),
    );
  }
}

String _$projectsDatasourceHash() =>
    r'1d088fee016eafed4a3fa9e89f09e0d5b300f752';
