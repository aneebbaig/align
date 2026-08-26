import 'package:flutter/material.dart';
import 'package:url_launcher/url_launcher.dart';

import '../../../../core/theme/app_colors.dart';
import '../../../../core/theme/app_text_styles.dart';
import '../../domain/entities/project_entity.dart';

Future<void> showProjectDetailsSheet(
  BuildContext context, {
  required String? notes,
  required List<ProjectLinkEntity> links,
  required Future<void> Function(String? notes) onSaveNotes,
  required Future<void> Function(List<ProjectLinkEntity> links) onSaveLinks,
  required void Function(BuildContext, String) showError,
}) {
  return showModalBottomSheet(
    context: context,
    isScrollControlled: true,
    backgroundColor: AppColors.card,
    shape: const RoundedRectangleBorder(
      borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
    ),
    builder: (ctx) => Padding(
      padding: EdgeInsets.only(bottom: MediaQuery.of(ctx).viewInsets.bottom),
      child: _ProjectDetailsSheet(
        notes: notes,
        links: links,
        onSaveNotes: onSaveNotes,
        onSaveLinks: onSaveLinks,
        showError: showError,
      ),
    ),
  );
}

class _ProjectDetailsSheet extends StatefulWidget {
  const _ProjectDetailsSheet({
    required this.notes,
    required this.links,
    required this.onSaveNotes,
    required this.onSaveLinks,
    required this.showError,
  });

  final String? notes;
  final List<ProjectLinkEntity> links;
  final Future<void> Function(String? notes) onSaveNotes;
  final Future<void> Function(List<ProjectLinkEntity> links) onSaveLinks;
  final void Function(BuildContext, String) showError;

  @override
  State<_ProjectDetailsSheet> createState() => _ProjectDetailsSheetState();
}

class _ProjectDetailsSheetState extends State<_ProjectDetailsSheet> {
  late final TextEditingController _notes;
  late String _savedNotes;
  late List<ProjectLinkEntity> _links;
  bool _adding = false;
  final _label = TextEditingController();
  final _url = TextEditingController();

  @override
  void initState() {
    super.initState();
    _notes = TextEditingController(text: widget.notes ?? '');
    _savedNotes = widget.notes ?? '';
    _links = [...widget.links];
  }

  @override
  void dispose() {
    _saveNotesIfChanged();
    _notes.dispose();
    _label.dispose();
    _url.dispose();
    super.dispose();
  }

  void _saveNotesIfChanged() {
    if (_notes.text != _savedNotes) {
      _savedNotes = _notes.text;
      widget.onSaveNotes(_notes.text.trim().isEmpty ? null : _notes.text.trim());
    }
  }

  String _normalizeUrl(String raw) {
    final t = raw.trim();
    if (t.isEmpty) return t;
    return t.startsWith(RegExp(r'https?://', caseSensitive: false)) ? t : 'https://$t';
  }

  Future<void> _persistLinks(List<ProjectLinkEntity> next) async {
    final prev = _links;
    setState(() => _links = next);
    try {
      await widget.onSaveLinks(next);
    } catch (_) {
      if (mounted) {
        setState(() => _links = prev);
        widget.showError(context, 'Failed to save link');
      }
    }
  }

  void _addLink() {
    final url = _normalizeUrl(_url.text);
    if (url.isEmpty) return;
    final label = _label.text.trim().isEmpty
        ? url.replaceFirst(RegExp(r'https?://', caseSensitive: false), '')
        : _label.text.trim();
    _persistLinks([..._links, ProjectLinkEntity(id: UniqueKey().toString(), label: label, url: url)]);
    _label.clear();
    _url.clear();
    setState(() => _adding = false);
  }

  Future<void> _open(String url) async {
    final uri = Uri.tryParse(url);
    if (uri == null || !await launchUrl(uri, mode: LaunchMode.externalApplication)) {
      if (mounted) widget.showError(context, 'Could not open link');
    }
  }

