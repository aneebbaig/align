import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../core/theme/app_colors.dart';
import '../core/theme/app_text_styles.dart';

class MorePage extends StatelessWidget {
  const MorePage({super.key});

  @override
  Widget build(BuildContext context) => Scaffold(
        backgroundColor: AppColors.background,
        appBar: AppBar(
          backgroundColor: AppColors.background,
          elevation: 0,
          title: const Text('More', style: AppTextStyles.headlineSmall),
        ),
        body: ListView(
          padding: const EdgeInsets.fromLTRB(16, 8, 16, 32),
          children: [
            _MoreItem(
              icon: Icons.pie_chart_outline,
              label: 'Budget',
              subtitle: 'View allocations & spending',
              onTap: () => context.push('/budget'),
            ),
            const SizedBox(height: 8),
            _MoreItem(
              icon: Icons.handshake_outlined,
              label: 'Loans',
              subtitle: 'Track money given & received',
              onTap: () => context.push('/loans'),
            ),
            const SizedBox(height: 8),
            _MoreItem(
              icon: Icons.savings_outlined,
              label: 'Savings',
              subtitle: 'Pots & wealth',
              onTap: () => context.push('/savings'),
            ),
            const SizedBox(height: 8),
            _MoreItem(
              icon: Icons.show_chart,
              label: 'Investments',
              subtitle: 'SIPs, plan & contributions',
              onTap: () => context.push('/investments'),
            ),
            const SizedBox(height: 8),
            _MoreItem(
              icon: Icons.checklist_rtl,
              label: 'Plans',
              subtitle: 'Projects & itemized checklists',
              onTap: () => context.push('/plans'),
            ),
            const SizedBox(height: 8),
            _MoreItem(
              icon: Icons.settings_outlined,
              label: 'Settings',
              subtitle: 'Account & preferences',
              onTap: () => context.push('/settings'),
            ),
          ],
        ),
      );
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
