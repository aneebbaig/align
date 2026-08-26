class TaskEntity {
  const TaskEntity({
    required this.id,
    required this.title,
    required this.type,
    required this.priority,
    required this.status,
    required this.order,
    this.description,
    this.dueDate,
    this.dueTime,
    this.category,
  });

  final String id;
  final String title;
  final String? description;
  final String type; // DAILY | ONE_TIME
  final String priority; // LOW | MEDIUM | HIGH | URGENT
  final String status; // PENDING | IN_PROGRESS | DONE | SKIPPED
  final DateTime? dueDate;
  final String? dueTime;
  final String? category;
  final int order;

  bool get isDone => status == 'DONE';
  bool get isDaily => type == 'DAILY';
  bool get isOneTime => type == 'ONE_TIME';

  TaskEntity copyWith({
    String? status,
  }) => TaskEntity(
        id: id,
        title: title,
        description: description,
        type: type,
        priority: priority,
        status: status ?? this.status,
        dueDate: dueDate,
        dueTime: dueTime,
        category: category,
        order: order,
      );
}
