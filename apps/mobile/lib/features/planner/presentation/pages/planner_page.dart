import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../../core/extensions/currency_ext.dart';
import '../../../../core/extensions/datetime_ext.dart';
import '../../../../core/theme/app_colors.dart';
import '../../../../core/theme/app_text_styles.dart';
import '../../../../core/widgets/app_button.dart';
import '../../../../core/widgets/app_card.dart';
import '../../domain/entities/planner_entity.dart';
import '../providers/planner_provider.dart';
import '../widgets/planner_sheets.dart';

const _monthWidth = 84.0;
const _cellWidth = 120.0;
const _goalsWidth = 180.0;
const _rowHeight = 52.0;
const _headHeight = 40.0;

// Months with a goal are tinted, like the source spreadsheet.
Color _rowColor(PlannerRowEntity row) => row.goals.isEmpty ? AppColors.card : AppColors.primary.withValues(alpha: 0.08);

class PlannerPage extends ConsumerWidget {
  const PlannerPage({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final async = ref.watch(plannerProvider);
    final data = async.asData?.value;
    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        backgroundColor: AppColors.background,
        elevation: 0,
        title: const Text('Planner', style: AppTextStyles.headlineSmall),
        actions: [
          if (data != null) ...[
            IconButton(
              tooltip: 'Add line',
              icon: const Icon(Icons.add, color: AppColors.primary),
              onPressed: () => showLineSheet(context, ref),
            ),
            PopupMenuButton<String>(
              icon: const Icon(Icons.more_vert, color: AppColors.mutedForeground),
              color: AppColors.popover,
              onSelected: (v) {
                if (v == 'settings') showPlannerSettingsSheet(context, ref, data.settings);
                if (v == 'lines') showLinesSheet(context, ref, data.lines);
              },
              itemBuilder: (_) => const [
                PopupMenuItem(value: 'lines', child: Text('Manage lines', style: AppTextStyles.bodyMedium)),
                PopupMenuItem(value: 'settings', child: Text('Planner settings', style: AppTextStyles.bodyMedium)),
              ],
            ),
          ],
        ],
      ),
      body: RefreshIndicator(
        color: AppColors.primary,
        backgroundColor: AppColors.card,
        onRefresh: () => ref.refresh(plannerProvider.future),
        child: async.when(
          data: (p) => _Content(data: p),
          loading: () => const Center(child: CircularProgressIndicator(color: AppColors.primary)),
          error: (_, __) => const Center(child: Text('Could not load the planner', style: AppTextStyles.bodyMedium)),
        ),
      ),
    );
  }
}

class _Content extends ConsumerWidget {
  const _Content({required this.data});
  final PlannerData data;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final s = data.settings;
    final last = data.rows.isEmpty ? null : data.rows.last;
    return ListView(
      padding: const EdgeInsets.fromLTRB(12, 4, 12, 32),
      children: [
        Text(
          'Starting cash ${s.startingCashPaisas.formatPKR()} · USD rate ${s.usdRate}\n'
          '${s.start.toShortMonthLabel} → ${last?.date.toShortMonthLabel ?? ''} · ${s.months} months',
          style: AppTextStyles.bodySmall,
        ),
        const SizedBox(height: 12),
        if (data.isEmpty) ...[
          AppCard(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text(
                  'Add a line for each regular amount - savings, a fee, a loan instalment, freelance. '
                  'Tap any month to change it for that month or from then on. '
                  'Tap the Goals column to add one-off costs. Net and Available work themselves out.',
                  style: AppTextStyles.bodySmall,
                ),
                const SizedBox(height: 12),
                AppButton(label: 'Add your first line', onPressed: () => showLineSheet(context, ref)),
              ],
            ),
          ),
          const SizedBox(height: 12),
        ],
        _Table(data: data),
      ],
    );
  }
}

/// Month column pinned on the left; lines, Goals, Net and Available scroll
/// sideways together.
class _Table extends ConsumerWidget {
  const _Table({required this.data});
  final PlannerData data;

  @override
  Widget build(BuildContext context, WidgetRef ref) => ClipRRect(
        borderRadius: BorderRadius.circular(12),
        child: DecoratedBox(
          decoration: BoxDecoration(
            border: Border.all(color: AppColors.border.withValues(alpha: 0.6)),
            borderRadius: BorderRadius.circular(12),
          ),
          child: Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Column(children: [
                const _Head(text: 'Month', width: _monthWidth, alignLeft: true),
                for (final row in data.rows)
                  _Cell(
                    text: row.date.toShortMonthLabel,
                    width: _monthWidth,
                    background: _rowColor(row),
                    weight: FontWeight.w600,
                    alignLeft: true,
                  ),
              ]),
              Expanded(
                child: SingleChildScrollView(
                  scrollDirection: Axis.horizontal,
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(children: [
                        for (final line in data.lines)
                          _Head(
                            text: '${line.name} ${line.isIn ? '+' : '−'}${line.isUsd ? ' \$' : ''}',
                            width: _cellWidth,
                            onTap: () => showLineSheet(context, ref, line: line),
                          ),
                        const _Head(text: 'Goals', width: _goalsWidth, alignLeft: true),
                        const _Head(text: 'Net', width: _cellWidth),
                        const _Head(text: 'Available', width: _cellWidth),
                      ]),
                      for (final row in data.rows) _RowCells(data: data, row: row),
                    ],
                  ),
                ),
              ),
            ],
          ),
        ),
      );
}

