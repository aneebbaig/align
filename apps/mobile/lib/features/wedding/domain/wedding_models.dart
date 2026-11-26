/// Wedding planner entities, parsed from /api/v1/wedding. All money is paisas.
library;

DateTime? _date(Object? v) => v is String ? DateTime.tryParse(v) : null;
int _int(Object? v) => (v as num?)?.toInt() ?? 0;

class WeddingTotals {
  const WeddingTotals({
    this.count = 0,
    this.estimated = 0,
    this.projected = 0,
    this.actual = 0,
    this.priced = 0,
    this.paid = 0,
    this.outstanding = 0,
  });

  final int count;
  final int estimated;

  /// Actual cost where known, else the estimate: the number to hold against the budget.
  final int projected;
  final int actual;
  final int priced;
  final int paid;
  final int outstanding;

  factory WeddingTotals.fromJson(Map<String, dynamic> j) => WeddingTotals(
        count: _int(j['count']),
        estimated: _int(j['estimated']),
        projected: _int(j['projected']),
        actual: _int(j['actual']),
        priced: _int(j['priced']),
        paid: _int(j['paid']),
        outstanding: _int(j['outstanding']),
      );
}

class WeddingSummary {
  const WeddingSummary({
    required this.id,
    required this.brideName,
    required this.groomName,
    required this.totalBudget,
    required this.status,
    required this.eventCount,
    required this.totals,
    this.weddingDate,
  });

  final String id;
  final String brideName;
  final String groomName;
  final DateTime? weddingDate;
  /// Sum of the wedding's event budgets (computed by the server).
  final int totalBudget;
  final String status; // PLANNING | IN_PROGRESS | DONE
  final int eventCount;
  final WeddingTotals totals;

  String get title => '$brideName & $groomName';
  bool get isDone => status == 'DONE';

  factory WeddingSummary.fromJson(Map<String, dynamic> j) => WeddingSummary(
        id: j['id'] as String,
        brideName: (j['brideName'] as String?) ?? '',
        groomName: (j['groomName'] as String?) ?? '',
        weddingDate: _date(j['weddingDate']),
        totalBudget: _int(j['totalBudget']),
        status: (j['status'] as String?) ?? 'PLANNING',
        eventCount: _int(j['eventCount']),
        totals: WeddingTotals.fromJson((j['totals'] as Map?)?.cast<String, dynamic>() ?? const {}),
      );
}

class WeddingEvent {
  const WeddingEvent({
    required this.id,
    required this.type,
    required this.name,
    required this.budgetAllocated,
    required this.status,
    required this.order,
    this.date,
    this.venue,
    this.guestCount,
    this.notes,
  });

  final String id;
  final String type;
  final String name;
  final DateTime? date;
  final String? venue;
  final int? guestCount;
  final int budgetAllocated;
  final String? notes;
  final String status;
  final int order;

  factory WeddingEvent.fromJson(Map<String, dynamic> j) => WeddingEvent(
        id: j['id'] as String,
        type: (j['type'] as String?) ?? 'OTHER',
        name: (j['name'] as String?) ?? '',
        date: _date(j['date']),
        venue: j['venue'] as String?,
        guestCount: (j['guestCount'] as num?)?.toInt(),
        budgetAllocated: _int(j['budgetAllocated']),
        notes: j['notes'] as String?,
        status: (j['status'] as String?) ?? 'PLANNED',
        order: _int(j['order']),
      );
}

class WeddingQuote {
  const WeddingQuote({
    required this.id,
    required this.vendorName,
    required this.amount,
    required this.isChosen,
    this.phone,
    this.instagram,
    this.notes,
  });

  final String id;
  final String vendorName;
  final String? phone;
  final String? instagram;
  final int amount;
  final String? notes;
  final bool isChosen;

