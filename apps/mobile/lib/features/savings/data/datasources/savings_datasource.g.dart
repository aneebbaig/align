// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'savings_datasource.dart';

// **************************************************************************
// RiverpodGenerator
// **************************************************************************

// GENERATED CODE - DO NOT MODIFY BY HAND
// ignore_for_file: type=lint, type=warning

@ProviderFor(savingsDatasource)
final savingsDatasourceProvider = SavingsDatasourceProvider._();

final class SavingsDatasourceProvider
    extends
        $FunctionalProvider<
          SavingsDatasource,
          SavingsDatasource,
          SavingsDatasource
        >
    with $Provider<SavingsDatasource> {
  SavingsDatasourceProvider._()
    : super(
        from: null,
        argument: null,
        retry: null,
        name: r'savingsDatasourceProvider',
        isAutoDispose: true,
        dependencies: null,
        $allTransitiveDependencies: null,
      );

  @override
  String debugGetCreateSourceHash() => _$savingsDatasourceHash();

  @$internal
  @override
  $ProviderElement<SavingsDatasource> $createElement(
    $ProviderPointer pointer,
  ) => $ProviderElement(pointer);

  @override
  SavingsDatasource create(Ref ref) {
    return savingsDatasource(ref);
  }

  /// {@macro riverpod.override_with_value}
  Override overrideWithValue(SavingsDatasource value) {
    return $ProviderOverride(
      origin: this,
      providerOverride: $SyncValueProvider<SavingsDatasource>(value),
    );
  }
}

String _$savingsDatasourceHash() => r'065fa099add8fb4cf7955933f39e6ddd53375384';
