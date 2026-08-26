import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../../core/errors/app_exception.dart';
import '../../../../core/theme/app_colors.dart';
import '../../../../core/theme/app_text_styles.dart';
import '../../../../core/widgets/app_empty_state.dart';
import '../../domain/entities/project_entity.dart';
import '../providers/projects_provider.dart';
import '../widgets/project_card.dart';

class ProjectsPage extends ConsumerStatefulWidget {
  const ProjectsPage({super.key});

  @override
  ConsumerState<ProjectsPage> createState() => _ProjectsPageState();
}

class _ProjectsPageState extends ConsumerState<ProjectsPage>
    with SingleTickerProviderStateMixin {
  late final TabController _tabs;
  static const _filters = ['ALL', 'ACTIVE', 'ON_HOLD', 'COMPLETED'];
  static const _labels = ['All', 'Active', 'On Hold', 'Completed'];
  String _sort = 'updated';

  @override
  void initState() {
    super.initState();
    // Default to the "Active" tab.
    _tabs = TabController(length: _filters.length, vsync: this, initialIndex: 1);
  }

  @override
  void dispose() {
    _tabs.dispose();
    super.dispose();
  }

  Widget _buildList(List<ProjectEntity> all, String filter) {
    final visible = filter == 'ALL'
        ? [...all]
        : all.where((p) => p.status == filter).toList();

    visible.sort((a, b) {
      final av = _sort == 'updated' ? a.updatedAt : a.createdAt;
      final bv = _sort == 'updated' ? b.updatedAt : b.createdAt;
      return bv.compareTo(av);
    });

    if (visible.isEmpty) {
      return Center(
        child: AppEmptyState(
          icon: Icons.folder_outlined,
          title: all.isEmpty ? 'No projects yet' : 'Nothing here',
          subtitle: all.isEmpty
              ? 'Tap + to create a project for client or freelance work.'
              : 'No projects match this filter.',
        ),
      );
    }

    return RefreshIndicator(
      color: AppColors.primary,
      backgroundColor: AppColors.card,
      onRefresh: () async => ref.invalidate(projectsProvider),
      child: ListView.separated(
        padding: const EdgeInsets.fromLTRB(16, 12, 16, 100),
        itemCount: visible.length,
        separatorBuilder: (_, __) => const SizedBox(height: 10),
        itemBuilder: (_, i) => ProjectCard(
          project: visible[i],
          onTap: () => context.push('/projects/${visible[i].id}'),
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final projectsAsync = ref.watch(projectsProvider);

    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        backgroundColor: AppColors.background,
        elevation: 0,
        title: const Text('Work', style: AppTextStyles.headlineSmall),
        actions: [
          PopupMenuButton<String>(
            icon: const Icon(Icons.sort, color: AppColors.foreground),
            initialValue: _sort,
            onSelected: (v) => setState(() => _sort = v),
            itemBuilder: (context) => const [
              PopupMenuItem(value: 'updated', child: Text('Recently updated')),
              PopupMenuItem(value: 'created', child: Text('Newest first')),
            ],
          ),
        ],
        bottom: TabBar(
          controller: _tabs,
          isScrollable: true,
          tabAlignment: TabAlignment.start,
          labelColor: AppColors.primary,
          unselectedLabelColor: AppColors.mutedForeground,
          indicatorColor: AppColors.primary,
          indicatorSize: TabBarIndicatorSize.label,
          labelStyle: AppTextStyles.labelMedium.copyWith(fontWeight: FontWeight.w600),
          unselectedLabelStyle: AppTextStyles.labelMedium,
          tabs: [for (final l in _labels) Tab(text: l)],
        ),
      ),
      floatingActionButton: FloatingActionButton(
        backgroundColor: AppColors.primary,
        foregroundColor: Colors.black,
        onPressed: () => context.push('/quick-add-project'),
        child: const Icon(Icons.add),
      ),
      body: projectsAsync.when(
        loading: () => const Center(
          child: CircularProgressIndicator(color: AppColors.primary, strokeWidth: 2),
        ),
        error: (e, _) => Center(
          child: Text(
            e is AppException ? e.message : 'Failed to load projects',
            style: AppTextStyles.bodyMedium.copyWith(color: AppColors.mutedForeground),
          ),
        ),
        data: (all) => TabBarView(
          controller: _tabs,
          children: [for (final f in _filters) _buildList(all, f)],
        ),
      ),
    );
  }
}
