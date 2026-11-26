import 'package:flutter/material.dart';
import 'package:intl/intl.dart';

import '../theme/app_colors.dart';
import '../theme/app_text_styles.dart';

DateTime _day(DateTime d) => DateTime(d.year, d.month, d.day);

/// The Saturday of this week (or today when it is Saturday/Sunday's weekend start).
DateTime thisWeekend(DateTime now) {
  final t = _day(now);
  final add = (DateTime.saturday - t.weekday) % 7;
  return t.add(Duration(days: add));
}

/// The coming Monday (always after today).
DateTime nextWeek(DateTime now) {
  final t = _day(now);
  final add = (DateTime.monday - t.weekday) % 7;
  return t.add(Duration(days: add == 0 ? 7 : add));
}

/// One-tap due dates: None, Today, Tomorrow, This weekend, Next week, Pick...
/// A date picked another way shows as its own selected chip.
class DueDateChips extends StatelessWidget {
  const DueDateChips({required this.value, required this.onChanged, super.key});
  final DateTime? value;
  final ValueChanged<DateTime?> onChanged;

  Future<void> _pick(BuildContext context) async {
    final now = DateTime.now();
    final picked = await showDatePicker(
      context: context,
      initialDate: value ?? now,
      firstDate: DateTime(now.year - 1),
      lastDate: DateTime(now.year + 10),
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
    if (picked != null) onChanged(_day(picked));
  }

  @override
  Widget build(BuildContext context) {
    final now = DateTime.now();
    final today = _day(now);
    final v = value == null ? null : _day(value!);
    final presets = <(String, DateTime)>[
      ('Today', today),
      ('Tomorrow', today.add(const Duration(days: 1))),
      ('This weekend', thisWeekend(now)),
      ('Next week', nextWeek(now)),
    ];
    final matched = v != null && presets.any((p) => p.$2 == v);
    Widget chip(String label, bool selected, VoidCallback onTap, {IconData? icon}) => ChoiceChip(
          label: Text(label,
              style: AppTextStyles.labelMedium.copyWith(color: selected ? AppColors.primary : AppColors.foreground)),
          avatar: icon == null ? null : Icon(icon, size: 14, color: AppColors.mutedForeground),
          selected: selected,
          showCheckmark: false,
          backgroundColor: AppColors.card,
          selectedColor: AppColors.primary.withValues(alpha: 0.15),
          side: BorderSide(color: selected ? AppColors.primary : AppColors.border.withValues(alpha: 0.5)),
          onSelected: (_) => onTap(),
        );
    return SizedBox(
      height: 40,
      child: ListView(
        scrollDirection: Axis.horizontal,
        children: [
          chip('None', v == null, () => onChanged(null)),
          for (final p in presets) ...[
            const SizedBox(width: 8),
            chip(p.$1, v == p.$2, () => onChanged(p.$2)),
          ],
          if (v != null && !matched) ...[
            const SizedBox(width: 8),
            chip(DateFormat('d MMM').format(v), true, () => _pick(context)),
          ],
          const SizedBox(width: 8),
          chip('Pick…', false, () => _pick(context), icon: Icons.calendar_today_outlined),
        ],
      ),
    );
  }
}
