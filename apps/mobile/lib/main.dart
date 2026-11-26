import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:home_widget/home_widget.dart';

import 'app.dart';
import 'core/network/server_url.dart';
import 'core/services/storage_service.dart';
import 'features/settings/data/menu_prefs_store.dart';
import 'features/settings/presentation/providers/menu_prefs_provider.dart';

@pragma('vm:entry-point')
void backgroundCallback(Uri? uri) {
  // Widget tap deeplink handled by GoRouter via URI scheme
}

void main() async {
  WidgetsFlutterBinding.ensureInitialized();

  HomeWidget.registerInteractivityCallback(backgroundCallback);

  await SystemChrome.setPreferredOrientations([
    DeviceOrientation.portraitUp,
    DeviceOrientation.portraitDown,
  ]);

  SystemChrome.setSystemUIOverlayStyle(const SystemUiOverlayStyle(
    statusBarColor: Colors.transparent,
    statusBarBrightness: Brightness.dark,
    statusBarIconBrightness: Brightness.light,
    systemNavigationBarColor: Color(0xFF040201),
    systemNavigationBarIconBrightness: Brightness.light,
  ));

  // Read before the first frame so the router's first redirect already knows
  // whether this install has been pointed at a server.
  final storage = StorageService();
  final serverUrl = await storage.getServerUrl();
  // Cached menu choices, so hidden sections stay hidden on the first frame.
  final menuPrefs = await MenuPrefsStore.read();

  runApp(
    ProviderScope(
      overrides: [
        storageServiceProvider.overrideWithValue(storage),
        initialServerUrlProvider.overrideWithValue(serverUrl),
        initialMenuPrefsProvider.overrideWithValue(menuPrefs),
      ],
      child: const AlignApp(),
    ),
  );
}
