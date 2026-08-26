import 'package:dio/dio.dart';
import 'package:riverpod_annotation/riverpod_annotation.dart';

import '../../../../core/constants/api_constants.dart';
import '../../../../core/errors/error_handler.dart';
import '../../../../core/network/api_client.dart';
import '../../domain/entities/loan_entity.dart';

part 'loans_datasource.g.dart';

@riverpod
LoansDatasource loansDatasource(Ref ref) =>
    LoansDatasource(ref.watch(apiClientProvider));

class LoansDatasource {
  const LoansDatasource(this._dio);
  final Dio _dio;

  Future<String> createLoan({
    required String personName,
    required String type,
    required int principalPaisas,
    required DateTime date,
    String? description,
    DateTime? dueDate,
    String? notes,
    int? budgetMonth,
    int? budgetYear,
    // When true, no principal Transaction is booked - loan tracking only,
    // no entry in Expenses/Income. Defaults to false (book it).
    bool skipTransaction = false,
  }) async {
    try {
      final res = await _dio.post(
        ApiConstants.loans,
        data: {
          'personName': personName,
          'type': type,
          'principalPaisas': principalPaisas,
          'date': date.toIso8601String(),
          if (description != null && description.isNotEmpty) 'description': description,
          if (dueDate != null) 'dueDate': dueDate.toIso8601String(),
          if (notes != null && notes.isNotEmpty) 'notes': notes,
          if (budgetMonth != null) 'budgetMonth': budgetMonth,
          if (budgetYear != null) 'budgetYear': budgetYear,
          if (skipTransaction) 'skipTransaction': true,
        },
      );
      return (res.data['data'] as Map<String, dynamic>)['id'] as String;
    } catch (e) {
      throw ErrorHandler.handle(e);
    }
  }

  Future<void> recordPayment({
    required String loanId,
    required int amountPaisas,
    required DateTime date,
    String? notes,
    int? budgetMonth,
    int? budgetYear,
    String? fundingPotId,
    String? linkScheduleId,
    // When true, no repayment Transaction is booked - no entry in
    // Expenses/Income, no funding-source/pot handling. Defaults to false.
    bool skipTransaction = false,
  }) async {
    try {
      await _dio.post(
        ApiConstants.loanPayments(loanId),
        data: {
          'amountPaisas': amountPaisas,
          'date': date.toIso8601String(),
          if (notes != null && notes.isNotEmpty) 'notes': notes,
          if (budgetMonth != null) 'budgetMonth': budgetMonth,
          if (budgetYear != null) 'budgetYear': budgetYear,
          if (fundingPotId != null) 'fundingSource': 'SAVINGS_POT',
          if (fundingPotId != null) 'fundingPotId': fundingPotId,
          if (linkScheduleId != null) 'linkScheduleId': linkScheduleId,
          if (skipTransaction) 'skipTransaction': true,
        },
      );
    } catch (e) {
      throw ErrorHandler.handle(e);
    }
  }

  Future<void> updatePayment({
    required String loanId,
    required String paymentId,
    required int amountPaisas,
    required DateTime date,
    String? notes,
    int? budgetMonth,
    int? budgetYear,
    String? fundingPotId,
  }) async {
    try {
      await _dio.patch(
        ApiConstants.loanPaymentById(loanId, paymentId),
        data: {
          'amountPaisas': amountPaisas,
          'date': date.toIso8601String(),
          if (notes != null && notes.isNotEmpty) 'notes': notes,
          if (budgetMonth != null) 'budgetMonth': budgetMonth,
          if (budgetYear != null) 'budgetYear': budgetYear,
          'fundingSource': fundingPotId != null ? 'SAVINGS_POT' : 'INCOME',
          if (fundingPotId != null) 'fundingPotId': fundingPotId,
        },
      );
    } catch (e) {
      throw ErrorHandler.handle(e);
    }
  }

  Future<void> deletePayment({
    required String loanId,
    required String paymentId,
  }) async {
    try {
      await _dio.delete(ApiConstants.loanPaymentById(loanId, paymentId));
    } catch (e) {
      throw ErrorHandler.handle(e);
    }
  }

  Future<List<LoanEntity>> getLoans() async {
    try {
      final res = await _dio.get(ApiConstants.loans);
      final list = res.data['data'] as List<dynamic>;
      return list.map((e) => _parse(e as Map<String, dynamic>)).toList();
    } catch (e) {
      throw ErrorHandler.handle(e);
    }
  }

  Future<String> createSchedule({
    required String loanId,
    required String kind,
    required int amountPaisas,
    required DateTime startDate,
    DateTime? endDate,
    String flexibility = 'FIXED',
    int priority = 0,
    int slideWindowMonths = 0,
    double? interestRate,
  }) async {
    try {
      final res = await _dio.post(
        ApiConstants.loanSchedules(loanId),
        data: {
          'kind': kind,
          'amountPaisas': amountPaisas,
          'startDate': startDate.toIso8601String(),
          if (endDate != null) 'endDate': endDate.toIso8601String(),
          'flexibility': flexibility,
          'priority': priority,
          'slideWindowMonths': slideWindowMonths,
          if (interestRate != null) 'interestRate': interestRate,
        },
      );
      return (res.data['data'] as Map<String, dynamic>)['id'] as String;
    } catch (e) {
      throw ErrorHandler.handle(e);
    }
  }

  Future<void> deleteSchedule({
    required String loanId,
    required String scheduleId,
  }) async {
    try {
      await _dio.delete(ApiConstants.loanScheduleById(loanId, scheduleId));
    } catch (e) {
      throw ErrorHandler.handle(e);
    }
  }

  static LoanEntity _parse(Map<String, dynamic> m) => LoanEntity(
        id: m['id'] as String,
        personName: m['personName'] as String,
        description: m['description'] as String?,
        type: m['type'] as String,
        principalPaisas: m['principalAmount'] as int,
        remainingPaisas: m['remainingAmount'] as int,
        date: DateTime.parse(m['date'] as String),
        dueDate: m['dueDate'] != null
            ? DateTime.parse(m['dueDate'] as String)
            : null,
        status: m['status'] as String,
        notes: m['notes'] as String?,
        recentPayments: (m['payments'] as List<dynamic>)
            .map((p) => _parsePayment(p as Map<String, dynamic>))
            .toList(),
        schedules: (m['schedules'] as List<dynamic>? ?? [])
            .map((s) => _parseSchedule(s as Map<String, dynamic>))
            .toList(),
      );

  static LoanPaymentEntity _parsePayment(Map<String, dynamic> m) =>
      LoanPaymentEntity(
        id: m['id'] as String,
        amountPaisas: m['amount'] as int,
        date: DateTime.parse(m['date'] as String),
        notes: m['notes'] as String?,
        hasTransaction: m['transactionId'] != null,
      );

  static LoanScheduleEntity _parseSchedule(Map<String, dynamic> m) =>
      LoanScheduleEntity(
        id: m['id'] as String,
        loanId: m['loanId'] as String,
        kind: m['kind'] as String,
        amountPaisas: m['amountPaisas'] as int,
        startDate: DateTime.parse(m['startDate'] as String),
        endDate: m['endDate'] != null
            ? DateTime.parse(m['endDate'] as String)
            : null,
        flexibility: m['flexibility'] as String,
        priority: m['priority'] as int,
        slideWindowMonths: m['slideWindowMonths'] as int,
        interestRate: (m['interestRate'] as num?)?.toDouble(),
        fulfilledPaymentId: m['fulfilledPaymentId'] as String?,
      );
}
