import 'package:intl/intl.dart';

import '../constants/app_constants.dart';

abstract final class CurrencyUtils {
  static final _fmt = NumberFormat('#,##0.##', 'en_US');
  static final _fmtWhole = NumberFormat('#,##0', 'en_US');

  /// Converts PKR rupees (double) to paisas (int) - mirrors web app toPaisas().
  static int toPaisas(double amount) => (amount * 100).round();

  /// Converts paisas (int) to PKR double.
  static double fromPaisas(int paisas) => paisas / 100;

  /// "PKR 1,450" - full format for detail views.
  static String formatPKR(int paisas) =>
      '${AppConstants.currencySymbol} ${_fmtWhole.format(paisas / 100)}';

  /// "PKR 1,450.50" - with decimals when non-zero.
  static String formatPKRDecimal(int paisas) {
    final amount = paisas / 100;
    return '${AppConstants.currencySymbol} ${_fmt.format(amount)}';
  }

  /// Compact: "PKR 1.2L", "PKR 45K", "PKR 850" - for cards/widgets.
  static String formatPKRCompact(int paisas) {
    final amount = paisas / 100;
    if (amount >= 100000) {
      return '${AppConstants.currencySymbol} ${(amount / 100000).toStringAsFixed(1)}L';
    }
    if (amount >= 1000) {
      return '${AppConstants.currencySymbol} ${(amount / 1000).toStringAsFixed(1)}K';
    }
    return formatPKR(paisas);
  }

  /// Raw formatted number without symbol - for input fields.
  static String formatAmount(int paisas) => _fmtWhole.format(paisas / 100);

  /// Parses user input string to paisas. Returns null on invalid input.
  static int? parseInput(String input) {
    final cleaned = input.replaceAll(',', '').trim();
    final value = double.tryParse(cleaned);
    if (value == null || value < 0) return null;
    return toPaisas(value);
  }
}
