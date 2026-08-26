// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'tags_datasource.dart';

// **************************************************************************
// RiverpodGenerator
// **************************************************************************

// GENERATED CODE - DO NOT MODIFY BY HAND
// ignore_for_file: type=lint, type=warning

@ProviderFor(tagsDatasource)
final tagsDatasourceProvider = TagsDatasourceProvider._();

final class TagsDatasourceProvider
    extends $FunctionalProvider<TagsDatasource, TagsDatasource, TagsDatasource>
    with $Provider<TagsDatasource> {
  TagsDatasourceProvider._()
    : super(
        from: null,
        argument: null,
        retry: null,
        name: r'tagsDatasourceProvider',
        isAutoDispose: true,
        dependencies: null,
        $allTransitiveDependencies: null,
      );

  @override
  String debugGetCreateSourceHash() => _$tagsDatasourceHash();

  @$internal
  @override
  $ProviderElement<TagsDatasource> $createElement($ProviderPointer pointer) =>
      $ProviderElement(pointer);

  @override
  TagsDatasource create(Ref ref) {
    return tagsDatasource(ref);
  }

  /// {@macro riverpod.override_with_value}
  Override overrideWithValue(TagsDatasource value) {
    return $ProviderOverride(
      origin: this,
      providerOverride: $SyncValueProvider<TagsDatasource>(value),
    );
  }
}

String _$tagsDatasourceHash() => r'ea839ce4a78077ca4de8e4deb4cf39fd01c7363d';
