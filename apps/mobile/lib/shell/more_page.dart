import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../core/theme/app_colors.dart';
import '../core/theme/app_text_styles.dart';
import '../features/settings/presentation/providers/menu_prefs_provider.dart';

typedef _MoreEntry = ({IconData icon, String label, String subtitle, String path, String section});

class MorePage extends ConsumerWidget {
  const MorePage({super.key});

  // `section` matches the web's hidden-sections keys. Settings is always shown.
  static const List<_MoreEntry> _items = [
    (icon: Icons.pie_chart_outline, label: 'Budget', subtitle: 'View allocations & spending', path: '/budget', section: 'budget'),
    (icon: Icons.handshake_outlined, label: 'Loans', subtitle: 'Track money given & received', path: '/loans', section: 'loans'),
    (icon: Icons.savings_outlined, label: 'Savings', subtitle: 'Pots & wealth', path: '/savings', section: 'savings'),
    (icon: Icons.show_chart, label: 'Investments', subtitle: 'Investments, plan & contributions', path: '/investments', section: 'investments'),
    (icon: Icons.table_chart_outlined, label: 'Forecast', subtitle: 'Your cash month by month – separate from your real money', path: '/planner', section: 'forecast'),
    (icon: Icons.alarm, label: 'Routines', subtitle: 'Daily routine with timed reminders', path: '/routines', section: 'routines'),
    (icon: Icons.checklist_rtl, label: 'Plans', subtitle: 'Projects & itemized checklists', path: '/plans', section: 'plans'),
    (icon: Icons.settings_outlined, label: 'Settings', subtitle: 'Account & preferences', path: '/settings', section: ''),
  ];

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final hidden = ref.watch(menuPrefsProvider).hidden;
    final items = _items.where((i) => i.section.isEmpty || !hidden.contains(i.section)).toList();

    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        backgroundColor: AppColors.background,
        elevation: 0,
        title: const Text('More', style: AppTextStyles.headlineSmall),
      ),
      body: ListView(
        padding: const EdgeInsets.fromLTRB(16, 8, 16, 32),
        children: [
          for (var i = 0; i < items.length; i++) ...[
            _MoreItem(
              icon: items[i].icon,
              label: items[i].label,
              subtitle: items[i].subtitle,
              onTap: () => context.push(items[i].path),
            ),
            if (i != items.length - 1) const SizedBox(height: 8),
          ],
        ],
      ),
    );
  }
}

class _MoreItem extends StatelessWidget {
  const _MoreItem({
    required this.icon,
    required this.label,
    required this.subtitle,
    required this.onTap,
  });
  final IconData icon;
  final String label;
  final String subtitle;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) => InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(12),
        child: Container(
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(
            color: AppColors.card,
            borderRadius: BorderRadius.circular(12),
            border: Border.all(color: AppColors.border.withValues(alpha: 0.5)),
          ),
          child: Row(
            children: [
              Container(
                width: 40,
                height: 40,
                decoration: BoxDecoration(
                  color: AppColors.primary.withValues(alpha: 0.12),
                  borderRadius: BorderRadius.circular(10),
                ),
                child: Icon(icon, color: AppColors.primary, size: 20),
              ),
              const SizedBox(width: 14),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(label,
                        style: AppTextStyles.bodyMedium
                            .copyWith(fontWeight: FontWeight.w600)),
                    const SizedBox(height: 2),
                    Text(subtitle,
                        style: AppTextStyles.bodySmall
                            .copyWith(color: AppColors.mutedForeground)),
                  ],
                ),
              ),
              const Icon(Icons.chevron_right, color: AppColors.mutedForeground, size: 20),
            ],
          ),
        ),
      );
}
