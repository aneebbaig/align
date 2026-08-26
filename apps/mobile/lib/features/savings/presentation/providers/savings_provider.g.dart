// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'savings_provider.dart';

// **************************************************************************
// RiverpodGenerator
// **************************************************************************

// GENERATED CODE - DO NOT MODIFY BY HAND
// ignore_for_file: type=lint, type=warning

@ProviderFor(savings)
final savingsProvider = SavingsProvider._();

final class SavingsProvider
    extends
        $FunctionalProvider<
          AsyncValue<SavingsState>,
          SavingsState,
          FutureOr<SavingsState>
        >
    with $FutureModifier<SavingsState>, $FutureProvider<SavingsState> {
  SavingsProvider._()
    : super(
        from: null,
        argument: null,
        retry: null,
        name: r'savingsProvider',
        isAutoDispose: true,
        dependencies: null,
        $allTransitiveDependencies: null,
      );

  @override
  String debugGetCreateSourceHash() => _$savingsHash();

  @$internal
  @override
  $FutureProviderElement<SavingsState> $createElement(
    $ProviderPointer pointer,
  ) => $FutureProviderElement(pointer);

  @override
  FutureOr<SavingsState> create(Ref ref) {
    return savings(ref);
  }
}

String _$savingsHash() => r'd31b3950c2d16e1683ef549c0c520bd039146e89';
