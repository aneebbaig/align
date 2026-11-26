import 'package:flutter/material.dart';

import '../../../../core/extensions/currency_ext.dart';
import '../../../../core/theme/app_colors.dart';
import '../../../../core/theme/app_text_styles.dart';
import '../../data/models/quick_picks_model.dart';

/// Up to [max] saved descriptions for [query]: prefix matches first, then
/// ones that merely contain it. Case-insensitive; an empty query suggests nothing.
List<QuickDescription> suggestDescriptions(List<QuickDescription> all, String query, {int max = 6}) {
  final q = query.trim().toLowerCase();
  if (q.isEmpty) return const [];
  final seen = <String>{};
  final prefix = <QuickDescription>[];
  final contains = <QuickDescription>[];
  for (final d in all) {
    final t = d.description.toLowerCase();
    if (t == q || !seen.add(t)) continue;
    if (t.startsWith(q)) {
      prefix.add(d);
    } else if (t.contains(q)) {
      contains.add(d);
    }
  }
  return [...prefix, ...contains].take(max).toList();
}

/// Whether to offer the "Count it in {month}'s budget" choice: only when the
/// chosen [date] falls in a different month than the open budget period.
bool needsBudgetChoice(DateTime date, {int? openMonth, int? openYear, DateTime? now}) {
  final n = now ?? DateTime.now();
  final m = openMonth ?? n.month;
  final y = openYear ?? n.year;
  return date.month != m || date.year != y;
}

/// Category ids to show first: the server's top categories, then recents,
/// restricted to ids that exist in [known].
List<String> orderedCategoryIds(List<String> top, List<String> recent, Set<String> known) => [
      ...top,
      ...recent.where((id) => !top.contains(id)),
    ].where(known.contains).toList();

String amountFieldText(int paisas) {
  final v = paisas / 100;
  return v == v.roundToDouble() ? v.toStringAsFixed(0) : v.toStringAsFixed(2);
}

/// Horizontally scrolling "description · amount" chips; tap to fill the form.
class QuickRepeatChips extends StatelessWidget {
  const QuickRepeatChips({required this.repeats, required this.onTap, super.key});
  final List<QuickRepeat> repeats;
  final ValueChanged<QuickRepeat> onTap;

  @override
  Widget build(BuildContext context) => SizedBox(
        height: 40,
        child: ListView.separated(
          scrollDirection: Axis.horizontal,
          itemCount: repeats.length,
          separatorBuilder: (_, __) => const SizedBox(width: 8),
          itemBuilder: (_, i) {
            final r = repeats[i];
            return ActionChip(
              label: Text('${r.description} · ${r.lastAmountPaisas.formatPKR()}',
                  style: AppTextStyles.labelMedium.copyWith(color: AppColors.foreground)),
              backgroundColor: AppColors.card,
              side: BorderSide(color: AppColors.border.withValues(alpha: 0.5)),
              onPressed: () => onTap(r),
            );
          },
        ),
      );
}

/// The description field with simple autocomplete from past descriptions.
class DescriptionAutocomplete extends StatelessWidget {
  const DescriptionAutocomplete({
    required this.controller,
    required this.focusNode,
    required this.descriptions,
    required this.onPicked,
    this.hint = 'Description (optional)',
    super.key,
  });
  final TextEditingController controller;
  final FocusNode focusNode;
  final List<QuickDescription> descriptions;
  final ValueChanged<QuickDescription> onPicked;
  final String hint;

  OutlineInputBorder _b(Color c) => OutlineInputBorder(
        borderRadius: BorderRadius.circular(8),
        borderSide: BorderSide(color: c),
      );

  @override
  Widget build(BuildContext context) => RawAutocomplete<QuickDescription>(
        textEditingController: controller,
        focusNode: focusNode,
        displayStringForOption: (o) => o.description,
        optionsBuilder: (v) => suggestDescriptions(descriptions, v.text),
        onSelected: onPicked,
        fieldViewBuilder: (context, ctrl, node, onSubmit) => TextField(
          controller: ctrl,
          focusNode: node,
          style: AppTextStyles.bodyMedium,
          maxLines: 1,
          textCapitalization: TextCapitalization.sentences,
          decoration: InputDecoration(
            hintText: hint,
            hintStyle: AppTextStyles.bodyMedium.copyWith(color: AppColors.mutedForeground),
            filled: true,
            fillColor: AppColors.card,
            contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 12),
            border: _b(AppColors.border.withValues(alpha: 0.5)),
            enabledBorder: _b(AppColors.border.withValues(alpha: 0.5)),
            focusedBorder: _b(AppColors.primary.withValues(alpha: 0.6)),
          ),
        ),
        optionsViewBuilder: (context, onSelected, options) => Align(
          alignment: Alignment.topLeft,
          child: Material(
            color: AppColors.popover,
            elevation: 4,
            borderRadius: BorderRadius.circular(8),
            child: ConstrainedBox(
              constraints: BoxConstraints(maxWidth: MediaQuery.of(context).size.width - 32, maxHeight: 260),
              child: ListView(
                padding: EdgeInsets.zero,
                shrinkWrap: true,
                children: [
                  for (final o in options)
                    ListTile(
                      dense: true,
                      title: Text(o.description, style: AppTextStyles.bodyMedium),
                      onTap: () => onSelected(o),
                    ),
                ],
              ),
            ),
          ),
        ),
      );
}

/// Bottom action bar: primary button, and an optional "Save & add another".
class QuickAddActions extends StatelessWidget {
  const QuickAddActions({
    required this.primaryLabel,
    required this.onPrimary,
    required this.loading,
    this.onAddAnother,
    super.key,
  });
  final String primaryLabel;
  final VoidCallback? onPrimary;
  final VoidCallback? onAddAnother;
  final bool loading;

  @override
  Widget build(BuildContext context) => SafeArea(
        top: false,
        child: Container(
          padding: const EdgeInsets.fromLTRB(16, 8, 16, 12),
          color: AppColors.background,
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              SizedBox(
                width: double.infinity,
                height: 52,
                child: ElevatedButton(
                  onPressed: loading ? null : onPrimary,
                  child: loading
                      ? const SizedBox.square(
                          dimension: 20,
                          child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white),
                        )
                      : Text(primaryLabel,
                          style: AppTextStyles.labelLarge.copyWith(
                              fontWeight: FontWeight.w600, fontSize: 16, color: AppColors.primaryForeground)),
                ),
              ),
              if (onAddAnother != null) ...[
                const SizedBox(height: 6),
                SizedBox(
                  width: double.infinity,
                  child: OutlinedButton(
                    onPressed: loading ? null : onAddAnother,
                    child: const Text('Save & add another'),
                  ),
                ),
              ],
            ],
          ),
        ),
      );
}
