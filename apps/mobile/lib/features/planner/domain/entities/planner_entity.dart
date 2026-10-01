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
  final int months; // 1..120
  final int startingCashPaisas;
  final double usdRate; // the planner's own PKR per USD

  DateTime get start => DateTime(startYear, startMonth);
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
  final int native; // the line's own unit: paisas, or cents for USD lines
  final int pkr; // paisas
  final int signed; // +pkr for IN lines, -pkr for OUT lines
  final bool isOverride; // set "just this month"
}

class PlannerGoalEntity {
  const PlannerGoalEntity({required this.id, required this.name, required this.amountPaisas, this.note});

  final String id;
  final String name;
  final int amountPaisas;
  final String? note;
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
  final int net; // money in - money out, before goals
  final int available; // running balance after goals

  DateTime get date => DateTime(year, month);

  PlannerCellEntity? cellFor(String lineId) {
    for (final c in cells) {
      if (c.lineId == lineId) return c;
    }
    return null;
  }
}

/// The whole planner as GET /api/v1/planner returns it. The server computes
/// every row, so the app only renders - it never redoes the maths.
class PlannerData {
  const PlannerData({required this.settings, required this.lines, required this.rows});

  final PlannerSettingsEntity settings;
  final List<PlannerLineEntity> lines;
  final List<PlannerRowEntity> rows;

  bool get isEmpty => lines.isEmpty && rows.every((r) => r.goals.isEmpty);
}
