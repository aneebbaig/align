import 'package:shared_preferences/shared_preferences.dart';

const _kHidden = 'menu_hidden_sections';
const _kSupported = 'menu_prefs_supported';

/// Local copy of the hidden-sections list, so the nav is right on first frame.
class MenuPrefsSnapshot {
  const MenuPrefsSnapshot({this.hidden = const [], this.supported = true});
  final List<String> hidden;

  /// False when the server has no preferences endpoint (older server).
  final bool supported;
}

class MenuPrefsStore {
  const MenuPrefsStore._();

  static Future<MenuPrefsSnapshot> read() async {
    final prefs = await SharedPreferences.getInstance();
    return MenuPrefsSnapshot(
      hidden: prefs.getStringList(_kHidden) ?? const [],
      supported: prefs.getBool(_kSupported) ?? true,
    );
  }

  static Future<void> write(MenuPrefsSnapshot s) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setStringList(_kHidden, s.hidden);
    await prefs.setBool(_kSupported, s.supported);
  }
}
