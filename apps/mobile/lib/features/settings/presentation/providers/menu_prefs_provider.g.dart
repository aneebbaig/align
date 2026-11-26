// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'menu_prefs_provider.dart';

// **************************************************************************
// RiverpodGenerator
// **************************************************************************

// GENERATED CODE - DO NOT MODIFY BY HAND
// ignore_for_file: type=lint, type=warning
/// Which menu sections this person hid (shared with the web app).

@ProviderFor(MenuPrefs)
final menuPrefsProvider = MenuPrefsProvider._();

/// Which menu sections this person hid (shared with the web app).
final class MenuPrefsProvider
    extends $NotifierProvider<MenuPrefs, MenuPrefsSnapshot> {
  /// Which menu sections this person hid (shared with the web app).
  MenuPrefsProvider._()
    : super(
        from: null,
        argument: null,
        retry: null,
        name: r'menuPrefsProvider',
        isAutoDispose: false,
        dependencies: null,
        $allTransitiveDependencies: null,
      );

  @override
  String debugGetCreateSourceHash() => _$menuPrefsHash();

  @$internal
  @override
  MenuPrefs create() => MenuPrefs();

  /// {@macro riverpod.override_with_value}
  Override overrideWithValue(MenuPrefsSnapshot value) {
    return $ProviderOverride(
      origin: this,
      providerOverride: $SyncValueProvider<MenuPrefsSnapshot>(value),
    );
  }
}

String _$menuPrefsHash() => r'4d567ad49fb4de53b3dea3f5bd9d644523f3f943';

/// Which menu sections this person hid (shared with the web app).

abstract class _$MenuPrefs extends $Notifier<MenuPrefsSnapshot> {
  MenuPrefsSnapshot build();
  @$mustCallSuper
  @override
  void runBuild() {
    final ref = this.ref as $Ref<MenuPrefsSnapshot, MenuPrefsSnapshot>;
    final element =
        ref.element
            as $ClassProviderElement<
              AnyNotifier<MenuPrefsSnapshot, MenuPrefsSnapshot>,
              MenuPrefsSnapshot,
              Object?,
              Object?
            >;
    element.handleCreate(ref, build);
  }
}
