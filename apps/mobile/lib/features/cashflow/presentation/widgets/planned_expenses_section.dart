import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../../core/errors/app_exception.dart';
import '../../../../core/extensions/currency_ext.dart';
import '../../../../core/extensions/datetime_ext.dart';
import '../../../../core/services/toast_service.dart';
import '../../../../core/theme/app_colors.dart';
import '../../../../core/theme/app_text_styles.dart';
import '../../../../core/widgets/app_badge.dart';
import '../../../../core/widgets/app_icon_box.dart';
import '../../../../core/widgets/app_list_row.dart';
import '../../../../core/widgets/app_section.dart';
import '../../data/datasources/cashflow_datasource.dart';
import '../../domain/entities/planned_expense_entity.dart';
import '../pages/add_planned_expense_page.dart';
import '../pages/record_planned_expense_page.dart';
import '../providers/planned_expenses_provider.dart';

class PlannedExpensesSection extends ConsumerWidget {
  const PlannedExpensesSection({super.key});

  void _add(BuildContext context) {
    Navigator.of(context).push(
      MaterialPageRoute(
        fullscreenDialog: true,
        builder: (_) => const AddPlannedExpensePage(),
      ),
    );
  }

  void _markPaid(BuildContext context, PlannedExpenseEntity item) {
    Navigator.of(context).push(
      MaterialPageRoute(
        fullscreenDialog: true,
        builder: (_) => RecordPlannedExpensePage(plannedExpense: item),
      ),
    );
  }

  Future<void> _delete(BuildContext context, WidgetRef ref, PlannedExpenseEntity item) async {
    try {
      await ref.read(cashflowDatasourceProvider).deletePlannedExpense(item.id);
      ref.invalidate(plannedExpensesProvider);
      if (context.mounted) {
        ref.read(toastServiceProvider).success(context, 'Planned expense removed');
      }
    } catch (e) {
      if (!context.mounted) return;
      final msg = e is AppException ? e.message : 'Failed to remove';
      ref.read(toastServiceProvider).error(context, msg);
    }
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final async = ref.watch(plannedExpensesProvider);

    return async.when(
      data: (all) {
        final items = all.where((e) => e.status == 'PLANNED').toList();
        if (items.isEmpty) return const SizedBox.shrink();
        return Padding(
          padding: const EdgeInsets.only(bottom: 16),
          child: AppSection(
            label: 'Planned Expenses',
            trailingLabel: '+ Add',
            onTrailingTap: () => _add(context),
            children: items
                .map((item) => Padding(
                      padding: const EdgeInsets.only(bottom: 8),
                      child: AppListRow(
                        leading: const AppIconBox(icon: Icons.event_note_outlined, size: 36),
                        title: item.name,
                        subtitle: 'Due ${item.dueDate.toShortDate}',
                        trailing: Row(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            if (item.flexibility == 'FLEXIBLE') ...[
                              const AppBadge(label: 'Flexible', variant: AppBadgeVariant.neutral),
                              const SizedBox(width: 8),
                            ],
                            Text(
                              item.amountPaisas.formatPKR(),
                              style: AppTextStyles.currencySmall.copyWith(fontWeight: FontWeight.w600),
                            ),
                            const SizedBox(width: 8),
                            GestureDetector(
                              onTap: () => _markPaid(context, item),
                              behavior: HitTestBehavior.opaque,
                              child: const Padding(
                                padding: EdgeInsets.all(4),
                                child: Icon(Icons.check_circle_outline, size: 16, color: Color(0xFF4CAF50)),
                              ),
                            ),
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
