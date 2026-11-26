import 'package:align/features/wedding/domain/wedding_models.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  group('WeddingPlan.fromJson', () {
    final json = {
      'id': 'w1',
      'brideName': 'A',
      'groomName': 'B',
      'weddingDate': '2027-03-04T00:00:00.000Z',
      'haqMehr': null,
      'status': 'PLANNING',
      'events': [
        {'id': 'e1', 'type': 'MEHNDI', 'name': 'Mehndi', 'date': null, 'budgetAllocated': 100000, 'status': 'PLANNED', 'order': 3},
      ],
      'expenses': [
        {
          'id': 'x1',
          'eventId': 'e1',
          'name': 'Dress',
          'category': 'DRESS',
          'estimatedAmount': 5000000,
          'actualAmount': null,
          'paidAmount': 0,
          'vendorName': null,
          'quotes': [
            {'id': 'q1', 'vendorName': 'Zed', 'amount': 4000000, 'isChosen': false},
            {'id': 'q2', 'vendorName': 'Yan', 'amount': 4500000, 'isChosen': true},
          ],
        },
        {'id': 'x2', 'eventId': 'e1', 'name': 'Cake', 'estimatedAmount': 100, 'actualAmount': 90, 'paidAmount': 90},
      ],
    };

    test('parses events, expenses and quotes', () {
      final p = WeddingPlan.fromJson(json);
      expect(p.title, 'A & B');
      expect(p.weddingDate, isNotNull);
      expect(p.haqMehr, isNull);
      expect(p.events.single.order, 3);
      expect(p.expenses, hasLength(2));
      final dress = p.expenses.first;
      expect(dress.eventId, 'e1');
      expect(dress.actualAmount, isNull);
      expect(dress.quotes, hasLength(2));
      expect(dress.hasChosenQuote, isTrue);
      expect(p.budget, 100000);
    });

    test('tolerates missing optional fields', () {
      final cake = WeddingPlan.fromJson(json).expenses.last;
      expect(cake.eventId, 'e1');
      expect(cake.category, 'MISC');
      expect(cake.quotes, isEmpty);
      expect(cake.actualAmount, 90);
    });
  });

  test('WeddingSummary.fromJson reads totals', () {
    final s = WeddingSummary.fromJson({
      'id': 'w',
      'brideName': 'A',
      'groomName': 'B',
      'totalBudget': 1000,
      'status': 'DONE',
      'eventCount': 2,
      'totals': {'count': 3, 'estimated': 10, 'projected': 12, 'actual': 2, 'priced': 1, 'paid': 5, 'outstanding': 7},
    });
    expect(s.isDone, isTrue);
    expect(s.totals.projected, 12);
    expect(s.totals.outstanding, 7);
  });

  test('PreviousPayment.fromJson keeps a null actual', () {
    final p = PreviousPayment.fromJson({'previousActualAmount': null, 'previousPaidAmount': 250});
    expect(p.actualAmount, isNull);
    expect(p.paidAmount, 250);
  });
}
