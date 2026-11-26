import 'package:shared_preferences/shared_preferences.dart';

const _kDate = 'last_entry_date';
const _kSavedAt = 'last_entry_saved_at';

/// The date of the last NEW expense/income saved, and when it was saved.
class LastEntry {
  const LastEntry({required this.date, required this.savedAt});
  final DateTime date;
  final DateTime savedAt;
}

/// How long after a save the "Last: d MMM" chip is still offered.
const lastEntryWindow = Duration(hours: 3);

/// The date to offer as a "Last: d MMM" chip, or null: only within
/// [lastEntryWindow] of the save, and only when that date isn't today.
DateTime? lastChipDate(LastEntry? last, DateTime now) {
  if (last == null) return null;
  if (now.difference(last.savedAt) > lastEntryWindow || now.isBefore(last.savedAt)) return null;
  final d = DateTime(last.date.year, last.date.month, last.date.day);
  if (d == DateTime(now.year, now.month, now.day)) return null;
  return d;
}

class LastEntryStore {
  const LastEntryStore._();

  static Future<LastEntry?> read() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.reload();
    final d = DateTime.tryParse(prefs.getString(_kDate) ?? '');
    final s = DateTime.tryParse(prefs.getString(_kSavedAt) ?? '');
    if (d == null || s == null) return null;
    return LastEntry(date: d, savedAt: s);
  }

  /// The category last used for a new entry of [type] ('expense' | 'income').
  static Future<String?> readCategory(String type) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.reload();
    return prefs.getString('last_category_$type');
  }

  static Future<void> recordCategory(String type, String categoryId) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString('last_category_$type', categoryId);
  }

  static Future<void> record(DateTime date, {DateTime? now}) async {
    final prefs = await SharedPreferences.getInstance();
    final d = DateTime(date.year, date.month, date.day);
    await prefs.setString(_kDate, d.toIso8601String());
    await prefs.setString(_kSavedAt, (now ?? DateTime.now()).toIso8601String());
  }
}
