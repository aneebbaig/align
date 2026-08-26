// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'budget_provider.dart';

// **************************************************************************
// RiverpodGenerator
// **************************************************************************

// GENERATED CODE - DO NOT MODIFY BY HAND
// ignore_for_file: type=lint, type=warning

@ProviderFor(budget)
final budgetProvider = BudgetProvider._();

final class BudgetProvider
    extends
        $FunctionalProvider<
          AsyncValue<BudgetData>,
          BudgetData,
          FutureOr<BudgetData>
        >
    with $FutureModifier<BudgetData>, $FutureProvider<BudgetData> {
  BudgetProvider._()
    : super(
        from: null,
        argument: null,
        retry: null,
        name: r'budgetProvider',
        isAutoDispose: true,
        dependencies: null,
        $allTransitiveDependencies: null,
      );

  @override
  String debugGetCreateSourceHash() => _$budgetHash();

  @$internal
  @override
  $FutureProviderElement<BudgetData> $createElement($ProviderPointer pointer) =>
      $FutureProviderElement(pointer);

  @override
  FutureOr<BudgetData> create(Ref ref) {
    return budget(ref);
  }
}

String _$budgetHash() => r'f80373555ec92535b87fb5303049eceae77fa315';
