import 'package:flutter_test/flutter_test.dart';

import 'package:align/core/network/server_url.dart';

void main() {
  group('normaliseServerUrl', () {
    test('assumes https for a bare host', () {
      expect(normaliseServerUrl('money.example.com'), 'https://money.example.com');
    });

    test('keeps an explicit scheme and port', () {
      expect(normaliseServerUrl('http://192.168.1.5:3000'), 'http://192.168.1.5:3000');
    });

    test('strips trailing slashes', () {
      expect(normaliseServerUrl('https://money.example.com///'), 'https://money.example.com');
    });

    test('strips an API path the user pasted', () {
      expect(normaliseServerUrl('https://money.example.com/api/v1'), 'https://money.example.com');
      expect(normaliseServerUrl('https://money.example.com/api/v1/'), 'https://money.example.com');
      expect(normaliseServerUrl('https://money.example.com/api'), 'https://money.example.com');
    });

    test('keeps a base path the app is served under', () {
      expect(normaliseServerUrl('https://example.com/align/'), 'https://example.com/align');
      expect(normaliseServerUrl('https://example.com/align/api/v1'), 'https://example.com/align');
    });

    test('drops query and fragment', () {
      expect(normaliseServerUrl('https://example.com/?a=1#x'), 'https://example.com');
    });

    test('trims surrounding whitespace', () {
      expect(normaliseServerUrl('  https://example.com  '), 'https://example.com');
    });

    test('rejects input that cannot be an origin', () {
      expect(normaliseServerUrl(''), isNull);
      expect(normaliseServerUrl('   '), isNull);
      expect(normaliseServerUrl('ftp://example.com'), isNull);
      expect(normaliseServerUrl('https://'), isNull);
      expect(normaliseServerUrl('not a host'), isNull);
    });
  });
}
