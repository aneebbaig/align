import 'package:dio/dio.dart';
import 'package:logger/logger.dart';

class AppLogInterceptor extends Interceptor {
  final _logger = Logger(
    printer: PrettyPrinter(methodCount: 0, printEmojis: false),
  );

  @override
  void onRequest(RequestOptions options, RequestInterceptorHandler handler) {
    assert(() {
      _logger.d('[→] ${options.method} ${options.uri}');
      return true;
    }());
    handler.next(options);
  }

  @override
  void onResponse(Response response, ResponseInterceptorHandler handler) {
    assert(() {
      _logger.i('[←] ${response.statusCode} ${response.requestOptions.uri}');
      return true;
    }());
    handler.next(response);
  }

  @override
  void onError(DioException err, ErrorInterceptorHandler handler) {
    assert(() {
      _logger.e(
        '[✗] ${err.response?.statusCode} ${err.requestOptions.uri}\n${err.message}',
      );
      return true;
    }());
    handler.next(err);
  }
}
