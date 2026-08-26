import 'package:dio/dio.dart';
import 'package:riverpod_annotation/riverpod_annotation.dart';

import '../../../../core/constants/api_constants.dart';
import '../../../../core/errors/error_handler.dart';
import '../../../../core/network/api_client.dart';
import '../../domain/entities/investment_entity.dart';

part 'investments_datasource.g.dart';

@riverpod
InvestmentsDatasource investmentsDatasource(Ref ref) =>
    InvestmentsDatasource(ref.watch(apiClientProvider));

class InvestmentsDatasource {
  const InvestmentsDatasource(this._dio);
  final Dio _dio;

  Future<InvestmentsData> getInvestments() async {
    try {
      final res = await _dio.get(ApiConstants.investments);
      final d = res.data['data'] as Map<String, dynamic>;
      final summary = d['summary'] as Map<String, dynamic>;
      final planJson = d['plan'] as Map<String, dynamic>?;
      return InvestmentsData(
        totalInvestedPaisas: summary['totalInvestedPaisas'] as int,
        totalCurrentValuePaisas: summary['totalCurrentValuePaisas'] as int,
        totalGainPaisas: summary['totalGainPaisas'] as int,
        plan: planJson != null ? _parsePlan(planJson) : null,
        investments: (d['investments'] as List<dynamic>)
            .map((e) => _parseInvestment(e as Map<String, dynamic>))
            .toList(),
      );
    } catch (e) {
      throw ErrorHandler.handle(e);
    }
  }

  // Adds money to a plan category directly - lazily creates the category's
  // linked Investment on first use (name/type inherited from the category),
  // so there's no separate "new SIP" creation step: add the investment to
  // the plan first (savePlan), then add money into it any time.
  Future<void> addMoneyToCategory({
    required String planCategoryId,
    required int amountPaisas,
    required DateTime date,
    String? notes,
  }) async {
    try {
      await _dio.post(
        ApiConstants.investmentPlanCategoryContributions(planCategoryId),
        data: {
          'amountPaisas': amountPaisas,
          'date': date.toIso8601String(),
          if (notes != null && notes.isNotEmpty) 'notes': notes,
        },
      );
    } catch (e) {
      throw ErrorHandler.handle(e);
    }
  }

  Future<void> updateValue({
    required String id,
    int? currentValuePaisas,
    String? notes,
    Object? planCategoryId = _unset,
  }) async {
    try {
      await _dio.patch(ApiConstants.investmentById(id), data: {
        if (currentValuePaisas != null) 'currentValuePaisas': currentValuePaisas,
        if (notes != null) 'notes': notes,
        if (planCategoryId != _unset) 'planCategoryId': planCategoryId,
      });
    } catch (e) {
      throw ErrorHandler.handle(e);
    }
  }

  Future<void> deleteSip(String id) async {
    try {
      await _dio.delete(ApiConstants.investmentById(id));
    } catch (e) {
      throw ErrorHandler.handle(e);
    }
  }

  Future<void> logContribution({
    required String investmentId,
    required int amountPaisas,
    required DateTime date,
    String? notes,
  }) async {
    try {
      await _dio.post(ApiConstants.investmentContributions(investmentId), data: {
        'amountPaisas': amountPaisas,
        'date': date.toIso8601String(),
        if (notes != null && notes.isNotEmpty) 'notes': notes,
      });
    } catch (e) {
      throw ErrorHandler.handle(e);
    }
  }

  Future<void> deleteContribution({
    required String investmentId,
    required String contributionId,
  }) async {
    try {
      await _dio.delete(
        ApiConstants.investmentContributionById(investmentId, contributionId),
      );
    } catch (e) {
      throw ErrorHandler.handle(e);
    }
  }

  Future<void> savePlan({
    required int monthlyTargetPaisas,
    required List<({String? id, String name, String? investmentType, int percentage})> categories,
    bool autoFromSurplus = false,
  }) async {
    try {
      await _dio.put(ApiConstants.investmentPlan, data: {
        'monthlyTargetPaisas': monthlyTargetPaisas,
        'autoFromSurplus': autoFromSurplus,
        'categories': categories
            .map((c) => {
                  if (c.id != null) 'id': c.id,
                  'name': c.name,
                  if (c.investmentType != null) 'investmentType': c.investmentType,
                  'percentage': c.percentage,
                })
            .toList(),
      });
    } catch (e) {
      throw ErrorHandler.handle(e);
    }
  }

  static InvestmentEntity _parseInvestment(Map<String, dynamic> m) =>
      InvestmentEntity(
        id: m['id'] as String,
        name: m['name'] as String,
        type: m['type'] as String,
        platform: m['platform'] as String,
        investedPaisas: m['investedAmountPaisas'] as int,
        currentValuePaisas: m['currentValuePaisas'] as int,
        units: (m['units'] as num?)?.toDouble(),
        purchaseDate: DateTime.parse(m['purchaseDate'] as String),
        notes: m['notes'] as String?,
        planCategoryId: m['planCategoryId'] as String?,
        contributions: (m['contributions'] as List<dynamic>)
            .map((c) => _parseContribution(c as Map<String, dynamic>))
            .toList(),
      );

  static ContributionEntity _parseContribution(Map<String, dynamic> m) =>
      ContributionEntity(
        id: m['id'] as String,
        amountPaisas: m['amountPaisas'] as int,
        date: DateTime.parse(m['date'] as String),
        notes: m['notes'] as String?,
      );

  static InvestmentPlanEntity _parsePlan(Map<String, dynamic> m) =>
      InvestmentPlanEntity(
        id: m['id'] as String,
        monthlyTargetPaisas: m['monthlyTargetPaisas'] as int,
        autoFromSurplus: m['autoFromSurplus'] as bool,
        categories: (m['categories'] as List<dynamic>)
            .map((c) => _parseCategory(c as Map<String, dynamic>))
            .toList(),
      );

  static PlanCategoryEntity _parseCategory(Map<String, dynamic> m) =>
      PlanCategoryEntity(
        id: m['id'] as String,
        name: m['name'] as String,
        investmentType: m['investmentType'] as String?,
        percentage: m['percentage'] as int,
        plannedPaisas: m['plannedPaisas'] as int? ?? 0,
        actualPaisas: m['actualPaisas'] as int? ?? 0,
      );
}

// Sentinel so `planCategoryId: null` (unassign) is distinguishable from "not
// provided" in updateValue.
const Object _unset = Object();
