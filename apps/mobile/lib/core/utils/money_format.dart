/// Plain number for an amount field: no decimals when whole ("1500"), else 2.
String paisasToFieldText(int paisas) {
  final v = paisas / 100;
  return v == v.roundToDouble() ? v.toStringAsFixed(0) : v.toStringAsFixed(2);
}
