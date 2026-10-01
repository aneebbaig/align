import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

import 'package:align/core/theme/app_colors.dart';
import 'package:align/core/widgets/app_progress_bar.dart';
import 'package:align/core/widgets/app_summary_card.dart';

Widget _wrap(Widget child) => MaterialApp(home: Scaffold(body: child));
Color? _colorOf(WidgetTester tester, String text) => tester.widget<Text>(find.text(text)).style?.color;

void main() {
  testWidgets('shows the headline figure with its label', (tester) async {
    await tester.pumpWidget(_wrap(const AppSummaryCard(label: 'Spent this month', value: 'Rs 84,200')));
    expect(find.text('Spent this month'), findsOneWidget);
    expect(find.text('Rs 84,200'), findsOneWidget);
  });

  testWidgets('no bar when there is nothing to measure against', (tester) async {
    await tester.pumpWidget(_wrap(const AppSummaryCard(label: 'Spent', value: 'Rs 1', caption: 'No budget set')));
    expect(find.byType(AppProgressBar), findsNothing);
    expect(find.text('No budget set'), findsOneWidget);
  });

  testWidgets('shows the bar with its percentage', (tester) async {
    await tester.pumpWidget(_wrap(const AppSummaryCard(
      label: 'Spent',
      value: 'Rs 84,200',
      progress: 0.7,
      progressLabel: '70%',
      caption: 'of Rs 120,000 budget · Rs 35,800 left',
    )));
    expect(find.byType(AppProgressBar), findsOneWidget);
    expect(tester.widget<AppProgressBar>(find.byType(AppProgressBar)).value, 0.7);
    expect(find.text('70%'), findsOneWidget);
  });

  testWidgets('footer row shows the second figure in its tone', (tester) async {
    await tester.pumpWidget(_wrap(const AppSummaryCard(
      label: 'Income',
      value: 'Rs 155,000',
      footerLabel: 'Over-allocated',
      footerValue: '-Rs 2,000',
      footerColor: AppColors.destructive,
    )));
    expect(find.text('Over-allocated'), findsOneWidget);
    expect(_colorOf(tester, '-Rs 2,000'), AppColors.destructive);
  });
}
