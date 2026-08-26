class LoanPaymentEntity {
  const LoanPaymentEntity({
    required this.id,
    required this.amountPaisas,
    required this.date,
    required this.hasTransaction,
    this.notes,
  });

  final String id;
  final int amountPaisas;
  final DateTime date;
  final String? notes;
  // False for the legacy "mark fully paid" shortcut, which doesn't book a
  // ledger transaction - those payments can be deleted but not edited.
  final bool hasTransaction;
}

class LoanScheduleEntity {
  const LoanScheduleEntity({
    required this.id,
    required this.loanId,
    required this.kind,
    required this.amountPaisas,
    required this.startDate,
    required this.flexibility,
    required this.priority,
    required this.slideWindowMonths,
    this.endDate,
    this.interestRate,
    this.fulfilledPaymentId,
  });

  final String id;
  final String loanId;
  final String kind; // LUMP_SUM | FIXED_INSTALLMENT
  final int amountPaisas;
  final DateTime startDate;
  final DateTime? endDate;
  final String flexibility; // FIXED | FLEXIBLE
  final int priority;
  final int slideWindowMonths;
  final double? interestRate;
  // Set once a real LoanPayment has been recorded for this installment.
  final String? fulfilledPaymentId;
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
    this.schedules = const [],
  });

  final String id;
  final String personName;
  final String? description;
  final String type; // GIVEN | RECEIVED
  final int principalPaisas;
  final int remainingPaisas;
  final DateTime date;
  final DateTime? dueDate;
  final String status; // ACTIVE | PARTIALLY_PAID | PAID
  final String? notes;
  final List<LoanPaymentEntity> recentPayments;
  final List<LoanScheduleEntity> schedules;

  double get paidPct =>
      principalPaisas > 0
          ? ((principalPaisas - remainingPaisas) / principalPaisas).clamp(0.0, 1.0)
          : 0.0;
}
