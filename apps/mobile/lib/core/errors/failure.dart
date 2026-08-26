import 'app_exception.dart';

sealed class Failure {
  const Failure(this.message);
  final String message;

  factory Failure.fromException(AppException e) => switch (e) {
        NetworkException() => NetworkFailure(e.message),
        UnauthorizedException() => AuthFailure(e.message),
        ForbiddenException() => AuthFailure(e.message),
        NotFoundException() => NotFoundFailure(e.message),
        ValidationException() => ValidationFailure(e.message),
        ServerException() => ServerFailure(e.message),
        CacheException() => CacheFailure(e.message),
        NoRefreshTokenException() => AuthFailure(e.message),
        TotpRequiredException() => AuthFailure(e.message),
      };
}

final class NetworkFailure extends Failure {
  const NetworkFailure([super.message = 'Check your connection and try again']);
}

final class AuthFailure extends Failure {
  const AuthFailure([super.message = 'Session expired. Please sign in again']);
}

final class NotFoundFailure extends Failure {
  const NotFoundFailure([super.message = 'That item no longer exists']);
}

final class ValidationFailure extends Failure {
  const ValidationFailure(super.message);
}

final class ServerFailure extends Failure {
  const ServerFailure([super.message = 'Something went wrong. Try again shortly']);
}

final class CacheFailure extends Failure {
  const CacheFailure([super.message = 'Could not save data locally']);
}
