import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';

import '../../../../core/errors/app_exception.dart';
import '../../../../core/extensions/currency_ext.dart';
import '../../../../core/extensions/datetime_ext.dart';
import '../../../../core/services/toast_service.dart';
import '../../../../core/theme/app_colors.dart';
import '../../../../core/theme/app_text_styles.dart';
import '../../../../core/widgets/app_card.dart';
import '../../../../core/widgets/app_progress_bar.dart';
import '../../data/datasources/plans_datasource.dart';
import '../../domain/entities/plan_entity.dart';
import '../providers/plans_provider.dart';
import '../widgets/plan_sheets.dart';

class PlanDetailPage extends ConsumerWidget {
  const PlanDetailPage({super.key, required this.planId});
  final String planId;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final async = ref.watch(planDetailProvider(planId));
    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        backgroundColor: AppColors.background,
        elevation: 0,
        title: Text(async.asData?.value.name ?? 'Plan', style: AppTextStyles.headlineSmall),
        actions: [
          if (async.asData != null)
            PopupMenuButton<String>(
              icon: const Icon(Icons.more_vert, color: AppColors.mutedForeground),
              color: AppColors.popover,
              onSelected: (v) {
                final plan = async.asData!.value;
                if (v == 'edit') {
                  showEditPlanSheet(context, ref, plan);
                } else if (v == 'delete') {
                  _confirmDeletePlan(context, ref, plan);
                } else {
                  _setStatus(context, ref, plan, v);
                }
              },
              itemBuilder: (_) {
                final plan = async.asData!.value;
                final closed = plan.status == 'COMPLETED' || plan.status == 'CANCELLED';
                return [
                  const PopupMenuItem(value: 'edit', child: Text('Edit plan', style: AppTextStyles.bodyMedium)),
                  if (plan.status == 'PLANNING')
                    const PopupMenuItem(value: 'IN_PROGRESS', child: Text('Mark in progress', style: AppTextStyles.bodyMedium)),
                  if (!closed)
                    const PopupMenuItem(value: 'COMPLETED', child: Text('Mark completed', style: AppTextStyles.bodyMedium)),
                  if (!closed)
                    const PopupMenuItem(value: 'CANCELLED', child: Text('Cancel plan', style: AppTextStyles.bodyMedium)),
                  PopupMenuItem(value: 'delete', child: Text('Delete plan', style: AppTextStyles.bodyMedium.copyWith(color: AppColors.destructive))),
                ];
              },
            ),
        ],
      ),
      body: RefreshIndicator(
        color: AppColors.primary,
        backgroundColor: AppColors.card,
        onRefresh: () => ref.refresh(planDetailProvider(planId).future),
        child: async.when(
          skipLoadingOnReload: true,
          data: (plan) => _Content(plan: plan),
          loading: () => const Center(child: CircularProgressIndicator(color: AppColors.primary)),
          error: (_, __) => const Center(child: Text('Could not load plan', style: AppTextStyles.bodyMedium)),
        ),
      ),
    );
  }
}

const _statusLabels = {
  'PLANNING': 'Planning',
  'IN_PROGRESS': 'In progress',
  'COMPLETED': 'Completed',
  'CANCELLED': 'Cancelled',
};

Future<void> _setStatus(BuildContext context, WidgetRef ref, PlanDetailEntity plan, String status) async {
  try {
    await ref.read(plansDatasourceProvider).updatePlan(id: plan.id, status: status);
    ref.invalidate(planDetailProvider(plan.id));
    ref.invalidate(plansProvider);
  } catch (e) {
    if (context.mounted) ref.read(toastServiceProvider).error(context, e is AppException ? e.message : 'Failed');
  }
}

class _Content extends ConsumerStatefulWidget {
  const _Content({required this.plan});
  final PlanDetailEntity plan;

  @override
  ConsumerState<_Content> createState() => _ContentState();
}

class _ContentState extends ConsumerState<_Content> {
  PlanDetailEntity get plan => widget.plan;

