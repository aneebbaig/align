class ApiConstants {
  ApiConstants._();

  // Nothing here is baked in at build time: the origin comes from whatever the
  // user entered on first launch (see core/network/server_url.dart), and these
  // paths are appended to it.

  /// REST data API, and better-auth, relative to the configured origin.
  static const String apiPath = '/api/v1';
  static const String authPath = '/api/auth';

  /// Unauthenticated liveness endpoint, used to validate a URL before saving it.
  static const String health = '/api/health';

  static String apiBase(String origin) => '$origin$apiPath';
  static String authBase(String origin) => '$origin$authPath';

  // better-auth endpoints (used with authBase(origin))
  static const String signIn = '/sign-in/email';
  static const String signOut = '/sign-out';
  static const String getSession = '/get-session';
  static const String verifyTotp = '/two-factor/verify-totp';

  // REST data endpoints (used with apiBase(origin))
  static const String categories = '/categories';
  static const String expenses = '/expenses';
  static const String expenseFundingContext = '/expenses/funding-context';
  static const String income = '/income';
  static const String budget = '/budget';
  static const String savings = '/savings';
  static const String loans = '/loans';
  static const String dashboard = '/dashboard';

  static const String tasks = '/tasks';
  static const String projects = '/projects';
  static const String tags = '/tags';
  static const String investments = '/investments';
  static const String investmentPlan = '/investment-plan';
  static const String planner = '/planner';
  static const String plannerSettings = '/planner/settings';
  static const String plannerLines = '/planner/lines';
  static const String plannerLinesOrder = '/planner/lines/order';
  static String plannerLine(String id) => '/planner/lines/$id';
  static String plannerLineCells(String id) => '/planner/lines/$id/cells';
  static const String plannerGoals = '/planner/goals';
  static String plannerGoal(String id) => '/planner/goals/$id';
  static const String plans = '/plans';

  static String planById(String id) => '/plans/$id';
  static String planItems(String planId) => '/plans/$planId/items';
  static String planItemBuy(String planId, String itemId) => '/plans/$planId/items/$itemId/buy';
  static String planItem(String planId, String itemId) => '/plans/$planId/items/$itemId';

  static String investmentById(String id) => '/investments/$id';
  static String investmentContributions(String id) => '/investments/$id/contributions';
  static String investmentContributionById(String id, String cid) =>
      '/investments/$id/contributions/$cid';
  static String investmentPlanCategoryContributions(String categoryId) =>
      '/investment-plan/categories/$categoryId/contributions';

  static String loanPayments(String loanId) => '/loans/$loanId/payments';
  static String loanTopUps(String loanId) => '/loans/$loanId/top-ups';
  static String loanWriteOff(String loanId) => '/loans/$loanId/write-off';
  static String loanPaymentById(String loanId, String paymentId) =>
      '/loans/$loanId/payments/$paymentId';
  static String expenseById(String id) => '/expenses/$id';
  static String incomeById(String id) => '/income/$id';
  static String taskById(String id) => '/tasks/$id';
  static String projectById(String id) => '/projects/$id';
  static String projectTasks(String projectId) => '/projects/$projectId/tasks';
  static String projectTaskById(String projectId, String taskId) =>
      '/projects/$projectId/tasks/$taskId';
  static String tagById(String id) => '/tags/$id';
}
