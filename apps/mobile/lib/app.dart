import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:riverpod_annotation/riverpod_annotation.dart';
import 'package:toastification/toastification.dart';

import 'core/constants/app_constants.dart';
import 'core/network/server_url.dart';
import 'core/theme/app_theme.dart';
import 'features/auth/presentation/pages/login_page.dart';
import 'features/auth/presentation/pages/splash_page.dart';
import 'features/auth/presentation/providers/router_notifier.dart';
import 'features/dashboard/presentation/pages/dashboard_page.dart';
import 'features/server_setup/presentation/pages/server_setup_page.dart';
import 'features/expenses/presentation/pages/quick_add_expense_page.dart';
import 'features/budget/presentation/pages/budget_page.dart';
import 'features/savings/presentation/pages/savings_page.dart';
import 'features/investments/presentation/pages/investments_page.dart';
import 'features/plans/presentation/pages/plans_page.dart';
import 'features/plans/presentation/pages/plan_detail_page.dart';
import 'features/loans/presentation/pages/loans_page.dart';
import 'features/settings/presentation/pages/settings_page.dart';
import 'features/tasks/presentation/pages/tasks_page.dart';
import 'features/tasks/presentation/pages/quick_add_task_page.dart';
import 'features/projects/presentation/pages/projects_page.dart';
import 'features/projects/presentation/pages/project_detail_page.dart';
import 'features/projects/presentation/pages/quick_add_project_page.dart';
import 'features/income/presentation/pages/quick_add_income_page.dart';
import 'features/loans/presentation/pages/quick_add_loan_page.dart';
import 'shell/app_scaffold.dart';
import 'shell/money_page.dart';
import 'shell/more_page.dart';

part 'app.g.dart';

@Riverpod(keepAlive: true)
GoRouter goRouter(Ref ref) {
  final notifier = ref.watch(routerProvider.notifier);
  // Holds deep link target across auth loading gap (cold start / background resume)
  String? pendingLink;

  return GoRouter(
    initialLocation: '/splash',
    refreshListenable: notifier,
    errorBuilder: (_, state) => _ErrorPage(error: state.error),
    redirect: (context, state) {
      // Custom-scheme deep links: align://quick-add → park on splash, deliver after auth resolves
      if (state.uri.scheme == 'align') {
        final host = state.uri.host;
        final query = state.uri.hasQuery ? '?${state.uri.query}' : '';
        pendingLink = '/$host$query';
        return '/splash';
      }

      // Nothing in the app can talk to an API until a server is configured, so
      // the setup screen gates everything - including login.
      final onSetup = state.matchedLocation == '/setup';
      if (ref.read(serverUrlProvider) == null) return onSetup ? null : '/setup';
      // Reachable from Settings once configured (?change=1); otherwise leaving
      // it parked would strand the user on a screen with nothing to do.
      if (onSetup) {
        return state.uri.queryParameters['change'] == '1' ? null : '/splash';
      }

      final authAsync = ref.read(routerProvider);
      final onSplash = state.matchedLocation == '/splash';

      if (authAsync.isLoading || authAsync.hasError) {
        return onSplash ? null : '/splash';
      }

      final isAuthenticated = authAsync.value ?? false;
      final isOnLogin = state.matchedLocation == '/login';

      if (!isAuthenticated && !isOnLogin) return '/login';
      if (isAuthenticated && (isOnLogin || onSplash)) {
        final dest = pendingLink ?? '/dashboard';
        pendingLink = null;
        return dest;
      }
      return null;
    },
    routes: [
      GoRoute(
        path: '/splash',
        builder: (_, __) => const SplashPage(),
      ),
      GoRoute(
        path: '/setup',
        builder: (_, state) => ServerSetupPage(
          isChange: state.uri.queryParameters['change'] == '1',
        ),
      ),
      GoRoute(
        path: '/login',
        builder: (_, __) => const LoginPage(),
      ),
      ShellRoute(
        builder: (_, __, child) => AppScaffold(child: child),
        routes: [
          GoRoute(
            path: '/dashboard',
            builder: (_, __) => const DashboardPage(),
          ),
          GoRoute(
            path: '/money',
            builder: (_, __) => const MoneyPage(),
          ),
          GoRoute(
            path: '/tasks',
            builder: (_, __) => const TasksPage(),
          ),
          GoRoute(
            path: '/investments',
            builder: (_, __) => const InvestmentsPage(),
          ),
          GoRoute(
            path: '/savings',
            builder: (_, __) => const SavingsPage(),
          ),
          GoRoute(
            path: '/more',
            builder: (_, __) => const MorePage(),
          ),
          // Pushable from More page - keep bottom nav visible
          GoRoute(
            path: '/budget',
            builder: (_, __) => const BudgetPage(),
          ),
          GoRoute(
            path: '/loans',
            builder: (_, __) => const LoansPage(),
          ),
          GoRoute(
            path: '/plans',
            builder: (_, __) => const PlansPage(),
            routes: [
              GoRoute(
                path: ':id',
                builder: (_, state) => PlanDetailPage(planId: state.pathParameters['id']!),
              ),
            ],
          ),
          GoRoute(
            path: '/projects',
            builder: (_, __) => const ProjectsPage(),
            routes: [
              GoRoute(
                path: ':id',
                builder: (_, state) =>
                    ProjectDetailPage(projectId: state.pathParameters['id']!),
              ),
            ],
          ),
          GoRoute(
            path: '/settings',
            builder: (_, __) => const SettingsPage(),
          ),
        ],
      ),
      // Modal routes - slide up, no bottom nav
      GoRoute(
        path: '/quick-add',
        pageBuilder: (_, state) => _slideUp(state, const QuickAddExpensePage()),
      ),
      GoRoute(
        path: '/quick-add-income',
        pageBuilder: (_, state) => _slideUp(state, const QuickAddIncomePage()),
      ),
      GoRoute(
        path: '/quick-add-task',
        pageBuilder: (_, state) => _slideUp(state, const QuickAddTaskPage()),
      ),
      GoRoute(
        path: '/quick-add-loan',
        pageBuilder: (_, state) => _slideUp(state, const QuickAddLoanPage()),
      ),
      GoRoute(
        path: '/quick-add-project',
        pageBuilder: (_, state) => _slideUp(state, const QuickAddProjectPage()),
      ),
    ],
  );
}

