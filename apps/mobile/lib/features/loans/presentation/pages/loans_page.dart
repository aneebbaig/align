import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../../core/errors/app_exception.dart';
import '../../../../core/extensions/currency_ext.dart';
import '../../../../core/extensions/datetime_ext.dart';
import '../../../../core/services/toast_service.dart';
import '../../../../core/theme/app_colors.dart';
import '../../../../core/theme/app_text_styles.dart';
import '../../../../core/widgets/app_badge.dart';
import '../../../../core/widgets/app_card.dart';
import '../../../../core/widgets/app_divider.dart';
import '../../../../core/widgets/app_empty_state.dart';
import '../../../../core/widgets/app_progress_bar.dart';
import '../../data/datasources/loans_datasource.dart';
import '../../domain/entities/loan_entity.dart';
import '../providers/loans_provider.dart';
import 'loan_entry_page.dart';
import 'record_payment_page.dart';

class LoansPage extends ConsumerWidget {
  const LoansPage({super.key});

  void _showPayment(BuildContext context, LoanEntity loan, {LoanPaymentEntity? editPayment}) {
    Navigator.of(context).push(
      MaterialPageRoute(
        fullscreenDialog: true,
        builder: (_) => RecordPaymentPage(loan: loan, editPayment: editPayment),
      ),
    );
  }

  void _showEntry(BuildContext context, LoanEntity loan, LoanEntryMode mode) {
    Navigator.of(context).push(
      MaterialPageRoute(
        fullscreenDialog: true,
        builder: (_) => LoanEntryPage(loan: loan, mode: mode),
      ),
    );
  }

