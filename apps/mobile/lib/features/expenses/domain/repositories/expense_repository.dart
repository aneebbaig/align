abstract interface class ExpenseRepository {
  Future<void> deleteExpense(String id);
  Future<String> createExpense({
    required int amountPaisas,
    required String categoryId,
    required String description,
    String? notes,
    required DateTime date,
    bool isRegretPurchase = false,
    int? budgetMonth,
    int? budgetYear,
    String? fundingPotId,
  });
}
