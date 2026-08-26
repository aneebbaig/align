import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../../core/extensions/currency_ext.dart';
import '../../../../core/extensions/datetime_ext.dart';
import '../../../../core/extensions/lucide_ext.dart';
import '../../../../core/theme/app_colors.dart';
import '../../../../core/theme/app_text_styles.dart';
import '../../../../core/widgets/app_badge.dart';
import '../../../../core/widgets/app_card.dart';
import '../../../../core/widgets/app_empty_state.dart';
import '../../../../core/widgets/app_progress_bar.dart';
import '../../domain/entities/savings_pot_entity.dart';
import '../providers/savings_provider.dart';

class SavingsPage extends ConsumerWidget {
  const SavingsPage({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final async = ref.watch(savingsProvider);

    return Scaffold(
      backgroundColor: AppColors.background,
      body: RefreshIndicator(
        color: AppColors.primary,
        backgroundColor: AppColors.card,
        onRefresh: () => ref.refresh(savingsProvider.future),
        child: CustomScrollView(
          slivers: [
            const SliverAppBar(
              backgroundColor: AppColors.background,
              floating: true,
              snap: true,
              elevation: 0,
              title: Text('Savings', style: AppTextStyles.headlineSmall),
            ),
            async.when(
              data: (state) => state.pots.isEmpty
                  ? const SliverFillRemaining(
                      child: AppEmptyState(
                        title: 'No savings pots yet',
                        icon: Icons.savings_outlined,
                      ),
                    )
                  : SliverPadding(
                      padding: const EdgeInsets.fromLTRB(16, 4, 16, 100),
                      sliver: SliverList(
                        delegate: SliverChildListDelegate([
                          AppCard(
                            margin: const EdgeInsets.only(bottom: 16),
                            child: Row(
                              mainAxisAlignment: MainAxisAlignment.spaceBetween,
                              children: [
                                Text('Total Savings', style: AppTextStyles.bodyMedium.copyWith(
                                  color: AppColors.mutedForeground,
                                )),
                                Text(
                                  state.totalPaisas.formatPKR(),
                                  style: AppTextStyles.currencyMedium.copyWith(
                                    color: AppColors.primary,
                                  ),
                                ),
                              ],
                            ),
                          ),
                          ...state.pots.map((p) => Padding(
                                padding: const EdgeInsets.only(bottom: 10),
                                child: _PotCard(pot: p),
                              )),
                        ]),
                      ),
                    ),
              loading: () => const SliverFillRemaining(
                child: Center(
                  child: CircularProgressIndicator(color: AppColors.primary),
                ),
              ),
              error: (_, __) => SliverFillRemaining(
                child: AppEmptyState(
                  title: 'Could not load savings',
                  icon: Icons.wifi_off_outlined,
                  onRetry: () => ref.refresh(savingsProvider.future),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _PotCard extends StatelessWidget {
  const _PotCard({required this.pot});
  final SavingsPotEntity pot;

  @override
  Widget build(BuildContext context) => AppCard(
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Icon(pot.icon.lucideIcon, size: 22, color: AppColors.primary),
                const SizedBox(width: 10),
                Expanded(
                  child: Text(pot.name, style: AppTextStyles.bodyMedium.copyWith(
                    fontWeight: FontWeight.w500,
                  )),
                ),
                AppBadge(
                  label: pot.type,
                  variant: pot.type == 'EMERGENCY'
                      ? AppBadgeVariant.warning
                      : pot.type == 'LIQUID'
                          ? AppBadgeVariant.success
                          : AppBadgeVariant.neutral,
                ),
              ],
            ),
            const SizedBox(height: 12),
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text(
                  pot.currentPaisas.formatPKR(),
                  style: AppTextStyles.currencyMedium.copyWith(
                    color: AppColors.primary,
                  ),
                ),
                if (pot.targetPaisas > 0)
                  Text(
                    'of ${pot.targetPaisas.formatPKR()}',
                    style: AppTextStyles.bodySmall,
                  ),
              ],
            ),
            if (pot.targetPaisas > 0) ...[
              const SizedBox(height: 8),
              AppProgressBar(value: pot.progressPct),
              if (pot.targetDate != null) ...[
                const SizedBox(height: 6),
                Text(
                  'by ${pot.targetDate!.toShortDate}',
                  style: AppTextStyles.bodySmall.copyWith(
                    color: AppColors.mutedForeground,
                  ),
                ),
              ],
            ],
          ],
        ),
      );
}
