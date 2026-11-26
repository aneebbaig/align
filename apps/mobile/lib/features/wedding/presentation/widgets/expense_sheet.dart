import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../../core/services/toast_service.dart';
import '../../../../core/theme/app_colors.dart';
import '../../../../core/theme/app_text_styles.dart';
import '../../../../core/utils/amount_expr.dart';
import '../../../../core/widgets/amount_expr_field.dart';
import '../../../../core/utils/money_format.dart';
import '../../../../core/widgets/app_sheet.dart';
import '../../../../core/widgets/app_text_field.dart';
import '../../data/wedding_datasource.dart';
import '../../domain/wedding_logic.dart';
import '../../domain/wedding_models.dart';
import '../providers/wedding_provider.dart';
import 'wedding_common.dart';

Future<void> showExpenseSheet(BuildContext context, {required String planId, required String expenseId}) =>
    showAppSheet<void>(context, _ExpenseSheetLoader(planId: planId, expenseId: expenseId), safeArea: true);

class _ExpenseSheetLoader extends ConsumerWidget {
  const _ExpenseSheetLoader({required this.planId, required this.expenseId});
  final String planId;
  final String expenseId;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final plan = ref.watch(weddingPlanProvider(planId)).asData?.value;
    WeddingExpense? expense;
    for (final e in plan?.expenses ?? const <WeddingExpense>[]) {
      if (e.id == expenseId) expense = e;
    }
    if (plan == null || expense == null) {
      return const SizedBox(height: 200, child: Center(child: CircularProgressIndicator(color: AppColors.primary)));
    }
    return _ExpenseSheetBody(key: ValueKey(expenseId), plan: plan, expense: expense);
  }
}

class _ExpenseSheetBody extends ConsumerStatefulWidget {
  const _ExpenseSheetBody({required this.plan, required this.expense, super.key});
  final WeddingPlan plan;
  final WeddingExpense expense;

  @override
  ConsumerState<_ExpenseSheetBody> createState() => _ExpenseSheetBodyState();
}

class _ExpenseSheetBodyState extends ConsumerState<_ExpenseSheetBody> {
  late final _name = TextEditingController(text: widget.expense.name);
  late final _estimate = TextEditingController(text: _field(widget.expense.estimatedAmount));
  late final _actual = TextEditingController(text: _fieldOpt(widget.expense.actualAmount));
  late final _paid = TextEditingController(text: _field(widget.expense.paidAmount));
  late final _vendor = TextEditingController(text: widget.expense.vendorName ?? '');
  late final _phone = TextEditingController(text: widget.expense.vendorPhone ?? '');
  late final _insta = TextEditingController(text: widget.expense.vendorInstagram ?? '');
  late final _notes = TextEditingController(text: widget.expense.notes ?? '');
  final _quoteVendor = TextEditingController();
  final _quoteAmount = TextEditingController();
  late String _category = widget.expense.category;
  late String _eventId = widget.expense.eventId;
  bool _busy = false;

  static String _field(int paisas) => paisas == 0 ? '' : paisasToFieldText(paisas);
  static String _fieldOpt(int? paisas) => paisas == null ? '' : paisasToFieldText(paisas);

  WeddingExpense get e => widget.expense;
  String get _planId => widget.plan.id;
  WeddingDatasource get _ds => ref.read(weddingDatasourceProvider);

  @override
  void dispose() {
    for (final c in [_name, _estimate, _actual, _paid, _vendor, _phone, _insta, _notes, _quoteVendor, _quoteAmount]) {
      c.dispose();
    }
    super.dispose();
  }

