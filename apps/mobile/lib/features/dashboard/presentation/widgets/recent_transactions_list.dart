import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../../../../../core/extensions/currency_ext.dart';
import '../../../../../core/extensions/lucide_ext.dart';
import '../../../../../core/theme/app_colors.dart';
import '../../../../../core/theme/app_text_styles.dart';
import '../../../../../core/widgets/app_icon_box.dart';
import '../../../../../core/widgets/app_list_row.dart';
import '../../../../../core/widgets/app_section.dart';
import '../../domain/entities/dashboard_data.dart';

class RecentTransactionsList extends StatelessWidget {
  const RecentTransactionsList({required this.items, super.key});
  final List<RecentTransaction> items;

  @override
  Widget build(BuildContext context) => AppSection(
        label: 'Recent',
        trailingLabel: 'See all',
        onTrailingTap: () => context.go('/money'),
        children: items.isEmpty
            ? [
                const Padding(
                  padding: EdgeInsets.symmetric(vertical: 20),
                  child: Center(
                    child: Text(
                      'No expenses this period',
                      style: AppTextStyles.bodySmall,
                    ),
                  ),
                ),
              ]
            : items
                .map(
                  (t) => Padding(
                    padding: const EdgeInsets.only(bottom: 6),
                    child: AppListRow(
                      leading: AppIconBox(icon: t.category.icon.lucideIcon, size: 38),
                      title: t.description,
                      subtitle: t.category.name,
                      trailing: Text(
                        t.type == 'EXPENSE'
                            ? '−${t.amountPaisas.formatPKRCompact()}'
                            : '+${t.amountPaisas.formatPKRCompact()}',
                        style: AppTextStyles.currencySmall.copyWith(
                          color: t.type == 'EXPENSE'
                              ? AppColors.foreground
                              : const Color(0xFF4CAF50),
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                    ),
                  ),
                )
                .toList(),
      );
}
