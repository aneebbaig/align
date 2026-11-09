import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../../core/errors/app_exception.dart';
import '../../../../core/services/toast_service.dart';
import '../../../../core/theme/app_colors.dart';
import '../../../../core/theme/app_text_styles.dart';
import '../../data/datasources/plans_datasource.dart';
import '../../domain/entities/plan_entity.dart';
import '../providers/plans_provider.dart';

int? _toPaisas(String s) {
  final v = double.tryParse(s.trim());
  if (v == null || v < 0) return null;
  return (v * 100).round();
}

Future<T?> _sheet<T>(BuildContext context, Widget child) => showModalBottomSheet<T>(
      context: context,
      isScrollControlled: true,
      backgroundColor: AppColors.popover,
      shape: const RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(16))),
      builder: (_) => Padding(
        padding: EdgeInsets.only(bottom: MediaQuery.of(context).viewInsets.bottom),
        child: child,
      ),
    );

void showNewPlanSheet(BuildContext context, WidgetRef ref) => _sheet(context, const _NewPlanSheet());
void showAddItemSheet(BuildContext context, WidgetRef ref, String planId) =>
    _sheet(context, _ItemSheet(planId: planId));
void showEditItemSheet(BuildContext context, WidgetRef ref, String planId, PlanItemEntity item) =>
    _sheet(context, _ItemSheet(planId: planId, existing: item));
void showEditPlanSheet(BuildContext context, WidgetRef ref, PlanDetailEntity plan) =>
    _sheet(context, _EditPlanSheet(plan: plan));

class _Field extends StatelessWidget {
  const _Field({required this.controller, required this.hint, this.keyboardType, this.prefix, this.autofocus = false, this.onChanged, this.maxLines = 1});
  final TextEditingController controller;
  final String hint;
  final TextInputType? keyboardType;
  final String? prefix;
  final bool autofocus;
  final VoidCallback? onChanged;
  final int maxLines;

  @override
  Widget build(BuildContext context) => TextField(
        controller: controller,
        autofocus: autofocus,
        maxLines: maxLines,
        keyboardType: keyboardType,
        textCapitalization: TextCapitalization.sentences,
        style: AppTextStyles.bodyMedium,
        onChanged: onChanged != null ? (_) => onChanged!() : null,
        decoration: InputDecoration(
          hintText: hint,
          prefixText: prefix,
          prefixStyle: AppTextStyles.bodyMedium.copyWith(color: AppColors.mutedForeground),
          hintStyle: AppTextStyles.bodyMedium.copyWith(color: AppColors.mutedForeground),
          filled: true,
          fillColor: AppColors.card,
          contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 12),
          border: _b(0.5),
          enabledBorder: _b(0.5),
          focusedBorder: _b(0.6, AppColors.primary),
        ),
      );

  OutlineInputBorder _b(double a, [Color? c]) => OutlineInputBorder(
        borderRadius: BorderRadius.circular(8),
        borderSide: BorderSide(color: (c ?? AppColors.border).withValues(alpha: a)),
      );
}

class _Header extends StatelessWidget {
  const _Header({required this.title, required this.onSubmit, required this.canSubmit, required this.loading, this.submit = 'Save'});
  final String title;
  final VoidCallback onSubmit;
  final bool canSubmit;
  final bool loading;
  final String submit;

  @override
  Widget build(BuildContext context) => Row(children: [
        Expanded(child: Text(title, style: AppTextStyles.bodyLarge.copyWith(fontWeight: FontWeight.w600))),
        TextButton(
          onPressed: canSubmit && !loading ? onSubmit : null,
          child: loading
              ? const SizedBox(width: 16, height: 16, child: CircularProgressIndicator(strokeWidth: 2, color: AppColors.primary))
              : Text(submit, style: AppTextStyles.labelLarge.copyWith(
                  color: canSubmit ? AppColors.primary : AppColors.mutedForeground, fontWeight: FontWeight.w600)),
        ),
      ]);
}

// ── New plan ─────────────────────────────────────────────────────────────────

class _NewPlanSheet extends ConsumerStatefulWidget {
  const _NewPlanSheet();
  @override
  ConsumerState<_NewPlanSheet> createState() => _NewPlanSheetState();
}

class _NewPlanSheetState extends ConsumerState<_NewPlanSheet> {
  final _name = TextEditingController();
  final _target = TextEditingController();
  String _type = 'ITEMIZED';
  bool _loading = false;

  @override
  void dispose() {
    _name.dispose();
    _target.dispose();
    super.dispose();
  }

  bool get _canSubmit => _name.text.trim().isNotEmpty && (_type == 'ITEMIZED' || _toPaisas(_target.text) != null);

