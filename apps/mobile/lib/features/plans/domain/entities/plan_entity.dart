class PlanEntity {
  const PlanEntity({
    required this.id,
    required this.name,
    required this.icon,
    required this.coverColor,
    required this.planType,
    required this.status,
    required this.totalEstimatedPaisas,
    required this.totalPaidPaisas,
    required this.itemCount,
    required this.paidCount,
    this.targetDate,
  });

  final String id;
  final String name;
  final String icon;
  final String coverColor;
  final String planType; // FIXED | ITEMIZED
  final String status;
  final int totalEstimatedPaisas;
  final int totalPaidPaisas;
  final int itemCount;
  final int paidCount;
  final DateTime? targetDate;

  double get progress => itemCount > 0 ? paidCount / itemCount : 0;
}

class PlanItemEntity {
  const PlanItemEntity({
    required this.id,
    required this.name,
    required this.estimatedPaisas,
    required this.status,
    this.actualPaisas,
    this.notes,
    this.vendor,
    this.dueDate,
  });

  final String id;
  final String name;
  final int estimatedPaisas;
  final int? actualPaisas;
  final String status; // PENDING | BOOKED | PAID | SKIPPED
  final String? notes;
  final String? vendor;
  final DateTime? dueDate;

  bool get isBought => status == 'PAID';
}

class PlanAffordability {
  const PlanAffordability({
    required this.liquidAvailablePaisas,
    required this.investmentsTotalPaisas,
    required this.netWorthPaisas,
    required this.coveragePct,
    required this.canAfford,
  });

  final int liquidAvailablePaisas;
  final int investmentsTotalPaisas;
  final int netWorthPaisas;
  final int coveragePct;
  final bool canAfford;
}

class PlanDetailEntity {
  const PlanDetailEntity({
    required this.id,
    required this.name,
    required this.planType,
    required this.status,
    required this.totalEstimatedPaisas,
    required this.totalPaidPaisas,
    required this.remainingPaisas,
    required this.items,
    required this.affordability,
    this.targetDate,
  });

  final String id;
  final String name;
  final String planType;
  final String status;
  final int totalEstimatedPaisas;
  final int totalPaidPaisas;
  final int remainingPaisas;
  final List<PlanItemEntity> items;
  final PlanAffordability affordability;
  final DateTime? targetDate;
}
