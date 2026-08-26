import '../../../expenses/domain/entities/category_entity.dart';

class BudgetCategoryData {
  const BudgetCategoryData({
    required this.id,
    required this.categoryId,
    required this.category,
    required this.allocatedPaisas,
    required this.spentPaisas,
    required this.remainingPaisas,
    required this.pct,
  });

  final String id;
  final String categoryId;
  final CategoryEntity category;
  final int allocatedPaisas;
  final int spentPaisas;
  final int remainingPaisas;
  final int pct;
}

class BudgetData {
  const BudgetData({
    required this.month,
    required this.year,
    required this.periodLabel,
    required this.totalBudgetPaisas,
    required this.totalSpentPaisas,
    required this.remainingPaisas,
    required this.categories,
  });

  final int month;
  final int year;
  final String periodLabel;
  final int? totalBudgetPaisas;
  final int totalSpentPaisas;
  final int? remainingPaisas;
  final List<BudgetCategoryData> categories;

  bool get hasBudget => totalBudgetPaisas != null;
}
