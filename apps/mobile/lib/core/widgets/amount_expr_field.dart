import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

import '../theme/app_colors.dart';
import '../theme/app_text_styles.dart';
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
