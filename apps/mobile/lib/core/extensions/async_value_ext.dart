import 'package:flutter_riverpod/flutter_riverpod.dart';

extension AsyncValueX<T> on AsyncValue<T> {
  /// Restores the Riverpod 2.x ergonomic API - returns value or null if loading/error.
  T? get valueOrNull => asData?.value;
}
