// GENERATED CODE - DO NOT MODIFY BY HAND
// coverage:ignore-file
// ignore_for_file: type=lint
// ignore_for_file: unused_element, deprecated_member_use, deprecated_member_use_from_same_package, use_function_type_syntax_for_parameters, unnecessary_const, avoid_init_to_null, invalid_override_different_default_values_named, prefer_expression_function_bodies, annotate_overrides, invalid_annotation_target, unnecessary_question_mark

part of 'quick_picks_model.dart';

// **************************************************************************
// FreezedGenerator
// **************************************************************************

// dart format off
T _$identity<T>(T value) => value;

/// @nodoc
mixin _$QuickRepeat {

 String get description; String get categoryId; String get categoryName; String? get categoryColor; int get lastAmountPaisas; String? get fundingSource;// INCOME | SAVINGS_POT | null
 String? get fundingPotId; String? get fundingCurrencyId;
/// Create a copy of QuickRepeat
/// with the given fields replaced by the non-null parameter values.
@JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
$QuickRepeatCopyWith<QuickRepeat> get copyWith => _$QuickRepeatCopyWithImpl<QuickRepeat>(this as QuickRepeat, _$identity);

  /// Serializes this QuickRepeat to a JSON map.
  Map<String, dynamic> toJson();


@override
bool operator ==(Object other) {
  return identical(this, other) || (other.runtimeType == runtimeType&&other is QuickRepeat&&(identical(other.description, description) || other.description == description)&&(identical(other.categoryId, categoryId) || other.categoryId == categoryId)&&(identical(other.categoryName, categoryName) || other.categoryName == categoryName)&&(identical(other.categoryColor, categoryColor) || other.categoryColor == categoryColor)&&(identical(other.lastAmountPaisas, lastAmountPaisas) || other.lastAmountPaisas == lastAmountPaisas)&&(identical(other.fundingSource, fundingSource) || other.fundingSource == fundingSource)&&(identical(other.fundingPotId, fundingPotId) || other.fundingPotId == fundingPotId)&&(identical(other.fundingCurrencyId, fundingCurrencyId) || other.fundingCurrencyId == fundingCurrencyId));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode => Object.hash(runtimeType,description,categoryId,categoryName,categoryColor,lastAmountPaisas,fundingSource,fundingPotId,fundingCurrencyId);

@override
String toString() {
  return 'QuickRepeat(description: $description, categoryId: $categoryId, categoryName: $categoryName, categoryColor: $categoryColor, lastAmountPaisas: $lastAmountPaisas, fundingSource: $fundingSource, fundingPotId: $fundingPotId, fundingCurrencyId: $fundingCurrencyId)';
}


}

/// @nodoc
abstract mixin class $QuickRepeatCopyWith<$Res>  {
  factory $QuickRepeatCopyWith(QuickRepeat value, $Res Function(QuickRepeat) _then) = _$QuickRepeatCopyWithImpl;
@useResult
$Res call({
 String description, String categoryId, String categoryName, String? categoryColor, int lastAmountPaisas, String? fundingSource, String? fundingPotId, String? fundingCurrencyId
});




}
/// @nodoc
class _$QuickRepeatCopyWithImpl<$Res>
    implements $QuickRepeatCopyWith<$Res> {
  _$QuickRepeatCopyWithImpl(this._self, this._then);

  final QuickRepeat _self;
  final $Res Function(QuickRepeat) _then;

/// Create a copy of QuickRepeat
/// with the given fields replaced by the non-null parameter values.
@pragma('vm:prefer-inline') @override $Res call({Object? description = null,Object? categoryId = null,Object? categoryName = null,Object? categoryColor = freezed,Object? lastAmountPaisas = null,Object? fundingSource = freezed,Object? fundingPotId = freezed,Object? fundingCurrencyId = freezed,}) {
  return _then(_self.copyWith(
description: null == description ? _self.description : description // ignore: cast_nullable_to_non_nullable
as String,categoryId: null == categoryId ? _self.categoryId : categoryId // ignore: cast_nullable_to_non_nullable
as String,categoryName: null == categoryName ? _self.categoryName : categoryName // ignore: cast_nullable_to_non_nullable
as String,categoryColor: freezed == categoryColor ? _self.categoryColor : categoryColor // ignore: cast_nullable_to_non_nullable
as String?,lastAmountPaisas: null == lastAmountPaisas ? _self.lastAmountPaisas : lastAmountPaisas // ignore: cast_nullable_to_non_nullable
as int,fundingSource: freezed == fundingSource ? _self.fundingSource : fundingSource // ignore: cast_nullable_to_non_nullable
as String?,fundingPotId: freezed == fundingPotId ? _self.fundingPotId : fundingPotId // ignore: cast_nullable_to_non_nullable
as String?,fundingCurrencyId: freezed == fundingCurrencyId ? _self.fundingCurrencyId : fundingCurrencyId // ignore: cast_nullable_to_non_nullable
as String?,
  ));
}

}


/// Adds pattern-matching-related methods to [QuickRepeat].
extension QuickRepeatPatterns on QuickRepeat {
/// A variant of `map` that fallback to returning `orElse`.
///
/// It is equivalent to doing:
/// ```dart
/// switch (sealedClass) {
///   case final Subclass value:
///     return ...;
///   case _:
///     return orElse();
/// }
/// ```

@optionalTypeArgs TResult maybeMap<TResult extends Object?>(TResult Function( _QuickRepeat value)?  $default,{required TResult orElse(),}){
final _that = this;
switch (_that) {
case _QuickRepeat() when $default != null:
return $default(_that);case _:
  return orElse();

}
}
/// A `switch`-like method, using callbacks.
///
/// Callbacks receives the raw object, upcasted.
/// It is equivalent to doing:
/// ```dart
/// switch (sealedClass) {
///   case final Subclass value:
///     return ...;
///   case final Subclass2 value:
///     return ...;
/// }
/// ```

@optionalTypeArgs TResult map<TResult extends Object?>(TResult Function( _QuickRepeat value)  $default,){
final _that = this;
switch (_that) {
case _QuickRepeat():
return $default(_that);case _:
  throw StateError('Unexpected subclass');

}
}
/// A variant of `map` that fallback to returning `null`.
///
/// It is equivalent to doing:
/// ```dart
/// switch (sealedClass) {
///   case final Subclass value:
///     return ...;
///   case _:
///     return null;
/// }
/// ```

@optionalTypeArgs TResult? mapOrNull<TResult extends Object?>(TResult? Function( _QuickRepeat value)?  $default,){
final _that = this;
switch (_that) {
case _QuickRepeat() when $default != null:
return $default(_that);case _:
  return null;

}
}
/// A variant of `when` that fallback to an `orElse` callback.
///
/// It is equivalent to doing:
/// ```dart
/// switch (sealedClass) {
///   case Subclass(:final field):
///     return ...;
///   case _:
///     return orElse();
/// }
/// ```

@optionalTypeArgs TResult maybeWhen<TResult extends Object?>(TResult Function( String description,  String categoryId,  String categoryName,  String? categoryColor,  int lastAmountPaisas,  String? fundingSource,  String? fundingPotId,  String? fundingCurrencyId)?  $default,{required TResult orElse(),}) {final _that = this;
switch (_that) {
case _QuickRepeat() when $default != null:
return $default(_that.description,_that.categoryId,_that.categoryName,_that.categoryColor,_that.lastAmountPaisas,_that.fundingSource,_that.fundingPotId,_that.fundingCurrencyId);case _:
  return orElse();

}
}
/// A `switch`-like method, using callbacks.
///
/// As opposed to `map`, this offers destructuring.
/// It is equivalent to doing:
/// ```dart
/// switch (sealedClass) {
///   case Subclass(:final field):
///     return ...;
///   case Subclass2(:final field2):
///     return ...;
/// }
/// ```

@optionalTypeArgs TResult when<TResult extends Object?>(TResult Function( String description,  String categoryId,  String categoryName,  String? categoryColor,  int lastAmountPaisas,  String? fundingSource,  String? fundingPotId,  String? fundingCurrencyId)  $default,) {final _that = this;
switch (_that) {
case _QuickRepeat():
return $default(_that.description,_that.categoryId,_that.categoryName,_that.categoryColor,_that.lastAmountPaisas,_that.fundingSource,_that.fundingPotId,_that.fundingCurrencyId);case _:
  throw StateError('Unexpected subclass');

}
}
/// A variant of `when` that fallback to returning `null`
///
/// It is equivalent to doing:
/// ```dart
/// switch (sealedClass) {
///   case Subclass(:final field):
///     return ...;
///   case _:
///     return null;
/// }
/// ```

@optionalTypeArgs TResult? whenOrNull<TResult extends Object?>(TResult? Function( String description,  String categoryId,  String categoryName,  String? categoryColor,  int lastAmountPaisas,  String? fundingSource,  String? fundingPotId,  String? fundingCurrencyId)?  $default,) {final _that = this;
switch (_that) {
case _QuickRepeat() when $default != null:
return $default(_that.description,_that.categoryId,_that.categoryName,_that.categoryColor,_that.lastAmountPaisas,_that.fundingSource,_that.fundingPotId,_that.fundingCurrencyId);case _:
  return null;

}
}

}

/// @nodoc
@JsonSerializable()

class _QuickRepeat implements QuickRepeat {
  const _QuickRepeat({required this.description, required this.categoryId, required this.categoryName, this.categoryColor, required this.lastAmountPaisas, this.fundingSource, this.fundingPotId, this.fundingCurrencyId});
  factory _QuickRepeat.fromJson(Map<String, dynamic> json) => _$QuickRepeatFromJson(json);

@override final  String description;
@override final  String categoryId;
@override final  String categoryName;
@override final  String? categoryColor;
@override final  int lastAmountPaisas;
@override final  String? fundingSource;
// INCOME | SAVINGS_POT | null
@override final  String? fundingPotId;
@override final  String? fundingCurrencyId;

/// Create a copy of QuickRepeat
/// with the given fields replaced by the non-null parameter values.
@override @JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
_$QuickRepeatCopyWith<_QuickRepeat> get copyWith => __$QuickRepeatCopyWithImpl<_QuickRepeat>(this, _$identity);

@override
Map<String, dynamic> toJson() {
  return _$QuickRepeatToJson(this, );
}

@override
bool operator ==(Object other) {
  return identical(this, other) || (other.runtimeType == runtimeType&&other is _QuickRepeat&&(identical(other.description, description) || other.description == description)&&(identical(other.categoryId, categoryId) || other.categoryId == categoryId)&&(identical(other.categoryName, categoryName) || other.categoryName == categoryName)&&(identical(other.categoryColor, categoryColor) || other.categoryColor == categoryColor)&&(identical(other.lastAmountPaisas, lastAmountPaisas) || other.lastAmountPaisas == lastAmountPaisas)&&(identical(other.fundingSource, fundingSource) || other.fundingSource == fundingSource)&&(identical(other.fundingPotId, fundingPotId) || other.fundingPotId == fundingPotId)&&(identical(other.fundingCurrencyId, fundingCurrencyId) || other.fundingCurrencyId == fundingCurrencyId));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode => Object.hash(runtimeType,description,categoryId,categoryName,categoryColor,lastAmountPaisas,fundingSource,fundingPotId,fundingCurrencyId);

@override
String toString() {
  return 'QuickRepeat(description: $description, categoryId: $categoryId, categoryName: $categoryName, categoryColor: $categoryColor, lastAmountPaisas: $lastAmountPaisas, fundingSource: $fundingSource, fundingPotId: $fundingPotId, fundingCurrencyId: $fundingCurrencyId)';
}


}

/// @nodoc
abstract mixin class _$QuickRepeatCopyWith<$Res> implements $QuickRepeatCopyWith<$Res> {
  factory _$QuickRepeatCopyWith(_QuickRepeat value, $Res Function(_QuickRepeat) _then) = __$QuickRepeatCopyWithImpl;
@override @useResult
$Res call({
 String description, String categoryId, String categoryName, String? categoryColor, int lastAmountPaisas, String? fundingSource, String? fundingPotId, String? fundingCurrencyId
});




}
/// @nodoc
class __$QuickRepeatCopyWithImpl<$Res>
    implements _$QuickRepeatCopyWith<$Res> {
  __$QuickRepeatCopyWithImpl(this._self, this._then);

  final _QuickRepeat _self;
  final $Res Function(_QuickRepeat) _then;

/// Create a copy of QuickRepeat
/// with the given fields replaced by the non-null parameter values.
@override @pragma('vm:prefer-inline') $Res call({Object? description = null,Object? categoryId = null,Object? categoryName = null,Object? categoryColor = freezed,Object? lastAmountPaisas = null,Object? fundingSource = freezed,Object? fundingPotId = freezed,Object? fundingCurrencyId = freezed,}) {
  return _then(_QuickRepeat(
description: null == description ? _self.description : description // ignore: cast_nullable_to_non_nullable
as String,categoryId: null == categoryId ? _self.categoryId : categoryId // ignore: cast_nullable_to_non_nullable
as String,categoryName: null == categoryName ? _self.categoryName : categoryName // ignore: cast_nullable_to_non_nullable
as String,categoryColor: freezed == categoryColor ? _self.categoryColor : categoryColor // ignore: cast_nullable_to_non_nullable
as String?,lastAmountPaisas: null == lastAmountPaisas ? _self.lastAmountPaisas : lastAmountPaisas // ignore: cast_nullable_to_non_nullable
as int,fundingSource: freezed == fundingSource ? _self.fundingSource : fundingSource // ignore: cast_nullable_to_non_nullable
as String?,fundingPotId: freezed == fundingPotId ? _self.fundingPotId : fundingPotId // ignore: cast_nullable_to_non_nullable
as String?,fundingCurrencyId: freezed == fundingCurrencyId ? _self.fundingCurrencyId : fundingCurrencyId // ignore: cast_nullable_to_non_nullable
as String?,
  ));
}


}


/// @nodoc
mixin _$QuickDescription {

 String get description; String? get categoryId;
/// Create a copy of QuickDescription
/// with the given fields replaced by the non-null parameter values.
@JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
$QuickDescriptionCopyWith<QuickDescription> get copyWith => _$QuickDescriptionCopyWithImpl<QuickDescription>(this as QuickDescription, _$identity);

  /// Serializes this QuickDescription to a JSON map.
  Map<String, dynamic> toJson();


@override
bool operator ==(Object other) {
  return identical(this, other) || (other.runtimeType == runtimeType&&other is QuickDescription&&(identical(other.description, description) || other.description == description)&&(identical(other.categoryId, categoryId) || other.categoryId == categoryId));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode => Object.hash(runtimeType,description,categoryId);

@override
String toString() {
  return 'QuickDescription(description: $description, categoryId: $categoryId)';
}


}

/// @nodoc
abstract mixin class $QuickDescriptionCopyWith<$Res>  {
  factory $QuickDescriptionCopyWith(QuickDescription value, $Res Function(QuickDescription) _then) = _$QuickDescriptionCopyWithImpl;
@useResult
$Res call({
 String description, String? categoryId
});




}
/// @nodoc
class _$QuickDescriptionCopyWithImpl<$Res>
    implements $QuickDescriptionCopyWith<$Res> {
  _$QuickDescriptionCopyWithImpl(this._self, this._then);

  final QuickDescription _self;
  final $Res Function(QuickDescription) _then;

/// Create a copy of QuickDescription
/// with the given fields replaced by the non-null parameter values.
@pragma('vm:prefer-inline') @override $Res call({Object? description = null,Object? categoryId = freezed,}) {
  return _then(_self.copyWith(
description: null == description ? _self.description : description // ignore: cast_nullable_to_non_nullable
as String,categoryId: freezed == categoryId ? _self.categoryId : categoryId // ignore: cast_nullable_to_non_nullable
as String?,
  ));
}

}


/// Adds pattern-matching-related methods to [QuickDescription].
extension QuickDescriptionPatterns on QuickDescription {
/// A variant of `map` that fallback to returning `orElse`.
///
/// It is equivalent to doing:
/// ```dart
/// switch (sealedClass) {
///   case final Subclass value:
///     return ...;
///   case _:
///     return orElse();
/// }
/// ```

@optionalTypeArgs TResult maybeMap<TResult extends Object?>(TResult Function( _QuickDescription value)?  $default,{required TResult orElse(),}){
final _that = this;
switch (_that) {
case _QuickDescription() when $default != null:
return $default(_that);case _:
  return orElse();

}
}
/// A `switch`-like method, using callbacks.
///
/// Callbacks receives the raw object, upcasted.
/// It is equivalent to doing:
/// ```dart
/// switch (sealedClass) {
///   case final Subclass value:
///     return ...;
///   case final Subclass2 value:
///     return ...;
/// }
/// ```

@optionalTypeArgs TResult map<TResult extends Object?>(TResult Function( _QuickDescription value)  $default,){
final _that = this;
switch (_that) {
case _QuickDescription():
return $default(_that);case _:
  throw StateError('Unexpected subclass');

}
}
/// A variant of `map` that fallback to returning `null`.
///
/// It is equivalent to doing:
/// ```dart
/// switch (sealedClass) {
///   case final Subclass value:
///     return ...;
///   case _:
///     return null;
/// }
/// ```

@optionalTypeArgs TResult? mapOrNull<TResult extends Object?>(TResult? Function( _QuickDescription value)?  $default,){
final _that = this;
switch (_that) {
case _QuickDescription() when $default != null:
return $default(_that);case _:
  return null;

}
}
/// A variant of `when` that fallback to an `orElse` callback.
///
/// It is equivalent to doing:
/// ```dart
/// switch (sealedClass) {
///   case Subclass(:final field):
///     return ...;
///   case _:
///     return orElse();
/// }
/// ```

@optionalTypeArgs TResult maybeWhen<TResult extends Object?>(TResult Function( String description,  String? categoryId)?  $default,{required TResult orElse(),}) {final _that = this;
switch (_that) {
case _QuickDescription() when $default != null:
return $default(_that.description,_that.categoryId);case _:
  return orElse();

}
}
/// A `switch`-like method, using callbacks.
///
/// As opposed to `map`, this offers destructuring.
/// It is equivalent to doing:
/// ```dart
/// switch (sealedClass) {
///   case Subclass(:final field):
///     return ...;
///   case Subclass2(:final field2):
///     return ...;
/// }
/// ```

@optionalTypeArgs TResult when<TResult extends Object?>(TResult Function( String description,  String? categoryId)  $default,) {final _that = this;
switch (_that) {
case _QuickDescription():
return $default(_that.description,_that.categoryId);case _:
  throw StateError('Unexpected subclass');

}
}
/// A variant of `when` that fallback to returning `null`
///
/// It is equivalent to doing:
/// ```dart
/// switch (sealedClass) {
///   case Subclass(:final field):
///     return ...;
///   case _:
///     return null;
/// }
/// ```

@optionalTypeArgs TResult? whenOrNull<TResult extends Object?>(TResult? Function( String description,  String? categoryId)?  $default,) {final _that = this;
switch (_that) {
case _QuickDescription() when $default != null:
return $default(_that.description,_that.categoryId);case _:
  return null;

}
}

}

/// @nodoc
@JsonSerializable()

class _QuickDescription implements QuickDescription {
  const _QuickDescription({required this.description, this.categoryId});
  factory _QuickDescription.fromJson(Map<String, dynamic> json) => _$QuickDescriptionFromJson(json);

@override final  String description;
@override final  String? categoryId;

/// Create a copy of QuickDescription
/// with the given fields replaced by the non-null parameter values.
@override @JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
_$QuickDescriptionCopyWith<_QuickDescription> get copyWith => __$QuickDescriptionCopyWithImpl<_QuickDescription>(this, _$identity);

@override
Map<String, dynamic> toJson() {
  return _$QuickDescriptionToJson(this, );
}

@override
bool operator ==(Object other) {
  return identical(this, other) || (other.runtimeType == runtimeType&&other is _QuickDescription&&(identical(other.description, description) || other.description == description)&&(identical(other.categoryId, categoryId) || other.categoryId == categoryId));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode => Object.hash(runtimeType,description,categoryId);

@override
String toString() {
  return 'QuickDescription(description: $description, categoryId: $categoryId)';
}


}

/// @nodoc
abstract mixin class _$QuickDescriptionCopyWith<$Res> implements $QuickDescriptionCopyWith<$Res> {
  factory _$QuickDescriptionCopyWith(_QuickDescription value, $Res Function(_QuickDescription) _then) = __$QuickDescriptionCopyWithImpl;
@override @useResult
$Res call({
 String description, String? categoryId
});




}
/// @nodoc
class __$QuickDescriptionCopyWithImpl<$Res>
    implements _$QuickDescriptionCopyWith<$Res> {
  __$QuickDescriptionCopyWithImpl(this._self, this._then);

  final _QuickDescription _self;
  final $Res Function(_QuickDescription) _then;

/// Create a copy of QuickDescription
/// with the given fields replaced by the non-null parameter values.
@override @pragma('vm:prefer-inline') $Res call({Object? description = null,Object? categoryId = freezed,}) {
  return _then(_QuickDescription(
description: null == description ? _self.description : description // ignore: cast_nullable_to_non_nullable
as String,categoryId: freezed == categoryId ? _self.categoryId : categoryId // ignore: cast_nullable_to_non_nullable
as String?,
  ));
}


}


/// @nodoc
mixin _$QuickPicks {

 List<QuickRepeat> get repeats; List<String> get topCategoryIds; List<QuickDescription> get descriptions;
/// Create a copy of QuickPicks
/// with the given fields replaced by the non-null parameter values.
@JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
$QuickPicksCopyWith<QuickPicks> get copyWith => _$QuickPicksCopyWithImpl<QuickPicks>(this as QuickPicks, _$identity);

  /// Serializes this QuickPicks to a JSON map.
  Map<String, dynamic> toJson();


@override
bool operator ==(Object other) {
  return identical(this, other) || (other.runtimeType == runtimeType&&other is QuickPicks&&const DeepCollectionEquality().equals(other.repeats, repeats)&&const DeepCollectionEquality().equals(other.topCategoryIds, topCategoryIds)&&const DeepCollectionEquality().equals(other.descriptions, descriptions));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode => Object.hash(runtimeType,const DeepCollectionEquality().hash(repeats),const DeepCollectionEquality().hash(topCategoryIds),const DeepCollectionEquality().hash(descriptions));

@override
String toString() {
  return 'QuickPicks(repeats: $repeats, topCategoryIds: $topCategoryIds, descriptions: $descriptions)';
}


}

/// @nodoc
abstract mixin class $QuickPicksCopyWith<$Res>  {
  factory $QuickPicksCopyWith(QuickPicks value, $Res Function(QuickPicks) _then) = _$QuickPicksCopyWithImpl;
@useResult
$Res call({
 List<QuickRepeat> repeats, List<String> topCategoryIds, List<QuickDescription> descriptions
});




}
/// @nodoc
class _$QuickPicksCopyWithImpl<$Res>
    implements $QuickPicksCopyWith<$Res> {
  _$QuickPicksCopyWithImpl(this._self, this._then);

  final QuickPicks _self;
  final $Res Function(QuickPicks) _then;

/// Create a copy of QuickPicks
/// with the given fields replaced by the non-null parameter values.
@pragma('vm:prefer-inline') @override $Res call({Object? repeats = null,Object? topCategoryIds = null,Object? descriptions = null,}) {
  return _then(_self.copyWith(
repeats: null == repeats ? _self.repeats : repeats // ignore: cast_nullable_to_non_nullable
as List<QuickRepeat>,topCategoryIds: null == topCategoryIds ? _self.topCategoryIds : topCategoryIds // ignore: cast_nullable_to_non_nullable
as List<String>,descriptions: null == descriptions ? _self.descriptions : descriptions // ignore: cast_nullable_to_non_nullable
as List<QuickDescription>,
  ));
}

}


/// Adds pattern-matching-related methods to [QuickPicks].
extension QuickPicksPatterns on QuickPicks {
/// A variant of `map` that fallback to returning `orElse`.
///
/// It is equivalent to doing:
/// ```dart
/// switch (sealedClass) {
///   case final Subclass value:
///     return ...;
///   case _:
///     return orElse();
/// }
/// ```

@optionalTypeArgs TResult maybeMap<TResult extends Object?>(TResult Function( _QuickPicks value)?  $default,{required TResult orElse(),}){
final _that = this;
switch (_that) {
case _QuickPicks() when $default != null:
return $default(_that);case _:
  return orElse();

}
}
/// A `switch`-like method, using callbacks.
///
/// Callbacks receives the raw object, upcasted.
/// It is equivalent to doing:
/// ```dart
/// switch (sealedClass) {
///   case final Subclass value:
///     return ...;
///   case final Subclass2 value:
///     return ...;
/// }
/// ```

@optionalTypeArgs TResult map<TResult extends Object?>(TResult Function( _QuickPicks value)  $default,){
final _that = this;
switch (_that) {
case _QuickPicks():
return $default(_that);case _:
  throw StateError('Unexpected subclass');

}
}
/// A variant of `map` that fallback to returning `null`.
///
/// It is equivalent to doing:
/// ```dart
/// switch (sealedClass) {
///   case final Subclass value:
///     return ...;
///   case _:
///     return null;
/// }
/// ```

@optionalTypeArgs TResult? mapOrNull<TResult extends Object?>(TResult? Function( _QuickPicks value)?  $default,){
final _that = this;
switch (_that) {
case _QuickPicks() when $default != null:
return $default(_that);case _:
  return null;

}
}
/// A variant of `when` that fallback to an `orElse` callback.
///
/// It is equivalent to doing:
/// ```dart
/// switch (sealedClass) {
///   case Subclass(:final field):
///     return ...;
///   case _:
///     return orElse();
/// }
/// ```

@optionalTypeArgs TResult maybeWhen<TResult extends Object?>(TResult Function( List<QuickRepeat> repeats,  List<String> topCategoryIds,  List<QuickDescription> descriptions)?  $default,{required TResult orElse(),}) {final _that = this;
switch (_that) {
case _QuickPicks() when $default != null:
return $default(_that.repeats,_that.topCategoryIds,_that.descriptions);case _:
  return orElse();

}
}
/// A `switch`-like method, using callbacks.
///
/// As opposed to `map`, this offers destructuring.
/// It is equivalent to doing:
/// ```dart
/// switch (sealedClass) {
///   case Subclass(:final field):
///     return ...;
///   case Subclass2(:final field2):
///     return ...;
/// }
/// ```

@optionalTypeArgs TResult when<TResult extends Object?>(TResult Function( List<QuickRepeat> repeats,  List<String> topCategoryIds,  List<QuickDescription> descriptions)  $default,) {final _that = this;
switch (_that) {
case _QuickPicks():
return $default(_that.repeats,_that.topCategoryIds,_that.descriptions);case _:
  throw StateError('Unexpected subclass');

}
}
/// A variant of `when` that fallback to returning `null`
///
/// It is equivalent to doing:
/// ```dart
/// switch (sealedClass) {
///   case Subclass(:final field):
///     return ...;
///   case _:
///     return null;
/// }
/// ```

@optionalTypeArgs TResult? whenOrNull<TResult extends Object?>(TResult? Function( List<QuickRepeat> repeats,  List<String> topCategoryIds,  List<QuickDescription> descriptions)?  $default,) {final _that = this;
switch (_that) {
case _QuickPicks() when $default != null:
return $default(_that.repeats,_that.topCategoryIds,_that.descriptions);case _:
  return null;

}
}

}

/// @nodoc
@JsonSerializable()

class _QuickPicks implements QuickPicks {
  const _QuickPicks({final  List<QuickRepeat> repeats = const <QuickRepeat>[], final  List<String> topCategoryIds = const <String>[], final  List<QuickDescription> descriptions = const <QuickDescription>[]}): _repeats = repeats,_topCategoryIds = topCategoryIds,_descriptions = descriptions;
  factory _QuickPicks.fromJson(Map<String, dynamic> json) => _$QuickPicksFromJson(json);

 final  List<QuickRepeat> _repeats;
@override@JsonKey() List<QuickRepeat> get repeats {
  if (_repeats is EqualUnmodifiableListView) return _repeats;
  // ignore: implicit_dynamic_type
  return EqualUnmodifiableListView(_repeats);
}

 final  List<String> _topCategoryIds;
@override@JsonKey() List<String> get topCategoryIds {
  if (_topCategoryIds is EqualUnmodifiableListView) return _topCategoryIds;
  // ignore: implicit_dynamic_type
  return EqualUnmodifiableListView(_topCategoryIds);
}

 final  List<QuickDescription> _descriptions;
@override@JsonKey() List<QuickDescription> get descriptions {
  if (_descriptions is EqualUnmodifiableListView) return _descriptions;
  // ignore: implicit_dynamic_type
  return EqualUnmodifiableListView(_descriptions);
}


/// Create a copy of QuickPicks
/// with the given fields replaced by the non-null parameter values.
@override @JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
_$QuickPicksCopyWith<_QuickPicks> get copyWith => __$QuickPicksCopyWithImpl<_QuickPicks>(this, _$identity);

@override
Map<String, dynamic> toJson() {
  return _$QuickPicksToJson(this, );
}

@override
bool operator ==(Object other) {
  return identical(this, other) || (other.runtimeType == runtimeType&&other is _QuickPicks&&const DeepCollectionEquality().equals(other._repeats, _repeats)&&const DeepCollectionEquality().equals(other._topCategoryIds, _topCategoryIds)&&const DeepCollectionEquality().equals(other._descriptions, _descriptions));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode => Object.hash(runtimeType,const DeepCollectionEquality().hash(_repeats),const DeepCollectionEquality().hash(_topCategoryIds),const DeepCollectionEquality().hash(_descriptions));

@override
String toString() {
  return 'QuickPicks(repeats: $repeats, topCategoryIds: $topCategoryIds, descriptions: $descriptions)';
}


}

/// @nodoc
abstract mixin class _$QuickPicksCopyWith<$Res> implements $QuickPicksCopyWith<$Res> {
  factory _$QuickPicksCopyWith(_QuickPicks value, $Res Function(_QuickPicks) _then) = __$QuickPicksCopyWithImpl;
@override @useResult
$Res call({
 List<QuickRepeat> repeats, List<String> topCategoryIds, List<QuickDescription> descriptions
});




}
/// @nodoc
class __$QuickPicksCopyWithImpl<$Res>
    implements _$QuickPicksCopyWith<$Res> {
  __$QuickPicksCopyWithImpl(this._self, this._then);

  final _QuickPicks _self;
  final $Res Function(_QuickPicks) _then;

/// Create a copy of QuickPicks
/// with the given fields replaced by the non-null parameter values.
@override @pragma('vm:prefer-inline') $Res call({Object? repeats = null,Object? topCategoryIds = null,Object? descriptions = null,}) {
  return _then(_QuickPicks(
repeats: null == repeats ? _self._repeats : repeats // ignore: cast_nullable_to_non_nullable
as List<QuickRepeat>,topCategoryIds: null == topCategoryIds ? _self._topCategoryIds : topCategoryIds // ignore: cast_nullable_to_non_nullable
as List<String>,descriptions: null == descriptions ? _self._descriptions : descriptions // ignore: cast_nullable_to_non_nullable
as List<QuickDescription>,
  ));
}


}

// dart format on
