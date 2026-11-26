import 'wedding_models.dart';

// Wedding planner maths and list filtering. Mirrors apps/web/src/lib/wedding/*.
// Cost and payment are separate: an expense is worth its actual cost where
// known, else its estimate; paidAmount is what has been handed over so far.

enum PaymentStatus { unpaid, partPaid, paid }

int costOf(WeddingExpense e) => e.actualAmount ?? e.estimatedAmount;

PaymentStatus paymentStatus(WeddingExpense e) {
  if (e.paidAmount <= 0) return PaymentStatus.unpaid;
  final cost = costOf(e);
  return cost > 0 && e.paidAmount >= cost ? PaymentStatus.paid : PaymentStatus.partPaid;
}

int balanceOf(WeddingExpense e) {
  final b = costOf(e) - e.paidAmount;
  return b < 0 ? 0 : b;
}

WeddingTotals sumTotals(Iterable<WeddingExpense> rows) {
  var count = 0, estimated = 0, projected = 0, actual = 0, priced = 0, paid = 0, outstanding = 0;
  for (final e in rows) {
    count++;
    estimated += e.estimatedAmount;
    projected += costOf(e);
    paid += e.paidAmount;
    outstanding += balanceOf(e);
    if (e.actualAmount != null) {
      actual += e.actualAmount!;
      priced++;
    }
  }
  return WeddingTotals(
    count: count,
    estimated: estimated,
    projected: projected,
    actual: actual,
    priced: priced,
    paid: paid,
    outstanding: outstanding,
  );
}

// ── budget ──────────────────────────────────────────────────────────────────

enum BudgetState { none, ok, close, over }

const closeAt = 0.85;

class BudgetStatus {
  const BudgetStatus(this.state, this.pct, this.left, this.overBy);
  final BudgetState state;
  final double pct;
  final int left;
  final int overBy;
}

BudgetStatus budgetStatus(int projected, int budget) {
  if (budget <= 0) return const BudgetStatus(BudgetState.none, 0, 0, 0);
  final pct = projected / budget;
  final state = projected > budget ? BudgetState.over : (pct >= closeAt ? BudgetState.close : BudgetState.ok);
  return BudgetStatus(state, pct, projected >= budget ? 0 : budget - projected, projected > budget ? projected - budget : 0);
}

// ── filters ─────────────────────────────────────────────────────────────────

enum StatusFilter { all, toPay, partPaid, paid, needsPrice, quotes }

const statusFilterLabels = {
  StatusFilter.all: 'All',
  StatusFilter.toPay: 'To pay',
  StatusFilter.partPaid: 'Part paid',
  StatusFilter.paid: 'Paid',
  StatusFilter.needsPrice: 'Needs price',
  StatusFilter.quotes: 'Quotes to choose',
};

bool matchesStatus(WeddingExpense e, StatusFilter f) {
  switch (f) {
    case StatusFilter.all:
      return true;
    case StatusFilter.toPay:
      return paymentStatus(e) != PaymentStatus.paid;
    case StatusFilter.partPaid:
      return paymentStatus(e) == PaymentStatus.partPaid;
    case StatusFilter.paid:
      return paymentStatus(e) == PaymentStatus.paid;
    case StatusFilter.needsPrice:
      return e.actualAmount == null;
    case StatusFilter.quotes:
      return e.quotes.length >= 2 && !e.hasChosenQuote;
  }
}

/// Case-insensitive match on name, vendor (including quoting vendors) and notes.
bool matchesSearch(WeddingExpense e, String query) {
  final q = query.trim().toLowerCase();
  if (q.isEmpty) return true;
  final fields = [e.name, e.vendorName, e.notes, ...e.quotes.map((x) => x.vendorName)];
  return fields.any((v) => v != null && v.toLowerCase().contains(q));
}

Map<StatusFilter, int> statusCounts(List<WeddingExpense> rows) => {
      for (final f in StatusFilter.values) f: rows.where((r) => matchesStatus(r, f)).length,
    };

List<WeddingExpense> applyFilters(List<WeddingExpense> rows, StatusFilter f, String query) =>
    rows.where((e) => matchesStatus(e, f) && matchesSearch(e, query)).toList();

// ── labels ──────────────────────────────────────────────────────────────────

const expenseCategories = <String, String>{
  'VENUE': 'Venue',
  'CATERING': 'Catering',
  'DECOR': 'Decor & Props',
  'FLOWERS': 'Flowers',
  'PHOTOGRAPHY': 'Photography',
  'VIDEOGRAPHY': 'Videography',
  'DRESS': 'Dresses & Clothes',
  'JEWELRY': 'Jewelry',
  'MAKEUP': 'Makeup artist',
  'BEAUTY': 'Beauty & Grooming',
  'MEHNDI_ARTIST': 'Mehndi artist',
  'MUSIC_DJ': 'Music & DJ',
  'ENTERTAINMENT': 'Entertainment',
  'TRANSPORT': 'Transport',
  'FOOD': 'Food & Refreshments',
  'PRINTING': 'Printing & Cards',
  'GIFTS': 'Gifts & Favours',
  'FIREWORKS': 'Fireworks',
  'HONEYMOON': 'Honeymoon',
  'MISC': 'Miscellaneous',
};

String categoryLabel(String value) => expenseCategories[value] ?? value;

/// Event types in ceremony order: value, label.
const eventTypes = <(String, String)>[
  ('DHOLKI', 'Dholki'),
  ('MAYUN', 'Mayun'),
  ('MEHNDI', 'Mehndi'),
  ('NIKKAH', 'Nikkah'),
  ('BARAT', 'Barat'),
  ('RUKHSATI', 'Rukhsati'),
  ('VALIMA', 'Valima'),
  ('OTHER', 'Other'),
];

