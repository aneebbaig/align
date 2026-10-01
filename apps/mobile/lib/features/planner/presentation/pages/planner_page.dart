import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../../core/extensions/currency_ext.dart';
import '../../../../core/theme/app_colors.dart';
import '../../../../core/theme/app_text_styles.dart';
import '../../../../core/widgets/app_card.dart';
import '../../../../core/widgets/app_empty_state.dart';
import '../../domain/entities/planner_entity.dart';
import '../providers/planner_provider.dart';
import '../widgets/planner_sheets.dart';

const _monthW = 84.0;
const _cellW = 124.0;
const _goalsW = 190.0;
const _rowH = 52.0;
const _amber = Color(0x22F59E0B);

String _num(int paisas) {
  final v = paisas / 100;
  final s = v.abs().round().toString().replaceAllMapped(RegExp(r'\B(?=(\d{3})+(?!\d))'), (_) => ',');
  return v < 0 ? '-$s' : s;
}

class PlannerPage extends ConsumerWidget {
  const PlannerPage({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final async = ref.watch(plannerProvider);
    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        backgroundColor: AppColors.background,
        elevation: 0,
        title: const Text('Planner', style: AppTextStyles.headlineSmall),
      ),
      body: async.when(
        loading: () => const Center(child: CircularProgressIndicator(color: AppColors.primary)),
        error: (_, __) => AppEmptyState(
          title: 'Could not load the planner',
          icon: Icons.wifi_off_outlined,
          onRetry: () => ref.invalidate(plannerProvider),
        ),
        data: (p) => RefreshIndicator(
          color: AppColors.primary,
          onRefresh: () => ref.refresh(plannerProvider.future),
          child: ListView(
            padding: const EdgeInsets.fromLTRB(12, 4, 12, 32),
            children: [
              _Header(data: p),
              const SizedBox(height: 12),
              if (p.lines.isEmpty && p.rows.every((r) => r.goals.isEmpty))
                const Padding(
                  padding: EdgeInsets.only(bottom: 12),
                  child: Text(
                    'Add a line for each regular amount (savings, a fee, a loan instalment, freelance). '
                    'Tap any month to change it for that month or from then on. Net and Available update themselves.',
                    style: AppTextStyles.bodySmall,
                  ),
                ),
              _Table(data: p),
            ],
          ),
        ),
      ),
    );
  }
}

class _Header extends StatelessWidget {
  const _Header({required this.data});
  final PlannerData data;

  @override
  Widget build(BuildContext context) {
    final s = data.settings;
    final last = data.rows.isEmpty ? null : data.rows.last;
    return AppCard(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            'Starting cash ${s.startingCashPaisas.formatPKR()} · USD rate ${s.usdRate}\n'
            '${monthLabel(s.startMonth, s.startYear)} → ${last == null ? '' : monthLabel(last.month, last.year)} (${s.months} months)',
            style: AppTextStyles.bodySmall,
          ),
          const SizedBox(height: 8),
          Row(
            children: [
              TextButton.icon(
                onPressed: () => showPlannerSheet(context, PlannerSettingsSheet(settings: s)),
                icon: const Icon(Icons.tune, size: 16),
                label: const Text('Settings'),
              ),
              TextButton.icon(
                onPressed: () => showPlannerSheet(context, LinesSheet(lines: data.lines)),
                icon: const Icon(Icons.view_column_outlined, size: 16),
                label: const Text('Lines'),
              ),
              const Spacer(),
              TextButton.icon(
                onPressed: () => showPlannerSheet(context, const LineFormSheet()),
                icon: const Icon(Icons.add, size: 16),
                label: const Text('Line'),
              ),
            ],
          ),
        ],
      ),
    );
  }
}

// Month column pinned on the left; everything else scrolls sideways together.
class _Table extends ConsumerWidget {
  const _Table({required this.data});
  final PlannerData data;

