class ContributionEntity {
  const ContributionEntity({
    required this.id,
    required this.amountPaisas,
    required this.date,
    this.notes,
  });

  final String id;
  final int amountPaisas;
  final DateTime date;
  final String? notes;
}

class InvestmentEntity {
  const InvestmentEntity({
    required this.id,
    required this.name,
    required this.type,
    required this.platform,
    required this.investedPaisas,
    required this.currentValuePaisas,
    required this.purchaseDate,
    required this.contributions,
    this.units,
    this.notes,
    this.planCategoryId,
  });

  final String id;
  final String name;
  final String type; // MUTUAL_FUND | STOCKS | GOLD | CRYPTO | FIXED_DEPOSIT | OTHER
  final String platform;
  final int investedPaisas;
  final int currentValuePaisas;
  final DateTime purchaseDate;
  final List<ContributionEntity> contributions;
  final double? units;
  final String? notes;
  final String? planCategoryId;

  int get gainPaisas => currentValuePaisas - investedPaisas;
  double get gainPct =>
      investedPaisas > 0 ? (gainPaisas / investedPaisas) * 100 : 0;
}

class PlanCategoryEntity {
  const PlanCategoryEntity({
    required this.id,
    required this.name,
    required this.percentage,
    this.investmentType,
    this.plannedPaisas = 0,
    this.actualPaisas = 0,
  });

  final String id;
  final String name;
  final String? investmentType;
  final int percentage;
  final int plannedPaisas;
  final int actualPaisas;
}

class InvestmentPlanEntity {
  const InvestmentPlanEntity({
    required this.id,
    required this.monthlyTargetPaisas,
    required this.autoFromSurplus,
    required this.categories,
  });

  final String id;
  final int monthlyTargetPaisas;
  final bool autoFromSurplus;
  final List<PlanCategoryEntity> categories;
}

class InvestmentsData {
  const InvestmentsData({
    required this.totalInvestedPaisas,
    required this.totalCurrentValuePaisas,
    required this.totalGainPaisas,
    required this.investments,
    this.plan,
  });

  final int totalInvestedPaisas;
  final int totalCurrentValuePaisas;
  final int totalGainPaisas;
  final List<InvestmentEntity> investments;
  final InvestmentPlanEntity? plan;
}
