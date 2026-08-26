sealed class AppException implements Exception {
  const AppException(this.message);
  final String message;
}

final class NetworkException extends AppException {
  const NetworkException([super.message = 'Network error']);
  const NetworkException.timeout() : super('Request timed out');
  const NetworkException.noConnection() : super('No connection');
}

final class ServerException extends AppException {
  const ServerException(super.message, {this.statusCode});
  final int? statusCode;
}

final class UnauthorizedException extends AppException {
  const UnauthorizedException() : super('Session expired');
}

final class ForbiddenException extends AppException {
  const ForbiddenException() : super('Access denied');
}

final class NotFoundException extends AppException {
  const NotFoundException([super.message = 'Not found']);
}

final class ValidationException extends AppException {
  const ValidationException(super.message);
}

final class CacheException extends AppException {
  const CacheException([super.message = 'Local storage error']);
}

final class NoRefreshTokenException extends AppException {
  const NoRefreshTokenException() : super('No refresh token');
}

/// Password was accepted but the account has 2FA enabled; the server is
/// asking for a TOTP / backup code. The login screen shows the code field
/// and resubmits with `totp` set.
final class TotpRequiredException extends AppException {
  const TotpRequiredException() : super('Two-factor code required');
}
