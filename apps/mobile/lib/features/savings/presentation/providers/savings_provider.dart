import 'package:riverpod_annotation/riverpod_annotation.dart';

import '../../data/datasources/savings_datasource.dart';
import '../../domain/entities/savings_pot_entity.dart';

part 'savings_provider.g.dart';

class SavingsState {
  const SavingsState({required this.pots, required this.totalPaisas});
  final List<SavingsPotEntity> pots;
  final int totalPaisas;
}

@riverpod
Future<SavingsState> savings(Ref ref) async {
  final result = await ref.watch(savingsDatasourceProvider).getSavings();
  return SavingsState(pots: result.pots, totalPaisas: result.totalPaisas);
}
