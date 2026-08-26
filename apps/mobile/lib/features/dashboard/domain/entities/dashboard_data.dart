import '../../../expenses/domain/entities/category_entity.dart';

class BudgetSummary {
  const BudgetSummary({
    required this.totalBudgetPaisas,
    required this.totalSpentPaisas,
    required this.remainingPaisas,
  });
  final int totalBudgetPaisas;
  final int totalSpentPaisas;
  final int remainingPaisas;
}

class RecentTransaction {
  const RecentTransaction({
    required this.id,
    required this.amountPaisas,
    required this.type,
    required this.description,
    required this.date,
    required this.category,
  });
  final String id;
  final int amountPaisas;
  final String type;
  final String description;
  final DateTime date;
  final CategoryEntity category;
}

class DashboardData {
  const DashboardData({
    required this.month,
    required this.year,
    required this.periodLabel,
    required this.totalIncomePaisas,
    required this.totalExpensesPaisas,
    required this.netSavingsPaisas,
    required this.budget,
    required this.recentTransactions,
  });
  final int month;
  final int year;
  final String periodLabel;
  final int totalIncomePaisas;
  final int totalExpensesPaisas;
  final int netSavingsPaisas;
  final BudgetSummary? budget;
  final List<RecentTransaction> recentTransactions;
}
