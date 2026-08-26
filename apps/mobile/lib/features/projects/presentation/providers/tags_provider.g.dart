// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'tags_provider.dart';

// **************************************************************************
// RiverpodGenerator
// **************************************************************************

// GENERATED CODE - DO NOT MODIFY BY HAND
// ignore_for_file: type=lint, type=warning

@ProviderFor(tags)
final tagsProvider = TagsProvider._();

final class TagsProvider
    extends
        $FunctionalProvider<
          AsyncValue<List<TagEntity>>,
          List<TagEntity>,
          FutureOr<List<TagEntity>>
        >
    with $FutureModifier<List<TagEntity>>, $FutureProvider<List<TagEntity>> {
  TagsProvider._()
    : super(
        from: null,
        argument: null,
        retry: null,
        name: r'tagsProvider',
        isAutoDispose: true,
        dependencies: null,
        $allTransitiveDependencies: null,
      );

  @override
  String debugGetCreateSourceHash() => _$tagsHash();

  @$internal
  @override
  $FutureProviderElement<List<TagEntity>> $createElement(
    $ProviderPointer pointer,
  ) => $FutureProviderElement(pointer);

  @override
  FutureOr<List<TagEntity>> create(Ref ref) {
    return tags(ref);
  }
}

String _$tagsHash() => r'14152237ae1ec5feb4c04596dfbd0aa34d96a2f5';
