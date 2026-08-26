class StorageKeys {
  StorageKeys._();

  // Secure storage (flutter_secure_storage)
  static const String accessToken = 'access_token';
  static const String refreshToken = 'refresh_token';

  /// Origin of the self-hosted server this install talks to, set on first launch.
  static const String serverUrl = 'server_url';

  // Shared preferences (non-sensitive)
  static const String recentCategories = 'recent_categories';
  static const String selectedTheme = 'selected_theme';
}
