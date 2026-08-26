import 'package:dio/dio.dart';
import 'package:riverpod_annotation/riverpod_annotation.dart';

import '../constants/api_constants.dart';
import '../constants/app_constants.dart';
import '../services/storage_service.dart';
import 'interceptors/auth_interceptor.dart';
import 'interceptors/log_interceptor.dart';
import 'server_url.dart';

part 'api_client.g.dart';

@Riverpod(keepAlive: true)
Dio apiClient(Ref ref) {
  final storage = ref.watch(storageServiceProvider);
  // Rebuilds when the user points the app at a different server. Empty until
  // one is configured - the router keeps every screen that would call the API
  // behind the setup gate, so no request is made with an empty base.
  final origin = ref.watch(serverUrlProvider);

  final dio = Dio(
    BaseOptions(
      baseUrl: origin == null ? '' : ApiConstants.apiBase(origin),
      connectTimeout: AppConstants.connectTimeout,
      receiveTimeout: AppConstants.receiveTimeout,
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
    ),
  );

  // Order matters: log first (sees raw request), auth second (injects token)
  dio.interceptors.addAll([
    AppLogInterceptor(),
    AuthInterceptor(storage: storage, dio: dio),
  ]);

  ref.onDispose(() => dio.close(force: true));

  return dio;
}
