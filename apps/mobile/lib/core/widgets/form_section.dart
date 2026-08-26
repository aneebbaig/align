import 'package:flutter/material.dart';

import '../theme/app_colors.dart';
import '../theme/app_text_styles.dart';

/// Small uppercase micro-header + content - the section idiom already used by
/// `FundingSourceField`'s "FUND FROM" label, pulled out here so every
/// creation page shares the same visual rhythm instead of one long
/// undifferentiated column of fields.
class FormSection extends StatelessWidget {
  const FormSection({required this.title, required this.children, super.key});
  final String title;
  final List<Widget> children;

  @override
  Widget build(BuildContext context) => Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            title.toUpperCase(),
            style: AppTextStyles.labelSmall.copyWith(
              color: AppColors.mutedForeground,
              letterSpacing: 0.7,
            ),
          ),
          const SizedBox(height: 8),
          for (var i = 0; i < children.length; i++) ...[
            if (i > 0) const SizedBox(height: 12),
            children[i],
          ],
        ],
      );
}

/// Collapsed-by-default disclosure for rarely-used fields, so the default
/// form only shows what's needed for the common case.
class MoreOptions extends StatefulWidget {
  const MoreOptions({required this.children, super.key});
  final List<Widget> children;

  @override
  State<MoreOptions> createState() => _MoreOptionsState();
}

class _MoreOptionsState extends State<MoreOptions> {
  bool _open = false;

  @override
  Widget build(BuildContext context) => Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          GestureDetector(
            onTap: () => setState(() => _open = !_open),
            behavior: HitTestBehavior.opaque,
            child: Row(
              children: [
                AnimatedRotation(
                  turns: _open ? 0.5 : 0,
                  duration: const Duration(milliseconds: 150),
                  child: const Icon(Icons.expand_more, size: 16, color: AppColors.mutedForeground),
                ),
                const SizedBox(width: 4),
                Text(
                  'More options',
                  style: AppTextStyles.labelMedium.copyWith(color: AppColors.mutedForeground),
                ),
              ],
            ),
          ),
          if (_open) ...[
            for (var i = 0; i < widget.children.length; i++) ...[
              const SizedBox(height: 12),
              widget.children[i],
            ],
          ],
        ],
      );
}
