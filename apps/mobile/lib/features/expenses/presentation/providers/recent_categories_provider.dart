import 'package:riverpod_annotation/riverpod_annotation.dart';
import 'package:shared_preferences/shared_preferences.dart';

part 'recent_categories_provider.g.dart';

const _kKey = 'recent_category_ids';
const _kMax = 5;

@riverpod
class RecentCategories extends _$RecentCategories {
  @override
  Future<List<String>> build() async {
    final prefs = await SharedPreferences.getInstance();
    return prefs.getStringList(_kKey) ?? [];
  }

  Future<void> record(String categoryId) async {
    final current = await future;
    final updated = [
      categoryId,
      ...current.where((id) => id != categoryId),
    ].take(_kMax).toList();

    final prefs = await SharedPreferences.getInstance();
    await prefs.setStringList(_kKey, updated);
    state = AsyncData(updated);
  }
}