String eventName(List<WeddingEvent> events, String eventId) {
  for (final e in events) {
    if (e.id == eventId) return e.name;
  }
  return 'Event';
}

List<WeddingEvent> orderEvents(List<WeddingEvent> events) => [...events]
  ..sort((a, b) {
    final c = a.order.compareTo(b.order);
    if (c != 0) return c;
    return (a.date?.millisecondsSinceEpoch ?? 0).compareTo(b.date?.millisecondsSinceEpoch ?? 0);
  });

// ── grouping ────────────────────────────────────────────────────────────────

enum GroupBy { none, event, category }

class ExpenseGroup {
  const ExpenseGroup(this.key, this.label, this.rows);
  final String key;
  final String label;
  final List<WeddingExpense> rows;
}

/// Splits rows into labelled groups, keeping first-seen row order inside each.
/// Event groups follow event order; category groups sort
/// by planned cost, biggest first.
List<ExpenseGroup> groupExpenses(List<WeddingExpense> rows, GroupBy by, List<WeddingEvent> events) {
  if (by == GroupBy.none) return [ExpenseGroup('all', '', rows)];
  final buckets = <String, List<WeddingExpense>>{};
  for (final e in rows) {
    final k = by == GroupBy.event ? e.eventId : e.category;
    buckets.putIfAbsent(k, () => []).add(e);
  }
  if (by == GroupBy.event) {
    return [
      for (final ev in orderEvents(events))
        if (buckets.containsKey(ev.id)) ExpenseGroup(ev.id, ev.name, buckets[ev.id]!),
    ];
  }
  final out = [for (final en in buckets.entries) ExpenseGroup(en.key, categoryLabel(en.key), en.value)];
  out.sort((a, b) => sumTotals(b.rows).projected.compareTo(sumTotals(a.rows).projected));
  return out;
}

// ── needs attention ─────────────────────────────────────────────────────────

enum AttentionKind { over, quote, price, unpaidSoon }

class Attention {
  const Attention(this.kind, this.text, {this.eventId, this.expenseId});
  final AttentionKind kind;
  final String text;

  /// Event to open, when the item is about an event.
  final String? eventId;
  final String? expenseId;
}

int _daysBetween(DateTime from, DateTime to) =>
    DateTime(to.year, to.month, to.day).difference(DateTime(from.year, from.month, from.day)).inDays;

/// Things worth a look: events over budget, quotes still to choose, events
/// coming up with bills unpaid, and (in the last 60 days) expenses with no real price.
List<Attention> attentionItems(
  WeddingPlan plan,
  DateTime now, {
  required String Function(int paisas) money,
}) {
  final out = <Attention>[];
  final events = orderEvents(plan.events);
  for (final ev in events) {
    final rows = plan.expenses.where((e) => e.eventId == ev.id);
    final st = budgetStatus(sumTotals(rows).projected, ev.budgetAllocated);
    if (st.state == BudgetState.over) {
      out.add(Attention(AttentionKind.over, '${ev.name} is ${money(st.overBy)} over budget', eventId: ev.id));
    }
  }
  for (final e in plan.expenses) {
    if (e.quotes.length >= 2 && !e.hasChosenQuote) {
      out.add(Attention(AttentionKind.quote, 'Choose a quote for ${e.name}', expenseId: e.id));
    }
  }
  for (final ev in events) {
    final d = ev.date;
    if (d == null) continue;
    final days = _daysBetween(now, d);
    if (days < 0 || days > 14) continue;
    final unpaid = plan.expenses.where((e) => e.eventId == ev.id && paymentStatus(e) != PaymentStatus.paid).length;
    if (unpaid == 0) continue;
    final when = days == 0 ? 'today' : (days == 1 ? 'tomorrow' : 'in $days days');
    out.add(Attention(
      AttentionKind.unpaidSoon,
      '${ev.name} is $when - $unpaid unpaid',
      eventId: ev.id,
    ));
  }
  final wd = plan.weddingDate;
  if (wd != null) {
    final days = _daysBetween(now, wd);
    if (days >= 0 && days <= 60) {
      for (final e in plan.expenses) {
        if (e.actualAmount == null) {
          out.add(Attention(AttentionKind.price, '${e.name} still has no real price', expenseId: e.id));
        }
      }
    }
  }
  return out;
}

// ── entry / quick add ───────────────────────────────────────────────────────

/// The one wedding to open directly: exactly one that is not DONE, else null.
WeddingSummary? soleActiveWedding(List<WeddingSummary> all) {
  final active = all.where((w) => !w.isDone).toList();
  return active.length == 1 ? active.first : null;
}

/// Event id quick add lands in: the remembered one if it still exists, else the first
/// event, else null (the wedding has no events yet, so nothing can be added).
String? resolveRememberedEvent(String? saved, List<WeddingEvent> events) {
  if (saved != null && events.any((e) => e.id == saved)) return saved;
  final ordered = orderEvents(events);
  return ordered.isEmpty ? null : ordered.first.id;
}

// ── formatting ──────────────────────────────────────────────────────────────

/// "PKR 1.2M", "PKR 345k", "PKR 8,500" - for tight spots.
String formatShort(int paisas, {String symbol = 'PKR'}) {
  final v = paisas.abs() / 100;
  final sign = paisas < 0 ? '-' : '';
  String grouped(double n) => n.round().toString().replaceAllMapped(RegExp(r'\B(?=(\d{3})+(?!\d))'), (_) => ',');
  if (v >= 1000000) return '$sign$symbol ${(v / 1000000).toStringAsFixed(1).replaceFirst(RegExp(r'\.0$'), '')}M';
  if (v >= 10000) return '$sign$symbol ${(v / 1000).round()}k';
  return '$sign$symbol ${grouped(v)}';
}
