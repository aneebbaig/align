import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../../core/errors/app_exception.dart';
import '../../../../core/services/toast_service.dart';
import '../../../../core/theme/app_colors.dart';
import '../../../../core/theme/app_text_styles.dart';
import '../../../../core/utils/amount_expr.dart';
import '../../../../core/widgets/amount_expr_field.dart';
import '../../../../core/widgets/app_sheet.dart';
import '../../../../core/widgets/app_text_field.dart';
import '../../../../core/widgets/sheet_header.dart';
import '../../data/datasources/plans_datasource.dart';
import '../../domain/entities/plan_entity.dart';
import '../providers/plans_provider.dart';
import 'plan_item_sheets.dart';

void showNewPlanSheet(BuildContext context, WidgetRef ref) => showAppSheet(context, const _NewPlanSheet());
void showAddItemSheet(BuildContext context, WidgetRef ref, String planId) =>
    showAppSheet(context, AddItemSheet(planId: planId));
void showItemSheet(BuildContext context, WidgetRef ref, String planId, PlanItemEntity item) =>
    showAppSheet(context, ItemDetailSheet(planId: planId, item: item));
void showEditPlanSheet(BuildContext context, WidgetRef ref, PlanDetailEntity plan) =>
    showAppSheet(context, _EditPlanSheet(plan: plan));

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

  bool get _canSubmit => _name.text.trim().isNotEmpty && (_type == 'ITEMIZED' || parseAmount(_target.text).isValid);

  Future<void> _submit() async {
    if (!_canSubmit) return;
    setState(() => _loading = true);
    try {
      HapticFeedback.mediumImpact();
      await ref.read(plansDatasourceProvider).createPlan(
            name: _name.text.trim(),
            planType: _type,
            estimatedTotalPaisas: _type == 'FIXED' ? parseAmount(_target.text).paisas : null,
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
          SheetHeader(title: 'New Plan', onSubmit: _submit, canSubmit: _canSubmit, loading: _loading, submit: 'Create'),
          const SizedBox(height: 16),
          AppTextField(controller: _name, hint: 'Plan name', dense: true, autofocus: true, textCapitalization: TextCapitalization.sentences, onChanged: (_) => setState(() {})),
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
            AmountExprField(controller: _target, hint: 'Target amount', onChanged: () => setState(() {})),
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

// ── Edit plan ────────────────────────────────────────────────────────────────

class _EditPlanSheet extends ConsumerStatefulWidget {
  const _EditPlanSheet({required this.plan});
  final PlanDetailEntity plan;
  @override
  ConsumerState<_EditPlanSheet> createState() => _EditPlanSheetState();
}

class _EditPlanSheetState extends ConsumerState<_EditPlanSheet> {
  late final _name = TextEditingController(text: widget.plan.name);
  late final _desc = TextEditingController(text: widget.plan.description ?? '');
  bool _loading = false;

  @override
  void dispose() {
    _name.dispose();
    _desc.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    if (_name.text.trim().isEmpty) return;
    setState(() => _loading = true);
    try {
      HapticFeedback.mediumImpact();
      await ref.read(plansDatasourceProvider).updatePlan(
            id: widget.plan.id,
            name: _name.text.trim(),
            setDescription: true,
            description: _desc.text.trim().isEmpty ? null : _desc.text.trim(),
          );
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
          SheetHeader(title: 'Edit Plan', onSubmit: _submit, canSubmit: _name.text.trim().isNotEmpty, loading: _loading),
          const SizedBox(height: 16),
          AppTextField(controller: _name, hint: 'Plan name', dense: true, textCapitalization: TextCapitalization.sentences, onChanged: (_) => setState(() {})),
          const SizedBox(height: 12),
          AppTextField(controller: _desc, hint: 'Description (optional)', dense: true, maxLines: 3, textCapitalization: TextCapitalization.sentences),
        ],
      ),
    );
  }
}