  /// Item order while a drag is being saved; cleared when fresh data arrives.
  List<PlanItemEntity>? _local;

  @override
  void didUpdateWidget(covariant _Content old) {
    super.didUpdateWidget(old);
    if (old.plan != widget.plan) _local = null;
  }

  /// Reorders one group's rows. The new sequence is spliced into the slots
  /// those items already occupy, so other groups stay put.
  Future<void> _reorder(List<PlanItemEntity> group, int from, int to) async {
    final moved = [...group];
    moved.insert(to, moved.removeAt(from));
    final inGroup = group.map((i) => i.id).toSet();
    var next = 0;
    final items = [
      for (final i in (_local ?? plan.items)) inGroup.contains(i.id) ? moved[next++] : i,
    ];
    setState(() => _local = items);
    HapticFeedback.selectionClick();
    try {
      await ref.read(plansDatasourceProvider).reorderItems(planId: plan.id, ids: items.map((i) => i.id).toList());
      ref.invalidate(planDetailProvider(plan.id));
    } catch (e) {
      if (!mounted) return;
      setState(() => _local = null);
      ref.read(toastServiceProvider).error(context, e is AppException ? e.message : 'Failed to reorder');
    }
  }

  Widget _groupCard(String? title, List<PlanItemEntity> group) => Padding(
        padding: const EdgeInsets.only(bottom: 12),
        child: AppCard(
          padding: EdgeInsets.zero,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              if (title != null)
                Padding(
                  padding: const EdgeInsets.fromLTRB(14, 10, 14, 6),
                  child: Row(
                    crossAxisAlignment: CrossAxisAlignment.baseline,
                    textBaseline: TextBaseline.alphabetic,
                    children: [
                      Text(title, style: AppTextStyles.bodyMedium.copyWith(fontWeight: FontWeight.w600)),
                      const SizedBox(width: 8),
                      Text('${group.where((i) => i.isBought).length} of ${group.length} bought', style: AppTextStyles.labelSmall),
                    ],
                  ),
                ),
              ReorderableListView.builder(
                shrinkWrap: true,
                physics: const NeverScrollableScrollPhysics(),
                buildDefaultDragHandles: false,
                itemCount: group.length,
                onReorderItem: (from, to) => _reorder(group, from, to),
                proxyDecorator: (child, _, __) => Material(color: Colors.transparent, child: child),
                itemBuilder: (context, index) {
                  final item = group[index];
                  return _ItemRow(
                    key: ValueKey(item.id),
                    item: item,
                    dragHandle: ReorderableDragStartListener(
                      index: index,
                      child: const Padding(
                        padding: EdgeInsets.fromLTRB(10, 12, 4, 12),
                        child: Icon(Icons.drag_indicator, size: 18, color: AppColors.mutedForeground),
                      ),
                    ),
                    onToggle: () => _toggle(item),
                    onOpen: () => showItemSheet(context, ref, plan.id, item),
                  );
                },
              ),
            ],
          ),
        ),
      );

  Future<void> _toggle(PlanItemEntity item) async {
    try {
      HapticFeedback.mediumImpact();
      final ds = ref.read(plansDatasourceProvider);
      if (item.isBought) {
        await ds.setItemStatus(planId: plan.id, itemId: item.id, status: 'PENDING');
      } else {
        await ds.buyItem(planId: plan.id, itemId: item.id, log: false);
      }
      ref.invalidate(planDetailProvider(plan.id));
      ref.invalidate(plansProvider);
      if (mounted && !item.isBought) ref.read(toastServiceProvider).success(context, 'Marked as bought');
    } catch (e) {
      if (mounted) ref.read(toastServiceProvider).error(context, e is AppException ? e.message : 'Failed');
    }
  }

  @override
  Widget build(BuildContext context) {
    final items = _local ?? plan.items;
    final meta = [
      if ((plan.description ?? '').trim().isNotEmpty) plan.description!.trim(),
      if (plan.targetDate != null) 'Target ${plan.targetDate!.toShortDate}',
      _statusLabels[plan.status] ?? plan.status,
      if (plan.completedAt != null) 'Completed on ${DateFormat('d MMMM y').format(plan.completedAt!)}',
    ].join(' · ');
    final grouped = <String, List<PlanItemEntity>>{};
    final ungrouped = <PlanItemEntity>[];
    for (final i in items) {
      final g = (i.groupName ?? '').trim();
      if (g.isEmpty) {
        ungrouped.add(i);
      } else {
        (grouped[g] ??= []).add(i);
      }
    }
    return ListView(
      padding: const EdgeInsets.fromLTRB(16, 0, 16, 100),
      children: [
        Text(meta, style: AppTextStyles.bodySmall),
        const SizedBox(height: 12),
        _Summary(plan: plan),
        const SizedBox(height: 16),
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Text('Items', style: AppTextStyles.bodyMedium.copyWith(fontWeight: FontWeight.w600)),
            TextButton.icon(
              onPressed: () => showAddItemSheet(context, ref, plan.id),
              icon: const Icon(Icons.add, size: 16, color: AppColors.primary),
              label: const Text('Add', style: TextStyle(color: AppColors.primary)),
              style: TextButton.styleFrom(padding: const EdgeInsets.symmetric(horizontal: 6), minimumSize: Size.zero),
            ),
          ],
        ),
        const SizedBox(height: 4),
        if (items.isEmpty)
          const Padding(
            padding: EdgeInsets.symmetric(vertical: 24),
            child: Text(
              'Nothing here yet. Add everything you expect to buy - rough estimates are fine.',
              textAlign: TextAlign.center,
              style: AppTextStyles.bodySmall,
            ),
          )
        else ...[
          for (final e in grouped.entries) _groupCard(e.key, e.value),
          if (ungrouped.isNotEmpty) _groupCard(grouped.isNotEmpty ? 'Other' : null, ungrouped),
        ],
      ],
    );
  }
}

