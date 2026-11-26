import 'package:align/features/wedding/domain/wedding_logic.dart';
import 'package:align/features/wedding/domain/wedding_models.dart';
import 'package:flutter_test/flutter_test.dart';

WeddingExpense x(
  String id, {
  String name = 'Thing',
  int est = 100,
  int? actual,
  int paid = 0,
  String? eventId,
  String category = 'MISC',
  String? vendor,
  List<WeddingQuote> quotes = const [],
}) =>
    WeddingExpense(
      id: id,
      name: name,
      category: category,
      estimatedAmount: est,
      actualAmount: actual,
      paidAmount: paid,
      eventId: eventId,
      vendorName: vendor,
      quotes: quotes,
    );

WeddingQuote q(String id, int amount, {bool chosen = false, String vendor = 'V'}) =>
    WeddingQuote(id: id, vendorName: vendor, amount: amount, isChosen: chosen);

void main() {
  group('payment', () {
    test('status follows paid vs cost (actual wins over estimate)', () {
      expect(paymentStatus(x('a')), PaymentStatus.unpaid);
      expect(paymentStatus(x('a', paid: 40)), PaymentStatus.partPaid);
      expect(paymentStatus(x('a', paid: 100)), PaymentStatus.paid);
      expect(paymentStatus(x('a', actual: 150, paid: 100)), PaymentStatus.partPaid);
      expect(paymentStatus(x('a', est: 0, paid: 5)), PaymentStatus.partPaid);
    });

    test('balance never goes negative', () {
      expect(balanceOf(x('a', paid: 130)), 0);
      expect(balanceOf(x('a', paid: 30)), 70);
    });

    test('sumTotals', () {
      final t = sumTotals([x('a', paid: 50), x('b', actual: 300, paid: 300)]);
      expect(t.count, 2);
      expect(t.estimated, 200);
      expect(t.projected, 400);
      expect(t.actual, 300);
      expect(t.priced, 1);
      expect(t.paid, 350);
      expect(t.outstanding, 50);
    });
  });

  group('budgetStatus', () {
    test('states', () {
      expect(budgetStatus(10, 0).state, BudgetState.none);
      expect(budgetStatus(50, 100).state, BudgetState.ok);
      expect(budgetStatus(90, 100).state, BudgetState.close);
      final over = budgetStatus(130, 100);
      expect(over.state, BudgetState.over);
      expect(over.overBy, 30);
      expect(budgetStatus(60, 100).left, 40);
    });
  });

  group('filters', () {
    final rows = [
      x('unpaid', name: 'Hall'),
      x('part', name: 'Dress', paid: 40, actual: 100),
      x('paid', name: 'Cake', actual: 100, paid: 100, vendor: 'Sweet Co'),
      x('quotes', name: 'Photos', quotes: [q('1', 5, vendor: 'Lens'), q('2', 6)]),
      x('chosen', name: 'Video', quotes: [q('3', 5), q('4', 6, chosen: true)]),
    ];
    List<String> ids(StatusFilter f) => rows.where((r) => matchesStatus(r, f)).map((r) => r.id).toList();

    test('status chips', () {
      expect(ids(StatusFilter.all), hasLength(5));
      expect(ids(StatusFilter.toPay), ['unpaid', 'part', 'quotes', 'chosen']);
      expect(ids(StatusFilter.partPaid), ['part']);
      expect(ids(StatusFilter.paid), ['paid']);
      expect(ids(StatusFilter.needsPrice), ['unpaid', 'quotes', 'chosen']);
      expect(ids(StatusFilter.quotes), ['quotes']);
    });

    test('counts match the filters', () {
      final c = statusCounts(rows);
      expect(c[StatusFilter.toPay], 4);
      expect(c[StatusFilter.quotes], 1);
    });

    test('search covers name, vendor and quoting vendors, case-insensitively', () {
      expect(matchesSearch(rows[0], 'hall'), isTrue);
      expect(matchesSearch(rows[2], 'SWEET'), isTrue);
      expect(matchesSearch(rows[3], 'lens'), isTrue);
      expect(matchesSearch(rows[0], 'zzz'), isFalse);
      expect(matchesSearch(rows[0], '  '), isTrue);
    });

    test('applyFilters combines both', () {
      expect(applyFilters(rows, StatusFilter.paid, 'cake').map((r) => r.id), ['paid']);
      expect(applyFilters(rows, StatusFilter.paid, 'hall'), isEmpty);
    });
  });

  group('grouping', () {
    final events = [
      const WeddingEvent(id: 'b', type: 'BARAT', name: 'Barat', budgetAllocated: 0, status: 'PLANNED', order: 5),
      const WeddingEvent(id: 'm', type: 'MEHNDI', name: 'Mehndi', budgetAllocated: 0, status: 'PLANNED', order: 3),
    ];
    final rows = [
      x('1', eventId: 'b', category: 'FOOD', est: 10),
      x('2', eventId: null, category: 'DRESS', est: 500),
      x('3', eventId: 'm', category: 'FOOD', est: 20),
    ];

    test('by event: whole wedding first, then event order', () {
      final g = groupExpenses(rows, GroupBy.event, events);
      expect(g.map((e) => e.label), ['Whole wedding', 'Mehndi', 'Barat']);
    });

    test('by category: biggest first', () {
      final g = groupExpenses(rows, GroupBy.category, events);
      expect(g.map((e) => e.key), ['DRESS', 'FOOD']);
      expect(g.last.rows, hasLength(2));
    });

    test('none: one unlabelled group', () {
      final g = groupExpenses(rows, GroupBy.none, events);
      expect(g, hasLength(1));
      expect(g.single.label, '');
    });
  });

  group('entry', () {
    WeddingSummary w(String id, String status) => WeddingSummary(
          id: id,
          brideName: 'A',
          groomName: 'B',
          totalBudget: 0,
          status: status,
          eventCount: 0,
          totals: const WeddingTotals(),
        );

    test('opens directly only when exactly one wedding is not done', () {
      expect(soleActiveWedding([w('1', 'PLANNING')])?.id, '1');
      expect(soleActiveWedding([w('1', 'PLANNING'), w('2', 'DONE')])?.id, '1');
      expect(soleActiveWedding([w('1', 'PLANNING'), w('2', 'IN_PROGRESS')]), isNull);
      expect(soleActiveWedding([w('1', 'DONE')]), isNull);
      expect(soleActiveWedding(const []), isNull);
    });

    test('remembered event falls back to whole wedding when gone', () {
      final events = [const WeddingEvent(id: 'm', type: 'MEHNDI', name: 'Mehndi', budgetAllocated: 0, status: 'PLANNED', order: 1)];
      expect(resolveRememberedEvent('m', events), 'm');
      expect(resolveRememberedEvent('gone', events), isNull);
      expect(resolveRememberedEvent('general', events), isNull);
      expect(resolveRememberedEvent(null, events), isNull);
    });
  });

  group('attention', () {
    String m(int p) => 'M$p';
    final now = DateTime(2027, 1, 10, 15);
    WeddingPlan plan({DateTime? date, List<WeddingEvent> events = const [], List<WeddingExpense> expenses = const []}) => WeddingPlan(
          id: 'p',
          brideName: 'A',
          groomName: 'B',
          totalBudget: 0,
          status: 'PLANNING',
          weddingDate: date,
          events: events,
          expenses: expenses,
        );

    test('flags over-budget events, quotes to choose and unpaid soon', () {
      final ev = WeddingEvent(id: 'e', type: 'MEHNDI', name: 'Mehndi', budgetAllocated: 100, status: 'PLANNED', order: 1, date: DateTime(2027, 1, 12));
      final items = attentionItems(
        plan(events: [ev], expenses: [
          x('a', eventId: 'e', est: 150),
          x('b', quotes: [q('1', 1), q('2', 2)]),
        ]),
        now,
        money: m,
      );
      expect(items.map((i) => i.kind), [AttentionKind.over, AttentionKind.quote, AttentionKind.unpaidSoon]);
      expect(items.first.text, 'Mehndi is M50 over budget');
      expect(items.last.text, 'Mehndi is in 2 days - 1 unpaid');
    });

    test('unpriced expenses only matter within 60 days of the wedding', () {
      final soon = attentionItems(plan(date: DateTime(2027, 2, 1), expenses: [x('a')]), now, money: m);
      expect(soon.single.kind, AttentionKind.price);
      final far = attentionItems(plan(date: DateTime(2027, 9, 1), expenses: [x('a')]), now, money: m);
      expect(far, isEmpty);
    });
  });

  test('formatShort', () {
    expect(formatShort(850000), 'PKR 8,500');
    expect(formatShort(34500000), 'PKR 345k');
    expect(formatShort(120000000), 'PKR 1.2M');
    expect(formatShort(-120000000), '-PKR 1.2M');
  });
}
