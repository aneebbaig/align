import 'package:riverpod_annotation/riverpod_annotation.dart';
import 'package:shared_preferences/shared_preferences.dart';

import '../../data/wedding_datasource.dart';
import '../../domain/wedding_models.dart';

part 'wedding_provider.g.dart';

@riverpod
Future<List<WeddingSummary>> weddingList(Ref ref) => ref.watch(weddingDatasourceProvider).list();

@riverpod
Future<WeddingPlan> weddingPlan(Ref ref, String id) => ref.watch(weddingDatasourceProvider).plan(id);

/// Remembers which event quick-add last used, per wedding.
class WeddingLastEvent {
  const WeddingLastEvent._();
  static String _key(String planId) => 'wedding_last_event_$planId';

  static Future<String?> read(String planId) async {
    final prefs = await SharedPreferences.getInstance();
    return prefs.getString(_key(planId));
  }

  static Future<void> write(String planId, String eventKey) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(_key(planId), eventKey);
  }
}
