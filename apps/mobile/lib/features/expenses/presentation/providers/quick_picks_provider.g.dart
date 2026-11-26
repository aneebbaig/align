// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'quick_picks_provider.dart';

// **************************************************************************
// RiverpodGenerator
// **************************************************************************

// GENERATED CODE - DO NOT MODIFY BY HAND
// ignore_for_file: type=lint, type=warning
/// Quick picks for the add form. Any failure (including a 404 from an older
/// server) yields empty picks, so the form just hides the suggestions.

@ProviderFor(quickPicks)
final quickPicksProvider = QuickPicksFamily._();

/// Quick picks for the add form. Any failure (including a 404 from an older
/// server) yields empty picks, so the form just hides the suggestions.

final class QuickPicksProvider
    extends
        $FunctionalProvider<
          AsyncValue<QuickPicks>,
          QuickPicks,
          FutureOr<QuickPicks>
        >
    with $FutureModifier<QuickPicks>, $FutureProvider<QuickPicks> {
  /// Quick picks for the add form. Any failure (including a 404 from an older
  /// server) yields empty picks, so the form just hides the suggestions.
  QuickPicksProvider._({
    required QuickPicksFamily super.from,
    required String super.argument,
  }) : super(
         retry: null,
         name: r'quickPicksProvider',
         isAutoDispose: true,
         dependencies: null,
         $allTransitiveDependencies: null,
       );

  @override
  String debugGetCreateSourceHash() => _$quickPicksHash();

  @override
  String toString() {
    return r'quickPicksProvider'
        ''
        '($argument)';
  }

  @$internal
  @override
  $FutureProviderElement<QuickPicks> $createElement($ProviderPointer pointer) =>
      $FutureProviderElement(pointer);

  @override
  FutureOr<QuickPicks> create(Ref ref) {
    final argument = this.argument as String;
    return quickPicks(ref, argument);
  }

  @override
  bool operator ==(Object other) {
    return other is QuickPicksProvider && other.argument == argument;
  }

  @override
  int get hashCode {
    return argument.hashCode;
  }
}

String _$quickPicksHash() => r'91e4e36f3bef6c13f43f3e290af6c4b2fef3c7e6';

/// Quick picks for the add form. Any failure (including a 404 from an older
/// server) yields empty picks, so the form just hides the suggestions.

final class QuickPicksFamily extends $Family
    with $FunctionalFamilyOverride<FutureOr<QuickPicks>, String> {
  QuickPicksFamily._()
    : super(
        retry: null,
        name: r'quickPicksProvider',
        dependencies: null,
        $allTransitiveDependencies: null,
        isAutoDispose: true,
      );

  /// Quick picks for the add form. Any failure (including a 404 from an older
  /// server) yields empty picks, so the form just hides the suggestions.

  QuickPicksProvider call(String type) =>
      QuickPicksProvider._(argument: type, from: this);

  @override
  String toString() => r'quickPicksProvider';
}
