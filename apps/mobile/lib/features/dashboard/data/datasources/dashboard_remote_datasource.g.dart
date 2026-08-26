// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'dashboard_remote_datasource.dart';

// **************************************************************************
// RiverpodGenerator
// **************************************************************************

// GENERATED CODE - DO NOT MODIFY BY HAND
// ignore_for_file: type=lint, type=warning

@ProviderFor(dashboardRemoteDatasource)
final dashboardRemoteDatasourceProvider = DashboardRemoteDatasourceProvider._();

final class DashboardRemoteDatasourceProvider
    extends
        $FunctionalProvider<
          DashboardRemoteDatasource,
          DashboardRemoteDatasource,
          DashboardRemoteDatasource
        >
    with $Provider<DashboardRemoteDatasource> {
  DashboardRemoteDatasourceProvider._()
    : super(
        from: null,
        argument: null,
        retry: null,
        name: r'dashboardRemoteDatasourceProvider',
        isAutoDispose: true,
        dependencies: null,
        $allTransitiveDependencies: null,
      );

  @override
  String debugGetCreateSourceHash() => _$dashboardRemoteDatasourceHash();

  @$internal
  @override
  $ProviderElement<DashboardRemoteDatasource> $createElement(
    $ProviderPointer pointer,
  ) => $ProviderElement(pointer);

  @override
  DashboardRemoteDatasource create(Ref ref) {
    return dashboardRemoteDatasource(ref);
  }

  /// {@macro riverpod.override_with_value}
  Override overrideWithValue(DashboardRemoteDatasource value) {
    return $ProviderOverride(
      origin: this,
      providerOverride: $SyncValueProvider<DashboardRemoteDatasource>(value),
    );
  }
}

String _$dashboardRemoteDatasourceHash() =>
    r'2ce2f1a07a93ce1a4435855aee6713c36c3a3b1f';
