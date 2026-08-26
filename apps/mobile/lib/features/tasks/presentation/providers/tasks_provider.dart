import 'package:riverpod_annotation/riverpod_annotation.dart';

import '../../data/datasources/tasks_datasource.dart';
import '../../domain/entities/task_entity.dart';

part 'tasks_provider.g.dart';

@riverpod
Future<List<TaskEntity>> tasks(Ref ref) =>
    ref.watch(tasksDatasourceProvider).getTasks();

@riverpod
class CreateTask extends _$CreateTask {
  @override
  AsyncValue<String?> build() => const AsyncData(null);

  Future<String?> submit({
    required String title,
    String? description,
    String type = 'ONE_TIME',
    String priority = 'MEDIUM',
    String? dueDate,
    String? category,
  }) async {
    state = const AsyncLoading();
    try {
      final id = await ref.read(tasksDatasourceProvider).createTask(
            title: title,
            description: description,
            type: type,
            priority: priority,
            dueDate: dueDate,
            category: category,
          );
      state = AsyncData(id);
      return id;
    } catch (e, st) {
      state = AsyncError(e, st);
      rethrow;
    }
  }
}

@riverpod
class UpdateTaskStatus extends _$UpdateTaskStatus {
  @override
  AsyncValue<void> build() => const AsyncData(null);

  Future<void> call(String id, String status) async {
    state = const AsyncLoading();
    try {
      await ref.read(tasksDatasourceProvider).updateTaskStatus(id, status);
      state = const AsyncData(null);
      ref.invalidate(tasksProvider);
    } catch (e, st) {
      state = AsyncError(e, st);
      rethrow;
    }
  }
}

@riverpod
class DeleteTask extends _$DeleteTask {
  @override
  AsyncValue<void> build() => const AsyncData(null);

  Future<void> call(String id) async {
    state = const AsyncLoading();
    try {
      await ref.read(tasksDatasourceProvider).deleteTask(id);
      state = const AsyncData(null);
      ref.invalidate(tasksProvider);
    } catch (e, st) {
      state = AsyncError(e, st);
      rethrow;
    }
  }
}
