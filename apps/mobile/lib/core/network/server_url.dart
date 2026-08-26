import 'package:riverpod_annotation/riverpod_annotation.dart';

import '../services/storage_service.dart';

part 'server_url.g.dart';

/// No server is baked into the app. Every install asks for one on first launch
/// (ServerSetupPage) and stores it; everything network-facing reads the origin
/// from here, so the same APK works against anybody's self-hosted instance.

/// Turns whatever the user typed into a bare origin - scheme, host, optional
/// port, optional base path - or null when it can't be one.
///
/// Accepts `example.com`, `https://example.com/`, `http://192.168.1.5:3000`,
/// and full API URLs like `https://example.com/api/v1` (the `/api/vN` tail is
/// dropped, since the app appends its own paths).
String? normaliseServerUrl(String input) {
  var value = input.trim();
  if (value.isEmpty) return null;
  // A bare host is the most common paste; assume TLS rather than refusing it.
  if (!value.contains('://')) value = 'https://$value';

  final uri = Uri.tryParse(value);
  if (uri == null) return null;
  if (uri.scheme != 'http' && uri.scheme != 'https') return null;
  if (!uri.hasAuthority || uri.host.isEmpty) return null;
  if (uri.host.contains(' ') || !uri.host.contains(RegExp(r'^[A-Za-z0-9._\-\[\]:]+$'))) {
    return null;
  }

  final path = uri.path
      .replaceFirst(RegExp(r'/api(/v\d+)?/?$'), '')
      .replaceAll(RegExp(r'/+$'), '');

  // Rebuilt rather than Uri.replace'd: replace(query: null) keeps the existing
  // query, and a pasted URL often carries one.
  return Uri(
    scheme: uri.scheme,
    host: uri.host,
    port: uri.hasPort ? uri.port : null,
    path: path,
  ).toString();
}

/// Seeded in main() from storage before the first frame, so the router knows
/// on its very first redirect whether a server is configured.
@Riverpod(keepAlive: true)
String? initialServerUrl(Ref ref) =>
    throw UnimplementedError('initialServerUrlProvider must be overridden in main()');

/// The configured server origin, or null when the app has never been set up.
@Riverpod(keepAlive: true)
class ServerUrl extends _$ServerUrl {
  @override
  String? build() => ref.read(initialServerUrlProvider);

  Future<void> save(String origin) async {
    await ref.read(storageServiceProvider).saveServerUrl(origin);
    state = origin;
  }

  Future<void> clear() async {
    await ref.read(storageServiceProvider).clearServerUrl();
    state = null;
  }
}
