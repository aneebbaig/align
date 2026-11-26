import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../../core/theme/app_colors.dart';
import '../../../../core/theme/app_text_styles.dart';
import '../../../../core/widgets/app_card.dart';
import '../../../../core/widgets/app_sheet.dart';
import '../../../../core/widgets/app_text_field.dart';
import '../../../../core/widgets/sheet_header.dart';
import '../../domain/entities/planner_entity.dart';
import 'planner_sheet_common.dart';

void showLineSheet(BuildContext context, WidgetRef ref, {PlannerLineEntity? line}) =>
    showAppSheet(context, LineSheet(existing: line), safeArea: true);

class LineSheet extends ConsumerStatefulWidget {
  const LineSheet({this.existing, super.key});
  final PlannerLineEntity? existing;

  @override
  ConsumerState<LineSheet> createState() => LineSheetState();
}

class LineSheetState extends ConsumerState<LineSheet> {
  late final _name = TextEditingController(text: widget.existing?.name ?? '');
  late String _direction = widget.existing?.direction ?? 'IN';
  late String _currency = widget.existing?.currency ?? 'PKR';
  bool _loading = false;

  @override
  void dispose() {
    _name.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    if (_name.text.trim().isEmpty) return;
    setState(() => _loading = true);
    final existing = widget.existing;
    final ok = await applyPlannerChange(
      context,
      ref,
      (ds) => existing == null
          ? ds.addLine(name: _name.text.trim(), direction: _direction, currency: _currency)
          : ds.updateLine(id: existing.id, name: _name.text.trim(), direction: _direction, currency: _currency),
      done: existing == null ? 'Line added' : 'Line updated',
    );
    if (!mounted) return;
    if (ok) {
      Navigator.pop(context);
    } else {
      setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) => Padding(
        padding: const EdgeInsets.fromLTRB(16, 16, 16, 24),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            SheetHeader(
              title: widget.existing == null ? 'New line' : 'Edit line',
              onSubmit: _submit,
              canSubmit: _name.text.trim().isNotEmpty,
              loading: _loading,
              submit: widget.existing == null ? 'Add' : 'Save',
            ),
            const SizedBox(height: 12),
            AppTextField(dense: true, textCapitalization: TextCapitalization.sentences, controller: _name, hint: 'e.g. Base Savings, Car Loan', autofocus: true, onChanged: (_) => setState(() {})),
            const SizedBox(height: 12),
            Row(children: [
              PlannerChoice(label: 'Coming in (+)', selected: _direction == 'IN', onTap: () => setState(() => _direction = 'IN')),
              const SizedBox(width: 8),
              PlannerChoice(label: 'Going out (−)', selected: _direction == 'OUT', onTap: () => setState(() => _direction = 'OUT')),
            ]),
            const SizedBox(height: 8),
            Row(children: [
              PlannerChoice(label: 'Rupees', selected: _currency == 'PKR', onTap: () => setState(() => _currency = 'PKR')),
              const SizedBox(width: 8),
              PlannerChoice(label: 'Dollars', selected: _currency == 'USD', onTap: () => setState(() => _currency = 'USD')),
            ]),
          ],
        ),
      );
}

// ── Manage lines ─────────────────────────────────────────────────────────────

class LinesSheet extends ConsumerWidget {
  const LinesSheet({required this.lines, super.key});
  final List<PlannerLineEntity> lines;

  Future<void> _move(BuildContext context, WidgetRef ref, int i, int dir) async {
    final ids = lines.map((l) => l.id).toList();
    final moved = ids.removeAt(i);
    ids.insert(i + dir, moved);
    final ok = await applyPlannerChange(context, ref, (ds) => ds.reorderLines(ids), done: 'Order saved');
    if (ok && context.mounted) Navigator.pop(context);
  }

  Future<void> _delete(BuildContext context, WidgetRef ref, PlannerLineEntity line) async {
    if (!await confirmDestructive(context, title: 'Delete line?', body: 'This removes ${line.name} and every amount set for it. Goals stay.')) return;
    if (!context.mounted) return;
    final ok = await applyPlannerChange(context, ref, (ds) => ds.deleteLine(line.id), done: 'Line deleted');
    if (ok && context.mounted) Navigator.pop(context);
  }

  void _menu(BuildContext context, WidgetRef ref, int i) {
    final line = lines[i];
    showModalBottomSheet<void>(
      context: context,
      backgroundColor: AppColors.popover,
      shape: const RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(16))),
      builder: (ctx) => SafeArea(
        child: Column(mainAxisSize: MainAxisSize.min, children: [
          ListTile(
            leading: const Icon(Icons.edit_outlined, color: AppColors.foreground, size: 20),
            title: const Text('Edit line', style: AppTextStyles.bodyMedium),
            onTap: () {
              Navigator.pop(ctx);
              Navigator.pop(context);
              showLineSheet(context, ref, line: line);
            },
          ),
          if (i > 0)
            ListTile(
              leading: const Icon(Icons.arrow_back, color: AppColors.foreground, size: 20),
              title: const Text('Move left', style: AppTextStyles.bodyMedium),
              onTap: () {
                Navigator.pop(ctx);
                _move(context, ref, i, -1);
              },
            ),
          if (i < lines.length - 1)
            ListTile(
              leading: const Icon(Icons.arrow_forward, color: AppColors.foreground, size: 20),
              title: const Text('Move right', style: AppTextStyles.bodyMedium),
              onTap: () {
                Navigator.pop(ctx);
                _move(context, ref, i, 1);
              },
            ),
          ListTile(
            leading: const Icon(Icons.delete_outline, color: AppColors.destructive, size: 20),
            title: Text('Delete line', style: AppTextStyles.bodyMedium.copyWith(color: AppColors.destructive)),
            onTap: () {
              Navigator.pop(ctx);
              _delete(context, ref, line);
            },
          ),
        ]),
      ),
    );
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) => Padding(
        padding: const EdgeInsets.fromLTRB(16, 16, 16, 24),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            SheetHeader(
              title: 'Lines',
              onSubmit: () {
                Navigator.pop(context);
                showLineSheet(context, ref);
              },
              canSubmit: true,
              submit: 'Add',
            ),
            const SizedBox(height: 8),
            if (lines.isEmpty) const Text('No lines yet.', style: AppTextStyles.bodySmall),
            for (var i = 0; i < lines.length; i++)
              Padding(
                padding: const EdgeInsets.only(bottom: 6),
                child: AppCard(
                  onTap: () => _menu(context, ref, i),
                  padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
                  child: Row(children: [
                    Expanded(child: Text(lines[i].name, style: AppTextStyles.bodyMedium.copyWith(fontWeight: FontWeight.w600))),
                    Text(
                      '${lines[i].isIn ? 'In' : 'Out'} · ${lines[i].isUsd ? 'Dollars' : 'Rupees'}',
                      style: AppTextStyles.bodySmall,
                    ),
                    const SizedBox(width: 6),
                    const Icon(Icons.more_horiz, size: 18, color: AppColors.mutedForeground),
                  ]),
                ),
              ),
          ],
        ),
      );
}
