import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../../core/errors/app_exception.dart';
import '../../../../core/services/toast_service.dart';
import '../../../../core/theme/app_colors.dart';
import '../../../../core/theme/app_text_styles.dart';
import '../../../../core/widgets/app_empty_state.dart';
import '../../../../core/widgets/undo_delete.dart';
import '../../data/datasources/loans_datasource.dart';
import '../../domain/entities/loan_entity.dart';
import '../providers/loans_provider.dart';
import '../widgets/loan_card.dart';
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

  /// Hides the payment now; the real delete waits for the Undo snackbar to close.
  void _deletePayment(BuildContext context, WidgetRef ref, LoanEntity loan, LoanPaymentEntity payment) {
    final ds = ref.read(loansDatasourceProvider);
    final container = ProviderScope.containerOf(context);
    final toast = ref.read(toastServiceProvider);
    void unhide() => pendingPaymentDeletes.value = {...pendingPaymentDeletes.value}..remove(payment.id);
    pendingPaymentDeletes.value = {...pendingPaymentDeletes.value, payment.id};
    deferDelete(
      context,
      message: 'Payment deleted',
      onUndo: unhide,
      commit: () async {
        await ds.deletePayment(loanId: loan.id, paymentId: payment.id);
        container.invalidate(loansProvider);
        unhide();
      },
      onError: (e) {
        if (context.mounted) toast.error(context, e is AppException ? e.message : 'Failed to delete payment');
      },
    );
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
                        LoanGroupHeader(
                          label: 'Money Given',
                          total: given.fold(
                              0, (sum, l) => sum + l.remainingPaisas),
                          color: AppColors.warning,
                        ),
                        const SizedBox(height: 8),
                        ...given.map((l) => Padding(
                              padding: const EdgeInsets.only(bottom: 10),
                              child: LoanCard(
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
                        LoanGroupHeader(
                          label: 'Money Received',
                          total: received.fold(
                              0, (sum, l) => sum + l.remainingPaisas),
                          color: AppColors.destructive,
                        ),
                        const SizedBox(height: 8),
                        ...received.map((l) => Padding(
                              padding: const EdgeInsets.only(bottom: 10),
                              child: LoanCard(
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