  Future<void> _guard(Future<void> Function() body) async {
    if (_busy) return;
    setState(() => _busy = true);
    try {
      await body();
    } catch (err) {
      if (mounted) toastError(context, ref, err);
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  /// null = blank, otherwise paisas; throws a message for bad input.
  int? _amount(TextEditingController c, String label) {
    final v = parseOptionalAmount(c.text);
    if (v == badAmount) throw StateError('$label is not a valid amount');
    return v;
  }

  Future<void> _save() => _guard(() async {
        if (_name.text.trim().isEmpty) {
          ref.read(toastServiceProvider).error(context, 'Give the expense a name');
          return;
        }
        final int? estimate, actual, paid;
        try {
          estimate = _amount(_estimate, 'Estimate');
          actual = _amount(_actual, 'Actual cost');
          paid = _amount(_paid, 'Paid so far');
        } on StateError catch (err) {
          ref.read(toastServiceProvider).error(context, err.message);
          return;
        }
        final chosen = e.hasChosenQuote;
        await _ds.updateExpense(_planId, e.id, {
          'name': _name.text.trim(),
          'category': _category,
          'eventId': _eventId,
          if (!chosen) 'estimatedAmount': estimate ?? 0,
          'actualAmount': actual,
          'paidAmount': paid ?? 0,
          if (!chosen) 'vendorName': _vendor.text,
          if (!chosen) 'vendorPhone': _phone.text,
          if (!chosen) 'vendorInstagram': _insta.text,
          'notes': _notes.text,
        });
        refreshWedding(ref, _planId);
        if (mounted) Navigator.pop(context);
      });

  Future<void> _payInFull() => _guard(() async {
        final cost = costOf(e);
        await _ds.payInFull(_planId, e.id);
        _actual.text = paisasToFieldText(e.actualAmount ?? cost);
        _paid.text = paisasToFieldText(cost);
        refreshWedding(ref, _planId);
        if (mounted) ref.read(toastServiceProvider).success(context, 'Marked paid in full');
      });

  Future<void> _delete() async {
    final ok = await confirmDestructive(context, title: 'Delete ${e.name}?', body: 'Its quotes go with it.');
    if (!ok) return;
    await _guard(() async {
      await _ds.deleteExpense(_planId, e.id);
      refreshWedding(ref, _planId);
      if (mounted) Navigator.pop(context);
    });
  }

  Future<void> _addQuote() => _guard(() async {
        final vendor = _quoteVendor.text.trim();
        final amount = parseOptionalAmount(_quoteAmount.text);
        if (vendor.isEmpty) {
          ref.read(toastServiceProvider).error(context, "Enter the vendor's name");
          return;
        }
        if (amount == null || amount == badAmount) {
          ref.read(toastServiceProvider).error(context, 'Enter the quoted amount');
          return;
        }
        await _ds.addQuote(_planId, e.id, vendorName: vendor, amount: amount);
        _quoteVendor.clear();
        _quoteAmount.clear();
        refreshWedding(ref, _planId);
      });

  Future<void> _quoteAction(Future<void> Function() call) => _guard(() async {
        await call();
        refreshWedding(ref, _planId);
      });

  @override
  Widget build(BuildContext context) {
    final chosen = e.hasChosenQuote;
    final events = orderEvents(widget.plan.events);
    final status = paymentStatus(e);
    final cost = costOf(e);

    return Padding(
      padding: EdgeInsets.only(bottom: MediaQuery.of(context).viewInsets.bottom),
      child: ListView(
        shrinkWrap: true,
        padding: const EdgeInsets.fromLTRB(16, 16, 16, 24),
        children: [
          Row(children: [
            Expanded(child: Text('Expense', style: AppTextStyles.bodyLarge.copyWith(fontWeight: FontWeight.w600))),
            TextButton(
              onPressed: _busy ? null : _save,
              child: _busy
                  ? const SizedBox(width: 16, height: 16, child: CircularProgressIndicator(strokeWidth: 2, color: AppColors.primary))
                  : Text('Save', style: AppTextStyles.labelLarge.copyWith(color: AppColors.primary, fontWeight: FontWeight.w600)),
            ),
          ]),
          const SizedBox(height: 8),
          AppTextField(controller: _name, label: 'Name', dense: true, textCapitalization: TextCapitalization.sentences),
          const SizedBox(height: 12),
          Row(children: [
            Expanded(
              child: _Dropdown<String>(
                label: 'Category',
                value: _category,
                items: [for (final c in expenseCategories.entries) (c.key, c.value)],
                onChanged: (v) => setState(() => _category = v),
              ),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: _Dropdown<String>(
                label: 'Event',
                value: _eventId,
                items: [for (final ev in events) (ev.id, ev.name)],
                onChanged: (v) => setState(() => _eventId = v),
              ),
            ),
          ]),
          const SizedBox(height: 16),
          // ── cost ──
          const Text('Cost', style: AppTextStyles.labelLarge),
          const SizedBox(height: 8),
          if (chosen)
            Text('Estimate follows the chosen quote: ${money(e.estimatedAmount)}',
                style: AppTextStyles.bodySmall.copyWith(color: AppColors.mutedForeground))
          else ...[
            Text('Estimate', style: AppTextStyles.bodySmall.copyWith(color: AppColors.mutedForeground)),
            const SizedBox(height: 4),
            AmountExprField(controller: _estimate, prefix: 'PKR '),
          ],
          const SizedBox(height: 8),
          Text('Actual cost (once known)', style: AppTextStyles.bodySmall.copyWith(color: AppColors.mutedForeground)),
          const SizedBox(height: 4),
          AmountExprField(controller: _actual, prefix: 'PKR '),
          const SizedBox(height: 16),
          // ── payment ──
          Row(children: [
            const Expanded(child: Text('Payment', style: AppTextStyles.labelLarge)),
            Text(
              switch (status) {
                PaymentStatus.paid => 'Paid',
                PaymentStatus.partPaid => '${money(balanceOf(e))} to pay',
                PaymentStatus.unpaid => cost > 0 ? '${money(cost)} to pay' : 'Unpaid',
              },
              style: AppTextStyles.bodySmall.copyWith(
                color: status == PaymentStatus.paid ? AppColors.success : AppColors.mutedForeground,
              ),
            ),
          ]),
          const SizedBox(height: 8),
          Text('Paid so far', style: AppTextStyles.bodySmall.copyWith(color: AppColors.mutedForeground)),
          const SizedBox(height: 4),
          AmountExprField(controller: _paid, prefix: 'PKR '),
          const SizedBox(height: 8),
          SizedBox(
            width: double.infinity,
            child: OutlinedButton.icon(
              onPressed: _busy || status == PaymentStatus.paid || cost == 0 ? null : _payInFull,
              icon: const Icon(Icons.check_circle_outline, size: 18),
              label: const Text('Pay in full'),
              style: OutlinedButton.styleFrom(
                foregroundColor: AppColors.success,
                side: const BorderSide(color: AppColors.success),
              ),
            ),
          ),
          const SizedBox(height: 16),
          // ── vendor ──
          const Text('Vendor', style: AppTextStyles.labelLarge),
          const SizedBox(height: 8),
          AppTextField(controller: _vendor, label: 'Name', dense: true, readOnly: chosen),
          const SizedBox(height: 8),
          Row(children: [
            Expanded(child: AppTextField(controller: _phone, label: 'Phone', dense: true, readOnly: chosen, keyboardType: TextInputType.phone)),
            const SizedBox(width: 12),
            Expanded(child: AppTextField(controller: _insta, label: 'Instagram', dense: true, readOnly: chosen)),
          ]),
          if (chosen)
            Padding(
              padding: const EdgeInsets.only(top: 4),
              child: Text('Set by the chosen quote.', style: AppTextStyles.labelSmall.copyWith(color: AppColors.mutedForeground)),
            ),
          const SizedBox(height: 8),
          AppTextField(controller: _notes, label: 'Notes', dense: true, maxLines: 3, textCapitalization: TextCapitalization.sentences),
          const SizedBox(height: 16),
          // ── quotes ──
          Row(children: [
            const Expanded(child: Text('Quotes', style: AppTextStyles.labelLarge)),
            if (chosen)
              TextButton(
                onPressed: _busy ? null : () => _quoteAction(() => _ds.clearQuoteChoice(_planId, e.id)),
                child: const Text('Un-choose'),
              ),
          ]),
          if (e.quotes.isEmpty)
            Text('Compare vendors: add each price you are quoted.',
                style: AppTextStyles.bodySmall.copyWith(color: AppColors.mutedForeground)),
          for (final q in e.quotes) _QuoteTile(
            quote: q,
            cheapest: cheapestQuoteId(e.quotes) == q.id,
            busy: _busy,
            onChoose: () => _quoteAction(() => _ds.chooseQuote(_planId, e.id, q.id)),
            onDelete: () => _quoteAction(() => _ds.deleteQuote(_planId, e.id, q.id)),
          ),
          const SizedBox(height: 8),
          Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
            Expanded(flex: 3, child: AppTextField(controller: _quoteVendor, hint: 'Vendor', dense: true, textCapitalization: TextCapitalization.words)),
            const SizedBox(width: 8),
            Expanded(
              flex: 2,
              child: AppTextField(
                controller: _quoteAmount,
                hint: 'Price',
                dense: true,
                keyboardType: const TextInputType.numberWithOptions(decimal: true),
                inputFormatters: [AmountExprFormatter()],
                onSubmitted: (_) => _addQuote(),
              ),
            ),
            IconButton(onPressed: _busy ? null : _addQuote, icon: const Icon(Icons.add_circle, color: AppColors.primary)),
          ]),
          const SizedBox(height: 16),
          Center(
            child: TextButton(
              onPressed: _busy ? null : _delete,
              child: Text('Delete expense', style: AppTextStyles.labelLarge.copyWith(color: AppColors.destructive)),
            ),
          ),
        ],
      ),
    );
  }
}

