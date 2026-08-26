import 'package:dio/dio.dart';
import 'package:riverpod_annotation/riverpod_annotation.dart';

import '../../../../core/constants/api_constants.dart';
import '../../../../core/errors/error_handler.dart';
import '../../../../core/network/api_client.dart';
import '../../domain/entities/plan_entity.dart';

part 'plans_datasource.g.dart';

@riverpod
PlansDatasource plansDatasource(Ref ref) =>
    PlansDatasource(ref.watch(apiClientProvider));

class PlansDatasource {
  const PlansDatasource(this._dio);
  final Dio _dio;

  Future<List<PlanEntity>> getPlans() async {
    try {
      final res = await _dio.get(ApiConstants.plans);
      final list = res.data['data'] as List<dynamic>;
      return list.map((e) => _parsePlan(e as Map<String, dynamic>)).toList();
    } catch (e) {
      throw ErrorHandler.handle(e);
    }
  }

  Future<PlanDetailEntity> getPlanDetail(String id) async {
    try {
      final res = await _dio.get(ApiConstants.planById(id));
      return _parseDetail(res.data['data'] as Map<String, dynamic>);
    } catch (e) {
      throw ErrorHandler.handle(e);
    }
  }

  Future<String> createPlan({
    required String name,
    required String planType, // FIXED | ITEMIZED
    int? estimatedTotalPaisas,
    String? targetDate,
  }) async {
    try {
      final res = await _dio.post(ApiConstants.plans, data: {
        'name': name,
        'planType': planType,
        if (estimatedTotalPaisas != null) 'estimatedTotalPaisas': estimatedTotalPaisas,
        if (targetDate != null) 'targetDate': targetDate,
      });
      return (res.data['data'] as Map<String, dynamic>)['id'] as String;
    } catch (e) {
      throw ErrorHandler.handle(e);
    }
  }

  Future<void> updatePlan({
    required String id,
    String? name,
    String? status,
    int? estimatedTotalPaisas,
  }) async {
    try {
      await _dio.patch(ApiConstants.planById(id), data: {
        if (name != null) 'name': name,
        if (status != null) 'status': status,
        if (estimatedTotalPaisas != null) 'estimatedTotalPaisas': estimatedTotalPaisas,
      });
    } catch (e) {
      throw ErrorHandler.handle(e);
    }
  }

  Future<void> deletePlan(String id) async {
    try {
      await _dio.delete(ApiConstants.planById(id));
    } catch (e) {
      throw ErrorHandler.handle(e);
    }
  }

  Future<void> addItem({
    required String planId,
    required String name,
    required int estimatedCostPaisas,
  }) async {
    try {
      await _dio.post(ApiConstants.planItems(planId), data: {
        'name': name,
        'estimatedCostPaisas': estimatedCostPaisas,
      });
    } catch (e) {
      throw ErrorHandler.handle(e);
    }
  }

  Future<void> updateItem({
    required String planId,
    required String itemId,
    String? name,
    int? estimatedCostPaisas,
  }) async {
    try {
      await _dio.patch(ApiConstants.planItem(planId, itemId), data: {
        if (name != null) 'name': name,
        if (estimatedCostPaisas != null) 'estimatedCostPaisas': estimatedCostPaisas,
      });
    } catch (e) {
      throw ErrorHandler.handle(e);
    }
  }

  Future<void> deleteItem({required String planId, required String itemId}) async {
    try {
      await _dio.delete(ApiConstants.planItem(planId, itemId));
    } catch (e) {
      throw ErrorHandler.handle(e);
    }
  }

  Future<void> buyItem({required String planId, required String itemId}) async {
    try {
      await _dio.post(ApiConstants.planItemBuy(planId, itemId));
    } catch (e) {
      throw ErrorHandler.handle(e);
    }
  }

  Future<void> setItemStatus({
    required String planId,
    required String itemId,
    required String status,
  }) async {
    try {
      await _dio.patch(ApiConstants.planItem(planId, itemId), data: {'status': status});
    } catch (e) {
      throw ErrorHandler.handle(e);
    }
  }

  static PlanEntity _parsePlan(Map<String, dynamic> m) => PlanEntity(
        id: m['id'] as String,
        name: m['name'] as String,
        icon: m['icon'] as String,
        coverColor: m['coverColor'] as String,
        planType: m['planType'] as String,
        status: m['status'] as String,
        totalEstimatedPaisas: m['totalEstimatedPaisas'] as int,
        totalPaidPaisas: m['totalPaidPaisas'] as int,
        itemCount: m['itemCount'] as int,
        paidCount: m['paidCount'] as int,
        targetDate: m['targetDate'] != null ? DateTime.parse(m['targetDate'] as String) : null,
      );

  static PlanItemEntity _parseItem(Map<String, dynamic> m) => PlanItemEntity(
        id: m['id'] as String,
        name: m['name'] as String,
        estimatedPaisas: m['estimatedCostPaisas'] as int,
        actualPaisas: m['actualCostPaisas'] as int?,
        status: m['status'] as String,
        notes: m['notes'] as String?,
        vendor: m['vendor'] as String?,
        dueDate: m['dueDate'] != null ? DateTime.parse(m['dueDate'] as String) : null,
      );

  static PlanDetailEntity _parseDetail(Map<String, dynamic> m) {
    final a = m['affordability'] as Map<String, dynamic>;
    return PlanDetailEntity(
      id: m['id'] as String,
      name: m['name'] as String,
      planType: m['planType'] as String,
      status: m['status'] as String,
      totalEstimatedPaisas: m['totalEstimatedPaisas'] as int,
      totalPaidPaisas: m['totalPaidPaisas'] as int,
      remainingPaisas: m['remainingPaisas'] as int,
      targetDate: m['targetDate'] != null ? DateTime.parse(m['targetDate'] as String) : null,
      items: (m['items'] as List<dynamic>).map((e) => _parseItem(e as Map<String, dynamic>)).toList(),
      affordability: PlanAffordability(
        liquidAvailablePaisas: a['liquidAvailablePaisas'] as int,
        investmentsTotalPaisas: a['investmentsTotalPaisas'] as int,
        netWorthPaisas: a['netWorthPaisas'] as int,
        coveragePct: a['coveragePct'] as int,
        canAfford: a['canAfford'] as bool,
      ),
    );
  }
}
