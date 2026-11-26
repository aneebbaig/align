import 'package:flutter/material.dart';
import '../../../../core/extensions/currency_ext.dart';
import '../../../../core/extensions/datetime_ext.dart';
import '../../../../core/theme/app_colors.dart';
import '../../../../core/theme/app_text_styles.dart';
import '../../../../core/widgets/app_icon_box.dart';
import '../../../../core/widgets/app_card.dart';
import '../../../../core/widgets/app_divider.dart';
import '../../../../core/widgets/app_progress_bar.dart';
import '../../domain/entities/loan_entity.dart';

/// Payment ids swiped away but not yet deleted on the server (Undo is open).
final pendingPaymentDeletes = ValueNotifier<Set<String>>(const {});

class LoanGroupHeader extends StatelessWidget {
  const LoanGroupHeader({
    required this.label,
    required this.total,
    required this.color,
    super.key,
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

class LoanCard extends StatefulWidget {
  const LoanCard({
    required this.loan,
    this.onPay,
    this.onEditPayment,
    this.onDeletePayment,
    this.onAddMore,
    this.onWriteOff,
    super.key,
  });
  final LoanEntity loan;
  final VoidCallback? onPay;
  final void Function(LoanPaymentEntity)? onEditPayment;
  final void Function(LoanPaymentEntity)? onDeletePayment;
  final VoidCallback? onAddMore;
  final VoidCallback? onWriteOff;

  @override
  State<LoanCard> createState() => LoanCardState();
}

class LoanCardState extends State<LoanCard> {
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
              onTap: () { Navigator.pop(ctx); widget.onDeletePayment!(p); },
            ),
        ]),
      ),
    );
  }

  Widget _history(BuildContext context) {
    final hidden = pendingPaymentDeletes.value;
    final rows = loan.recentPayments.where((p) => !hidden.contains(p.id)).toList();
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
  Widget build(BuildContext context) => ValueListenableBuilder<Set<String>>(
        valueListenable: pendingPaymentDeletes,
        builder: (context, _, __) => _card(context),
      );

  Widget _card(BuildContext context) {
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
