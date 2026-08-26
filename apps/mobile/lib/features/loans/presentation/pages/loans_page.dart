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
import 'add_schedule_page.dart';
import 'record_payment_page.dart';

class LoansPage extends ConsumerWidget {
  const LoansPage({super.key});

  void _showPayment(BuildContext context, LoanEntity loan, {LoanPaymentEntity? editPayment, LoanScheduleEntity? linkSchedule}) {
    Navigator.of(context).push(
      MaterialPageRoute(
        fullscreenDialog: true,
        builder: (_) => RecordPaymentPage(loan: loan, editPayment: editPayment, linkSchedule: linkSchedule),
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

  void _showAddSchedule(BuildContext context, LoanEntity loan) {
    Navigator.of(context).push(
      MaterialPageRoute(
        fullscreenDialog: true,
        builder: (_) => AddSchedulePage(loan: loan),
      ),
    );
  }

  Future<void> _deleteSchedule(BuildContext context, WidgetRef ref, LoanScheduleEntity schedule) async {
    try {
      await ref.read(loansDatasourceProvider).deleteSchedule(
            loanId: schedule.loanId,
            scheduleId: schedule.id,
          );
      ref.invalidate(loansProvider);
      if (context.mounted) {
        ref.read(toastServiceProvider).success(context, 'Schedule removed');
      }
    } catch (e) {
      if (!context.mounted) return;
      final msg = e is AppException ? e.message : 'Failed to remove schedule';
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
                                onPay: l.status != 'PAID' ? () => _showPayment(context, l) : null,
                                onAddSchedule: l.status != 'PAID' ? () => _showAddSchedule(context, l) : null,
                                onDeleteSchedule: (s) => _deleteSchedule(context, ref, s),
                                onEditPayment: (p) => _showPayment(context, l, editPayment: p),
                                onDeletePayment: (p) => _deletePayment(context, ref, l, p),
                                onRecordInstallment: l.status != 'PAID' ? (s) => _showPayment(context, l, linkSchedule: s) : null,
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
                                onPay: l.status != 'PAID' ? () => _showPayment(context, l) : null,
                                onAddSchedule: l.status != 'PAID' ? () => _showAddSchedule(context, l) : null,
                                onDeleteSchedule: (s) => _deleteSchedule(context, ref, s),
                                onEditPayment: (p) => _showPayment(context, l, editPayment: p),
                                onDeletePayment: (p) => _deletePayment(context, ref, l, p),
                                onRecordInstallment: l.status != 'PAID' ? (s) => _showPayment(context, l, linkSchedule: s) : null,
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
    this.onAddSchedule,
    this.onDeleteSchedule,
    this.onEditPayment,
    this.onDeletePayment,
    this.onRecordInstallment,
  });
  final LoanEntity loan;
  final VoidCallback? onPay;
  final VoidCallback? onAddSchedule;
  final void Function(LoanScheduleEntity)? onDeleteSchedule;
  final void Function(LoanPaymentEntity)? onEditPayment;
  final void Function(LoanPaymentEntity)? onDeletePayment;
  final void Function(LoanScheduleEntity)? onRecordInstallment;

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
        _ => AppBadgeVariant.success,
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
                  label: loan.status == 'PARTIALLY_PAID'
                      ? 'Partial'
                      : loan.status == 'ACTIVE'
                          ? 'Active'
                          : 'Paid',
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
                'RECENT PAYMENTS',
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
                              p.amountPaisas.formatPKR(),
                              style: AppTextStyles.labelMedium.copyWith(
                                color: const Color(0xFF4CAF50),
                              ),
                            ),
                            if (p.hasTransaction && onEditPayment != null) ...[
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
            if (loan.status != 'PAID') ...[
              const SizedBox(height: 12),
              const AppDivider(),
              const SizedBox(height: 10),
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Text(
                    'REPAYMENT PLAN',
                    style: AppTextStyles.labelSmall.copyWith(
                      color: AppColors.mutedForeground,
                      letterSpacing: 0.5,
                    ),
                  ),
                  if (onAddSchedule != null)
                    GestureDetector(
                      onTap: onAddSchedule,
                      behavior: HitTestBehavior.opaque,
                      child: const Icon(Icons.add_circle_outline, size: 16, color: AppColors.primary),
                    ),
                ],
              ),
              if (loan.schedules.isEmpty)
                Padding(
                  padding: const EdgeInsets.only(top: 6),
                  child: Text(
                    'No repayment plan yet',
                    style: AppTextStyles.bodySmall.copyWith(color: AppColors.mutedForeground),
                  ),
                )
              else ...[
                const SizedBox(height: 6),
                ...loan.schedules.map((s) => Padding(
                      padding: const EdgeInsets.only(bottom: 4),
                      child: Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          Expanded(
                            child: Text(
                              s.kind == 'LUMP_SUM'
                                  ? 'Lump sum · ${s.startDate.toShortDate}'
                                  : 'Installments · ${s.startDate.toShortDate} - ${s.endDate?.toShortDate ?? ''}',
                              style: AppTextStyles.bodySmall,
                            ),
                          ),
                          Text(
                            s.amountPaisas.formatPKR(),
                            style: AppTextStyles.labelMedium,
                          ),
                          if (s.fulfilledPaymentId != null)
                            Padding(
                              padding: const EdgeInsets.only(left: 8),
                              child: Text('Recorded', style: AppTextStyles.labelSmall.copyWith(color: const Color(0xFF4CAF50))),
                            )
                          else if (onRecordInstallment != null)
                            GestureDetector(
                              onTap: () => onRecordInstallment!(s),
                              behavior: HitTestBehavior.opaque,
                              child: Padding(
                                padding: const EdgeInsets.only(left: 8),
                                child: Text('Record', style: AppTextStyles.labelSmall.copyWith(color: AppColors.primary, fontWeight: FontWeight.w600)),
                              ),
                            ),
                          if (onDeleteSchedule != null) ...[
                            const SizedBox(width: 10),
                            GestureDetector(
                              onTap: () => onDeleteSchedule!(s),
                              behavior: HitTestBehavior.opaque,
                              child: Padding(
                                padding: const EdgeInsets.all(4),
                                child: Icon(
                                  Icons.delete_outline,
                                  size: 14,
                                  color: AppColors.destructive.withValues(alpha: 0.7),
                                ),
                              ),
                            ),
                          ],
                        ],
                      ),
                    )),
              ],
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
          ],
        ),
      );
}
