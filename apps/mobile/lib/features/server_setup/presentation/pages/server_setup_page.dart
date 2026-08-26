import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../../core/constants/app_constants.dart';
import '../../../../core/network/server_probe.dart';
import '../../../../core/network/server_url.dart';
import '../../../../core/services/storage_service.dart';
import '../../../../core/services/toast_service.dart';
import '../../../../core/theme/app_colors.dart';
import '../../../../core/theme/app_text_styles.dart';
import '../../../../core/widgets/app_button.dart';
import '../../../auth/presentation/providers/auth_provider.dart';

/// First launch asks which server this install talks to - the APK ships with
/// no address baked in, so the same build works for anyone self-hosting. Also
/// reachable from Settings to point the app somewhere else.
class ServerSetupPage extends ConsumerStatefulWidget {
  const ServerSetupPage({this.isChange = false, super.key});

  /// Entered from Settings rather than as the first-launch gate: the field is
  /// prefilled, the copy differs, and switching servers signs the user out.
  final bool isChange;

  @override
  ConsumerState<ServerSetupPage> createState() => _ServerSetupPageState();
}

class _ServerSetupPageState extends ConsumerState<ServerSetupPage> {
  final _controller = TextEditingController();
  final _focus = FocusNode();
  bool _checking = false;
  String? _error;

  @override
  void initState() {
    super.initState();
    if (widget.isChange) _controller.text = ref.read(serverUrlProvider) ?? '';
  }

  @override
  void dispose() {
    _controller.dispose();
    _focus.dispose();
    super.dispose();
  }

  Future<void> _connect() async {
    final origin = normaliseServerUrl(_controller.text);
    if (origin == null) {
      setState(() => _error = 'Enter a full address, like https://money.example.com');
      return;
    }

    _focus.unfocus();
    setState(() {
      _checking = true;
      _error = null;
    });

    // Reject a typo here rather than letting it come back as a login failure.
    final failure = await ref.read(serverProbeProvider).check(origin);
    if (!mounted) return;

    if (failure != null) {
      setState(() {
        _checking = false;
        _error = failure;
      });
      return;
    }

    final previous = ref.read(serverUrlProvider);
    // A different server means a different account database - the token in
    // storage is meaningless there, so drop it before switching.
    if (previous != null && previous != origin) {
      await ref.read(storageServiceProvider).clearToken();
    }
    await ref.read(serverUrlProvider.notifier).save(origin);
    ref.invalidate(authProvider);

    if (!mounted) return;
    setState(() => _checking = false);
    if (widget.isChange && previous != origin) {
      ref.read(toastServiceProvider).success(context, 'Connected to $origin');
    }
    context.go('/splash');
  }

  @override
  Widget build(BuildContext context) {
    final isHttp = _controller.text.trim().toLowerCase().startsWith('http://');

    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: widget.isChange
          ? AppBar(
              backgroundColor: AppColors.background,
              elevation: 0,
              title: const Text('Server', style: AppTextStyles.headlineSmall),
            )
          : null,
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(24),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              SizedBox(height: widget.isChange ? 8 : 48),
              if (!widget.isChange) ...[
                const Text(AppConstants.appName, style: AppTextStyles.displayLarge),
                const SizedBox(height: 4),
                Text(
                  'Personal Finance',
                  style: AppTextStyles.bodyLarge.copyWith(
                    color: AppColors.mutedForeground,
                  ),
                ),
                const SizedBox(height: 48),
              ],
              Text(
                widget.isChange ? 'Change server' : 'Connect to your server',
                style: AppTextStyles.headlineLarge,
              ),
              const SizedBox(height: 8),
              Text(
                widget.isChange
                    ? 'Point the app at a different instance. You will be signed out.'
                    : '${AppConstants.appName} stores your money in a server you run. '
                        'Enter its address to get started.',
                style: AppTextStyles.bodyMedium.copyWith(
                  color: AppColors.mutedForeground,
                ),
              ),
              const SizedBox(height: 32),
              TextFormField(
                controller: _controller,
                focusNode: _focus,
                keyboardType: TextInputType.url,
                textInputAction: TextInputAction.go,
                autocorrect: false,
                enableSuggestions: false,
                autofocus: !widget.isChange,
                decoration: InputDecoration(
                  labelText: 'Server address',
                  hintText: 'https://money.example.com',
                  errorText: _error,
                ),
                onChanged: (_) => setState(() {}),
                onFieldSubmitted: (_) => _checking ? null : _connect(),
              ),
              if (isHttp) ...[
                const SizedBox(height: 12),
                Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Icon(Icons.lock_open,
                        size: 16, color: AppColors.mutedForeground),
                    const SizedBox(width: 8),
                    Expanded(
                      child: Text(
                        'This address is unencrypted. Fine on your own network, '
                        'risky over the internet.',
                        style: AppTextStyles.bodySmall.copyWith(
                          color: AppColors.mutedForeground,
                        ),
                      ),
                    ),
                  ],
                ),
              ],
              const SizedBox(height: 24),
              AppButton(
                label: _checking ? 'Checking…' : 'Connect',
                isLoading: _checking,
                expand: true,
                onPressed: _checking ? null : _connect,
              ),
              const SizedBox(height: 24),
              Text(
                'Self-hosting guide: github.com/aneebbaig/align',
                style: AppTextStyles.bodySmall.copyWith(
                  color: AppColors.mutedForeground,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