/// Id of the single cheapest quote (needs two or more, and no tie for lowest).
String? cheapestQuoteId(List<WeddingQuote> quotes) {
  if (quotes.length < 2) return null;
  final min = quotes.map((q) => q.amount).reduce((a, b) => a < b ? a : b);
  final lowest = quotes.where((q) => q.amount == min).toList();
  return lowest.length == 1 ? lowest.first.id : null;
}

class _QuoteTile extends StatelessWidget {
  const _QuoteTile({
    required this.quote,
    required this.cheapest,
    required this.busy,
    required this.onChoose,
    required this.onDelete,
  });
  final WeddingQuote quote;
  final bool cheapest;
  final bool busy;
  final VoidCallback onChoose;
  final VoidCallback onDelete;

  @override
  Widget build(BuildContext context) => Container(
        margin: const EdgeInsets.only(top: 8),
        padding: const EdgeInsets.only(left: 12, top: 4, bottom: 4),
        decoration: BoxDecoration(
          color: AppColors.card,
          border: Border.all(color: quote.isChosen ? AppColors.primary : AppColors.border),
          borderRadius: BorderRadius.circular(10),
        ),
        child: Row(children: [
          Expanded(
            child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              Text(quote.vendorName, style: AppTextStyles.bodyMedium.copyWith(fontWeight: FontWeight.w600)),
              Text(
                [money(quote.amount), if (cheapest) 'cheapest', if (quote.isChosen) 'chosen'].join(' · '),
                style: AppTextStyles.bodySmall.copyWith(
                  color: quote.isChosen ? AppColors.primary : AppColors.mutedForeground,
                ),
              ),
            ]),
          ),
          if (!quote.isChosen) TextButton(onPressed: busy ? null : onChoose, child: const Text('Choose')),
          IconButton(
            onPressed: busy ? null : onDelete,
            icon: const Icon(Icons.delete_outline, size: 20, color: AppColors.mutedForeground),
          ),
        ]),
      );
}

class _Dropdown<T> extends StatelessWidget {
  const _Dropdown({required this.label, required this.value, required this.items, required this.onChanged});
  final String label;
  final T value;
  final List<(T, String)> items;
  final ValueChanged<T> onChanged;

  @override
  Widget build(BuildContext context) => DropdownButtonFormField<T>(
        initialValue: items.any((i) => i.$1 == value) ? value : null,
        isExpanded: true,
        dropdownColor: AppColors.popover,
        style: AppTextStyles.bodyMedium,
        decoration: InputDecoration(
          labelText: label,
          isDense: true,
          filled: true,
          fillColor: AppColors.card,
          contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 12),
          border: OutlineInputBorder(
            borderRadius: BorderRadius.circular(8),
            borderSide: BorderSide(color: AppColors.border.withValues(alpha: 0.5)),
          ),
        ),
        items: [for (final i in items) DropdownMenuItem(value: i.$1, child: Text(i.$2, overflow: TextOverflow.ellipsis))],
        onChanged: (v) {
          if (v != null) onChanged(v);
        },
      );
}