CustomTransitionPage<void> _slideUp(GoRouterState state, Widget child) =>
    CustomTransitionPage(
      key: state.pageKey,
      child: child,
      transitionsBuilder: (_, animation, __, child) => SlideTransition(
        position: Tween(
          begin: const Offset(0, 1),
          end: Offset.zero,
        ).animate(CurvedAnimation(parent: animation, curve: Curves.easeOut)),
        child: child,
      ),
    );

class _ErrorPage extends StatelessWidget {
  const _ErrorPage({this.error});
  final Exception? error;

  @override
  Widget build(BuildContext context) => Scaffold(
        backgroundColor: const Color(0xFF0A0A0A),
        body: SafeArea(
          child: Padding(
            padding: const EdgeInsets.all(32),
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Icon(Icons.link_off_rounded, size: 48, color: Color(0xFFF59E0B)),
                const SizedBox(height: 24),
                const Text(
                  'Page not found',
                  style: TextStyle(
                    color: Colors.white,
                    fontSize: 24,
                    fontWeight: FontWeight.w700,
                    letterSpacing: -0.5,
                  ),
                ),
                const SizedBox(height: 8),
                Text(
                  'The route you navigated to does not exist.',
                  style: TextStyle(color: Colors.white.withValues(alpha: 0.5), fontSize: 14),
                ),
                const SizedBox(height: 32),
                GestureDetector(
                  onTap: () => context.go('/dashboard'),
                  child: Container(
                    padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 12),
                    decoration: BoxDecoration(
                      color: const Color(0xFFF59E0B),
                      borderRadius: BorderRadius.circular(8),
                    ),
                    child: const Text(
                      'Go to Dashboard',
                      style: TextStyle(
                        color: Colors.black,
                        fontWeight: FontWeight.w600,
                        fontSize: 14,
                      ),
                    ),
                  ),
                ),
              ],
            ),
          ),
        ),
      );
}

class AlignApp extends ConsumerWidget {
  const AlignApp({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final router = ref.watch(goRouterProvider);
    return ToastificationWrapper(
      child: MaterialApp.router(
        title: AppConstants.appName,
        theme: AppTheme.dark,
        darkTheme: AppTheme.dark,
        themeMode: ThemeMode.dark,
        routerConfig: router,
        debugShowCheckedModeBanner: false,
      ),
    );
  }
}