class _RowCells extends ConsumerWidget {
  const _RowCells({required this.data, required this.row});
  final PlannerData data;
  final PlannerRowEntity row;

  String _lineText(PlannerLineEntity line) {
    final cell = row.cellFor(line.id);
    if (cell == null || cell.pkr == 0) return '–';
    final pkr = (line.isIn ? cell.pkr : -cell.pkr).formatAmount();
    return line.isUsd ? '$pkr\n(\$${cell.native.formatAmount()})' : pkr;
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final bg = _rowColor(row);
    return Row(children: [
      for (final line in data.lines)
        _Cell(
          text: _lineText(line),
          width: _cellWidth,
          background: bg,
          marked: row.cellFor(line.id)?.isOverride ?? false,
          onTap: () => showCellSheet(context, ref, line, row),
        ),
      _Cell(
        text: row.goals.map((g) => '${g.name} -${g.amountPaisas.formatAmount()}').join('\n'),
        width: _goalsWidth,
        background: bg,
        color: AppColors.primary,
        weight: FontWeight.w600,
        alignLeft: true,
        onTap: () => showGoalsSheet(context, ref, row),
      ),
      _Cell(
        text: row.net.formatAmount(),
        width: _cellWidth,
        background: bg,
        color: row.net < 0 ? AppColors.destructive : AppColors.success,
      ),
      _Cell(
        text: row.available.formatAmount(),
        width: _cellWidth,
        background: bg,
        weight: FontWeight.w700,
        color: row.available < 0 ? AppColors.destructive : AppColors.foreground,
      ),
    ]);
  }
}

class _Head extends StatelessWidget {
  const _Head({required this.text, required this.width, this.alignLeft = false, this.onTap});
  final String text;
  final double width;
  final bool alignLeft;
  final VoidCallback? onTap;

  @override
  Widget build(BuildContext context) => GestureDetector(
        onTap: onTap,
        behavior: HitTestBehavior.opaque,
        child: Container(
          width: width,
          height: _headHeight,
          padding: const EdgeInsets.symmetric(horizontal: 8),
          alignment: alignLeft ? Alignment.centerLeft : Alignment.centerRight,
          color: AppColors.muted,
          child: Text(
            text,
            maxLines: 1,
            overflow: TextOverflow.ellipsis,
            style: AppTextStyles.labelSmall.copyWith(color: AppColors.mutedForeground, fontWeight: FontWeight.w600),
          ),
        ),
      );
}

class _Cell extends StatelessWidget {
  const _Cell({
    required this.text,
    required this.width,
    required this.background,
    this.color,
    this.weight,
    this.alignLeft = false,
    this.marked = false,
    this.onTap,
  });

  final String text;
  final double width;
  final Color background;
  final Color? color;
  final FontWeight? weight;
  final bool alignLeft;
  final bool marked; // a "just this month" change
  final VoidCallback? onTap;

  @override
  Widget build(BuildContext context) => GestureDetector(
        onTap: onTap,
        behavior: HitTestBehavior.opaque,
        child: Container(
          width: width,
          height: _rowHeight,
          padding: const EdgeInsets.symmetric(horizontal: 8),
          alignment: alignLeft ? Alignment.centerLeft : Alignment.centerRight,
          decoration: BoxDecoration(
            color: background,
            border: Border(bottom: BorderSide(color: AppColors.border.withValues(alpha: 0.5))),
          ),
          child: Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              Flexible(
                child: Text(
                  text,
                  maxLines: 2,
                  overflow: TextOverflow.ellipsis,
                  textAlign: alignLeft ? TextAlign.left : TextAlign.right,
                  style: AppTextStyles.bodySmall.copyWith(color: color ?? AppColors.foreground, fontWeight: weight),
                ),
              ),
              if (marked) ...[
                const SizedBox(width: 4),
                Container(
                  width: 5,
                  height: 5,
                  decoration: const BoxDecoration(color: AppColors.primary, shape: BoxShape.circle),
                ),
              ],
            ],
          ),
        ),
      );
}
