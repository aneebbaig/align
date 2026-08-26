import 'package:dio/dio.dart';
import 'package:riverpod_annotation/riverpod_annotation.dart';

import '../constants/api_constants.dart';

part 'server_probe.g.dart';

@Riverpod(keepAlive: true)
ServerProbe serverProbe(Ref ref) => const ServerProbe();

/// Checks a URL really is an Align server before it is saved - a typo caught
/// here is a typo that doesn't come back later as a confusing login failure.
class ServerProbe {
  const ServerProbe();

  /// Returns null when [origin] answers as an Align server, otherwise a
  /// message to show under the field.
  Future<String?> check(String origin) async {
    final dio = Dio(
      BaseOptions(
        connectTimeout: const Duration(seconds: 10),
        receiveTimeout: const Duration(seconds: 10),
        validateStatus: (_) => true,
        headers: {'Accept': 'application/json'},
      ),
    );

    try {
      final res = await dio.getUri<dynamic>(Uri.parse('$origin${ApiConstants.health}'));
      final body = res.data;
      if (res.statusCode == 200 && body is Map && body['status'] == 'ok') return null;
      if (res.statusCode == 404) {
        return "Reached that address, but it isn't an Align server.";
      }
      if (res.statusCode == 401 || res.statusCode == 403) {
        return 'That address is behind another login (deployment protection?).';
      }
      return 'The server answered with ${res.statusCode}. Check the address.';
    } on DioException catch (e) {
      return switch (e.type) {
        DioExceptionType.connectionTimeout ||
        DioExceptionType.receiveTimeout ||
        DioExceptionType.sendTimeout =>
          'Timed out reaching that address.',
        DioExceptionType.badCertificate =>
          "The server's HTTPS certificate was rejected.",
        _ => "Couldn't reach that address. Check the URL and your connection.",
      };
    } catch (_) {
      return "Couldn't reach that address.";
    } finally {
      dio.close(force: true);
    }
  }
}
