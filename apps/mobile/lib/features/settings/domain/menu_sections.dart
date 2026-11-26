/// Sections the web app lets a person hide from the menu. Expenses and
/// Settings are not in this list because they can't be hidden.
const allMenuSectionKeys = [
  'dashboard',
  'income',
  'budget',
  'savings',
  'investments',
  'loans',
  'forecast',
  'plans',
  'lists',
  'tasks',
  'routines',
  'work',
  'calendar',
  'vault',
  'perfumes',
];

/// A section the phone has a screen for.
class PhoneSection {
  const PhoneSection(this.key, this.label);
  final String key;
  final String label;
}

/// Keys that have a screen on the phone, in the order the Settings switches
/// are shown. Keys not listed here (income, lists, calendar, vault, perfumes)
/// have no phone screen; they are only ever carried along untouched.
const phoneSections = [
  PhoneSection('dashboard', 'Home'),
  PhoneSection('tasks', 'Tasks'),
  PhoneSection('work', 'Work'),
  PhoneSection('budget', 'Budget'),
  PhoneSection('loans', 'Loans'),
  PhoneSection('savings', 'Savings'),
  PhoneSection('investments', 'Investments'),
  PhoneSection('forecast', 'Forecast'),
  PhoneSection('routines', 'Routines'),
  PhoneSection('plans', 'Plans'),
];

/// The hidden list after switching [key] on/off. Every other entry - including
/// keys this phone doesn't know about - is preserved in its original order.
List<String> withSectionHidden(List<String> hidden, String key, bool hide) {
  final without = hidden.where((k) => k != key).toList();
  if (!hide) return without;
  return [...without, key];
}

/// Parses `{ "data": { "hiddenSections": [...] } }` (or the inner map).
List<String> parseHiddenSections(Object? json) {
  final map = json is Map && json['data'] is Map ? json['data'] as Map : json;
  if (map is! Map) return const [];
  final list = map['hiddenSections'];
  if (list is! List) return const [];
  return [for (final v in list) if (v is String) v];
}
