import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import 'error_view.dart';

/// Generic AsyncValue → Widget. Use instead of manual when() chains.
class AsyncValueWidget<T> extends StatelessWidget {
  const AsyncValueWidget({
    required this.value,
    required this.data,
    this.loading,
    this.error,
    super.key,
  });

  final AsyncValue<T> value;
  final Widget Function(T data) data;
  final Widget? loading;
  final Widget Function(Object error, StackTrace? stack)? error;

  @override
  Widget build(BuildContext context) => switch (value) {
        AsyncData(:final value) => data(value),
        AsyncError(:final error, :final stackTrace) =>
          this.error?.call(error, stackTrace) ??
              ErrorView(message: _userMessage(error)),
        _ => loading ?? const Center(child: CircularProgressIndicator()),
      };

  String _userMessage(Object e) {
    // Only surface the message, never a stack trace
    if (e is Exception) return e.toString().replaceFirst('Exception: ', '');
    return 'Something went wrong';
  }
}

/// Slim loading indicator for inline use.
class InlineLoader extends StatelessWidget {
  const InlineLoader({super.key});
  @override
  Widget build(BuildContext context) => const Padding(
        padding: EdgeInsets.all(24),
        child: Center(child: CircularProgressIndicator()),
      );
}