  Future<void> _submit() async {
    if (!_canSubmit) return;
    setState(() => _loading = true);
    try {
      HapticFeedback.mediumImpact();
      await ref.read(plansDatasourceProvider).createPlan(
            name: _name.text.trim(),
            planType: _type,
            estimatedTotalPaisas: _type == 'FIXED' ? _toPaisas(_target.text) : null,
          );
      ref.invalidate(plansProvider);
      if (mounted) {
        ref.read(toastServiceProvider).success(context, 'Plan created');
        Navigator.pop(context);
      }
    } catch (e) {
      if (mounted) {
        setState(() => _loading = false);
        ref.read(toastServiceProvider).error(context, e is AppException ? e.message : 'Failed');
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.fromLTRB(16, 16, 16, 24),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          _Header(title: 'New Plan', onSubmit: _submit, canSubmit: _canSubmit, loading: _loading, submit: 'Create'),
          const SizedBox(height: 16),
          _Field(controller: _name, hint: 'Plan name', autofocus: true, onChanged: () => setState(() {})),
          const SizedBox(height: 12),
          Row(
            children: [
              Expanded(child: _TypeTab(label: 'Itemized', hint: 'A checklist', active: _type == 'ITEMIZED', onTap: () => setState(() => _type = 'ITEMIZED'))),
              const SizedBox(width: 8),
              Expanded(child: _TypeTab(label: 'Fixed', hint: 'One target', active: _type == 'FIXED', onTap: () => setState(() => _type = 'FIXED'))),
            ],
          ),
          if (_type == 'FIXED') ...[
            const SizedBox(height: 12),
            _Field(controller: _target, hint: 'Target amount', prefix: 'Rs ',
                keyboardType: const TextInputType.numberWithOptions(decimal: true),
                onChanged: () => setState(() {})),
          ],
        ],
      ),
    );
  }
}

class _TypeTab extends StatelessWidget {
  const _TypeTab({required this.label, required this.hint, required this.active, required this.onTap});
  final String label;
  final String hint;
  final bool active;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) => GestureDetector(
        onTap: onTap,
        child: Container(
          padding: const EdgeInsets.symmetric(vertical: 10, horizontal: 12),
          decoration: BoxDecoration(
            color: active ? AppColors.primary.withValues(alpha: 0.15) : AppColors.card,
            borderRadius: BorderRadius.circular(8),
            border: Border.all(color: active ? AppColors.primary.withValues(alpha: 0.5) : AppColors.border.withValues(alpha: 0.5)),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(label, style: AppTextStyles.bodyMedium.copyWith(
                fontWeight: FontWeight.w600, color: active ? AppColors.primary : AppColors.foreground)),
              Text(hint, style: AppTextStyles.labelSmall),
            ],
          ),
        ),
      );
}

// ── Add item / edit item details ─────────────────────────────────────────────
//
// Adding takes the two things a plan starts with: a name and an estimate.
// Editing here is for everything that isn't on the tile: due date and notes.
// (Name, estimate and actual cost are edited in place on the tile itself.)

class _ItemSheet extends ConsumerStatefulWidget {
  const _ItemSheet({required this.planId, this.existing});
  final String planId;
  final PlanItemEntity? existing;
  @override
  ConsumerState<_ItemSheet> createState() => _ItemSheetState();
}

class _ItemSheetState extends ConsumerState<_ItemSheet> {
  late final _name = TextEditingController(text: widget.existing?.name ?? '');
  late final _cost = TextEditingController();
  late final _notes = TextEditingController(text: widget.existing?.notes ?? '');
  late DateTime? _due = widget.existing?.dueDate;
  bool _loading = false;

  bool get _editing => widget.existing != null;
  bool get _canSubmit => _editing || (_name.text.trim().isNotEmpty && _toPaisas(_cost.text) != null);

  @override
  void dispose() {
    _name.dispose();
    _cost.dispose();
    _notes.dispose();
    super.dispose();
  }

  Future<void> _pickDue() async {
    final now = DateTime.now();
    final picked = await showDatePicker(
      context: context,
      initialDate: _due ?? now,
      firstDate: DateTime(now.year - 1),
      lastDate: DateTime(now.year + 10),
      builder: (ctx, child) => Theme(
        data: Theme.of(ctx).copyWith(
          colorScheme: const ColorScheme.dark(primary: AppColors.primary, surface: AppColors.card, onSurface: AppColors.foreground),
        ),
        child: child!,
      ),
    );
    if (picked != null) setState(() => _due = picked);
  }

