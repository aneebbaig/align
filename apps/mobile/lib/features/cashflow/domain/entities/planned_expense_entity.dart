class PlannedExpenseEntity {
  const PlannedExpenseEntity({
    required this.id,
    required this.name,
    required this.amountPaisas,
    required this.dueDate,
    required this.flexibility,
    required this.priority,
    required this.slideWindowMonths,
    required this.status,
    this.categoryId,
    this.notes,
  });

  final String id;
  final String name;
  final int amountPaisas;
  final DateTime dueDate;
  final String flexibility; // FIXED | FLEXIBLE
  final int priority;
  final int slideWindowMonths;
  final String? categoryId;
  final String? notes;
  final String status; // PLANNED | PAID | SKIPPED
}
