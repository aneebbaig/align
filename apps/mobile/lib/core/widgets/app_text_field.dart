import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

import '../theme/app_colors.dart';
import '../theme/app_text_styles.dart';

/// Single-source text field - all forms go through this widget.
class AppTextField extends StatelessWidget {
  const AppTextField({
    required this.controller,
    this.label,
    this.hint,
    this.obscureText = false,
    this.suffix,
    this.prefix,
    this.keyboardType,
    this.textInputAction,
    this.validator,
    this.onSubmitted,
    this.onChanged,
    this.readOnly = false,
    this.maxLines = 1,
    this.autofocus = false,
    this.focusNode,
    this.prefixText,
    this.inputFormatters,
    this.dense = false,
    this.textCapitalization = TextCapitalization.none,
    super.key,
  });

  final TextEditingController controller;
  final String? label;
  final String? hint;
  final bool obscureText;
  final Widget? suffix;
  final Widget? prefix;
  final TextInputType? keyboardType;
  final TextInputAction? textInputAction;
  final String? Function(String?)? validator;
  final void Function(String)? onSubmitted;
  final void Function(String)? onChanged;
  final bool readOnly;
  final int? maxLines;
  final bool autofocus;
  final FocusNode? focusNode;
  final String? prefixText;
  final List<TextInputFormatter>? inputFormatters;

  /// Compact filled style used inside sheets and quick-add forms.
  final bool dense;
  final TextCapitalization textCapitalization;

  @override
  Widget build(BuildContext context) => TextFormField(
        controller: controller,
        obscureText: obscureText,
        keyboardType: keyboardType,
        textInputAction: textInputAction,
        validator: validator,
        onFieldSubmitted: onSubmitted,
        onChanged: onChanged,
        readOnly: readOnly,
        maxLines: obscureText ? 1 : maxLines,
        autofocus: autofocus,
        focusNode: focusNode,
        inputFormatters: inputFormatters,
        textCapitalization: textCapitalization,
        style: AppTextStyles.bodyMedium,
        decoration: InputDecoration(
          labelText: label,
          hintText: hint,
          hintStyle: AppTextStyles.bodyMedium.copyWith(
            color: AppColors.mutedForeground,
          ),
          prefixText: prefixText,
          prefixStyle: AppTextStyles.bodyMedium.copyWith(color: AppColors.mutedForeground),
          suffixIcon: suffix,
          prefixIcon: prefix,
          filled: dense ? true : null,
          fillColor: dense ? AppColors.card : null,
          contentPadding: dense ? const EdgeInsets.symmetric(horizontal: 12, vertical: 12) : null,
          border: dense ? _border(AppColors.border.withValues(alpha: 0.5)) : null,
          enabledBorder: dense ? _border(AppColors.border.withValues(alpha: 0.5)) : null,
          focusedBorder: dense ? _border(AppColors.primary.withValues(alpha: 0.6)) : null,
        ),
      );

  static OutlineInputBorder _border(Color c) => OutlineInputBorder(
        borderRadius: BorderRadius.circular(8),
        borderSide: BorderSide(color: c),
      );
}