  factory WeddingQuote.fromJson(Map<String, dynamic> j) => WeddingQuote(
        id: j['id'] as String,
        vendorName: (j['vendorName'] as String?) ?? '',
        phone: j['phone'] as String?,
        instagram: j['instagram'] as String?,
        amount: _int(j['amount']),
        notes: j['notes'] as String?,
        isChosen: j['isChosen'] == true,
      );
}

class WeddingExpense {
  const WeddingExpense({
    required this.id,
    required this.name,
    required this.category,
    required this.estimatedAmount,
    required this.paidAmount,
    required this.quotes,
    required this.eventId,
    this.actualAmount,
    this.vendorName,
    this.vendorPhone,
    this.vendorInstagram,
    this.notes,
  });

  final String id;
  final String eventId;
  final String name;
  final String category;
  final int estimatedAmount;
  final int? actualAmount;
  final int paidAmount;
  final String? vendorName;
  final String? vendorPhone;
  final String? vendorInstagram;
  final String? notes;
  final List<WeddingQuote> quotes;

  bool get hasChosenQuote => quotes.any((q) => q.isChosen);

  factory WeddingExpense.fromJson(Map<String, dynamic> j) => WeddingExpense(
        id: j['id'] as String,
        eventId: (j['eventId'] as String?) ?? '',
        name: (j['name'] as String?) ?? '',
        category: (j['category'] as String?) ?? 'MISC',
        estimatedAmount: _int(j['estimatedAmount']),
        actualAmount: (j['actualAmount'] as num?)?.toInt(),
        paidAmount: _int(j['paidAmount']),
        vendorName: j['vendorName'] as String?,
        vendorPhone: j['vendorPhone'] as String?,
        vendorInstagram: j['vendorInstagram'] as String?,
        notes: j['notes'] as String?,
        quotes: [
          for (final q in (j['quotes'] as List? ?? const []))
            WeddingQuote.fromJson((q as Map).cast<String, dynamic>()),
        ],
      );
}

class WeddingPlan {
  const WeddingPlan({
    required this.id,
    required this.brideName,
    required this.groomName,
    required this.status,
    required this.events,
    required this.expenses,
    this.weddingDate,
    this.haqMehr,
    this.haqMehrNote,
    this.notes,
  });

  final String id;
  final String brideName;
  final String groomName;
  final DateTime? weddingDate;
  final int? haqMehr;
  final String? haqMehrNote;
  final String? notes;
  final String status;
  final List<WeddingEvent> events;
  final List<WeddingExpense> expenses;

  String get title => '$brideName & $groomName';

  /// The wedding's budget is what its events add up to - there is no separate total.
  int get budget => events.fold(0, (s, e) => s + e.budgetAllocated);

  factory WeddingPlan.fromJson(Map<String, dynamic> j) => WeddingPlan(
        id: j['id'] as String,
        brideName: (j['brideName'] as String?) ?? '',
        groomName: (j['groomName'] as String?) ?? '',
        weddingDate: _date(j['weddingDate']),
        haqMehr: (j['haqMehr'] as num?)?.toInt(),
        haqMehrNote: j['haqMehrNote'] as String?,
        notes: j['notes'] as String?,
        status: (j['status'] as String?) ?? 'PLANNING',
        events: [
          for (final e in (j['events'] as List? ?? const []))
            WeddingEvent.fromJson((e as Map).cast<String, dynamic>()),
        ],
        expenses: [
          for (final e in (j['expenses'] as List? ?? const []))
            WeddingExpense.fromJson((e as Map).cast<String, dynamic>()),
        ],
      );
}

/// What pay-in-full replaced, so the swipe can be undone.
class PreviousPayment {
  const PreviousPayment({required this.actualAmount, required this.paidAmount});
  final int? actualAmount;
  final int paidAmount;

  factory PreviousPayment.fromJson(Map<String, dynamic> j) => PreviousPayment(
        actualAmount: (j['previousActualAmount'] as num?)?.toInt(),
        paidAmount: _int(j['previousPaidAmount']),
      );
}
