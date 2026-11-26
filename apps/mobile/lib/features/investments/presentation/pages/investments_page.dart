import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../../core/theme/app_colors.dart';
import '../../../../core/theme/app_text_styles.dart';
import '../../../../core/widgets/app_empty_state.dart';
import '../providers/investments_provider.dart';
import '../widgets/investment_cards.dart';
import '../widgets/investment_sheets.dart';

class InvestmentsPage extends ConsumerWidget {
  const InvestmentsPage({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final async = ref.watch(investmentsProvider);

    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        backgroundColor: AppColors.background,
        elevation: 0,
        title: const Text('Investments', style: AppTextStyles.headlineSmall),
      ),
      floatingActionButton: async.maybeWhen(
        data: (data) => FloatingActionButton(
          tooltip: 'Add investment',
          onPressed: () => showPlanEditorSheet(context, ref, data.plan),
          child: const Icon(Icons.add),
        ),
        orElse: () => null,
      ),
      body: RefreshIndicator(
        color: AppColors.primary,
        backgroundColor: AppColors.card,
        onRefresh: () => ref.refresh(investmentsProvider.future),
        child: async.when(
          data: (data) => InvestmentsContent(data: data),
          loading: () =>
              const Center(child: CircularProgressIndicator(color: AppColors.primary)),
          error: (_, __) => ListView(
            children: [
              const SizedBox(height: 120),
              AppEmptyState(
                title: 'Could not load investments',
                icon: Icons.wifi_off_outlined,
                onRetry: () => ref.refresh(investmentsProvider.future),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
