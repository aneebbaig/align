import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

import 'package:align/features/planner/presentation/widgets/planner_sheets.dart';

void main() {
  Future<List<(int, String)>> pumpAndTap(WidgetTester tester, String button, {String? type}) async {
    final calls = <(int, String)>[];
    await tester.pumpWidget(MaterialApp(
      home: Scaffold(
        body: CellEditSheet(
          title: 'Savings · Jan 2027',
          isUsd: false,
          initialNative: 5000000,
          isOverride: false,
          onSave: (amount, scope) async => calls.add((amount, scope)),
        ),
      ),
    ));
    if (type != null) await tester.enterText(find.byType(TextField), type);
    await tester.tap(find.text(button));
    await tester.pump();
    return calls;
  }

  testWidgets('prefills the current amount in rupees', (tester) async {
    await pumpAndTap(tester, 'Just this month');
    expect(find.text('50000'), findsOneWidget);
  });

  testWidgets('"From this month on" saves a FROM_HERE step in paisas', (tester) async {
    final calls = await pumpAndTap(tester, 'From this month on', type: '30000');
    expect(calls, [(3000000, 'FROM_HERE')]);
  });

  testWidgets('"Just this month" saves a THIS_MONTH override', (tester) async {
    final calls = await pumpAndTap(tester, 'Just this month', type: '12.5');
    expect(calls, [(1250, 'THIS_MONTH')]);
  });
}
