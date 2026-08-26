/// Income-available + savings-pot balances for a specific budget period.
/// Mirrors the web app's `getExpenseFundingContext(month, year)` shape so the
/// "pay from" preview never goes stale when a transaction targets a period
/// other than the user's current open one.
class FundingContextPot {
  const FundingContextPot({required this.id, required this.name, required this.type, required this.basePaisas});
  final String id;
  final String name;
  final String type;
  final int basePaisas;
}

class FundingContextEntity {
  const FundingContextEntity({required this.monthlyIncomeAvailablePaisas, required this.pots});
  final int monthlyIncomeAvailablePaisas;
  final List<FundingContextPot> pots;
}
