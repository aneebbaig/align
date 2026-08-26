import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../core/theme/app_colors.dart';
import '../core/theme/app_text_styles.dart';
import '../features/expenses/presentation/pages/expenses_list_page.dart';
import '../features/income/presentation/pages/income_list_page.dart';

class MoneyPage extends StatefulWidget {
  const MoneyPage({super.key});

  @override
  State<MoneyPage> createState() => _MoneyPageState();
}

class _MoneyPageState extends State<MoneyPage> with SingleTickerProviderStateMixin {
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
          backgroundColor: _tab.index == 0 ? AppColors.primary : const Color(0xFF4CAF50),
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
