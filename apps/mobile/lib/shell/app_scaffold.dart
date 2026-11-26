import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../core/theme/app_colors.dart';
import '../features/settings/presentation/providers/menu_prefs_provider.dart';

class AppScaffold extends ConsumerStatefulWidget {
  const AppScaffold({required this.child, super.key});
  final Widget child;

  @override
  ConsumerState<AppScaffold> createState() => _AppScaffoldState();
}

typedef _Tab = ({IconData icon, IconData activeIcon, String label, String path, String? section});

class _AppScaffoldState extends ConsumerState<AppScaffold> {
  // `section` is the key from the web's hidden-sections list. Null = always shown.
  static const List<_Tab> _tabs = [
    (icon: Icons.dashboard_outlined, activeIcon: Icons.dashboard, label: 'Home', path: '/dashboard', section: 'dashboard'),
    (icon: Icons.account_balance_wallet_outlined, activeIcon: Icons.account_balance_wallet, label: 'Money', path: '/money', section: null),
    (icon: Icons.checklist_outlined, activeIcon: Icons.checklist, label: 'Tasks', path: '/tasks', section: 'tasks'),
    (icon: Icons.folder_outlined, activeIcon: Icons.folder, label: 'Work', path: '/projects', section: 'work'),
    (icon: Icons.more_horiz, activeIcon: Icons.more_horiz, label: 'More', path: '/more', section: null),
  ];

  // Sub-routes that live under "More" tab (keep More highlighted)
  static const _morePaths = ['/budget', '/loans', '/savings', '/investments', '/plans', '/planner', '/routines', '/settings'];

  @override
  void initState() {
    super.initState();
    // Pull the shared list once per app run; the cached copy already painted.
    Future.microtask(() => ref.read(menuPrefsProvider.notifier).refresh());
  }

  int _currentIndex(String location, List<_Tab> tabs) {
    final idx = tabs.indexWhere((t) => location.startsWith(t.path));
    if (idx >= 0) return idx;
    if (_morePaths.any((p) => location.startsWith(p))) {
      final more = tabs.indexWhere((t) => t.path == '/more');
      if (more >= 0) return more;
    }
    return 0;
  }

  @override
  Widget build(BuildContext context) {
    final hidden = ref.watch(menuPrefsProvider).hidden;
    final tabs = _tabs.where((t) => t.section == null || !hidden.contains(t.section)).toList();
    final location = GoRouterState.of(context).matchedLocation;
    final currentIndex = _currentIndex(location, tabs);

    return Scaffold(
      body: widget.child,
      bottomNavigationBar: Container(
        decoration: const BoxDecoration(
          border: Border(top: BorderSide(color: AppColors.border, width: 1)),
        ),
        child: NavigationBar(
          selectedIndex: currentIndex,
          onDestinationSelected: (i) => context.go(tabs[i].path),
          destinations: tabs
              .map(
                (t) => NavigationDestination(
                  icon: Icon(t.icon),
                  selectedIcon: Icon(t.activeIcon),
                  label: t.label,
                ),
              )
              .toList(),
        ),
      ),
    );
  }
}