  Future<void> _deletePayment(BuildContext context, WidgetRef ref, LoanEntity loan, LoanPaymentEntity payment) async {
    try {
      await ref.read(loansDatasourceProvider).deletePayment(loanId: loan.id, paymentId: payment.id);
      ref.invalidate(loansProvider);
      if (context.mounted) {
        ref.read(toastServiceProvider).success(context, 'Payment deleted');
      }
    } catch (e) {
      if (!context.mounted) return;
      final msg = e is AppException ? e.message : 'Failed to delete payment';
      ref.read(toastServiceProvider).error(context, msg);
    }
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final async = ref.watch(loansProvider);

    return Scaffold(
      backgroundColor: AppColors.background,
      floatingActionButton: FloatingActionButton(
        onPressed: () => context.push('/quick-add-loan'),
        tooltip: 'New loan',
        child: const Icon(Icons.add, size: 28),
      ),
      body: RefreshIndicator(
        color: AppColors.primary,
        backgroundColor: AppColors.card,
        onRefresh: () => ref.refresh(loansProvider.future),
        child: CustomScrollView(
          slivers: [
            const SliverAppBar(
              backgroundColor: AppColors.background,
              floating: true,
              snap: true,
              elevation: 0,
              title: Text('Loans', style: AppTextStyles.headlineSmall),
            ),
            async.when(
              data: (loans) {
                if (loans.isEmpty) {
                  return const SliverFillRemaining(
                    child: AppEmptyState(
                      title: 'No active loans',
                      icon: Icons.handshake_outlined,
                    ),
                  );
                }
                final given = loans.where((l) => l.type == 'GIVEN').toList();
                final received =
                    loans.where((l) => l.type == 'RECEIVED').toList();
                return SliverPadding(
                  padding: const EdgeInsets.fromLTRB(16, 4, 16, 100),
                  sliver: SliverList(
                    delegate: SliverChildListDelegate([
                      if (given.isNotEmpty) ...[
                        _GroupHeader(
                          label: 'Money Given',
                          total: given.fold(
                              0, (sum, l) => sum + l.remainingPaisas),
                          color: const Color(0xFFE67E22),
                        ),
                        const SizedBox(height: 8),
                        ...given.map((l) => Padding(
                              padding: const EdgeInsets.only(bottom: 10),
                              child: _LoanCard(
                                loan: l,
                                onPay: !l.isClosed ? () => _showPayment(context, l) : null,
                                onEditPayment: (p) => _showPayment(context, l, editPayment: p),
                                onDeletePayment: (p) => _deletePayment(context, ref, l, p),
                                onAddMore: () => _showEntry(context, l, LoanEntryMode.topUp),
                                onWriteOff: !l.isClosed ? () => _showEntry(context, l, LoanEntryMode.writeOff) : null,
                              ),
                            )),
                        const SizedBox(height: 12),
                      ],
                      if (received.isNotEmpty) ...[
                        _GroupHeader(
                          label: 'Money Received',
                          total: received.fold(
                              0, (sum, l) => sum + l.remainingPaisas),
                          color: AppColors.destructive,
                        ),
                        const SizedBox(height: 8),
                        ...received.map((l) => Padding(
                              padding: const EdgeInsets.only(bottom: 10),
                              child: _LoanCard(
                                loan: l,
                                onPay: !l.isClosed ? () => _showPayment(context, l) : null,
                                onEditPayment: (p) => _showPayment(context, l, editPayment: p),
                                onDeletePayment: (p) => _deletePayment(context, ref, l, p),
                                onAddMore: () => _showEntry(context, l, LoanEntryMode.topUp),
                                onWriteOff: !l.isClosed ? () => _showEntry(context, l, LoanEntryMode.writeOff) : null,
                              ),
                            )),
                      ],
                    ]),
                  ),
                );
              },
              loading: () => const SliverFillRemaining(
                child: Center(
                  child: CircularProgressIndicator(color: AppColors.primary),
                ),
              ),
              error: (_, __) => SliverFillRemaining(
                child: AppEmptyState(
                  title: 'Could not load loans',
                  icon: Icons.wifi_off_outlined,
                  onRetry: () => ref.refresh(loansProvider.future),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _GroupHeader extends StatelessWidget {
  const _GroupHeader({
    required this.label,
    required this.total,
    required this.color,
  });
  final String label;
  final int total;
  final Color color;

  @override
  Widget build(BuildContext context) => Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(
            label.toUpperCase(),
            style: AppTextStyles.labelSmall.copyWith(
              color: AppColors.mutedForeground,
              letterSpacing: 0.8,
            ),
          ),
          Text(
            total.formatPKR(),
            style: AppTextStyles.labelMedium.copyWith(color: color),
          ),
        ],
      );
}

class _LoanCard extends StatelessWidget {
  const _LoanCard({
    required this.loan,
    this.onPay,
    this.onEditPayment,
    this.onDeletePayment,
    this.onAddMore,
    this.onWriteOff,
  });
  final LoanEntity loan;
  final VoidCallback? onPay;
  final void Function(LoanPaymentEntity)? onEditPayment;
  final void Function(LoanPaymentEntity)? onDeletePayment;
  final VoidCallback? onAddMore;
  final VoidCallback? onWriteOff;

  Future<void> _confirmDeletePayment(BuildContext context, LoanPaymentEntity payment) async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        backgroundColor: AppColors.card,
        title: const Text('Delete payment?', style: AppTextStyles.headlineSmall),
        content: Text(
          "This removes the payment and its linked transaction, and adds the amount back to the loan's remaining balance. This cannot be undone.",
          style: AppTextStyles.bodyMedium.copyWith(color: AppColors.mutedForeground),
        ),
        actions: [
          TextButton(onPressed: () => Navigator.of(ctx).pop(false), child: const Text('Cancel')),
          TextButton(
            onPressed: () => Navigator.of(ctx).pop(true),
            child: const Text('Delete', style: TextStyle(color: AppColors.destructive)),
          ),
        ],
      ),
    );
    if (confirmed == true) onDeletePayment?.call(payment);
  }

  AppBadgeVariant get _badgeVariant => switch (loan.status) {
        'ACTIVE' => AppBadgeVariant.warning,
        'PARTIALLY_PAID' => AppBadgeVariant.primary,
        'WRITTEN_OFF' => AppBadgeVariant.neutral,
        _ => AppBadgeVariant.success,
      };

  String get _badgeLabel => switch (loan.status) {
        'ACTIVE' => 'Active',
        'PARTIALLY_PAID' => 'Partial',
        'WRITTEN_OFF' => loan.type == 'GIVEN' ? 'Written off' : 'Forgiven',
        _ => 'Paid',
      };

  @override
  Widget build(BuildContext context) => AppCard(
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(loan.personName,
                          style: AppTextStyles.bodyMedium
                              .copyWith(fontWeight: FontWeight.w600)),
                      if (loan.description != null)
                        Text(loan.description!,
                            style: AppTextStyles.bodySmall
                                .copyWith(color: AppColors.mutedForeground)),
                    ],
                  ),
                ),
                AppBadge(
                  label: _badgeLabel,
                  variant: _badgeVariant,
                ),
              ],
            ),
            const SizedBox(height: 12),
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text('Principal',
                        style: AppTextStyles.labelSmall
                            .copyWith(color: AppColors.mutedForeground)),
                    Text(loan.principalPaisas.formatPKR(),
                        style: AppTextStyles.currencySmall),
                  ],
                ),
                Column(
                  crossAxisAlignment: CrossAxisAlignment.end,
                  children: [
                    Text('Remaining',
                        style: AppTextStyles.labelSmall
                            .copyWith(color: AppColors.mutedForeground)),
                    Text(
                      loan.remainingPaisas.formatPKR(),
                      style: AppTextStyles.currencySmall.copyWith(
                        color: loan.type == 'RECEIVED'
                            ? AppColors.destructive
                            : const Color(0xFFE67E22),
                      ),
                    ),
                  ],
                ),
              ],
            ),
            const SizedBox(height: 8),
            AppProgressBar(value: loan.paidPct),
            if (loan.dueDate != null) ...[
              const SizedBox(height: 8),
              Row(
                children: [
                  const Icon(Icons.calendar_today_outlined,
                      size: 12, color: AppColors.mutedForeground),
                  const SizedBox(width: 4),
                  Text(
                    'Due ${loan.dueDate!.toShortDate}',
                    style: AppTextStyles.labelSmall
                        .copyWith(color: AppColors.mutedForeground),
                  ),
                ],
              ),
            ],
            if (loan.recentPayments.isNotEmpty) ...[
              const SizedBox(height: 12),
              const AppDivider(),
              const SizedBox(height: 10),
              Text(
                'HISTORY',
                style: AppTextStyles.labelSmall.copyWith(
                  color: AppColors.mutedForeground,
                  letterSpacing: 0.5,
                ),
              ),
              const SizedBox(height: 6),
              ...loan.recentPayments.map((p) => Padding(
                    padding: const EdgeInsets.only(bottom: 4),
                    child: Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Text(p.date.toShortDate, style: AppTextStyles.bodySmall),
                        Row(
                          children: [
                            Text(
                              switch (p.kind) {
                                'TOP_UP' => '+${p.amountPaisas.formatPKR()} added',
                                'WRITE_OFF' => '${p.amountPaisas.formatPKR()} ${loan.type == 'GIVEN' ? 'written off' : 'forgiven'}',
                                _ => p.amountPaisas.formatPKR(),
                              },
                              style: AppTextStyles.labelMedium.copyWith(
                                color: switch (p.kind) {
                                  'TOP_UP' => const Color(0xFFE67E22),
                                  'WRITE_OFF' => AppColors.mutedForeground,
                                  _ => const Color(0xFF4CAF50),
                                },
                              ),
                            ),
                            if (p.kind == 'PAYMENT' && p.hasTransaction && onEditPayment != null) ...[
                              const SizedBox(width: 8),
                              GestureDetector(
                                onTap: () => onEditPayment!(p),
                                behavior: HitTestBehavior.opaque,
                                child: const Icon(Icons.edit_outlined, size: 13, color: AppColors.mutedForeground),
                              ),
                            ],
                            if (onDeletePayment != null) ...[
                              const SizedBox(width: 8),
                              Builder(
                                builder: (ctx) => GestureDetector(
                                  onTap: () => _confirmDeletePayment(ctx, p),
                                  behavior: HitTestBehavior.opaque,
                                  child: Icon(Icons.delete_outline, size: 13, color: AppColors.destructive.withValues(alpha: 0.7)),
                                ),
                              ),
                            ],
                          ],
                        ),
                      ],
                    ),
                  )),
            ],
            if (onPay != null) ...[
              const SizedBox(height: 12),
              const AppDivider(),
              const SizedBox(height: 10),
              SizedBox(
                width: double.infinity,
                child: GestureDetector(
                  onTap: onPay,
                  child: Container(
                    padding: const EdgeInsets.symmetric(vertical: 10),
                    decoration: BoxDecoration(
                      color: AppColors.primary.withValues(alpha: 0.1),
                      borderRadius: BorderRadius.circular(8),
                      border: Border.all(
                        color: AppColors.primary.withValues(alpha: 0.3),
                      ),
                    ),
                    child: Row(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        const Icon(Icons.payments_outlined,
                            size: 15, color: AppColors.primary),
                        const SizedBox(width: 6),
                        Text(
                          'Record Payment',
                          style: AppTextStyles.labelMedium.copyWith(
                            color: AppColors.primary,
                            fontWeight: FontWeight.w600,
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
              ),
            ],
            const SizedBox(height: 6),
            Row(
              children: [
                if (onAddMore != null)
                  TextButton.icon(
                    onPressed: onAddMore,
                    icon: const Icon(Icons.add_circle_outline, size: 15, color: AppColors.primary),
                    label: Text(loan.type == 'GIVEN' ? 'Lend more' : 'Borrow more',
                        style: AppTextStyles.labelMedium.copyWith(color: AppColors.primary)),
                  ),
                const Spacer(),
                if (onWriteOff != null)
                  TextButton.icon(
                    onPressed: onWriteOff,
                    icon: const Icon(Icons.block, size: 15, color: AppColors.mutedForeground),
                    label: Text(loan.type == 'GIVEN' ? 'Write off' : 'Mark as forgiven',
                        style: AppTextStyles.labelMedium.copyWith(color: AppColors.mutedForeground)),
                  ),
              ],
            ),
          ],
        ),
      );
}
