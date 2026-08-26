package com.anhib.align

import android.app.PendingIntent
import android.appwidget.AppWidgetManager
import android.appwidget.AppWidgetProvider
import android.content.Context
import android.content.Intent
import android.net.Uri
import android.os.Build
import android.util.SizeF
import android.widget.RemoteViews

class QuickExpenseWidgetProvider : AppWidgetProvider() {

    override fun onUpdate(
        context: Context,
        appWidgetManager: AppWidgetManager,
        appWidgetIds: IntArray,
    ) {
        appWidgetIds.forEach { widgetId ->
            try {
                updateWidget(context, appWidgetManager, widgetId)
            } catch (_: Exception) {
                // Swallow — prevents "can't load widget" system error banner
            }
        }
    }

    companion object {
        fun updateWidget(
            context: Context,
            appWidgetManager: AppWidgetManager,
            widgetId: Int,
        ) {
            val views = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
                // Row layout when ≥ 200dp wide, grid 2×2 when narrower
                RemoteViews(
                    mapOf(
                        SizeF(110f, 50f) to buildViews(context, R.layout.quick_expense_widget_grid),
                        SizeF(181f, 50f) to buildViews(context, R.layout.quick_expense_widget),
                    )
                )
            } else {
                buildViews(context, R.layout.quick_expense_widget)
            }
            appWidgetManager.updateAppWidget(widgetId, views)
        }

        private fun buildViews(context: Context, layoutId: Int): RemoteViews {
            val views = RemoteViews(context.packageName, layoutId)
            views.setOnClickPendingIntent(R.id.widget_cat_1, deepLinkIntent(context, "quick-add", 1))
            views.setOnClickPendingIntent(R.id.widget_cat_2, deepLinkIntent(context, "tasks", 2))
            views.setOnClickPendingIntent(R.id.widget_cat_3, deepLinkIntent(context, "loans", 3))
            views.setOnClickPendingIntent(R.id.widget_cat_4, deepLinkIntent(context, "projects", 4))
            return views
        }

        private fun deepLinkIntent(context: Context, path: String, requestCode: Int): PendingIntent {
            val uri = Uri.parse("align://$path")
            val intent = Intent(Intent.ACTION_VIEW, uri).apply {
                setPackage(context.packageName)
                flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP
            }
            return PendingIntent.getActivity(
                context,
                requestCode,
                intent,
                PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE,
            )
        }
    }
}
