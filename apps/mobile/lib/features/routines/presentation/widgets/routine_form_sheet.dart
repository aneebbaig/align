import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';

import '../../../../core/errors/app_exception.dart';
import '../../../../core/services/toast_service.dart';
import '../../../../core/theme/app_colors.dart';
import '../../../../core/theme/app_text_styles.dart';
import '../../data/datasources/routines_datasource.dart';
import '../../data/reminder_service.dart';
import '../../domain/entities/routine_entity.dart';
import '../providers/routine_sync.dart';

const _weekdayLabels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

/// Add (routine == null) or edit a routine. Reschedules the phone's alarms
/// when it saves.
Future<void> showRoutineFormSheet(BuildContext context, WidgetRef ref, {RoutineEntity? routine}) =>
    showModalBottomSheet<void>(
      context: context,
      isScrollControlled: true,
      backgroundColor: AppColors.popover,
      shape: const RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(16))),
      builder: (_) => _RoutineForm(routine: routine, parentRef: ref, parentContext: context),
    );

class _RoutineForm extends StatefulWidget {
  const _RoutineForm({required this.routine, required this.parentRef, required this.parentContext});
  final RoutineEntity? routine;
  final WidgetRef parentRef;
  final BuildContext parentContext;

  @override
  State<_RoutineForm> createState() => _RoutineFormState();
}

class _RoutineFormState extends State<_RoutineForm> {
  late final _title = TextEditingController(text: widget.routine?.title ?? '');
  late TimeOfDay _time = widget.routine == null
      ? const TimeOfDay(hour: 6, minute: 0)
      : TimeOfDay(hour: widget.routine!.hour, minute: widget.routine!.minute);
  late bool _once = widget.routine?.isOneOff == true && widget.routine?.date != null;
  late final Set<int> _days = {...(widget.routine?.days ?? [1, 2, 3, 4, 5, 6, 7])};
  late DateTime _date = widget.routine?.date != null ? DateTime.parse(widget.routine!.date!) : DateTime.now();
  late bool _active = widget.routine?.active ?? true;
  bool _saving = false;

  @override
  void dispose() {
    _title.dispose();
    super.dispose();
  }

  String get _timeText => '${_time.hour.toString().padLeft(2, '0')}:${_time.minute.toString().padLeft(2, '0')}';

  bool get _valid => _title.text.trim().isNotEmpty && (_once || _days.isNotEmpty);

  Future<void> _save() async {
    final ref = widget.parentRef;
    final toast = ref.read(toastServiceProvider);
    setState(() => _saving = true);
    final body = {
      'title': _title.text.trim(),
      'time': _timeText,
      'days': _once ? <int>[] : (_days.toList()..sort()),
      'date': _once ? DateFormat('yyyy-MM-dd').format(_date) : null,
      'active': _active,
    };
    try {
      final ds = ref.read(routinesDatasourceProvider);
      if (widget.routine == null) {
        await ds.createRoutine(body);
        // First routine: ask for notification + exact alarm permission now.
        final exact = await ReminderService.instance.requestPermissions();
        if (!exact && widget.parentContext.mounted) {
          toast.info(widget.parentContext, 'Exact alarms are off, so reminders may arrive a few minutes late.');
        }
      } else {
        await ds.updateRoutine(widget.routine!.id, body);
      }
      await syncRoutines(ref);
      if (mounted) Navigator.of(context).pop();
    } catch (e) {
      if (mounted) {
        setState(() => _saving = false);
        toast.error(context, e is AppException ? e.message : 'Failed to save routine');
      }
    }
  }

  Future<void> _delete() async {
    final ref = widget.parentRef;
    final toast = ref.read(toastServiceProvider);
    setState(() => _saving = true);
    try {
      await ref.read(routinesDatasourceProvider).deleteRoutine(widget.routine!.id);
      await syncRoutines(ref);
      if (mounted) Navigator.of(context).pop();
    } catch (e) {
      if (mounted) {
        setState(() => _saving = false);
        toast.error(context, e is AppException ? e.message : 'Failed to delete routine');
      }
    }
  }

  @override
  Widget build(BuildContext context) => Padding(
        padding: EdgeInsets.fromLTRB(16, 16, 16, 16 + MediaQuery.of(context).viewInsets.bottom),
        child: SingleChildScrollView(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(widget.routine == null ? 'Add routine' : 'Edit routine', style: AppTextStyles.headlineSmall),
              const SizedBox(height: 16),
              TextField(
                controller: _title,
                autofocus: widget.routine == null,
                textCapitalization: TextCapitalization.sentences,
                decoration: const InputDecoration(labelText: 'Title', hintText: 'Learn Japanese'),
                onChanged: (_) => setState(() {}),
              ),
              const SizedBox(height: 12),
              ListTile(
                contentPadding: EdgeInsets.zero,
                title: const Text('Time'),
                trailing: Text(_time.format(context), style: AppTextStyles.bodyLarge),
                onTap: () async {
                  final t = await showTimePicker(context: context, initialTime: _time);
                  if (t != null) setState(() => _time = t);
                },
              ),
              SegmentedButton<bool>(
                segments: const [
                  ButtonSegment(value: false, label: Text('Repeats')),
                  ButtonSegment(value: true, label: Text('Once')),
                ],
                selected: {_once},
                onSelectionChanged: (s) => setState(() => _once = s.first),
              ),
              const SizedBox(height: 12),
              if (_once)
                ListTile(
                  contentPadding: EdgeInsets.zero,
                  title: const Text('Date'),
                  trailing: Text(DateFormat('EEE, d MMM yyyy').format(_date), style: AppTextStyles.bodyLarge),
                  onTap: () async {
                    final d = await showDatePicker(
                      context: context,
                      initialDate: _date,
                      firstDate: DateTime.now().subtract(const Duration(days: 1)),
                      lastDate: DateTime.now().add(const Duration(days: 365 * 2)),
                    );
                    if (d != null) setState(() => _date = d);
                  },
                )
              else
                Wrap(
                  spacing: 6,
                  children: [
                    for (var d = 1; d <= 7; d++)
                      FilterChip(
                        label: Text(_weekdayLabels[d - 1]),
                        selected: _days.contains(d),
                        onSelected: (on) => setState(() => on ? _days.add(d) : _days.remove(d)),
                      ),
                  ],
                ),
              SwitchListTile(
                contentPadding: EdgeInsets.zero,
                title: const Text('Reminders on'),
                value: _active,
                onChanged: (v) => setState(() => _active = v),
              ),
              const SizedBox(height: 8),
              Row(
                children: [
                  if (widget.routine != null)
                    TextButton(
                      onPressed: _saving ? null : _delete,
                      child: const Text('Delete', style: TextStyle(color: AppColors.destructive)),
                    ),
                  const Spacer(),
                  FilledButton(onPressed: _valid && !_saving ? _save : null, child: Text(_saving ? 'Saving…' : 'Save')),
                ],
              ),
            ],
          ),
        ),
      );
}
