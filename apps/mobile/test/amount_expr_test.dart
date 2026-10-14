import 'package:flutter_test/flutter_test.dart';

import 'package:align/core/utils/amount_expr.dart';

void main() {
  int? ok(String s) {
    final r = parseAmount(s);
    expect(r.error, isNull, reason: s);
    return r.paisas;
  }

  String err(String s) {
    final r = parseAmount(s);
    expect(r.paisas, isNull, reason: '$s should be rejected');
    return r.error!;
  }

  test('a plain number passes through', () {
    expect(ok('250'), 25000);
    expect(ok('12.5'), 1250);
    expect(ok('.5'), 50);
    expect(ok(' 99 '), 9900);
    expect(parseAmount('250').isExpression, isFalse);
  });

  test('adds and subtracts, with or without spaces', () {
    expect(ok('35+67'), 10200);
    expect(ok('100-40'), 6000);
    expect(ok('1000 + 250 - 50'), 120000);
    expect(ok('10-3-2'), 500);
    expect(parseAmount('35+67').isExpression, isTrue);
  });

  test('is exact with decimals', () {
    expect(ok('0.1+0.2'), 30);
    expect(ok('19.99+0.01'), 2000);
  });

  test('rejects negative results and a leading minus', () {
    expect(err('67-90'), contains('negative'));
    expect(err('5-10+2'), contains('negative'));
    expect(err('-5'), contains('negative'));
  });

  test('rejects zero and empty', () {
    expect(err('0'), contains('greater than zero'));
    expect(err('50-50'), contains('greater than zero'));
    expect(err(''), contains('required'));
    expect(err('   '), contains('required'));
  });

  test('rejects malformed sums', () {
    for (final bad in ['5+', '+5', '5++3', '5+-3', '1.2.3', 'abc', '5*3', '5/2', '(5)', '5 5', '1,000', '1e3', '--5']) {
      expect(parseAmount(bad).paisas, isNull, reason: bad);
    }
  });

  test('rejects more than two decimals and amounts too large to store', () {
    expect(err('1.234'), contains('2 decimal'));
    expect(err('99999999999'), contains('too large'));
    expect(err('20000000+20000000'), contains('too large'));
    expect(ok('21474836'), 2147483600);
  });
}
