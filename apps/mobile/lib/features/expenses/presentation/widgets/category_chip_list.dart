import 'package:flutter/material.dart';

import '../../../../../core/extensions/lucide_ext.dart';
import '../../../../../core/theme/app_colors.dart';
import '../../../../../core/theme/app_text_styles.dart';
import '../../../../../core/widgets/app_card.dart';
import '../../domain/entities/category_entity.dart';

class CategoryChipList extends StatelessWidget {
  const CategoryChipList({
    required this.categories,
    required this.recentIds,
    required this.selectedId,
    required this.onSelected,
    super.key,
  });

  final List<CategoryEntity> categories;
  final List<String> recentIds;
  final String? selectedId;
  final void Function(CategoryEntity) onSelected;

  List<CategoryEntity> get _sorted {
    final recentSet = recentIds.toSet();
    final recent = recentIds
        .map((id) => categories.firstWhere(
              (c) => c.id == id,
              orElse: () => categories.first,
            ))
        .where((c) => recentSet.contains(c.id))
        .toList();
    final rest = categories.where((c) => !recentSet.contains(c.id)).toList();
    return [...recent, ...rest];
  }

  @override
  Widget build(BuildContext context) => Wrap(
        spacing: 8,
        runSpacing: 8,
        children: _sorted.map((cat) {
          final selected = cat.id == selectedId;
          return _CategoryChip(
            category: cat,
            selected: selected,
            onTap: () => onSelected(cat),
          );
        }).toList(),
      );
}

class _CategoryChip extends StatelessWidget {
  const _CategoryChip({
    required this.category,
    required this.selected,
    required this.onTap,
  });
  final CategoryEntity category;
  final bool selected;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) => GestureDetector(
        onTap: onTap,
        child: AppCard(
          padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
          color: selected ? AppColors.primary.withValues(alpha: 0.15) : null,
          borderColor: selected ? AppColors.primary : null,
          radius: 24,
          child: Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              Icon(
                category.icon.lucideIcon,
                size: 15,
                color: selected ? AppColors.primary : AppColors.foreground,
              ),
              const SizedBox(width: 6),
              Text(
                category.name,
                style: AppTextStyles.labelMedium.copyWith(
                  color: selected ? AppColors.primary : AppColors.foreground,
                  fontWeight: selected ? FontWeight.w600 : FontWeight.w400,
                ),
              ),
            ],
          ),
        ),
      );
}
