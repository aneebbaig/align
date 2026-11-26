import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:package_info_plus/package_info_plus.dart';

import '../../../../core/errors/app_exception.dart';
import '../../../../core/network/server_url.dart';
import '../../../../core/services/toast_service.dart';
import '../../../../core/theme/app_colors.dart';
import '../../../../core/theme/app_text_styles.dart';
import '../../../../core/widgets/app_card.dart';
import '../../../../core/widgets/app_list_row.dart';
import '../../../auth/presentation/providers/auth_provider.dart';
import '../../../routines/data/log_nudge.dart';
import '../../../routines/data/reminder_service.dart';
import '../../domain/menu_sections.dart';
import '../providers/menu_prefs_provider.dart';

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

                // Menu section
                const _MenuSettings(),

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

                const _SectionLabel('Reminders'),
                const _NudgeSettings(),

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

/// The daily "log your spending" reminder. Stored on this phone only.
class _NudgeSettings extends StatefulWidget {
  const _NudgeSettings();

  @override
  State<_NudgeSettings> createState() => _NudgeSettingsState();
}

class _NudgeSettingsState extends State<_NudgeSettings> {
  bool _enabled = true;
  int _minutes = nudgeDefaultMinutes;
  bool _permitted = true;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    final enabled = await LogNudge.isEnabled();
    final minutes = await LogNudge.minutes();
    final permitted = await ReminderService.instance.notificationsEnabled();
    if (mounted) setState(() { _enabled = enabled; _minutes = minutes; _permitted = permitted; });
  }

  Future<void> _requestPermission() async {
    await ReminderService.instance.requestPermissions();
    await LogNudge.reschedule();
    await _load();
  }

  Future<void> _pickTime() async {
    final picked = await showTimePicker(
      context: context,
      initialTime: TimeOfDay(hour: _minutes ~/ 60, minute: _minutes % 60),
    );
    if (picked == null) return;
    final m = picked.hour * 60 + picked.minute;
    setState(() => _minutes = m);
    await LogNudge.setMinutes(m);
  }

  @override
  Widget build(BuildContext context) {
    final time = TimeOfDay(hour: _minutes ~/ 60, minute: _minutes % 60).format(context);
    return AppCard(
      margin: const EdgeInsets.only(bottom: 20),
      padding: EdgeInsets.zero,
      child: Column(
        children: [
          SwitchListTile(
            value: _enabled,
            activeThumbColor: AppColors.primary,
            secondary: const Icon(Icons.notifications_outlined, color: AppColors.mutedForeground, size: 20),
            title: const Text('Daily reminder to log spending', style: AppTextStyles.bodyMedium),
            onChanged: (v) async {
              setState(() => _enabled = v);
              await LogNudge.setEnabled(v);
            },
          ),
          if (_enabled)
            AppListRow(
              leading: const Icon(Icons.schedule, color: AppColors.mutedForeground, size: 20),
              title: 'Reminder time',
              subtitle: time,
              trailing: const Icon(Icons.chevron_right, color: AppColors.mutedForeground, size: 20),
              showBorder: false,
              onTap: _pickTime,
            ),
          if (_enabled && !_permitted)
            Padding(
              padding: const EdgeInsets.fromLTRB(16, 4, 16, 12),
              child: Row(
                children: [
                  Expanded(
                    child: Text('Notifications are off for Align',
                        style: AppTextStyles.bodySmall.copyWith(color: AppColors.mutedForeground)),
                  ),
                  TextButton(onPressed: _requestPermission, child: const Text('Turn on')),
                ],
              ),
            ),
        ],
      ),
    );
  }
}

/// "Show in menu" switches, shared with the web app. Older servers have no
/// preferences endpoint, so the whole card disappears instead of erroring.
class _MenuSettings extends ConsumerWidget {
  const _MenuSettings();

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final prefs = ref.watch(menuPrefsProvider);
    if (!prefs.supported) return const SizedBox.shrink();

    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        const _SectionLabel('Menu'),
        AppCard(
          margin: const EdgeInsets.only(bottom: 20),
          padding: EdgeInsets.zero,
          child: Column(
            children: [
              Padding(
                padding: const EdgeInsets.fromLTRB(16, 14, 16, 4),
                child: Text(
                  'Hide sections you do not use. Only changes your own menu.',
                  style: AppTextStyles.bodySmall.copyWith(color: AppColors.mutedForeground),
                ),
              ),
              for (final section in phoneSections)
                SwitchListTile(
                  value: !prefs.hidden.contains(section.key),
                  activeThumbColor: AppColors.primary,
                  title: Text(section.label, style: AppTextStyles.bodyMedium),
                  onChanged: (shown) async {
                    try {
                      await ref.read(menuPrefsProvider.notifier).setHidden(section.key, !shown);
                    } catch (e) {
                      if (context.mounted) {
                        ref.read(toastServiceProvider).error(
                              context,
                              e is AppException ? e.message : 'Failed to save',
                            );
                      }
                    }
                  },
                ),
            ],
          ),
        ),
      ],
    );
  }
}
