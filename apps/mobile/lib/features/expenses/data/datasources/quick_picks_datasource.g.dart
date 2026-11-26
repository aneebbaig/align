// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'quick_picks_datasource.dart';

// **************************************************************************
// RiverpodGenerator
// **************************************************************************

// GENERATED CODE - DO NOT MODIFY BY HAND
// ignore_for_file: type=lint, type=warning

@ProviderFor(quickPicksDatasource)
final quickPicksDatasourceProvider = QuickPicksDatasourceProvider._();

final class QuickPicksDatasourceProvider
    extends
        $FunctionalProvider<
          QuickPicksDatasource,
          QuickPicksDatasource,
          QuickPicksDatasource
        >
    with $Provider<QuickPicksDatasource> {
  QuickPicksDatasourceProvider._()
    : super(
        from: null,
        argument: null,
        retry: null,
        name: r'quickPicksDatasourceProvider',
        isAutoDispose: true,
        dependencies: null,
        $allTransitiveDependencies: null,
      );

  @override
  String debugGetCreateSourceHash() => _$quickPicksDatasourceHash();

  @$internal
  @override
  $ProviderElement<QuickPicksDatasource> $createElement(
    $ProviderPointer pointer,
  ) => $ProviderElement(pointer);

  @override
  QuickPicksDatasource create(Ref ref) {
    return quickPicksDatasource(ref);
  }

  /// {@macro riverpod.override_with_value}
  Override overrideWithValue(QuickPicksDatasource value) {
    return $ProviderOverride(
      origin: this,
      providerOverride: $SyncValueProvider<QuickPicksDatasource>(value),
    );
  }
}

String _$quickPicksDatasourceHash() =>
    r'2343f2e558652718e3dc8795c65ad42fd6e4d95e';
