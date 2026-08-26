// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'recurring_income_provider.dart';

// **************************************************************************
// RiverpodGenerator
// **************************************************************************

// GENERATED CODE - DO NOT MODIFY BY HAND
// ignore_for_file: type=lint, type=warning

@ProviderFor(recurringIncomes)
final recurringIncomesProvider = RecurringIncomesProvider._();

final class RecurringIncomesProvider
    extends
        $FunctionalProvider<
          AsyncValue<List<RecurringIncomeEntity>>,
          List<RecurringIncomeEntity>,
          FutureOr<List<RecurringIncomeEntity>>
        >
    with
        $FutureModifier<List<RecurringIncomeEntity>>,
        $FutureProvider<List<RecurringIncomeEntity>> {
  RecurringIncomesProvider._()
    : super(
        from: null,
        argument: null,
        retry: null,
        name: r'recurringIncomesProvider',
        isAutoDispose: true,
        dependencies: null,
        $allTransitiveDependencies: null,
      );

  @override
  String debugGetCreateSourceHash() => _$recurringIncomesHash();

  @$internal
  @override
  $FutureProviderElement<List<RecurringIncomeEntity>> $createElement(
    $ProviderPointer pointer,
  ) => $FutureProviderElement(pointer);

  @override
  FutureOr<List<RecurringIncomeEntity>> create(Ref ref) {
    return recurringIncomes(ref);
  }
}

String _$recurringIncomesHash() => r'3b93aa9ffacc136bb33f5517a2d7a66a6cb2a989';
