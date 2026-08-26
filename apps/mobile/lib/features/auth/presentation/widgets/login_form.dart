import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../../core/errors/app_exception.dart';
import '../../../../core/services/toast_service.dart';
import '../../../../core/theme/app_colors.dart';
import '../../../../core/theme/app_text_styles.dart';
import '../../../../core/widgets/app_button.dart';
import '../providers/auth_provider.dart';

class LoginForm extends ConsumerStatefulWidget {
  const LoginForm({super.key});

  @override
  ConsumerState<LoginForm> createState() => _LoginFormState();
}

class _LoginFormState extends ConsumerState<LoginForm> {
  final _formKey = GlobalKey<FormState>();
  final _emailCtrl = TextEditingController();
  final _passCtrl = TextEditingController();
  final _totpCtrl = TextEditingController();
  bool _obscure = true;
  bool _submitting = false;
  bool _needsTotp = false;

  @override
  void dispose() {
    _emailCtrl.dispose();
    _passCtrl.dispose();
    _totpCtrl.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    if (!_formKey.currentState!.validate()) return;
    setState(() => _submitting = true);

    try {
      if (_needsTotp) {
        await ref.read(authProvider.notifier).verifyTotp(_totpCtrl.text.trim());
      } else {
        await ref.read(authProvider.notifier).login(
              email: _emailCtrl.text.trim(),
              password: _passCtrl.text,
            );
      }
      // RouterNotifier auto-navigates on success
    } on TotpRequiredException {
      // Password accepted; reveal the 2FA field and wait for the code.
      if (mounted) setState(() => _needsTotp = true);
    } on AppException catch (e) {
      if (mounted) ref.read(toastServiceProvider).error(context, e.message);
    } catch (_) {
      if (mounted) {
        ref.read(toastServiceProvider).error(context, 'Sign in failed. Try again');
      }
    } finally {
      if (mounted) setState(() => _submitting = false);
    }
  }

  @override
  Widget build(BuildContext context) => Form(
        key: _formKey,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text('Sign in', style: AppTextStyles.headlineLarge),
            const SizedBox(height: 8),
            Text(
              'Welcome back',
              style: AppTextStyles.bodyMedium.copyWith(
                color: AppColors.mutedForeground,
              ),
            ),
            const SizedBox(height: 32),
            TextFormField(
              controller: _emailCtrl,
              keyboardType: TextInputType.emailAddress,
              textInputAction: TextInputAction.next,
              autocorrect: false,
              decoration: const InputDecoration(labelText: 'Email'),
              validator: (v) {
                if (v == null || v.trim().isEmpty) return 'Enter your email';
                if (!v.contains('@')) return 'Enter a valid email';
                return null;
              },
            ),
            const SizedBox(height: 16),
            TextFormField(
              controller: _passCtrl,
              obscureText: _obscure,
              textInputAction: TextInputAction.done,
              onFieldSubmitted: (_) => _submit(),
              decoration: InputDecoration(
                labelText: 'Password',
                suffixIcon: IconButton(
                  icon: Icon(
                    _obscure ? Icons.visibility_off : Icons.visibility,
                    color: AppColors.mutedForeground,
                    size: 20,
                  ),
                  onPressed: () => setState(() => _obscure = !_obscure),
                ),
              ),
              validator: (v) {
                if (v == null || v.isEmpty) return 'Enter your password';
                return null;
              },
            ),
            if (_needsTotp) ...[
              const SizedBox(height: 16),
              TextFormField(
                controller: _totpCtrl,
                keyboardType: TextInputType.number,
                textInputAction: TextInputAction.done,
                autofocus: true,
                onFieldSubmitted: (_) => _submit(),
                decoration: const InputDecoration(
                  labelText: 'Authentication code',
                  helperText: 'From your authenticator app, or a backup code',
                ),
                validator: (v) {
                  if (_needsTotp && (v == null || v.trim().isEmpty)) {
                    return 'Enter your code';
                  }
                  return null;
                },
              ),
            ],
            const SizedBox(height: 32),
            AppPrimaryButton(
              label: _needsTotp ? 'Verify & sign in' : 'Sign in',
              onPressed: _submitting ? null : _submit,
              isLoading: _submitting,
            ),
          ],
        ),
      );
}
