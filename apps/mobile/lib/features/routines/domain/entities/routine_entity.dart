/// A timed routine. Weekday routines repeat on [days] (ISO 1-7, Monday = 1);
/// a one-off has no days and a single [date] ("YYYY-MM-DD").
class RoutineEntity {
  const RoutineEntity({
    required this.id,
    required this.title,
    required this.time,
    required this.days,
    required this.date,
    required this.active,
  });

  factory RoutineEntity.fromJson(Map<String, dynamic> j) => RoutineEntity(
        id: j['id'] as String,
        title: j['title'] as String,
        time: j['time'] as String,
        days: (j['days'] as List<dynamic>).map((e) => e as int).toList(),
        date: j['date'] as String?,
        active: j['active'] as bool,
      );

  final String id;
  final String title;
  final String time; // "HH:mm"
  final List<int> days;
  final String? date;
  final bool active;

  bool get isOneOff => days.isEmpty;
  int get hour => int.parse(time.substring(0, 2));
  int get minute => int.parse(time.substring(3, 5));
}

/// One scheduled item on a given day, with whether and when it was ticked.
class DayItemEntity {
  const DayItemEntity({
    required this.routineId,
    required this.title,
    required this.time,
    required this.done,
    required this.completedAt,
    required this.deltaMinutes,
  });

  factory DayItemEntity.fromJson(Map<String, dynamic> j) => DayItemEntity(
        routineId: j['routineId'] as String,
        title: j['title'] as String,
        time: j['time'] as String,
        done: j['done'] as bool,
        completedAt: j['completedAt'] == null ? null : DateTime.parse(j['completedAt'] as String),
        deltaMinutes: j['deltaMinutes'] as int?,
      );

  final String routineId;
  final String title;
  final String time;
  final bool done;
  final DateTime? completedAt;

  /// Minutes between the scheduled time and the tick (negative = early).
  final int? deltaMinutes;

  DayItemEntity copyWith({bool? done, DateTime? completedAt, int? deltaMinutes, bool clear = false}) => DayItemEntity(
        routineId: routineId,
        title: title,
        time: time,
        done: done ?? this.done,
        completedAt: clear ? null : (completedAt ?? this.completedAt),
        deltaMinutes: clear ? null : (deltaMinutes ?? this.deltaMinutes),
      );
}

class DayStatEntity {
  const DayStatEntity({required this.date, required this.scheduled, required this.done});

  factory DayStatEntity.fromJson(Map<String, dynamic> j) =>
      DayStatEntity(date: j['date'] as String, scheduled: j['scheduled'] as int, done: j['done'] as int);

  final String date;
  final int scheduled;
  final int done;
}

class RoutineStatsEntity {
  const RoutineStatsEntity({required this.days, required this.currentStreak, required this.bestStreak});

  factory RoutineStatsEntity.fromJson(Map<String, dynamic> j) => RoutineStatsEntity(
        days: (j['days'] as List<dynamic>).map((e) => DayStatEntity.fromJson(e as Map<String, dynamic>)).toList(),
        currentStreak: j['currentStreak'] as int,
        bestStreak: j['bestStreak'] as int,
      );

  final List<DayStatEntity> days;
  final int currentStreak;
  final int bestStreak;
}
