import 'package:flutter_test/flutter_test.dart';

import 'package:align/core/services/last_entry_store.dart';
import 'package:align/core/widgets/day_strip.dart';
import 'package:align/features/expenses/data/models/quick_picks_model.dart';
import 'package:align/features/expenses/presentation/widgets/quick_add_helpers.dart';

void main() {
  final today = DateTime(2026, 11, 26, 15, 30); // a Thursday

  test('lists Today, Yesterday, then EEE d down to 13 days back, then Pick date', () {
    final chips = buildDayChips(today: today, selected: today);
    expect(chips.length, 15);
    expect(chips[0], DayChipSpec(DayChipKind.today, 'Today', DateTime(2026, 11, 26), selected: true));
    expect(chips[1].label, 'Yesterday');
    expect(chips[2].label, 'Tue 24');
    expect(chips[13].label, 'Fri 13');
    expect(chips.last.kind, DayChipKind.pick);
    expect(chips.where((c) => c.selected).length, 1);
  });

  test('selecting yesterday marks only that chip', () {
    final chips = buildDayChips(today: today, selected: DateTime(2026, 11, 25));
    expect(chips.singleWhere((c) => c.selected).label, 'Yesterday');
  });

  test('a picked date outside the strip shows first as d MMM, selected', () {
    final chips = buildDayChips(today: today, selected: DateTime(2026, 10, 3));
    expect(chips.first.kind, DayChipKind.picked);
    expect(chips.first.label, '3 Oct');
    expect(chips.first.selected, isTrue);
    expect(chips.where((c) => c.selected).length, 1);
  });

  test('a future selection (editing) is shown as a picked chip', () {
    final chips = buildDayChips(today: today, selected: DateTime(2026, 12, 1));
    expect(chips.first.label, '1 Dec');
  });

  test('last-used chip comes first, and is selected when it is the selection', () {
    final chips = buildDayChips(today: today, selected: today, lastUsed: DateTime(2026, 11, 20));
    expect(chips.first.label, 'Last: 20 Nov');
    expect(chips.first.selected, isFalse);
    expect(chips[1].label, 'Today');
    expect(chips[1].selected, isTrue);

    final sel = buildDayChips(today: today, selected: DateTime(2026, 11, 20), lastUsed: DateTime(2026, 11, 20));
    expect(sel.first.selected, isTrue);
    expect(sel.where((c) => c.selected).length, 1);
  });

  group('lastChipDate', () {
    final now = DateTime(2026, 11, 26, 12, 0);
    test('offered within 30 minutes when not today', () {
      final last = LastEntry(date: DateTime(2026, 11, 20), savedAt: now.subtract(const Duration(minutes: 10)));
      expect(lastChipDate(last, now), DateTime(2026, 11, 20));
    });
    test('not after 30 minutes', () {
      final last = LastEntry(date: DateTime(2026, 11, 20), savedAt: now.subtract(const Duration(minutes: 31)));
      expect(lastChipDate(last, now), isNull);
    });
    test('not when the date is today, or nothing stored', () {
      final last = LastEntry(date: DateTime(2026, 11, 26), savedAt: now.subtract(const Duration(minutes: 1)));
      expect(lastChipDate(last, now), isNull);
      expect(lastChipDate(null, now), isNull);
    });
  });

  group('suggestDescriptions', () {
    const all = [
      QuickDescription(description: 'Lunch at work'),
      QuickDescription(description: 'Uber'),
      QuickDescription(description: 'Late lunch'),
      QuickDescription(description: 'lunch box'),
      QuickDescription(description: 'Groceries'),
    ];
    test('prefix matches first, then contains', () {
      expect(suggestDescriptions(all, 'lunch').map((d) => d.description), ['Lunch at work', 'lunch box', 'Late lunch']);
    });
    test('caps at 6 and ignores empty queries', () {
      final many = [for (var i = 0; i < 20; i++) QuickDescription(description: 'Item $i')];
      expect(suggestDescriptions(many, 'item').length, 6);
      expect(suggestDescriptions(all, ' '), isEmpty);
    });
  });

  group('needsBudgetChoice', () {
    test('only when the month differs from the open period', () {
      expect(needsBudgetChoice(DateTime(2026, 11, 3), openMonth: 11, openYear: 2026), isFalse);
      expect(needsBudgetChoice(DateTime(2026, 10, 30), openMonth: 11, openYear: 2026), isTrue);
      expect(needsBudgetChoice(DateTime(2025, 11, 3), openMonth: 11, openYear: 2026), isTrue);
    });
    test('falls back to the current month', () {
      final now = DateTime(2026, 11, 26);
      expect(needsBudgetChoice(DateTime(2026, 11, 1), now: now), isFalse);
      expect(needsBudgetChoice(DateTime(2026, 10, 31), now: now), isTrue);
    });
  });
}
