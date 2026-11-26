import 'package:align/features/settings/domain/menu_sections.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  group('withSectionHidden', () {
    test('adds a key when hiding and removes it when showing', () {
      expect(withSectionHidden(const [], 'loans', true), ['loans']);
      expect(withSectionHidden(const ['loans', 'tasks'], 'loans', false), ['tasks']);
    });

    test('keeps keys this phone does not know about', () {
      expect(withSectionHidden(const ['income', 'loans'], 'tasks', true), ['income', 'loans', 'tasks']);
      expect(withSectionHidden(const ['income', 'loans'], 'loans', false), ['income']);
    });

    test('hiding twice does not duplicate the key', () {
      expect(withSectionHidden(const ['loans'], 'loans', true), ['loans']);
    });
  });

  group('allMenuSectionKeys', () {
    test('has wedding and no calendar', () {
      expect(allMenuSectionKeys, contains('wedding'));
      expect(allMenuSectionKeys, isNot(contains('calendar')));
      expect(allMenuSectionKeys, hasLength(15));
    });
  });

  group('phoneSections', () {
    test('includes wedding and only known keys', () {
      final keys = phoneSections.map((s) => s.key).toList();
      expect(keys, contains('wedding'));
      expect(keys.toSet().difference(allMenuSectionKeys.toSet()), isEmpty);
    });
  });

  group('parseHiddenSections', () {
    test('reads the data envelope the API returns', () {
      expect(parseHiddenSections({'data': {'hiddenSections': ['tasks', 'loans']}}), ['tasks', 'loans']);
    });

    test('reads a bare map too', () {
      expect(parseHiddenSections({'hiddenSections': ['tasks']}), ['tasks']);
    });

    test('returns empty for missing or malformed values', () {
      expect(parseHiddenSections(null), isEmpty);
      expect(parseHiddenSections({}), isEmpty);
      expect(parseHiddenSections({'hiddenSections': 'tasks'}), isEmpty);
      expect(parseHiddenSections({'hiddenSections': ['tasks', 3]}), ['tasks']);
    });
  });
}
