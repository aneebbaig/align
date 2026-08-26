import 'package:intl/intl.dart';

final _pkrFmt = NumberFormat('#,##0', 'en_US');
final _pkrDecFmt = NumberFormat('#,##0.##', 'en_US');

extension CurrencyInt on int {
  /// e.g. 150050 → "Rs 1,501"
  String formatPKR() => 'Rs ${_pkrFmt.format(this ~/ 100)}';

  /// e.g. 150050 → "Rs 1.5k" or "Rs 1.5M"
  String formatPKRCompact() {
    final rupees = this / 100.0;
    if (rupees >= 1000000) {
      return 'Rs ${_pkrDecFmt.format(rupees / 1000000)}M';
    }
    if (rupees >= 1000) {
      return 'Rs ${_pkrDecFmt.format(rupees / 1000)}k';
    }
    return 'Rs ${_pkrFmt.format(rupees.round())}';
  }

  /// Paisas → rupees as double.
  double get toRupees => this / 100.0;
}

extension CurrencyDouble on double {
  /// User-entered rupees → paisas integer. Mirrors web app `toPaisas()`.
  int get toPaisas => (this * 100).round();
}

extension CurrencyString on String {
  /// Parse numpad input string (e.g. "150.5") → paisas, or null if invalid.
  int? get parsePaisas {
    final v = double.tryParse(this);
    if (v == null || v <= 0) return null;
    return v.toPaisas;
  }
}