  @override
  Widget build(BuildContext context) {
    return SafeArea(
      child: SingleChildScrollView(
        padding: const EdgeInsets.fromLTRB(20, 12, 20, 20),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Center(
              child: Container(
                width: 36,
                height: 4,
                margin: const EdgeInsets.only(bottom: 16),
                decoration: BoxDecoration(color: AppColors.border, borderRadius: BorderRadius.circular(2)),
              ),
            ),
            Text('Details', style: AppTextStyles.headlineSmall.copyWith(fontWeight: FontWeight.w700)),
            const SizedBox(height: 16),

            _sectionLabel('Notes'),
            TextField(
              controller: _notes,
              style: AppTextStyles.bodyMedium,
              maxLines: 5,
              textCapitalization: TextCapitalization.sentences,
              onEditingComplete: _saveNotesIfChanged,
              decoration: _fieldDecoration('Scope, decisions, reminders…'),
            ),
            const SizedBox(height: 20),

            _sectionLabel('Links'),
            if (_links.isEmpty && !_adding)
              Padding(
                padding: const EdgeInsets.only(bottom: 8),
                child: Text('No links yet.',
                    style: AppTextStyles.bodySmall.copyWith(color: AppColors.mutedForeground)),
              ),
            for (final l in _links)
              Padding(
                padding: const EdgeInsets.only(bottom: 8),
                child: Container(
                  padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                  decoration: BoxDecoration(
                    color: AppColors.background,
                    borderRadius: BorderRadius.circular(10),
                    border: Border.all(color: AppColors.border.withValues(alpha: 0.5)),
                  ),
                  child: Row(
                    children: [
                      const Icon(Icons.link, size: 16, color: AppColors.mutedForeground),
                      const SizedBox(width: 10),
                      Expanded(
                        child: GestureDetector(
                          onTap: () => _open(l.url),
                          child: Text(
                            l.label,
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                            style: AppTextStyles.bodyMedium.copyWith(color: AppColors.foreground),
                          ),
                        ),
                      ),
                      GestureDetector(
                        onTap: () => _open(l.url),
                        child: const Padding(
                          padding: EdgeInsets.symmetric(horizontal: 4),
                          child: Icon(Icons.open_in_new, size: 15, color: AppColors.mutedForeground),
                        ),
                      ),
                      GestureDetector(
                        onTap: () => _persistLinks(_links.where((x) => x.id != l.id).toList()),
                        child: const Padding(
                          padding: EdgeInsets.only(left: 6),
                          child: Icon(Icons.close, size: 16, color: AppColors.mutedForeground),
                        ),
                      ),
                    ],
                  ),
                ),
              ),

            if (_adding) ...[
              Container(
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: AppColors.background,
                  borderRadius: BorderRadius.circular(10),
                  border: Border.all(color: AppColors.border.withValues(alpha: 0.5)),
                ),
                child: Column(
                  children: [
                    TextField(
                      controller: _label,
                      style: AppTextStyles.bodyMedium,
                      decoration: _fieldDecoration('Label (e.g. Figma)'),
                    ),
                    const SizedBox(height: 8),
                    TextField(
                      controller: _url,
                      style: AppTextStyles.bodyMedium,
                      keyboardType: TextInputType.url,
                      autofocus: true,
                      onSubmitted: (_) => _addLink(),
                      decoration: _fieldDecoration('https://…'),
                    ),
                    const SizedBox(height: 10),
                    Row(
                      children: [
                        Expanded(
                          child: FilledButton(
                            onPressed: _addLink,
                            style: FilledButton.styleFrom(
                              backgroundColor: AppColors.primary,
                              foregroundColor: Colors.black,
                            ),
                            child: const Text('Add'),
                          ),
                        ),
                        const SizedBox(width: 8),
                        TextButton(
                          onPressed: () {
                            _label.clear();
                            _url.clear();
                            setState(() => _adding = false);
                          },
                          child: Text('Cancel',
                              style: AppTextStyles.bodyMedium.copyWith(color: AppColors.mutedForeground)),
                        ),
                      ],
                    ),
                  ],
                ),
              ),
            ] else
              GestureDetector(
                onTap: () => setState(() => _adding = true),
                child: Container(
                  width: double.infinity,
                  padding: const EdgeInsets.symmetric(vertical: 11),
                  decoration: BoxDecoration(
                    borderRadius: BorderRadius.circular(10),
                    border: Border.all(
                      color: AppColors.border.withValues(alpha: 0.6),
                      style: BorderStyle.solid,
                    ),
                  ),
                  child: Row(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      const Icon(Icons.add, size: 16, color: AppColors.mutedForeground),
                      const SizedBox(width: 6),
                      Text('Add link',
                          style: AppTextStyles.bodyMedium.copyWith(color: AppColors.mutedForeground)),
                    ],
                  ),
                ),
              ),
          ],
        ),
      ),
    );
  }

  Widget _sectionLabel(String text) => Padding(
        padding: const EdgeInsets.only(bottom: 8),
        child: Text(text,
            style: AppTextStyles.labelMedium
                .copyWith(color: AppColors.mutedForeground, fontWeight: FontWeight.w600)),
      );

  InputDecoration _fieldDecoration(String hint) => InputDecoration(
        hintText: hint,
        hintStyle: AppTextStyles.bodyMedium.copyWith(color: AppColors.mutedForeground),
        isDense: true,
        filled: true,
        fillColor: AppColors.card,
        contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 12),
        border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(8),
          borderSide: BorderSide(color: AppColors.border.withValues(alpha: 0.5)),
        ),
        enabledBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(8),
          borderSide: BorderSide(color: AppColors.border.withValues(alpha: 0.5)),
        ),
        focusedBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(8),
          borderSide: const BorderSide(color: AppColors.primary),
        ),
      );
}
