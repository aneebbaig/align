/// Amount fields accept simple sums - "35+67", "1000 - 250" - so a bill can be
/// added up in the field. Only + and - between plain numbers; the result must
/// be a positive amount that fits the database (integer paisas).
class AmountParse {
  const AmountParse.ok(int this.paisas, {required this.isExpression}) : error = null;
  const AmountParse.error(String this.error)
      : paisas = null,
        isExpression = false;

  final int? paisas;
  final String? error;

  /// True when the text was a sum rather than a single number.
  final bool isExpression;

  bool get isValid => paisas != null;
}

const int _maxPaisas = 2147483647;
final RegExp _number = RegExp(r'^(\d+\.?\d*|\.\d+)$');

AmountParse parseAmount(String input) {
  final text = input.trim();
  if (text.isEmpty) return const AmountParse.error('Amount is required');
  if (text.startsWith('-')) return const AmountParse.error("Amount can't be negative");
  if (!RegExp(r'^[\d.+\-\s]+$').hasMatch(text)) return const AmountParse.error('Use numbers with + or - only');

  // "35 + 67 - 2" -> ["35", "+", "67", "-", "2"]
  final tokens = text
      .replaceAll(RegExp(r'\s+'), ' ')
      .replaceAllMapped(RegExp(r'\s*([+-])\s*'), (m) => ' ${m[1]} ')
      .trim()
      .split(' ');
  if (tokens.length.isEven) return const AmountParse.error('Finish the sum, e.g. 35+67');

  var total = 0;
  for (var i = 0; i < tokens.length; i++) {
    final t = tokens[i];
    if (i.isOdd) {
      if (t != '+' && t != '-') return const AmountParse.error('Use numbers with + or - only');
      continue;
    }
    if (!_number.hasMatch(t)) {
      return AmountParse.error(tokens.length == 1 ? 'Enter a valid amount' : 'Check the numbers in the sum');
    }
    final decimals = t.contains('.') ? t.split('.')[1].length : 0;
    if (decimals > 2) return const AmountParse.error('Use at most 2 decimal places');
    final part = (double.parse(t) * 100).round();
    if (part > _maxPaisas) return const AmountParse.error('Amount is too large');
    total += (i == 0 || tokens[i - 1] == '+') ? part : -part;
    if (total.abs() > _maxPaisas) return const AmountParse.error('Amount is too large');
  }

  if (total < 0) return const AmountParse.error("Result can't be negative");
  if (total == 0) return const AmountParse.error('Amount must be greater than zero');
  return AmountParse.ok(total, isExpression: tokens.length > 1);
}
