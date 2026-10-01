class LoanPaymentEntity {
  const LoanPaymentEntity({
    required this.id,
    required this.amountPaisas,
    required this.date,
    required this.hasTransaction,
    this.kind = 'PAYMENT',
    this.notes,
  });

  final String id;
  final int amountPaisas;
  final DateTime date;
  final String? notes;
  // False for the legacy "mark fully paid" shortcut, which doesn't book a
  // ledger transaction - those payments can be deleted but not edited.
  final bool hasTransaction;
  final String kind; // PAYMENT | TOP_UP | WRITE_OFF
}

class LoanEntity {
  const LoanEntity({
    required this.id,
    required this.personName,
    required this.type,
    required this.principalPaisas,
    required this.remainingPaisas,
    required this.date,
    required this.status,
    required this.recentPayments,
    this.description,
    this.dueDate,
    this.notes,
    this.offersWriteOffExpense = false,
  });

  final String id;
  final String personName;
  final String? description;
  final String type; // GIVEN | RECEIVED
  final int principalPaisas;
  final int remainingPaisas;
  final DateTime date;
  final DateTime? dueDate;
  final String status; // ACTIVE | PARTIALLY_PAID | PAID | WRITTEN_OFF
  final String? notes;
  final List<LoanPaymentEntity> recentPayments;
  // True only for a lent loan created track-only - see the web balance rules.
  final bool offersWriteOffExpense;

  bool get isClosed => status == 'PAID' || status == 'WRITTEN_OFF';

  double get paidPct =>
      principalPaisas > 0
          ? ((principalPaisas - remainingPaisas) / principalPaisas).clamp(0.0, 1.0)
          : 0.0;
}
