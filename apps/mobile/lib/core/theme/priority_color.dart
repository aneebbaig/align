import 'package:flutter/material.dart';

import 'app_colors.dart';

/// One colour per task priority, shared by every task and kanban view.
Color priorityColor(String priority) => switch (priority) {
      'URGENT' => AppColors.destructive,
      'HIGH' => AppColors.warning,
      'MEDIUM' => AppColors.primary,
      _ => AppColors.mutedForeground,
    };
