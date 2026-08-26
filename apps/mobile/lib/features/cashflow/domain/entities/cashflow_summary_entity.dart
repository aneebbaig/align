class UpcomingDueEntity {
  const UpcomingDueEntity({
    required this.sourceId,
    required this.payee,
    required this.category,
    required this.amountPaisas,
    required this.dueDate,
    required this.daysUntil,
  });

  final String sourceId;
  final String payee;
  final String category;
  final int amountPaisas;
  final DateTime dueDate;
  final int daysUntil;
}

class CashflowSummaryEntity {
  const CashflowSummaryEntity({
    required this.dueTotalPaisas,
    required this.leftAfterObligationsPaisas,
    required this.flagged,
    required this.shortfallPaisas,
    required this.alerts,
    this.soonest,
  });

  final int dueTotalPaisas;
  final int leftAfterObligationsPaisas;
  final bool flagged;
  final int shortfallPaisas;
  final UpcomingDueEntity? soonest;
  final List<UpcomingDueEntity> alerts;
}
