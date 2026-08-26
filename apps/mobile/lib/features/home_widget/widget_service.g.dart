// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'widget_service.dart';

// **************************************************************************
// RiverpodGenerator
// **************************************************************************

// GENERATED CODE - DO NOT MODIFY BY HAND
// ignore_for_file: type=lint, type=warning

@ProviderFor(widgetService)
final widgetServiceProvider = WidgetServiceProvider._();

final class WidgetServiceProvider
    extends $FunctionalProvider<WidgetService, WidgetService, WidgetService>
    with $Provider<WidgetService> {
  WidgetServiceProvider._()
    : super(
        from: null,
        argument: null,
        retry: null,
        name: r'widgetServiceProvider',
        isAutoDispose: false,
        dependencies: null,
        $allTransitiveDependencies: null,
      );

  @override
  String debugGetCreateSourceHash() => _$widgetServiceHash();

  @$internal
  @override
  $ProviderElement<WidgetService> $createElement($ProviderPointer pointer) =>
      $ProviderElement(pointer);

  @override
  WidgetService create(Ref ref) {
    return widgetService(ref);
  }

  /// {@macro riverpod.override_with_value}
  Override overrideWithValue(WidgetService value) {
    return $ProviderOverride(
      origin: this,
      providerOverride: $SyncValueProvider<WidgetService>(value),
    );
  }
}

String _$widgetServiceHash() => r'61ab1ec43a4274a84fd54c338004c1e4e4b5066f';
