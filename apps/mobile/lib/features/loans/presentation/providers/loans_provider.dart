import 'package:riverpod_annotation/riverpod_annotation.dart';

import '../../data/datasources/loans_datasource.dart';
import '../../domain/entities/loan_entity.dart';

part 'loans_provider.g.dart';

@riverpod
Future<List<LoanEntity>> loans(Ref ref) =>
    ref.watch(loansDatasourceProvider).getLoans();

@riverpod
class CreateLoan extends _$CreateLoan {
  @override
  AsyncValue<void> build() => const AsyncData(null);

  Future<void> submit({
    required String personName,
    required String type,
    required int principalPaisas,
    required DateTime date,
    String? description,
    DateTime? dueDate,
    String? notes,
  }) async {
    state = const AsyncLoading();
    try {
      await ref.read(loansDatasourceProvider).createLoan(
            personName: personName,
            type: type,
            principalPaisas: principalPaisas,
            date: date,
            description: description,
            dueDate: dueDate,
            notes: notes,
          );
      ref.invalidate(loansProvider);
      state = const AsyncData(null);
    } catch (e, st) {
      state = AsyncError(e, st);
      rethrow;
    }
  }
}

@riverpod
class RecordPayment extends _$RecordPayment {
  @override
  AsyncValue<void> build() => const AsyncData(null);

  Future<void> submit({
    required String loanId,
    required int amountPaisas,
    required DateTime date,
    String? notes,
  }) async {
    state = const AsyncLoading();
    try {
      await ref.read(loansDatasourceProvider).recordPayment(
            loanId: loanId,
            amountPaisas: amountPaisas,
            date: date,
            notes: notes,
          );
      ref.invalidate(loansProvider);
      state = const AsyncData(null);
    } catch (e, st) {
      state = AsyncError(e, st);
      rethrow;
    }
  }
}
