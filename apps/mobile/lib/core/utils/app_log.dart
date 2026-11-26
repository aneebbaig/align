import 'package:logger/logger.dart';

/// The one app logger (same package and style as the network log interceptor).
final appLog = Logger(printer: PrettyPrinter(methodCount: 0, printEmojis: false));