Future<void> _confirmDeletePlan(BuildContext context, WidgetRef ref, PlanDetailEntity plan) async {
  final ok = await showDialog<bool>(
    context: context,
    builder: (ctx) => AlertDialog(
      backgroundColor: AppColors.card,
      title: const Text('Delete plan?', style: AppTextStyles.bodyLarge),
      content: Text('This removes ${plan.name} and all its items.', style: AppTextStyles.bodySmall),
      actions: [
        TextButton(onPressed: () => Navigator.pop(ctx, false), child: const Text('Cancel')),
        TextButton(onPressed: () => Navigator.pop(ctx, true), child: const Text('Delete', style: TextStyle(color: AppColors.destructive))),
      ],
    ),
  );
  if (ok != true || !context.mounted) return;
  try {
    HapticFeedback.mediumImpact();
    await ref.read(plansDatasourceProvider).deletePlan(plan.id);
    ref.invalidate(plansProvider);
    if (context.mounted) {
      ref.read(toastServiceProvider).success(context, 'Deleted');
      context.pop();
    }
  } catch (e) {
    if (context.mounted) ref.read(toastServiceProvider).error(context, e is AppException ? e.message : 'Failed');
  }
}

class _Summary extends StatelessWidget {
  const _Summary({required this.plan});
  final PlanDetailEntity plan;

