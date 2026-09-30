// Mirrors GET /api/v1/planner. The server computes every row, so the app only
// renders - it never redoes the maths.

class PlannerSettingsEntity {
  const PlannerSettingsEntity({
    required this.startMonth,
    required this.startYear,
    required this.months,
    required this.startingCashPaisas,
    required this.usdRate,
  });

  final int startMonth;
  final int startYear;
  final int months;
  final int startingCashPaisas;
  final double usdRate;

  factory PlannerSettingsEntity.fromJson(Map<String, dynamic> m) => PlannerSettingsEntity(
        startMonth: m['startMonth'] as int,
        startYear: m['startYear'] as int,
        months: m['months'] as int,
        startingCashPaisas: m['startingCashPaisas'] as int,
        usdRate: (m['usdRate'] as num).toDouble(),
      );
}

class PlannerLineEntity {
  const PlannerLineEntity({
    required this.id,
    required this.name,
    required this.direction,
    required this.currency,
    required this.order,
  });

  final String id;
  final String name;
  final String direction; // IN | OUT
  final String currency; // PKR | USD
  final int order;

  bool get isIn => direction == 'IN';
  bool get isUsd => currency == 'USD';

  factory PlannerLineEntity.fromJson(Map<String, dynamic> m) => PlannerLineEntity(
        id: m['id'] as String,
        name: m['name'] as String,
        direction: m['direction'] as String,
        currency: m['currency'] as String,
        order: m['order'] as int,
      );
}

class PlannerCellEntity {
  const PlannerCellEntity({
    required this.lineId,
    required this.native,
    required this.pkr,
    required this.signed,
    required this.isOverride,
  });

  final String lineId;
  final int native; // the line's own unit (paisas or cents)
  final int pkr; // paisas
  final int signed;
  final bool isOverride;

  factory PlannerCellEntity.fromJson(Map<String, dynamic> m) => PlannerCellEntity(
        lineId: m['lineId'] as String,
        native: m['native'] as int,
        pkr: m['pkr'] as int,
        signed: m['signed'] as int,
        isOverride: m['isOverride'] as bool,
      );
}

class PlannerGoalEntity {
  const PlannerGoalEntity({required this.id, required this.name, required this.amountPaisas, this.note});

  final String id;
  final String name;
  final int amountPaisas;
  final String? note;

  factory PlannerGoalEntity.fromJson(Map<String, dynamic> m) => PlannerGoalEntity(
        id: m['id'] as String,
        name: m['name'] as String,
        amountPaisas: m['amountPaisas'] as int,
        note: m['note'] as String?,
      );
}

class PlannerRowEntity {
  const PlannerRowEntity({
    required this.month,
    required this.year,
    required this.cells,
    required this.goals,
    required this.goalsTotal,
    required this.net,
    required this.available,
  });

  final int month;
  final int year;
  final List<PlannerCellEntity> cells;
  final List<PlannerGoalEntity> goals;
  final int goalsTotal;
  final int net;
  final int available;

  PlannerCellEntity? cellFor(String lineId) {
    for (final c in cells) {
      if (c.lineId == lineId) return c;
    }
    return null;
  }

  factory PlannerRowEntity.fromJson(Map<String, dynamic> m) => PlannerRowEntity(
        month: m['month'] as int,
        year: m['year'] as int,
        cells: (m['cells'] as List<dynamic>).map((c) => PlannerCellEntity.fromJson(c as Map<String, dynamic>)).toList(),
        goals: (m['goals'] as List<dynamic>).map((g) => PlannerGoalEntity.fromJson(g as Map<String, dynamic>)).toList(),
        goalsTotal: m['goalsTotal'] as int,
        net: m['net'] as int,
        available: m['available'] as int,
      );
}

class PlannerData {
  const PlannerData({required this.settings, required this.lines, required this.rows});

  final PlannerSettingsEntity settings;
  final List<PlannerLineEntity> lines;
  final List<PlannerRowEntity> rows;

  factory PlannerData.fromJson(Map<String, dynamic> m) => PlannerData(
        settings: PlannerSettingsEntity.fromJson(m['settings'] as Map<String, dynamic>),
        lines: (m['lines'] as List<dynamic>).map((l) => PlannerLineEntity.fromJson(l as Map<String, dynamic>)).toList(),
        rows: (m['rows'] as List<dynamic>).map((r) => PlannerRowEntity.fromJson(r as Map<String, dynamic>)).toList(),
      );
}
