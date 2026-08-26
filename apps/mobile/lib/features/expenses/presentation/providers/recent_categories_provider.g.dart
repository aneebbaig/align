// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'recent_categories_provider.dart';

// **************************************************************************
// RiverpodGenerator
// **************************************************************************

// GENERATED CODE - DO NOT MODIFY BY HAND
// ignore_for_file: type=lint, type=warning

@ProviderFor(RecentCategories)
final recentCategoriesProvider = RecentCategoriesProvider._();

final class RecentCategoriesProvider
    extends $AsyncNotifierProvider<RecentCategories, List<String>> {
  RecentCategoriesProvider._()
    : super(
        from: null,
        argument: null,
        retry: null,
        name: r'recentCategoriesProvider',
        isAutoDispose: true,
        dependencies: null,
        $allTransitiveDependencies: null,
      );

  @override
  String debugGetCreateSourceHash() => _$recentCategoriesHash();

  @$internal
  @override
  RecentCategories create() => RecentCategories();
}

String _$recentCategoriesHash() => r'8b033a4e1d6a8fac26667af8ae83a2122d5f2408';

abstract class _$RecentCategories extends $AsyncNotifier<List<String>> {
  FutureOr<List<String>> build();
  @$mustCallSuper
  @override
  void runBuild() {
    final ref = this.ref as $Ref<AsyncValue<List<String>>, List<String>>;
    final element =
        ref.element
            as $ClassProviderElement<
              AnyNotifier<AsyncValue<List<String>>, List<String>>,
              AsyncValue<List<String>>,
              Object?,
              Object?
            >;
    element.handleCreate(ref, build);
  }
}
