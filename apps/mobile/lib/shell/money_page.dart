import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../core/theme/app_colors.dart';
import '../core/theme/app_text_styles.dart';
import '../features/expenses/presentation/pages/expenses_list_page.dart';
import '../features/income/presentation/pages/income_list_page.dart';
import '../features/settings/presentation/providers/menu_prefs_provider.dart';

/// Expenses and Income side by side; with the Income section hidden in the
/// menu, just the expenses list.
class MoneyPage extends ConsumerWidget {
  const MoneyPage({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final incomeHidden = ref.watch(menuPrefsProvider).hidden.contains('income');
    return incomeHidden ? const _ExpensesOnly() : const _MoneyTabs();
  }
}

class _ExpensesOnly extends StatelessWidget {
  const _ExpensesOnly();

  @override
  Widget build(BuildContext context) => Scaffold(
        backgroundColor: AppColors.background,
        appBar: AppBar(
          backgroundColor: AppColors.background,
          elevation: 0,
          title: const Text('Money', style: AppTextStyles.headlineSmall),
        ),
        body: const _ExpensesBody(),
        floatingActionButton: FloatingActionButton(
          onPressed: () => context.push('/quick-add'),
          tooltip: 'Add expense',
          child: const Icon(Icons.add, size: 28, color: Colors.black),
        ),
      );
}

class _MoneyTabs extends StatefulWidget {
  const _MoneyTabs();

  @override
  State<_MoneyTabs> createState() => _MoneyTabsState();
}

class _MoneyTabsState extends State<_MoneyTabs> with SingleTickerProviderStateMixin {
  late final TabController _tab;

  @override
  void initState() {
    super.initState();
    _tab = TabController(length: 2, vsync: this);
    _tab.addListener(() => setState(() {}));
  }

  @override
  void dispose() {
    _tab.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) => Scaffold(
        backgroundColor: AppColors.background,
        appBar: AppBar(
          backgroundColor: AppColors.background,
          elevation: 0,
          title: const Text('Money', style: AppTextStyles.headlineSmall),
          bottom: TabBar(
            controller: _tab,
            labelColor: AppColors.primary,
            unselectedLabelColor: AppColors.mutedForeground,
            indicatorColor: AppColors.primary,
            indicatorSize: TabBarIndicatorSize.label,
            labelStyle: AppTextStyles.labelMedium.copyWith(fontWeight: FontWeight.w600),
            tabs: const [
              Tab(text: 'Expenses'),
              Tab(text: 'Income'),
            ],
          ),
        ),
        body: TabBarView(
          controller: _tab,
          children: const [
            _ExpensesBody(),
            _IncomeBody(),
          ],
        ),
        floatingActionButton: FloatingActionButton(
          onPressed: () => context.push(
            _tab.index == 0 ? '/quick-add' : '/quick-add-income',
          ),
          tooltip: _tab.index == 0 ? 'Add expense' : 'Add income',
          backgroundColor: _tab.index == 0 ? AppColors.primary : AppColors.success,
          child: const Icon(Icons.add, size: 28, color: Colors.black),
        ),
        floatingActionButtonLocation: FloatingActionButtonLocation.endFloat,
      );
}

// Wrappers that strip their own Scaffold/AppBar when embedded in MoneyPage
class _ExpensesBody extends StatelessWidget {
  const _ExpensesBody();

  @override
  Widget build(BuildContext context) => const ExpensesListPage(showAppBar: false);
}

class _IncomeBody extends StatelessWidget {
  const _IncomeBody();

  @override
  Widget build(BuildContext context) => const IncomeListPage(showAppBar: false);
}
