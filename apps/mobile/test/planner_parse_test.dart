import 'package:flutter_test/flutter_test.dart';

import 'package:align/features/planner/data/datasources/planner_datasource.dart';

void main() {
  test('parses the planner API shape', () {
    final data = PlannerDatasource.parsePlanner({
      'settings': {'startMonth': 9, 'startYear': 2026, 'months': 2, 'startingCashPaisas': 0, 'usdRate': 278},
      'lines': [
        {'id': 'l1', 'name': 'Freelance', 'direction': 'IN', 'currency': 'USD', 'order': 1, 'steps': [], 'overrides': []},
      ],
      'goals': [],
      'rows': [
        {
          'month': 9, 'year': 2026,
          'cells': [{'lineId': 'l1', 'native': 35000, 'pkr': 9730000, 'signed': 9730000, 'isOverride': true}],
          'goals': [{'id': 'g1', 'name': 'Engine Swap', 'amountPaisas': 30000000, 'note': 'spent'}],
          'goalsTotal': 30000000, 'net': 9730000, 'available': -20270000,
        },
      ],
    });
    expect(data.settings.usdRate, 278.0);
    expect(data.lines.single.isUsd, isTrue);
    expect(data.lines.single.isIn, isTrue);
    final row = data.rows.single;
    expect(row.cellFor('l1')!.isOverride, isTrue);
    expect(row.cellFor('l1')!.pkr, 9730000);
    expect(row.cellFor('missing'), isNull);
    expect(row.goals.single.name, 'Engine Swap');
    expect(row.available, -20270000);
  });
}
