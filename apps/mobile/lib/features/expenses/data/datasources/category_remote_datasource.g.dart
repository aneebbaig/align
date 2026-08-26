// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'category_remote_datasource.dart';

// **************************************************************************
// RiverpodGenerator
// **************************************************************************

// GENERATED CODE - DO NOT MODIFY BY HAND
// ignore_for_file: type=lint, type=warning

@ProviderFor(categoryRemoteDatasource)
final categoryRemoteDatasourceProvider = CategoryRemoteDatasourceProvider._();

final class CategoryRemoteDatasourceProvider
    extends
        $FunctionalProvider<
          CategoryRemoteDatasource,
          CategoryRemoteDatasource,
          CategoryRemoteDatasource
        >
    with $Provider<CategoryRemoteDatasource> {
  CategoryRemoteDatasourceProvider._()
    : super(
        from: null,
        argument: null,
        retry: null,
        name: r'categoryRemoteDatasourceProvider',
        isAutoDispose: true,
        dependencies: null,
        $allTransitiveDependencies: null,
      );

  @override
  String debugGetCreateSourceHash() => _$categoryRemoteDatasourceHash();

  @$internal
  @override
  $ProviderElement<CategoryRemoteDatasource> $createElement(
    $ProviderPointer pointer,
  ) => $ProviderElement(pointer);

  @override
  CategoryRemoteDatasource create(Ref ref) {
    return categoryRemoteDatasource(ref);
  }

  /// {@macro riverpod.override_with_value}
  Override overrideWithValue(CategoryRemoteDatasource value) {
    return $ProviderOverride(
      origin: this,
      providerOverride: $SyncValueProvider<CategoryRemoteDatasource>(value),
    );
  }
}

String _$categoryRemoteDatasourceHash() =>
    r'c3b8506a3a68552a26c6212f5ecc37e75441736d';
