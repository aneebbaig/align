import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../../core/extensions/currency_ext.dart';
import '../../../../core/theme/app_colors.dart';
import '../../../../core/theme/app_text_styles.dart';
import '../../../../core/extensions/datetime_ext.dart';
import '../../../../core/widgets/app_card.dart';
import '../../../../core/widgets/app_text_field.dart';
import '../../../../core/widgets/sheet_header.dart';
import '../../domain/entities/planner_entity.dart';
import 'planner_sheet_common.dart';

class SettingsSheet extends ConsumerStatefulWidget {
  const SettingsSheet({required this.settings, super.key});
  final PlannerSettingsEntity settings;

  @override
  ConsumerState<SettingsSheet> createState() => SettingsSheetState();
}

class SettingsSheetState extends ConsumerState<SettingsSheet> {
  late DateTime _start = widget.settings.start;
  late final _months = TextEditingController(text: '${widget.settings.months}');
  late final _cash = TextEditingController(text: plannerInput(widget.settings.startingCashPaisas));
  late final _rate = TextEditingController(text: '${widget.settings.usdRate}');
  bool _loading = false;

  @override
  void dispose() {
    _months.dispose();
    _cash.dispose();
    _rate.dispose();
    super.dispose();
  }

  int? get _monthsValue {
    final v = int.tryParse(_months.text.trim());
    return v != null && v >= 1 && v <= 120 ? v : null;
  }

  double? get _rateValue {
    final v = double.tryParse(_rate.text.trim());
    return v != null && v > 0 ? v : null;
  }

  // Starting cash may be negative (e.g. starting in debt).
  int? get _cashValue => double.tryParse(_cash.text.trim().isEmpty ? '0' : _cash.text.trim())?.toPaisas;

  bool get _canSubmit => _monthsValue != null && _rateValue != null && _cashValue != null;

  Future<void> _submit() async {
    if (!_canSubmit) return;
    setState(() => _loading = true);
    final ok = await applyPlannerChange(
      context,
      ref,
      (ds) => ds.updateSettings(
        startMonth: _start.month,
        startYear: _start.year,
        months: _monthsValue,
        startingCashPaisas: _cashValue,
        usdRate: _rateValue,
      ),
      done: 'Forecast updated',
    );
    if (!mounted) return;
    if (ok) {
      Navigator.pop(context);
    } else {
      setState(() => _loading = false);
    }
  }

  Widget _label(String text) => Padding(
        padding: const EdgeInsets.only(top: 12, bottom: 6),
        child: Text(text, style: AppTextStyles.labelSmall.copyWith(color: AppColors.mutedForeground)),
      );

  @override
  Widget build(BuildContext context) => Padding(
        padding: const EdgeInsets.fromLTRB(16, 16, 16, 24),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            SheetHeader(title: 'Forecast settings', onSubmit: _submit, canSubmit: _canSubmit, loading: _loading),
            _label('Starts'),
            AppCard(
              padding: const EdgeInsets.symmetric(horizontal: 4, vertical: 2),
              child: Row(children: [
                IconButton(
                  icon: const Icon(Icons.chevron_left, color: AppColors.foreground),
                  onPressed: () => setState(() => _start = DateTime(_start.year, _start.month - 1)),
                ),
                Expanded(child: Center(child: Text(_start.toShortMonthLabel, style: AppTextStyles.bodyMedium))),
                IconButton(
                  icon: const Icon(Icons.chevron_right, color: AppColors.foreground),
                  onPressed: () => setState(() => _start = DateTime(_start.year, _start.month + 1)),
                ),
              ]),
            ),
            _label('Months (1-120)'),
            AppTextField(dense: true, controller: _months, hint: '24', keyboardType: TextInputType.number, onChanged: (_) => setState(() {})),
            _label('Starting cash'),
            AppTextField(dense: true, 
              controller: _cash,
              hint: '0',
              prefixText: 'Rs ',
              keyboardType: const TextInputType.numberWithOptions(decimal: true, signed: true),
              onChanged: (_) => setState(() {}),
            ),
            _label('USD rate (Rs per \$)'),
            AppTextField(dense: true, 
              controller: _rate,
              hint: '278',
              keyboardType: const TextInputType.numberWithOptions(decimal: true),
              onChanged: (_) => setState(() {}),
            ),
            const SizedBox(height: 6),
            const Text("The forecast's own rate - it doesn't change the real one in Settings.", style: AppTextStyles.bodySmall),
          ],
        ),
      );
}
