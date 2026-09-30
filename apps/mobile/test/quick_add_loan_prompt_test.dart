import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';

import 'package:align/features/loans/domain/entities/loan_entity.dart';
import 'package:align/features/loans/presentation/pages/quick_add_loan_page.dart';
import 'package:align/features/loans/presentation/providers/loans_provider.dart';

final _existing = LoanEntity(
  id: 'l1',
  personName: 'Ahmed',
  type: 'RECEIVED',
  principalPaisas: 1000000,
  remainingPaisas: 400000,
  date: DateTime(2026, 9, 1),
  status: 'PARTIALLY_PAID',
  recentPayments: const [],
);

void main() {
  // Opened on its own (e.g. from the dashboard or home-screen widget), with no
  // Loans screen underneath keeping the loans list alive.
  testWidgets('offers to add to an open loan with the same person, ignoring case and spaces', (tester) async {
    await tester.pumpWidget(ProviderScope(
      overrides: [loansProvider.overrideWith((ref) async => [_existing])],
      child: const MaterialApp(home: QuickAddLoanPage()),
    ));
    await tester.pumpAndSettle();

    // Amount field comes first on this page, then the person's name.
    await tester.enterText(find.byType(TextField).at(0), '5000');
    await tester.enterText(find.byType(TextField).at(1), '  ahmed ');
    await tester.pump();
    await tester.tap(find.text('Create'));
    await tester.pumpAndSettle();

    expect(find.text('Add to the existing loan?'), findsOneWidget);
  });
}
