import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:home_widget/home_widget.dart';

import 'app.dart';
import 'core/network/server_url.dart';
import 'core/services/storage_service.dart';

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

  runApp(
    ProviderScope(
      overrides: [
        storageServiceProvider.overrideWithValue(storage),
        initialServerUrlProvider.overrideWithValue(serverUrl),
      ],
      child: const AlignApp(),
    ),
  );
}
