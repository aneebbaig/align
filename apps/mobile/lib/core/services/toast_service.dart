import 'package:flutter/material.dart';
import 'package:riverpod_annotation/riverpod_annotation.dart';
import 'package:toastification/toastification.dart';

import '../constants/app_constants.dart';

part 'toast_service.g.dart';

@Riverpod(keepAlive: true)
ToastService toastService(Ref ref) => ToastService();

/// Single entry point for all in-app notifications.
/// Never call [toastification] directly from UI - use this service.
class ToastService {
  void success(BuildContext context, String message) => _show(
        context,
        message: message,
        type: ToastificationType.success,
        duration: AppConstants.toastSuccessDuration,
      );

  void error(BuildContext context, String message) => _show(
        context,
        message: message,
        type: ToastificationType.error,
        duration: AppConstants.toastErrorDuration,
      );

  void info(BuildContext context, String message) => _show(
        context,
        message: message,
        type: ToastificationType.info,
        duration: AppConstants.toastSuccessDuration,
      );

  void warning(BuildContext context, String message) => _show(
        context,
        message: message,
        type: ToastificationType.warning,
        duration: AppConstants.toastSuccessDuration,
      );

  void _show(
    BuildContext context, {
    required String message,
    required ToastificationType type,
    required int duration,
  }) {
    toastification.show(
      context: context,
      type: type,
      style: ToastificationStyle.flatColored,
      title: Text(message),
      autoCloseDuration: Duration(seconds: duration),
      alignment: Alignment.topCenter,
      animationDuration: const Duration(milliseconds: 200),
      showProgressBar: false,
      closeOnClick: true,
    );
  }
}