  Widget _cell(String text, double width, {Color? color, FontWeight? weight, Color? bg, bool alignLeft = false, VoidCallback? onTap, bool dot = false}) =>
      GestureDetector(
        onTap: onTap,
        behavior: HitTestBehavior.opaque,
        child: Container(
          width: width,
          height: _rowH,
          padding: const EdgeInsets.symmetric(horizontal: 8),
          alignment: alignLeft ? Alignment.centerLeft : Alignment.centerRight,
          decoration: BoxDecoration(
            color: bg,
            border: Border(bottom: BorderSide(color: AppColors.border.withValues(alpha: 0.6))),
          ),
          child: Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              Flexible(
                child: Text(text,
                    maxLines: 2,
                    overflow: TextOverflow.ellipsis,
                    textAlign: alignLeft ? TextAlign.left : TextAlign.right,
                    style: AppTextStyles.bodySmall.copyWith(color: color ?? AppColors.foreground, fontWeight: weight)),
              ),
              if (dot) ...[
                const SizedBox(width: 4),
                Container(width: 5, height: 5, decoration: const BoxDecoration(color: Color(0xFFF59E0B), shape: BoxShape.circle)),
              ],
            ],
          ),
        ),
      );

  Widget _head(String text, double width, {bool alignLeft = false}) => Container(
        width: width,
        height: 40,
        padding: const EdgeInsets.symmetric(horizontal: 8),
        alignment: alignLeft ? Alignment.centerLeft : Alignment.centerRight,
        color: AppColors.muted,
        child: Text(text, maxLines: 1, overflow: TextOverflow.ellipsis,
            style: AppTextStyles.labelSmall.copyWith(color: AppColors.mutedForeground, fontWeight: FontWeight.w600)),
      );

  void _editCell(BuildContext context, WidgetRef ref, PlannerLineEntity line, PlannerRowEntity row) {
    final cell = row.cellFor(line.id);
    showPlannerSheet(
      context,
      CellEditSheet(
        title: '${line.name} · ${monthLabel(row.month, row.year)}',
        isUsd: line.isUsd,
        initialNative: cell?.native ?? 0,
        isOverride: cell?.isOverride ?? false,
        onSave: (amount, scope) async {
          final ok = await runPlannerAction(context, ref,
              (ds) => ds.setCell(lineId: line.id, month: row.month, year: row.year, amount: amount, scope: scope));
          if (ok && context.mounted) Navigator.pop(context);
        },
        onRemoveOverride: () async {
          final ok = await runPlannerAction(context, ref,
              (ds) => ds.removeOverride(lineId: line.id, month: row.month, year: row.year));
          if (ok && context.mounted) Navigator.pop(context);
        },
      ),
    );
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final lines = data.lines;
    return ClipRRect(
      borderRadius: BorderRadius.circular(12),
      child: Container(
        decoration: BoxDecoration(border: Border.all(color: AppColors.border), borderRadius: BorderRadius.circular(12)),
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Column(
              children: [
                _head('Month', _monthW, alignLeft: true),
                for (final row in data.rows)
                  _cell(monthLabel(row.month, row.year), _monthW,
                      weight: FontWeight.w600, alignLeft: true, bg: row.goals.isEmpty ? AppColors.card : _amber),
              ],
            ),
            Expanded(
              child: SingleChildScrollView(
                scrollDirection: Axis.horizontal,
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(children: [
                      for (final l in lines) _head('${l.name} ${l.isIn ? '+' : '−'}${l.isUsd ? ' \$' : ''}', _cellW),
                      _head('Goals', _goalsW, alignLeft: true),
                      _head('Net', _cellW),
                      _head('Available', _cellW),
                    ]),
                    for (final row in data.rows)
                      Row(children: [
                        for (final l in lines)
                          Builder(builder: (_) {
                            final c = row.cellFor(l.id);
                            final text = (c == null || c.pkr == 0)
                                ? '–'
                                : '${l.isIn ? '' : '-'}${_num(c.pkr)}${l.isUsd ? '\n(\$${_num(c.native)})' : ''}';
                            return _cell(text, _cellW,
                                bg: row.goals.isEmpty ? AppColors.card : _amber,
                                dot: c?.isOverride ?? false,
                                onTap: () => _editCell(context, ref, l, row));
                          }),
                        _cell(
                          row.goals.map((g) => '${g.name} −${_num(g.amountPaisas)}').join('\n'),
                          _goalsW,
                          alignLeft: true,
                          color: const Color(0xFFF59E0B),
                          weight: FontWeight.w600,
                          bg: row.goals.isEmpty ? AppColors.card : _amber,
                          onTap: () => showPlannerSheet(context, GoalsSheet(row: row)),
                        ),
                        _cell(_num(row.net), _cellW,
                            color: row.net < 0 ? AppColors.destructive : AppColors.success,
                            bg: row.goals.isEmpty ? AppColors.card : _amber),
                        _cell(_num(row.available), _cellW,
                            weight: FontWeight.w700,
                            color: row.available < 0 ? AppColors.destructive : AppColors.foreground,
                            bg: row.goals.isEmpty ? AppColors.card : _amber),
                      ]),
                  ],
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
