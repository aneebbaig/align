import 'package:connectivity_plus/connectivity_plus.dart';
import 'package:riverpod_annotation/riverpod_annotation.dart';

part 'connectivity_service.g.dart';

@Riverpod(keepAlive: true)
Stream<bool> connectivityStream(Ref ref) => Connectivity()
    .onConnectivityChanged
    .map((results) => results.any((r) => r != ConnectivityResult.none));

@riverpod
Future<bool> isConnected(Ref ref) async {
  final results = await Connectivity().checkConnectivity();
  return results.any((r) => r != ConnectivityResult.none);
}