  @override
  Widget build(BuildContext context) {
    final stillToPay = plan.remainingPaisas;
    final paid = plan.totalPaidPaisas;
    final estimated = plan.totalEstimatedPaisas;
    final boughtCount = plan.items.where((i) => i.isBought).length;
    final scale = [estimated, paid, 1].reduce((a, b) => a > b ? a : b);
    final liquid = plan.affordability.liquidAvailablePaisas;
    final covered = liquid >= stillToPay;
    final coveragePct = stillToPay > 0 ? ((liquid / stillToPay) * 100).round().clamp(0, 100) : 100;
    return AppCard(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          if (plan.items.isNotEmpty && stillToPay == 0)
            Text('All paid', style: AppTextStyles.bodyLarge.copyWith(fontSize: 20, fontWeight: FontWeight.w600, color: AppColors.success))
          else
            Text('${stillToPay.formatPKR()} to go', style: AppTextStyles.bodyLarge.copyWith(fontSize: 20, fontWeight: FontWeight.w600)),
          const SizedBox(height: 10),
          AppProgressBar(value: paid / scale, color: AppColors.success),
          const SizedBox(height: 10),
          Text(
            'Estimated ${estimated.formatPKR()} · Paid ${paid.formatPKR()} · $boughtCount of ${plan.items.length} bought',
            style: AppTextStyles.bodySmall,
          ),
          if (stillToPay > 0) ...[
            const SizedBox(height: 8),
            if (covered)
              Text("Your free cash (${liquid.formatPKR()}) covers what's left.",
                  style: AppTextStyles.bodySmall.copyWith(color: AppColors.success))
            else
              Text(
                liquid > 0
                    ? 'Free cash covers $coveragePct% – ${(stillToPay - liquid).formatPKR()} short.'
                    : 'No free cash right now – all ${stillToPay.formatPKR()} still to find.',
                style: AppTextStyles.bodySmall.copyWith(color: AppColors.warning),
              ),
          ],
        ],
      ),
    );
  }
}

/// One plain checklist row: tick, name with a muted sub-line, one amount.
/// Everything else lives in the item sheet.
class _ItemRow extends StatelessWidget {
  const _ItemRow({super.key, required this.item, required this.dragHandle, required this.onToggle, required this.onOpen});
  final PlanItemEntity item;
  final Widget dragHandle;
  final VoidCallback onToggle;
  final VoidCallback onOpen;

  @override
  Widget build(BuildContext context) {
    final bought = item.isBought;
    final sub = [
      if (item.dueDate != null) 'Due ${item.dueDate!.toShortDate}',
      if ((item.notes ?? '').isNotEmpty) item.notes!,
    ].join(' · ');
    return Opacity(
      opacity: item.status == 'SKIPPED' ? 0.5 : 1,
      child: Row(
        children: [
          dragHandle,
          IconButton(
            onPressed: onToggle,
            tooltip: bought ? 'Mark not bought' : 'Mark bought',
            visualDensity: VisualDensity.compact,
            padding: EdgeInsets.zero,
            constraints: const BoxConstraints(minWidth: 32, minHeight: 32),
            icon: Icon(
              bought ? Icons.check_circle : Icons.radio_button_unchecked,
              size: 22,
              color: bought ? AppColors.success : AppColors.mutedForeground,
            ),
          ),
          Expanded(
            child: InkWell(
              onTap: onOpen,
              child: Padding(
                padding: const EdgeInsets.fromLTRB(6, 12, 12, 12),
                child: Row(
                  children: [
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            item.name,
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                            style: AppTextStyles.bodyMedium.copyWith(
                              fontWeight: FontWeight.w500,
                              color: bought ? AppColors.mutedForeground : AppColors.foreground,
                              decoration: bought ? TextDecoration.lineThrough : null,
                            ),
                          ),
                          if (sub.isNotEmpty)
                            Text(sub, maxLines: 1, overflow: TextOverflow.ellipsis, style: AppTextStyles.labelSmall),
                        ],
                      ),
                    ),
                    const SizedBox(width: 8),
                    Text.rich(TextSpan(children: [
                      if (item.actualPaisas == null) const TextSpan(text: 'est. ', style: AppTextStyles.labelSmall),
                      TextSpan(
                        text: (item.actualPaisas ?? item.estimatedPaisas).formatPKR(),
                        style: AppTextStyles.bodyMedium.copyWith(fontWeight: FontWeight.w600),
                      ),
                    ])),
                  ],
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }
}
