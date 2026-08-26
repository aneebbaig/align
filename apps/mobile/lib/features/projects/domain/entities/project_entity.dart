class ProjectEntity {
  const ProjectEntity({
    required this.id,
    required this.name,
    required this.color,
    required this.status,
    required this.taskCount,
    required this.doneCount,
    required this.createdAt,
    required this.updatedAt,
    this.description,
    this.client,
    this.dueDate,
    this.notes,
    this.links = const [],
    this.tasks = const [],
    this.recentTasks = const [],
  });

  final String id;
  final String name;
  final String? description;
  final String? client;
  final String color; // hex string e.g. "#6366F1"
  final String status; // ACTIVE | ON_HOLD | COMPLETED | CANCELLED
  final DateTime? dueDate;
  final DateTime createdAt;
  final DateTime updatedAt;
  final String? notes;
  final List<ProjectLinkEntity> links;
  final int taskCount;
  final int doneCount;
  final List<ProjectTaskEntity> tasks;
  final List<ProjectTaskEntity> recentTasks;

  bool get isActive => status == 'ACTIVE';
  double get progress => taskCount == 0 ? 0 : doneCount / taskCount;

  /// List payload - task counts come from the API summary; [tasks] stays empty.
  factory ProjectEntity.fromSummaryJson(Map<String, dynamic> m) => ProjectEntity(
        id: m['id'] as String,
        name: m['name'] as String,
        description: m['description'] as String?,
        client: m['client'] as String?,
        color: m['color'] as String? ?? '#6366F1',
        status: m['status'] as String,
        dueDate: m['dueDate'] != null ? DateTime.parse(m['dueDate'] as String) : null,
        createdAt: DateTime.parse(m['createdAt'] as String),
        updatedAt: DateTime.parse(m['updatedAt'] as String),
        taskCount: m['taskCount'] as int? ?? 0,
        doneCount: m['doneCount'] as int? ?? 0,
        recentTasks: (m['recentTasks'] as List<dynamic>? ?? [])
            .map((t) => ProjectTaskEntity.fromJson(t as Map<String, dynamic>))
            .toList(),
      );

  /// Detail payload - includes the full task list.
  factory ProjectEntity.fromDetailJson(Map<String, dynamic> m) {
    final tasks = (m['tasks'] as List<dynamic>? ?? [])
        .map((t) => ProjectTaskEntity.fromJson(t as Map<String, dynamic>))
        .toList();
    return ProjectEntity(
      id: m['id'] as String,
      name: m['name'] as String,
      description: m['description'] as String?,
      client: m['client'] as String?,
      color: m['color'] as String? ?? '#6366F1',
      status: m['status'] as String,
      dueDate: m['dueDate'] != null ? DateTime.parse(m['dueDate'] as String) : null,
      createdAt: DateTime.parse(m['createdAt'] as String),
      updatedAt: DateTime.parse(m['updatedAt'] as String),
      notes: m['notes'] as String?,
      links: (m['links'] as List<dynamic>? ?? [])
          .map((l) => ProjectLinkEntity.fromJson(l as Map<String, dynamic>))
          .toList(),
      taskCount: tasks.length,
      doneCount: tasks.where((t) => t.isDone).length,
      tasks: tasks,
    );
  }
}

class ProjectLinkEntity {
  const ProjectLinkEntity({required this.id, required this.label, required this.url});

  final String id;
  final String label;
  final String url;

  Map<String, dynamic> toJson() => {'id': id, 'label': label, 'url': url};

  factory ProjectLinkEntity.fromJson(Map<String, dynamic> m) => ProjectLinkEntity(
        id: m['id'] as String? ?? '',
        label: m['label'] as String? ?? '',
        url: m['url'] as String? ?? '',
      );
}

class ProjectTaskEntity {
  const ProjectTaskEntity({
    required this.id,
    required this.title,
    required this.status,
    required this.priority,
    required this.order,
    this.description,
    this.dueDate,
    this.tags = const [],
  });

  final String id;
  final String title;
  final String? description;
  final String status; // TODO | IN_PROGRESS | REVIEW | DONE
  final String priority; // LOW | MEDIUM | HIGH | URGENT
  final DateTime? dueDate;
  final int order;
  final List<TagEntity> tags;

  bool get isDone => status == 'DONE';

  ProjectTaskEntity copyWith({String? status, int? order, List<TagEntity>? tags}) => ProjectTaskEntity(
        id: id,
        title: title,
        description: description,
        status: status ?? this.status,
        priority: priority,
        dueDate: dueDate,
        order: order ?? this.order,
        tags: tags ?? this.tags,
      );

  factory ProjectTaskEntity.fromJson(Map<String, dynamic> m) => ProjectTaskEntity(
        id: m['id'] as String,
        title: m['title'] as String,
        description: m['description'] as String?,
        status: m['status'] as String,
        priority: m['priority'] as String? ?? 'MEDIUM',
        dueDate: m['dueDate'] != null ? DateTime.parse(m['dueDate'] as String) : null,
        order: m['order'] as int? ?? 0,
        tags: (m['tags'] as List<dynamic>? ?? [])
            .map((t) => TagEntity.fromJson(t as Map<String, dynamic>))
            .toList(),
      );
}

class TagEntity {
  const TagEntity({required this.id, required this.name, required this.color});

  final String id;
  final String name;
  final String color; // hex string e.g. "#6366f1"

  factory TagEntity.fromJson(Map<String, dynamic> m) => TagEntity(
        id: m['id'] as String,
        name: m['name'] as String,
        color: m['color'] as String? ?? '#6366f1',
      );
}
