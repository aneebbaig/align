class SavingsPotEntity {
  const SavingsPotEntity({
    required this.id,
    required this.name,
    required this.icon,
    required this.color,
    required this.type,
    required this.targetPaisas,
    required this.currentPaisas,
    required this.currentUsdCents,
    this.targetDate,
  });

  final String id;
  final String name;
  final String icon;
  final String color;
  final String type;
  final int targetPaisas;
  final int currentPaisas;
  final int currentUsdCents;
  final DateTime? targetDate;

  double get progressPct =>
      targetPaisas > 0 ? (currentPaisas / targetPaisas).clamp(0.0, 1.0) : 0.0;
}
