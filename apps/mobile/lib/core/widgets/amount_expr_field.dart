import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

import '../theme/app_colors.dart';
import '../theme/app_text_styles.dart';
import 'app_text_field.dart';
import '../utils/amount_expr.dart';

/// Lets an amount field take a sum ("35+67"): digits, `.`, `+`, `-` and spaces,
/// with each number kept to 9 digits and 2 decimals like the plain field.
class AmountExprFormatter extends TextInputFormatter {
  static final _allowed = RegExp(r'^[\d.+\-\s]*$');
  static final _part = RegExp(r'^\d{0,9}(\.\d{0,2})?$');

  @override
  TextEditingValue formatEditUpdate(TextEditingValue old, TextEditingValue val) {
    final text = val.text;
    if (text.isEmpty) return val;
    if (!_allowed.hasMatch(text)) return old;
    for (final part in text.split(RegExp(r'[+\-\s]+'))) {
      if (part.isNotEmpty && !_part.hasMatch(part)) return old;
    }
    return val;
  }
}

/// Sits under an amount field: `+` / `−` keys (the number pad has no plus), and
/// the live result of a sum - or what is wrong with it.
class AmountExprBar extends StatelessWidget {
  const AmountExprBar({required this.controller, this.onChanged, super.key});

  final TextEditingController controller;

  /// Called after a `+` / `−` key edits the text, so the page can refresh.
  final VoidCallback? onChanged;

  void _insert(String op) {
    final sel = controller.selection;
    final text = controller.text;
    final start = sel.isValid ? sel.start : text.length;
    final end = sel.isValid ? sel.end : text.length;
    // Don't stack operators: "5+" then "-" turns it into "5-".
    var before = text.substring(0, start);
    if (before.isNotEmpty && RegExp(r'[+\-]\s*$').hasMatch(before)) {
      before = before.replaceFirst(RegExp(r'[+\-]\s*$'), '');
    }
    final next = '$before$op${text.substring(end)}';
    controller.value = TextEditingValue(
      text: next,
      selection: TextSelection.collapsed(offset: before.length + 1),
    );
    onChanged?.call();
  }

  @override
  Widget build(BuildContext context) => ValueListenableBuilder<TextEditingValue>(
        valueListenable: controller,
        builder: (_, value, __) {
          final text = value.text.trim();
          final result = text.isEmpty ? null : parseAmount(text);
          final hasOp = RegExp(r'[+\-]').hasMatch(text);

          String? message;
          var color = AppColors.mutedForeground;
          if (result != null && result.isValid && result.isExpression) {
            final p = result.paisas!;
            message = '= Rs ${(p / 100).toStringAsFixed(p % 100 == 0 ? 0 : 2)}';
            color = AppColors.primary;
          } else if (result != null && !result.isValid && hasOp) {
            message = result.error;
            if (!result.error!.startsWith('Finish')) color = AppColors.destructive;
          }

          return Row(
            children: [
              _OpKey(label: '+', onTap: () => _insert('+')),
              const SizedBox(width: 8),
              _OpKey(label: '−', onTap: () => _insert('-')),
              const SizedBox(width: 12),
              if (message != null)
                Expanded(child: Text(message, style: AppTextStyles.bodySmall.copyWith(color: color))),
            ],
          );
        },
      );
}

class _OpKey extends StatelessWidget {
  const _OpKey({required this.label, required this.onTap});
  final String label;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) => Semantics(
        button: true,
        label: label == '+' ? 'Add' : 'Subtract',
        child: GestureDetector(
          onTap: onTap,
          child: Container(
            width: 40,
            height: 32,
            alignment: Alignment.center,
            decoration: BoxDecoration(
              color: AppColors.card,
              border: Border.all(color: AppColors.border),
              borderRadius: BorderRadius.circular(8),
            ),
            child: Text(label, style: AppTextStyles.bodyLarge.copyWith(color: AppColors.foreground)),
          ),
        ),
      );
}

/// The standard money input: "Rs" prefix, number pad, takes a sum ("35+67"),
/// with +/- keys and the live result underneath. Read it with [parseAmount].
class AmountExprField extends StatelessWidget {
  const AmountExprField({
    required this.controller,
    this.hint = '0',
    this.prefix = 'Rs ',
    this.autofocus = false,
    this.onChanged,
    super.key,
  });
  final TextEditingController controller;
  final String hint;
  final String prefix;
  final bool autofocus;
  final VoidCallback? onChanged;

  @override
  Widget build(BuildContext context) => Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          AppTextField(
            controller: controller,
            hint: hint,
            prefixText: prefix,
            dense: true,
            autofocus: autofocus,
            keyboardType: const TextInputType.numberWithOptions(decimal: true),
            inputFormatters: [AmountExprFormatter()],
            onChanged: (_) => onChanged?.call(),
          ),
          const SizedBox(height: 6),
          AmountExprBar(controller: controller, onChanged: onChanged),
        ],
      );
}

/// The large amount entry used at the top of quick-add forms: big number,
/// takes a sum, with the +/- keys and live result underneath.
class BigAmountField extends StatelessWidget {
  const BigAmountField({
    required this.controller,
    required this.onChanged,
    this.focusNode,
    this.color = AppColors.primary,
    this.prefix = 'Rs ',
    this.enabled = true,
    super.key,
  });
  final TextEditingController controller;
  final VoidCallback onChanged;
  final FocusNode? focusNode;
  final Color color;
  final String prefix;
  final bool enabled;

  @override
  Widget build(BuildContext context) => Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          TextField(
            controller: controller,
            focusNode: focusNode,
            enabled: enabled,
            keyboardType: const TextInputType.numberWithOptions(decimal: true),
            inputFormatters: [AmountExprFormatter()],
            style: AppTextStyles.displayLarge.copyWith(color: color, letterSpacing: -1),
            decoration: InputDecoration(
              prefixText: prefix,
              prefixStyle: AppTextStyles.headlineMedium.copyWith(color: AppColors.mutedForeground),
              hintText: '0',
              hintStyle: AppTextStyles.displayLarge.copyWith(
                color: AppColors.mutedForeground.withValues(alpha: 0.4),
                letterSpacing: -1,
              ),
              border: InputBorder.none,
              enabledBorder: InputBorder.none,
              focusedBorder: InputBorder.none,
              contentPadding: const EdgeInsets.symmetric(vertical: 8),
            ),
            onChanged: (_) => onChanged(),
          ),
          if (enabled) AmountExprBar(controller: controller, onChanged: onChanged),
        ],
      );
}
