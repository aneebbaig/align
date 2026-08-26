import 'package:dio/dio.dart';

import 'app_exception.dart';

/// Converts raw Dio/network errors into typed [AppException]s.
/// Never surfaces raw stack traces or technical messages to UI.
class ErrorHandler {
  ErrorHandler._();

  static AppException handle(Object error) {
    if (error is AppException) return error;
    if (error is DioException) return _fromDio(error);
    return const ServerException('Something went wrong. Try again shortly');
  }

  static AppException _fromDio(DioException e) {
    switch (e.type) {
      case DioExceptionType.connectionTimeout:
      case DioExceptionType.sendTimeout:
      case DioExceptionType.receiveTimeout:
        return const NetworkException.timeout();

      case DioExceptionType.connectionError:
        return const NetworkException.noConnection();

      case DioExceptionType.badResponse:
        return _fromResponse(e.response);

      case DioExceptionType.cancel:
        return const NetworkException('Request cancelled');

      case DioExceptionType.unknown:
      default:
        final msg = e.message ?? '';
        if (msg.contains('SocketException') || msg.contains('connection')) {
          return const NetworkException.noConnection();
        }
        return const ServerException('Something went wrong. Try again shortly');
    }
  }

  static AppException _fromResponse(Response? response) {
    if (response == null) return const ServerException('No response from server');

    final status = response.statusCode ?? 0;
    final body = response.data;

    // Extract server-provided message when available
    String? serverMsg;
    if (body is Map) {
      serverMsg = body['error'] as String? ?? body['message'] as String?;
    }

    return switch (status) {
      400 => ValidationException(serverMsg ?? 'Invalid request'),
      401 => const UnauthorizedException(),
      403 => const ForbiddenException(),
      404 => NotFoundException(serverMsg ?? 'Not found'),
      409 => ValidationException(serverMsg ?? 'Conflict with existing data'),
      422 => ValidationException(serverMsg ?? 'Invalid data provided'),
      429 => const ServerException('Too many requests. Wait a moment'),
      >= 500 => const ServerException('Server error. Try again shortly'),
      _ => ServerException(serverMsg ?? 'Unexpected error ($status)'),
    };
  }
}
