import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:package_info_plus/package_info_plus.dart';

import '../../../../core/network/server_url.dart';
import '../../../../core/theme/app_colors.dart';
import '../../../../core/theme/app_text_styles.dart';
import '../../../../core/widgets/app_card.dart';
import '../../../../core/widgets/app_list_row.dart';
import '../../../auth/presentation/providers/auth_provider.dart';

class SettingsPage extends ConsumerWidget {
  const SettingsPage({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final userAsync = ref.watch(authProvider);
    final serverUrl = ref.watch(serverUrlProvider);
    final user = userAsync.asData?.value;

    return Scaffold(
      backgroundColor: AppColors.background,
      body: CustomScrollView(
        slivers: [
          const SliverAppBar(
            backgroundColor: AppColors.background,
            floating: true,
            snap: true,
            elevation: 0,
            title: Text('Settings', style: AppTextStyles.headlineSmall),
          ),
          SliverPadding(
            padding: const EdgeInsets.fromLTRB(16, 8, 16, 100),
            sliver: SliverList(
              delegate: SliverChildListDelegate([
                // Profile card
                if (user != null)
                  AppCard(
                    margin: const EdgeInsets.only(bottom: 20),
                    child: Row(
                      children: [
                        CircleAvatar(
                          radius: 22,
                          backgroundColor: AppColors.primary.withValues(alpha: 0.15),
                          child: Text(
                            user.name.isNotEmpty
                                ? user.name[0].toUpperCase()
                                : '?',
                            style: AppTextStyles.headlineSmall.copyWith(
                              color: AppColors.primary,
                            ),
                          ),
                        ),
                        const SizedBox(width: 14),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(user.name,
                                  style: AppTextStyles.bodyMedium.copyWith(
                                    fontWeight: FontWeight.w600,
                                  )),
                              Text(user.email,
                                  style: AppTextStyles.bodySmall.copyWith(
                                    color: AppColors.mutedForeground,
                                  )),
                            ],
                          ),
                        ),
                      ],
                    ),
                  ),

                // Server section
                const _SectionLabel('Server'),
                AppCard(
                  margin: const EdgeInsets.only(bottom: 20),
                  padding: EdgeInsets.zero,
                  child: AppListRow(
                    leading: const Icon(Icons.dns_outlined,
                        color: AppColors.mutedForeground, size: 20),
                    title: 'Server address',
                    subtitle: serverUrl ?? 'Not set',
                    trailing: const Icon(Icons.chevron_right,
                        color: AppColors.mutedForeground, size: 20),
                    showBorder: false,
                    onTap: () => context.push('/setup?change=1'),
                  ),
                ),

                // About section
                const _SectionLabel('About'),
                AppCard(
                  margin: const EdgeInsets.only(bottom: 20),
                  padding: EdgeInsets.zero,
                  child: FutureBuilder<PackageInfo>(
                    future: PackageInfo.fromPlatform(),
                    builder: (_, snap) {
                      final version = snap.hasData
                          ? '${snap.data!.version}+${snap.data!.buildNumber}'
                          : '-';
                      return AppListRow(
                        leading: const Icon(Icons.info_outline,
                            color: AppColors.mutedForeground, size: 20),
                        title: 'Version',
                        subtitle: version,
                        showBorder: false,
                      );
                    },
                  ),
                ),

                // Danger zone
                const _SectionLabel('Account'),
                AppCard(
                  padding: EdgeInsets.zero,
                  borderColor: AppColors.destructive.withValues(alpha: 0.3),
                  child: AppListRow(
                    leading: const Icon(Icons.logout,
                        color: AppColors.destructive, size: 20),
                    title: 'Sign out',
                    trailing: const SizedBox.shrink(),
                    showBorder: false,
                    onTap: () async {
                      final confirm = await showDialog<bool>(
                        context: context,
                        builder: (ctx) => AlertDialog(
                          backgroundColor: AppColors.card,
                          title: Text('Sign out?',
                              style: AppTextStyles.bodyMedium.copyWith(
                                fontWeight: FontWeight.w600,
                              )),
                          actions: [
                            TextButton(
                              onPressed: () => Navigator.pop(ctx, false),
                              child: Text('Cancel',
                                  style: AppTextStyles.bodySmall.copyWith(
                                    color: AppColors.mutedForeground,
                                  )),
                            ),
                            TextButton(
                              onPressed: () => Navigator.pop(ctx, true),
                              child: Text('Sign out',
                                  style: AppTextStyles.bodySmall.copyWith(
                                    color: AppColors.destructive,
                                  )),
                            ),
                          ],
                        ),
                      );
                      if (confirm == true && context.mounted) {
                        await ref.read(authProvider.notifier).logout();
                      }
                    },
                  ),
                ),
              ]),
            ),
          ),
        ],
      ),
    );
  }
}

class _SectionLabel extends StatelessWidget {
  const _SectionLabel(this.label);
  final String label;

  @override
  Widget build(BuildContext context) => Padding(
        padding: const EdgeInsets.only(bottom: 8),
        child: Text(
          label.toUpperCase(),
          style: AppTextStyles.labelSmall.copyWith(
            color: AppColors.mutedForeground,
            letterSpacing: 0.8,
          ),
        ),
      );
}
