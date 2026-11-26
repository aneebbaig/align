import 'package:freezed_annotation/freezed_annotation.dart';

part 'quick_picks_model.freezed.dart';
part 'quick_picks_model.g.dart';

/// A recently repeated entry: tapping it fills the form.
@freezed
abstract class QuickRepeat with _$QuickRepeat {
  const factory QuickRepeat({
    required String description,
    required String categoryId,
    required String categoryName,
    String? categoryColor,
    required int lastAmountPaisas,
    String? fundingSource, // INCOME | SAVINGS_POT | null
    String? fundingPotId,
    String? fundingCurrencyId,
  }) = _QuickRepeat;

  factory QuickRepeat.fromJson(Map<String, dynamic> json) => _$QuickRepeatFromJson(json);
}

@freezed
abstract class QuickDescription with _$QuickDescription {
  const factory QuickDescription({
    required String description,
    String? categoryId,
  }) = _QuickDescription;

  factory QuickDescription.fromJson(Map<String, dynamic> json) => _$QuickDescriptionFromJson(json);
}

@freezed
abstract class QuickPicks with _$QuickPicks {
  const factory QuickPicks({
    @Default(<QuickRepeat>[]) List<QuickRepeat> repeats,
    @Default(<String>[]) List<String> topCategoryIds,
    @Default(<QuickDescription>[]) List<QuickDescription> descriptions,
  }) = _QuickPicks;

  factory QuickPicks.fromJson(Map<String, dynamic> json) => _$QuickPicksFromJson(json);
}
