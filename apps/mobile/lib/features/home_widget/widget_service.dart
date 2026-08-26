import 'package:home_widget/home_widget.dart';
import 'package:riverpod_annotation/riverpod_annotation.dart';

import '../../core/extensions/currency_ext.dart';

part 'widget_service.g.dart';

const _qualifiedWidgetName =
    'com.anhib.align.QuickExpenseWidgetProvider';

@Riverpod(keepAlive: true)
WidgetService widgetService(Ref ref) => WidgetService();

class WidgetService {
  Future<void> update({required int todaySpendPaisas}) async {
    await HomeWidget.saveWidgetData<String>(
      'today_spend',
      todaySpendPaisas.formatPKR(),
    );
    await HomeWidget.updateWidget(
      qualifiedAndroidName: _qualifiedWidgetName,
    );
  }
}
