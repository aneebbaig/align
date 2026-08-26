import 'package:intl/intl.dart';

abstract final class AppDateUtils {
  static final _dayFmt = DateFormat('d MMM');
  static final _fullFmt = DateFormat('d MMM yyyy');
  static final _timeFmt = DateFormat('h:mm a');
  static final _monthFmt = DateFormat('MMMM yyyy');

  /// "14 Jun"
  static String shortDate(DateTime dt) => _dayFmt.format(dt);

  /// "14 Jun 2025"
  static String fullDate(DateTime dt) => _fullFmt.format(dt);

  /// "2:30 PM"
  static String time(DateTime dt) => _timeFmt.format(dt);

  /// "June 2025"
  static String monthYear(DateTime dt) => _monthFmt.format(dt);

  /// Budget period display: "Jun 2025"
  static String budgetPeriod(String month, int year) =>
      DateFormat('MMM yyyy').format(DateTime(year, _monthIndex(month)));

  /// "Today", "Yesterday", or "14 Jun"
  static String relativeDate(DateTime dt) {
    final now = DateTime.now();
    final today = DateTime(now.year, now.month, now.day);
    final date = DateTime(dt.year, dt.month, dt.day);
    final diff = today.difference(date).inDays;
    if (diff == 0) return 'Today';
    if (diff == 1) return 'Yesterday';
    return shortDate(dt);
  }

  static int _monthIndex(String month) {
    const months = [
      'january', 'february', 'march', 'april', 'may', 'june',
      'july', 'august', 'september', 'october', 'november', 'december',
    ];
    return months.indexOf(month.toLowerCase()) + 1;
  }
}
