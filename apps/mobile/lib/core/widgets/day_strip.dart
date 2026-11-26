import 'package:flutter/material.dart';
import 'package:intl/intl.dart';

import '../theme/app_colors.dart';
import '../theme/app_text_styles.dart';

enum DayChipKind { last, picked, today, yesterday, day, pick }

/// One chip in the strip. [date] is null only for the "Pick date…" chip.
class DayChipSpec {
  const DayChipSpec(this.kind, this.label, this.date, {this.selected = false});
  final DayChipKind kind;
  final String label;
  final DateTime? date;
  final bool selected;

  @override
  bool operator ==(Object other) =>
      other is DayChipSpec &&
      other.kind == kind &&
      other.label == label &&
      other.date == date &&
      other.selected == selected;

  @override
  int get hashCode => Object.hash(kind, label, date, selected);

  @override
  String toString() => 'DayChipSpec($kind, $label, $date, $selected)';
}

DateTime _day(DateTime d) => DateTime(d.year, d.month, d.day);

/// How many days back the strip lists (Today = 0 ... 13 days ago).
const int dayStripSpan = 13;

/// Builds the chips for the strip: optional picked date and "Last: d MMM" at
/// the start, then Today, Yesterday, 2-13 days ago, then "Pick date…".
/// [lastUsed] is only offered when it is not today and not already in the strip.
List<DayChipSpec> buildDayChips({
  required DateTime today,
  required DateTime selected,
  DateTime? lastUsed,
}) {
  final t = _day(today);
  final sel = _day(selected);
  final last = lastUsed == null ? null : _day(lastUsed);
  bool inStrip(DateTime d) {
    final diff = t.difference(d).inDays;
    return diff >= 0 && diff <= dayStripSpan;
  }

  final chips = <DayChipSpec>[];
  final showLast = last != null && last != t;
  if (!inStrip(sel) && sel != last) {
    chips.add(DayChipSpec(DayChipKind.picked, DateFormat('d MMM').format(sel), sel, selected: true));
  }
  if (showLast) {
    chips.add(DayChipSpec(DayChipKind.last, 'Last: ${DateFormat('d MMM').format(last)}', last, selected: sel == last));
  }
  for (var i = 0; i <= dayStripSpan; i++) {
    final d = DateTime(t.year, t.month, t.day - i);
    final label = i == 0 ? 'Today' : i == 1 ? 'Yesterday' : DateFormat('EEE d').format(d);
    final kind = i == 0 ? DayChipKind.today : i == 1 ? DayChipKind.yesterday : DayChipKind.day;
    chips.add(DayChipSpec(kind, label, d, selected: d == sel && !(showLast && sel == last)));
  }
  chips.add(const DayChipSpec(DayChipKind.pick, 'Pick date…', null));
  return chips;
}

/// Horizontally scrollable day chips; "Pick date…" opens a date picker for older dates.
class DayStrip extends StatelessWidget {
  const DayStrip({required this.selected, required this.onChanged, this.lastUsed, super.key});
  final DateTime selected;
  final ValueChanged<DateTime> onChanged;
  final DateTime? lastUsed;

  Future<void> _pick(BuildContext context) async {
    final now = DateTime.now();
    final picked = await showDatePicker(
      context: context,
      initialDate: selected,
      firstDate: DateTime(2020),
      lastDate: selected.isAfter(now) ? selected : now,
      builder: (ctx, child) => Theme(
        data: Theme.of(ctx).copyWith(
          colorScheme: const ColorScheme.dark(
            primary: AppColors.primary,
            surface: AppColors.card,
            onSurface: AppColors.foreground,
          ),
        ),
        child: child!,
      ),
    );
    if (picked != null) onChanged(picked);
  }

  @override
  Widget build(BuildContext context) {
    final chips = buildDayChips(today: DateTime.now(), selected: selected, lastUsed: lastUsed);
    return SizedBox(
      height: 40,
      child: ListView.separated(
        scrollDirection: Axis.horizontal,
        itemCount: chips.length,
        separatorBuilder: (_, __) => const SizedBox(width: 8),
        itemBuilder: (context, i) {
          final c = chips[i];
          return ChoiceChip(
            label: Text(c.label, style: AppTextStyles.labelMedium.copyWith(
              color: c.selected ? AppColors.primary : AppColors.foreground,
            )),
            avatar: c.kind == DayChipKind.pick
                ? const Icon(Icons.calendar_today_outlined, size: 14, color: AppColors.mutedForeground)
                : null,
            selected: c.selected,
            showCheckmark: false,
            backgroundColor: AppColors.card,
            selectedColor: AppColors.primary.withValues(alpha: 0.15),
            side: BorderSide(color: c.selected ? AppColors.primary : AppColors.border.withValues(alpha: 0.5)),
            onSelected: (_) {
              if (c.kind == DayChipKind.pick) {
                FocusScope.of(context).unfocus();
                _pick(context);
              } else {
                onChanged(c.date!);
              }
            },
          );
        },
      ),
    );
  }
}