  Future<void> _submit() async {
    if (!_canSubmit) return;
    setState(() => _loading = true);
    try {
      HapticFeedback.mediumImpact();
      final ds = ref.read(plansDatasourceProvider);
      if (!_editing) {
        await ds.addItem(planId: widget.planId, name: _name.text.trim(), estimatedCostPaisas: _toPaisas(_cost.text)!);
      } else {
        await ds.updateItem(
          planId: widget.planId,
          itemId: widget.existing!.id,
          setDueDate: true,
          dueDate: _due,
          setNotes: true,
          notes: _notes.text.trim().isEmpty ? null : _notes.text.trim(),
        );
      }
      ref.invalidate(planDetailProvider(widget.planId));
      ref.invalidate(plansProvider);
      if (mounted) {
        ref.read(toastServiceProvider).success(context, _editing ? 'Saved' : 'Item added');
        Navigator.pop(context);
      }
    } catch (e) {
      if (mounted) {
        setState(() => _loading = false);
        ref.read(toastServiceProvider).error(context, e is AppException ? e.message : 'Failed');
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final due = _due;
    return Padding(
      padding: const EdgeInsets.fromLTRB(16, 16, 16, 24),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          _Header(
            title: _editing ? widget.existing!.name : 'Add item',
            onSubmit: _submit,
            canSubmit: _canSubmit,
            loading: _loading,
            submit: _editing ? 'Save' : 'Add',
          ),
          const SizedBox(height: 16),
          if (!_editing) ...[
            _Field(controller: _name, hint: 'Item name', autofocus: true, onChanged: () => setState(() {})),
            const SizedBox(height: 12),
            _Field(controller: _cost, hint: 'Estimated cost', prefix: 'Rs ',
                keyboardType: const TextInputType.numberWithOptions(decimal: true),
                onChanged: () => setState(() {})),
          ] else ...[
            GestureDetector(
              onTap: _pickDue,
              child: Container(
                padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 14),
                decoration: BoxDecoration(
                  color: AppColors.card,
                  borderRadius: BorderRadius.circular(8),
                  border: Border.all(color: AppColors.border.withValues(alpha: 0.5)),
                ),
                child: Row(children: [
                  const Icon(Icons.event_outlined, size: 16, color: AppColors.mutedForeground),
                  const SizedBox(width: 10),
                  Expanded(
                    child: Text(
                      due == null ? 'Due date (optional)' : '${due.day}/${due.month}/${due.year}',
                      style: AppTextStyles.bodyMedium.copyWith(color: due == null ? AppColors.mutedForeground : AppColors.foreground),
                    ),
                  ),
                  if (due != null)
                    GestureDetector(
                      onTap: () => setState(() => _due = null),
                      behavior: HitTestBehavior.opaque,
                      child: const Padding(
                        padding: EdgeInsets.all(2),
                        child: Icon(Icons.close, size: 16, color: AppColors.mutedForeground),
                      ),
                    ),
                ]),
              ),
            ),
            const SizedBox(height: 12),
            _Field(controller: _notes, hint: 'Notes - quotes, who to call...', maxLines: 3),
          ],
        ],
      ),
    );
  }
}

// ── Edit plan ────────────────────────────────────────────────────────────────

class _EditPlanSheet extends ConsumerStatefulWidget {
  const _EditPlanSheet({required this.plan});
  final PlanDetailEntity plan;
  @override
  ConsumerState<_EditPlanSheet> createState() => _EditPlanSheetState();
}

class _EditPlanSheetState extends ConsumerState<_EditPlanSheet> {
  late final _name = TextEditingController(text: widget.plan.name);
  bool _loading = false;

  @override
  void dispose() {
    _name.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    if (_name.text.trim().isEmpty) return;
    setState(() => _loading = true);
    try {
      HapticFeedback.mediumImpact();
      await ref.read(plansDatasourceProvider).updatePlan(id: widget.plan.id, name: _name.text.trim());
      ref.invalidate(planDetailProvider(widget.plan.id));
      ref.invalidate(plansProvider);
      if (mounted) {
        ref.read(toastServiceProvider).success(context, 'Saved');
        Navigator.pop(context);
      }
    } catch (e) {
      if (mounted) {
        setState(() => _loading = false);
        ref.read(toastServiceProvider).error(context, e is AppException ? e.message : 'Failed');
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.fromLTRB(16, 16, 16, 24),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          _Header(title: 'Edit Plan', onSubmit: _submit, canSubmit: _name.text.trim().isNotEmpty, loading: _loading),
          const SizedBox(height: 16),
          _Field(controller: _name, hint: 'Plan name', onChanged: () => setState(() {})),
        ],
      ),
    );
  }
}
