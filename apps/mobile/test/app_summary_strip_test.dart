import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

import 'package:align/core/theme/app_colors.dart';
import 'package:align/core/widgets/app_summary_strip.dart';

Widget _wrap(Widget child) => MaterialApp(home: Scaffold(body: child));

Color? _colorOf(WidgetTester tester, String text) => tester.widget<Text>(find.text(text)).style?.color;

void main() {
  testWidgets('shows a dash when there is no budget', (tester) async {
    await tester.pumpWidget(_wrap(const AppSummaryStrip(items: [
      AppSummaryItem(label: 'Budget', value: '–', tone: AppSummaryTone.muted),
    ])));
    expect(find.text('BUDGET'), findsOneWidget);
    expect(_colorOf(tester, '–'), AppColors.mutedForeground);
  });

  testWidgets('under budget is green', (tester) async {
    await tester.pumpWidget(_wrap(const AppSummaryStrip(items: [
      AppSummaryItem(label: 'Under', value: 'Rs 5,000', tone: AppSummaryTone.positive),
    ])));
    expect(_colorOf(tester, 'Rs 5,000'), AppColors.success);
  });

  testWidgets('over budget is red with a caption', (tester) async {
    await tester.pumpWidget(_wrap(const AppSummaryStrip(items: [
      AppSummaryItem(label: 'Over', value: 'Rs 1,200', tone: AppSummaryTone.negative, caption: 'over budget'),
    ])));
    expect(_colorOf(tester, 'Rs 1,200'), AppColors.destructive);
    expect(find.text('over budget'), findsOneWidget);
  });
}
