extension AppDateTime on DateTime {
  bool isSameDay(DateTime other) =>
      year == other.year && month == other.month && day == other.day;

  /// "Today", "Yesterday", or "3 Jun"
  String get toRelativeDay {
    final now = DateTime.now();
    final today = DateTime(now.year, now.month, now.day);
    final self = DateTime(year, month, day);
    final diff = today.difference(self).inDays;
    if (diff == 0) return 'Today';
    if (diff == 1) return 'Yesterday';
    return '$day ${_months[month - 1]}';
  }

  /// "June 2026"
  String get toMonthLabel =>
      '${_monthsFull[month - 1]} $year';

  /// "3 Jun 2026"
  String get toShortDate => '$day ${_months[month - 1]} $year';

  static const _months = [
    'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
  ];
  static const _monthsFull = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December',
  ];
}
