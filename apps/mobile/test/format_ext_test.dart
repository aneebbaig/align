import 'package:flutter_test/flutter_test.dart';

import 'package:align/core/extensions/currency_ext.dart';
import 'package:align/core/extensions/datetime_ext.dart';

void main() {
  group('int.formatAmount', () {
    test('paisas to grouped rupees without a symbol', () {
      expect(15000000.formatAmount(), '150,000');
      expect(0.formatAmount(), '0');
    });

    test('keeps the sign for negative amounts', () {
      expect((-800000).formatAmount(), '-8,000');
    });

    test('rounds to the nearest rupee', () {
      expect(150050.formatAmount(), '1,501');
      expect((-150050).formatAmount(), '-1,501');
    });
  });

  test('DateTime.toShortMonthLabel', () {
    expect(DateTime(2026, 9).toShortMonthLabel, 'Sep 2026');
    expect(DateTime(2027, 1, 15).toShortMonthLabel, 'Jan 2027');
  });
}
