import 'category_entity.dart';

class ExpenseEntity {
  const ExpenseEntity({
    required this.id,
    required this.amountPaisas,
    required this.description,
    required this.date,
    required this.category,
    this.notes,
    this.isRegretPurchase = false,
    this.budgetMonth,
    this.budgetYear,
    this.fundingSource = 'INCOME',
    this.fundingPotId,
    this.locked = false,
  });

  final String id;
  final int amountPaisas;
  final String description;
  final String? notes;
  final DateTime date;
  final CategoryEntity category;
  final bool isRegretPurchase;

  /// The budget period it is filed under.
  final int? budgetMonth;
  final int? budgetYear;

  /// INCOME | SAVINGS_POT | SPLIT (split is set up on the web).
  final String fundingSource;
  final String? fundingPotId;

  /// Owned by a loan, repayment or investment (or income entered in another
  /// currency): its amount, period and funding are changed there, not here.
  final bool locked;

  bool get isSplit => fundingSource == 'SPLIT';
}

class ExpenseListPage {
  const ExpenseListPage({
    required this.items,
    required this.total,
    required this.page,
    required this.hasMore,
  });

  final List<ExpenseEntity> items;
  final int total;
  final int page;
  final bool hasMore;
}
