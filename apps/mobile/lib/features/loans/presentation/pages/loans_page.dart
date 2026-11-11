import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../../core/errors/app_exception.dart';
import '../../../../core/extensions/currency_ext.dart';
import '../../../../core/extensions/datetime_ext.dart';
import '../../../../core/services/toast_service.dart';
import '../../../../core/theme/app_colors.dart';
import '../../../../core/theme/app_text_styles.dart';
import '../../../../core/widgets/app_icon_box.dart';
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

class _LoanCard extends StatefulWidget {
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

  @override
  State<_LoanCard> createState() => _LoanCardState();
}

class _LoanCardState extends State<_LoanCard> {
  bool _open = false;

  LoanEntity get loan => widget.loan;
  bool get _given => loan.type == 'GIVEN';
  // Money coming back to you reads green, money you owe reads red.
  Color get _tone => _given ? AppColors.success : AppColors.destructive;

  String get _closedLabel => loan.status == 'WRITTEN_OFF' ? (_given ? 'Written off' : 'Forgiven') : 'Paid in full';

  bool get _overdue {
    final due = loan.dueDate;
    if (due == null || loan.isClosed) return false;
    final today = DateTime.now();
    return DateTime(due.year, due.month, due.day).isBefore(DateTime(today.year, today.month, today.day));
  }

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
    if (confirmed == true) widget.onDeletePayment?.call(payment);
  }

  // Tap a history row for what you can do with it - big touch targets instead of 13px icons.
  void _paymentSheet(BuildContext context, LoanPaymentEntity p) {
    final canEdit = p.kind == 'PAYMENT' && p.hasTransaction && widget.onEditPayment != null;
    final canDelete = widget.onDeletePayment != null;
    if (!canEdit && !canDelete) return;
    showModalBottomSheet<void>(
      context: context,
      backgroundColor: AppColors.popover,
      shape: const RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(16))),
      builder: (ctx) => SafeArea(
        child: Column(mainAxisSize: MainAxisSize.min, children: [
          if (canEdit)
            ListTile(
              leading: const Icon(Icons.edit_outlined, size: 20),
              title: const Text('Edit payment', style: AppTextStyles.bodyMedium),
              onTap: () { Navigator.pop(ctx); widget.onEditPayment!(p); },
            ),
          if (canDelete)
            ListTile(
              leading: const Icon(Icons.delete_outline, color: AppColors.destructive, size: 20),
              title: Text('Delete', style: AppTextStyles.bodyMedium.copyWith(color: AppColors.destructive)),
              onTap: () { Navigator.pop(ctx); _confirmDeletePayment(context, p); },
            ),
        ]),
      ),
    );
  }

  Widget _history(BuildContext context) {
    final rows = loan.recentPayments;
    return Padding(
      padding: const EdgeInsets.only(top: 8),
      child: Column(
        children: [
          for (final p in rows)
            InkWell(
              onTap: () => _paymentSheet(context, p),
              borderRadius: BorderRadius.circular(6),
              child: Padding(
                padding: const EdgeInsets.symmetric(vertical: 8, horizontal: 2),
                child: Row(
                  children: [
                    SizedBox(width: 64, child: Text(p.date.toShortDate, style: AppTextStyles.labelSmall.copyWith(color: AppColors.mutedForeground))),
                    Expanded(
                      child: Text(
                        switch (p.kind) {
                          'TOP_UP' => 'Added',
                          'WRITE_OFF' => _given ? 'Written off' : 'Forgiven',
                          _ => 'Payment',
                        },
                        style: AppTextStyles.bodySmall,
                      ),
                    ),
                    Text(
                      '${p.kind == 'WRITE_OFF' ? '' : '+'}${p.amountPaisas.formatPKR()}',
                      style: AppTextStyles.labelMedium.copyWith(
                        fontWeight: FontWeight.w600,
                        color: switch (p.kind) {
                          'TOP_UP' => AppColors.warning,
                          'WRITE_OFF' => AppColors.mutedForeground,
                          _ => AppColors.success,
                        },
                      ),
                    ),
                  ],
                ),
              ),
            ),
          Padding(
            padding: const EdgeInsets.symmetric(vertical: 8, horizontal: 2),
            child: Row(
              children: [
                SizedBox(width: 64, child: Text(loan.date.toShortDate, style: AppTextStyles.labelSmall.copyWith(color: AppColors.mutedForeground))),
                Expanded(child: Text(_given ? 'Lent' : 'Borrowed', style: AppTextStyles.bodySmall.copyWith(color: AppColors.mutedForeground))),
                Text(loan.principalPaisas.formatPKR(), style: AppTextStyles.labelMedium.copyWith(color: AppColors.mutedForeground)),
              ],
            ),
          ),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final closed = loan.isClosed;
    final paid = loan.principalPaisas - loan.remainingPaisas;
    final iconColor = closed ? AppColors.mutedForeground : _tone;
    final hasMenu = widget.onAddMore != null || widget.onWriteOff != null;

    return AppCard(
      padding: const EdgeInsets.fromLTRB(14, 14, 8, 8),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Padding(
            padding: const EdgeInsets.only(right: 6),
            child: Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                AppIconBox(
                  icon: _given ? Icons.south_west : Icons.north_east,
                  size: 34,
                  radius: 17,
                  color: iconColor.withValues(alpha: 0.12),
                  borderColor: Colors.transparent,
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(loan.personName, maxLines: 1, overflow: TextOverflow.ellipsis, style: AppTextStyles.bodyMedium.copyWith(fontWeight: FontWeight.w600)),
                      if (loan.description != null)
                        Text(loan.description!, maxLines: 1, overflow: TextOverflow.ellipsis, style: AppTextStyles.bodySmall.copyWith(color: AppColors.mutedForeground)),
                    ],
                  ),
                ),
                const SizedBox(width: 8),
                Column(
                  crossAxisAlignment: CrossAxisAlignment.end,
                  children: [
                    Text(
                      closed ? _closedLabel : loan.remainingPaisas.formatPKR(),
                      style: AppTextStyles.currencySmall.copyWith(color: closed ? AppColors.mutedForeground : _tone, fontWeight: FontWeight.w700),
                    ),
                    Text(closed ? loan.principalPaisas.formatPKR() : (_given ? 'owes you' : 'you owe'),
                        style: AppTextStyles.labelSmall.copyWith(color: AppColors.mutedForeground)),
                  ],
                ),
              ],
            ),
          ),
          if (!closed) ...[
            const SizedBox(height: 12),
            Padding(
              padding: const EdgeInsets.only(right: 6),
              child: AppProgressBar(value: loan.paidPct, height: 4, color: _tone),
            ),
            const SizedBox(height: 6),
            Padding(
              padding: const EdgeInsets.only(right: 6),
              child: Row(
                children: [
                  Expanded(
                    child: Text(
                      paid > 0 ? '${paid.formatPKR()} of ${loan.principalPaisas.formatPKR()} back' : 'Nothing back yet of ${loan.principalPaisas.formatPKR()}',
                      style: AppTextStyles.labelSmall.copyWith(color: AppColors.mutedForeground),
                    ),
                  ),
                  if (loan.dueDate != null)
                    Row(mainAxisSize: MainAxisSize.min, children: [
                      Icon(_overdue ? Icons.error_outline : Icons.calendar_today_outlined, size: 12, color: _overdue ? AppColors.destructive : AppColors.mutedForeground),
                      const SizedBox(width: 4),
                      Text(
                        _overdue ? 'Overdue · ${loan.dueDate!.toShortDate}' : 'Due ${loan.dueDate!.toShortDate}',
                        style: AppTextStyles.labelSmall.copyWith(color: _overdue ? AppColors.destructive : AppColors.mutedForeground, fontWeight: _overdue ? FontWeight.w600 : null),
                      ),
                    ]),
                ],
              ),
            ),
          ],
          const SizedBox(height: 8),
          const Padding(padding: EdgeInsets.only(right: 6), child: AppDivider()),
          const SizedBox(height: 2),
          Row(
            children: [
              if (widget.onPay != null)
                Expanded(
                  child: Padding(
                    padding: const EdgeInsets.only(right: 4, top: 4, bottom: 2),
                    child: FilledButton.icon(
                      onPressed: widget.onPay,
                      icon: const Icon(Icons.payments_outlined, size: 16),
                      label: const Text('Record payment'),
                      style: FilledButton.styleFrom(
                        backgroundColor: AppColors.primary,
                        foregroundColor: AppColors.primaryForeground,
                        padding: const EdgeInsets.symmetric(vertical: 10),
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                      ),
                    ),
                  ),
                )
              else
                const Spacer(),
              TextButton(
                onPressed: () => setState(() => _open = !_open),
                style: TextButton.styleFrom(foregroundColor: AppColors.mutedForeground, padding: const EdgeInsets.symmetric(horizontal: 8)),
                child: Row(mainAxisSize: MainAxisSize.min, children: [
                  Text('History · ${loan.recentPayments.length}', style: AppTextStyles.labelMedium),
                  Icon(_open ? Icons.expand_less : Icons.expand_more, size: 18),
                ]),
              ),
              if (hasMenu)
                PopupMenuButton<String>(
                  icon: const Icon(Icons.more_vert, size: 20, color: AppColors.mutedForeground),
                  color: AppColors.popover,
                  padding: EdgeInsets.zero,
                  onSelected: (v) => v == 'more' ? widget.onAddMore?.call() : widget.onWriteOff?.call(),
                  itemBuilder: (_) => [
                    if (widget.onAddMore != null)
                      PopupMenuItem(value: 'more', child: Text(_given ? 'Lend more' : 'Borrow more', style: AppTextStyles.bodyMedium)),
                    if (widget.onWriteOff != null)
                      PopupMenuItem(value: 'off', child: Text(_given ? 'Write off' : 'Mark as forgiven', style: AppTextStyles.bodyMedium)),
                  ],
                ),
            ],
          ),
          if (_open)
            Padding(
              padding: const EdgeInsets.only(right: 6),
              child: _history(context),
            ),
        ],
      ),
    );
  }
}
