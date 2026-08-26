import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../../core/extensions/currency_ext.dart';
import '../../../../core/theme/app_colors.dart';
import '../../../../core/theme/app_text_styles.dart';
import '../../../../core/widgets/app_card.dart';
import '../../../../core/widgets/app_empty_state.dart';
import '../../../../core/widgets/app_progress_bar.dart';
import '../../domain/entities/plan_entity.dart';
import '../providers/plans_provider.dart';
import '../widgets/plan_sheets.dart';

Color planColor(String hex) {
  var h = hex.replaceAll('#', '');
  if (h.length == 6) h = 'FF$h';
  return Color(int.tryParse(h, radix: 16) ?? 0xFF6366F1);
}

class PlansPage extends ConsumerWidget {
  const PlansPage({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final async = ref.watch(plansProvider);
    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        backgroundColor: AppColors.background,
        elevation: 0,
        title: const Text('Plans', style: AppTextStyles.headlineSmall),
        actions: [
          IconButton(
            icon: const Icon(Icons.add, color: AppColors.primary),
            tooltip: 'New plan',
            onPressed: () => showNewPlanSheet(context, ref),
          ),
        ],
      ),
      body: RefreshIndicator(
        color: AppColors.primary,
        backgroundColor: AppColors.card,
        onRefresh: () => ref.refresh(plansProvider.future),
        child: async.when(
          data: (plans) => plans.isEmpty
              ? ListView(children: const [
                  SizedBox(height: 120),
                  AppEmptyState(
                    title: 'No plans yet',
                    subtitle: 'Create plans on the web to buy things over time and tick them off here.',
                    icon: Icons.checklist_rtl,
                  ),
                ])
              : ListView(
                  padding: const EdgeInsets.fromLTRB(16, 8, 16, 100),
                  children: plans
                      .map((p) => Padding(
                            padding: const EdgeInsets.only(bottom: 10),
                            child: _PlanCard(plan: p),
                          ))
                      .toList(),
                ),
          loading: () => const Center(child: CircularProgressIndicator(color: AppColors.primary)),
          error: (_, __) => ListView(children: [
            const SizedBox(height: 120),
            AppEmptyState(
              title: 'Could not load plans',
              icon: Icons.wifi_off_outlined,
              onRetry: () => ref.refresh(plansProvider.future),
            ),
          ]),
        ),
      ),
    );
  }
}

class _PlanCard extends StatelessWidget {
  const _PlanCard({required this.plan});
  final PlanEntity plan;

  @override
  Widget build(BuildContext context) {
    final c = planColor(plan.coverColor);
    return AppCard(
      onTap: () => context.push('/plans/${plan.id}'),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Container(width: 4, height: 20, decoration: BoxDecoration(color: c, borderRadius: BorderRadius.circular(2))),
              const SizedBox(width: 10),
              Expanded(
                child: Text(plan.name,
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: AppTextStyles.bodyMedium.copyWith(fontWeight: FontWeight.w600)),
              ),
              Text(plan.status == 'PLANNING' ? 'Planning' : plan.status,
                  style: AppTextStyles.labelSmall),
            ],
          ),
          const SizedBox(height: 12),
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text('Est. ${plan.totalEstimatedPaisas.formatPKR()}',
                  style: AppTextStyles.currencyMedium.copyWith(color: AppColors.foreground)),
              if (plan.totalPaidPaisas > 0)
                Text('${plan.totalPaidPaisas.formatPKR()} bought',
                    style: AppTextStyles.bodySmall.copyWith(color: AppColors.success)),
            ],
          ),
          if (plan.itemCount > 0) ...[
            const SizedBox(height: 8),
            AppProgressBar(value: plan.progress, color: c),
            const SizedBox(height: 6),
            Text('${plan.paidCount}/${plan.itemCount} items done',
                style: AppTextStyles.bodySmall),
          ],
        ],
      ),
    );
  }
}
