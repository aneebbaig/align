import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../../core/errors/app_exception.dart';
import '../../../../core/extensions/currency_ext.dart';
import '../../../../core/services/toast_service.dart';
import '../../../../core/theme/app_colors.dart';
import '../../../../core/theme/app_text_styles.dart';
import '../../../../core/widgets/app_icon_box.dart';
import '../../../../core/widgets/app_list_row.dart';
import '../../../../core/widgets/app_section.dart';
import '../../data/datasources/cashflow_datasource.dart';
import '../../domain/entities/recurring_income_entity.dart';
import '../pages/add_recurring_income_page.dart';
import '../pages/record_recurring_income_page.dart';
import '../providers/recurring_income_provider.dart';

class RecurringIncomeSection extends ConsumerWidget {
  const RecurringIncomeSection({super.key});

  void _add(BuildContext context) {
    Navigator.of(context).push(
      MaterialPageRoute(
        fullscreenDialog: true,
        builder: (_) => const AddRecurringIncomePage(),
      ),
    );
  }

  void _record(BuildContext context, RecurringIncomeEntity item) {
    Navigator.of(context).push(
      MaterialPageRoute(
        fullscreenDialog: true,
        builder: (_) => RecordRecurringIncomePage(recurringIncome: item),
      ),
    );
  }

  Future<void> _delete(BuildContext context, WidgetRef ref, RecurringIncomeEntity item) async {
    try {
      await ref.read(cashflowDatasourceProvider).deleteRecurringIncome(item.id);
      ref.invalidate(recurringIncomesProvider);
      if (context.mounted) {
        ref.read(toastServiceProvider).success(context, 'Recurring income removed');
      }
    } catch (e) {
      if (!context.mounted) return;
      final msg = e is AppException ? e.message : 'Failed to remove';
      ref.read(toastServiceProvider).error(context, msg);
    }
  }

  IconData _iconFor(String kind) => switch (kind) {
        'SALARY' => Icons.work_outline,
        'FREELANCE' => Icons.laptop_mac_outlined,
        _ => Icons.account_balance_wallet_outlined,
      };

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final async = ref.watch(recurringIncomesProvider);

    return async.when(
      data: (items) {
        if (items.isEmpty) return const SizedBox.shrink();
        return Padding(
          padding: const EdgeInsets.only(bottom: 16),
          child: AppSection(
            label: 'Recurring Income',
            trailingLabel: '+ Add',
            onTrailingTap: () => _add(context),
            children: items
                .map((item) => Padding(
                      padding: const EdgeInsets.only(bottom: 8),
                      child: AppListRow(
                        leading: AppIconBox(icon: _iconFor(item.kind), size: 36),
                        title: item.label,
                        subtitle: item.variable ? 'Floor (variable)' : 'Fixed monthly',
                        trailing: Row(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            Text(
                              '${item.variable ? '≥' : ''}${item.amountPaisas.formatPKR()}',
                              style: AppTextStyles.currencySmall.copyWith(
                                color: const Color(0xFF4CAF50),
                                fontWeight: FontWeight.w600,
                              ),
                            ),
                            const SizedBox(width: 8),
                            if (item.recordedFor(DateTime.now().month, DateTime.now().year))
                              Text('Recorded', style: AppTextStyles.labelSmall.copyWith(color: const Color(0xFF4CAF50)))
                            else
                              GestureDetector(
                                onTap: () => _record(context, item),
                                behavior: HitTestBehavior.opaque,
                                child: Text('Record', style: AppTextStyles.labelMedium.copyWith(color: AppColors.primary, fontWeight: FontWeight.w600)),
                              ),
                            const SizedBox(width: 8),
                            GestureDetector(
                              onTap: () => _delete(context, ref, item),
                              behavior: HitTestBehavior.opaque,
                              child: Padding(
                                padding: const EdgeInsets.all(4),
                                child: Icon(
                                  Icons.delete_outline,
                                  size: 16,
                                  color: AppColors.destructive.withValues(alpha: 0.7),
                                ),
                              ),
                            ),
                          ],
                        ),
                      ),
                    ))
                .toList(),
          ),
        );
      },
      loading: () => const SizedBox.shrink(),
      error: (_, __) => const SizedBox.shrink(),
    );
  }
}

