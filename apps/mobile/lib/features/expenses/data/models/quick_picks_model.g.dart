// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'quick_picks_model.dart';

// **************************************************************************
// JsonSerializableGenerator
// **************************************************************************

_QuickRepeat _$QuickRepeatFromJson(Map<String, dynamic> json) => _QuickRepeat(
  description: json['description'] as String,
  categoryId: json['categoryId'] as String,
  categoryName: json['categoryName'] as String,
  categoryColor: json['categoryColor'] as String?,
  lastAmountPaisas: (json['lastAmountPaisas'] as num).toInt(),
  fundingSource: json['fundingSource'] as String?,
  fundingPotId: json['fundingPotId'] as String?,
  fundingCurrencyId: json['fundingCurrencyId'] as String?,
);

Map<String, dynamic> _$QuickRepeatToJson(_QuickRepeat instance) =>
    <String, dynamic>{
      'description': instance.description,
      'categoryId': instance.categoryId,
      'categoryName': instance.categoryName,
      'categoryColor': instance.categoryColor,
      'lastAmountPaisas': instance.lastAmountPaisas,
      'fundingSource': instance.fundingSource,
      'fundingPotId': instance.fundingPotId,
      'fundingCurrencyId': instance.fundingCurrencyId,
    };

_QuickDescription _$QuickDescriptionFromJson(Map<String, dynamic> json) =>
    _QuickDescription(
      description: json['description'] as String,
      categoryId: json['categoryId'] as String?,
    );

Map<String, dynamic> _$QuickDescriptionToJson(_QuickDescription instance) =>
    <String, dynamic>{
      'description': instance.description,
      'categoryId': instance.categoryId,
    };

_QuickPicks _$QuickPicksFromJson(Map<String, dynamic> json) => _QuickPicks(
  repeats:
      (json['repeats'] as List<dynamic>?)
          ?.map((e) => QuickRepeat.fromJson(e as Map<String, dynamic>))
          .toList() ??
      const <QuickRepeat>[],
  topCategoryIds:
      (json['topCategoryIds'] as List<dynamic>?)
          ?.map((e) => e as String)
          .toList() ??
      const <String>[],
  descriptions:
      (json['descriptions'] as List<dynamic>?)
          ?.map((e) => QuickDescription.fromJson(e as Map<String, dynamic>))
          .toList() ??
      const <QuickDescription>[],
);

Map<String, dynamic> _$QuickPicksToJson(_QuickPicks instance) =>
    <String, dynamic>{
      'repeats': instance.repeats,
      'topCategoryIds': instance.topCategoryIds,
      'descriptions': instance.descriptions,
    };
