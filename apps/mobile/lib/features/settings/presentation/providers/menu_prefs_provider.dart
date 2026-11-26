import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:riverpod_annotation/riverpod_annotation.dart';

import '../../../../core/constants/api_constants.dart';
import '../../../../core/errors/app_exception.dart';
import '../../../../core/errors/error_handler.dart';
import '../../../../core/network/api_client.dart';
import '../../data/menu_prefs_store.dart';
import '../../domain/menu_sections.dart';

part 'menu_prefs_provider.g.dart';

/// Read from local storage before the first frame (see main.dart).
final initialMenuPrefsProvider = Provider<MenuPrefsSnapshot>((_) => const MenuPrefsSnapshot());

/// Which menu sections this person hid (shared with the web app).
@Riverpod(keepAlive: true)
class MenuPrefs extends _$MenuPrefs {
  @override
  MenuPrefsSnapshot build() => ref.watch(initialMenuPrefsProvider);

  /// Fetch from the server. A 404 means an older server: no list, no switches.
  Future<void> refresh() async {
    try {
      final res = await ref.read(apiClientProvider).get(ApiConstants.preferences);
      await _set(MenuPrefsSnapshot(hidden: parseHiddenSections(res.data)));
    } catch (e) {
      if (ErrorHandler.handle(e) is NotFoundException) {
        await _set(const MenuPrefsSnapshot(supported: false));
      }
      // Any other failure: keep what we have (cached list).
    }
  }

  /// Optimistically hides/shows [key]; reverts and rethrows on failure.
  Future<void> setHidden(String key, bool hide) async {
    final before = state;
    final next = withSectionHidden(before.hidden, key, hide);
    state = MenuPrefsSnapshot(hidden: next);
    try {
      final res = await ref.read(apiClientProvider).patch(
        ApiConstants.preferences,
        data: {'hiddenSections': next},
      );
      await _set(MenuPrefsSnapshot(hidden: parseHiddenSections(res.data)));
    } catch (e) {
      state = before;
      throw ErrorHandler.handle(e);
    }
  }

  Future<void> _set(MenuPrefsSnapshot s) async {
    state = s;
    await MenuPrefsStore.write(s);
  }
}
