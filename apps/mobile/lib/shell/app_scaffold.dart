import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../core/theme/app_colors.dart';

class AppScaffold extends StatelessWidget {
  const AppScaffold({required this.child, super.key});
  final Widget child;

  static const _tabs = [
    (icon: Icons.dashboard_outlined, activeIcon: Icons.dashboard, label: 'Home', path: '/dashboard'),
    (icon: Icons.account_balance_wallet_outlined, activeIcon: Icons.account_balance_wallet, label: 'Money', path: '/money'),
    (icon: Icons.checklist_outlined, activeIcon: Icons.checklist, label: 'Tasks', path: '/tasks'),
    (icon: Icons.folder_outlined, activeIcon: Icons.folder, label: 'Work', path: '/projects'),
    (icon: Icons.more_horiz, activeIcon: Icons.more_horiz, label: 'More', path: '/more'),
  ];

  // Sub-routes that live under "More" tab (keep More highlighted)
  static const _morePaths = ['/budget', '/loans', '/savings', '/investments', '/plans', '/settings'];

  int _currentIndex(String location) {
    final idx = _tabs.indexWhere((t) => location.startsWith(t.path));
    if (idx >= 0) return idx;
    if (_morePaths.any((p) => location.startsWith(p))) return 4;
    return 0;
  }

  @override
  Widget build(BuildContext context) {
    final location = GoRouterState.of(context).matchedLocation;
    final currentIndex = _currentIndex(location);

    return Scaffold(
      body: child,
      bottomNavigationBar: Container(
        decoration: const BoxDecoration(
          border: Border(top: BorderSide(color: AppColors.border, width: 1)),
        ),
        child: NavigationBar(
          selectedIndex: currentIndex,
          onDestinationSelected: (i) => context.go(_tabs[i].path),
          destinations: _tabs
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
