import 'package:riverpod_annotation/riverpod_annotation.dart';

import '../../data/datasources/quick_picks_datasource.dart';
import '../../data/models/quick_picks_model.dart';

part 'quick_picks_provider.g.dart';

/// Quick picks for the add form. Any failure (including a 404 from an older
/// server) yields empty picks, so the form just hides the suggestions.
@riverpod
Future<QuickPicks> quickPicks(Ref ref, String type) async {
  try {
    return await ref.watch(quickPicksDatasourceProvider).getQuickPicks(type);
  } catch (_) {
    return const QuickPicks();
  }
}
