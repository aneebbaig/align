// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'planned_expenses_provider.dart';

// **************************************************************************
// RiverpodGenerator
// **************************************************************************

// GENERATED CODE - DO NOT MODIFY BY HAND
// ignore_for_file: type=lint, type=warning

@ProviderFor(plannedExpenses)
final plannedExpensesProvider = PlannedExpensesProvider._();

final class PlannedExpensesProvider
    extends
        $FunctionalProvider<
          AsyncValue<List<PlannedExpenseEntity>>,
          List<PlannedExpenseEntity>,
          FutureOr<List<PlannedExpenseEntity>>
        >
    with
        $FutureModifier<List<PlannedExpenseEntity>>,
        $FutureProvider<List<PlannedExpenseEntity>> {
  PlannedExpensesProvider._()
    : super(
        from: null,
        argument: null,
        retry: null,
        name: r'plannedExpensesProvider',
        isAutoDispose: true,
        dependencies: null,
        $allTransitiveDependencies: null,
      );

  @override
  String debugGetCreateSourceHash() => _$plannedExpensesHash();

  @$internal
  @override
  $FutureProviderElement<List<PlannedExpenseEntity>> $createElement(
    $ProviderPointer pointer,
  ) => $FutureProviderElement(pointer);

  @override
  FutureOr<List<PlannedExpenseEntity>> create(Ref ref) {
    return plannedExpenses(ref);
  }
}

String _$plannedExpensesHash() => r'11dff4684a13674a881a7e2390501cd76460117d';
