import 'package:flutter/material.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'api.dart';
import 'home_widget_service.dart';

class AppState extends ChangeNotifier {
  AppState({
    required this.api,
    required this.preferences,
    FlutterSecureStorage? storage,
  }) : storage = storage ?? const FlutterSecureStorage() {
    language = preferences.getString('language') ?? 'ru';
    themeMode = ThemeMode.values.firstWhere(
      (m) => m.name == preferences.getString('theme'),
      orElse: () => ThemeMode.dark,
    );
    disclaimerAccepted = preferences.getBool('disclaimer_accepted') ?? false;
    api.onUnauthorized = expireSession;
  }

  @override
  void notifyListeners() {
    if (ready) {
      HomeWidgetService.sync(
        token: api.token,
        language: language,
        baseUrl: api.baseUrl,
      );
    }
    super.notifyListeners();
  }

  final Api api;
  final SharedPreferences preferences;
  final FlutterSecureStorage storage;
  Json? user;
  bool ready = false;
  late bool disclaimerAccepted;
  bool needsOnboarding = false;
  bool needsProductTour = false;
  String get onboardingKey => 'wellness_onboarding_completed.${user?['id']}';
  String get onboardingPendingKey =>
      'wellness_onboarding_pending.${user?['id']}';
  String get tourPendingKey => 'product_tour_pending.v1.${user?['id']}';
  String? startupError;
  late String language;
  late ThemeMode themeMode;
  bool get authenticated => api.token != null;
  String tr(String ru, String en) => language == 'ru' ? ru : en;

  Future<void> restore() async {
    startupError = null;
    ready = false;
    notifyListeners();
    try {
      api.token = await storage.read(key: 'auth_token');
      if (authenticated) {
        final response = await api.call('/auth/profile');
        user = response['user'] as Json?;
        needsOnboarding = preferences.getBool(onboardingPendingKey) == true;
        needsProductTour = preferences.getBool(tourPendingKey) == true;
      }
    } on ApiException catch (e) {
      if (e.status != 401) startupError = e.message;
    } catch (_) {
      startupError = tr(
        'Не удалось открыть защищённое хранилище.',
        'Could not open secure storage.',
      );
    }
    ready = true;
    notifyListeners();
  }

  Future<void> acceptAuth(Json response) async {
    final token = response['token'] as String?;
    if (token == null || token.isEmpty) {
      throw const ApiException('Authentication token missing');
    }
    await storage.write(key: 'auth_token', value: token);
    api.token = token;
    user = response['user'] as Json?;
    if (response['isNewUser'] == true &&
        preferences.getBool(onboardingKey) != true) {
      await preferences.setBool(onboardingPendingKey, true);
    }
    needsOnboarding = preferences.getBool(onboardingPendingKey) == true;
    needsProductTour = preferences.getBool(tourPendingKey) == true;
    startupError = null;
    notifyListeners();
  }

  Future<void> finishOnboarding({List<String> interests = const []}) async {
    await preferences.setStringList('wellness_interests', interests);
    await preferences.setBool('wellness_onboarding_completed', true);
    await preferences.setBool(onboardingKey, true);
    await preferences.setBool(tourPendingKey, true);
    await preferences.remove(onboardingPendingKey);
    needsProductTour = true;
    needsOnboarding = false;
    notifyListeners();
  }

  Future<void> finishProductTour() async {
    await preferences.remove(tourPendingKey);
    needsProductTour = false;
    notifyListeners();
  }

  Future<void> restartProductTour() async {
    await preferences.setBool(tourPendingKey, true);
    needsProductTour = true;
    notifyListeners();
  }

  Future<void> accountDeleted() async {
    await preferences.remove(onboardingKey);
    await preferences.remove(onboardingPendingKey);
    await preferences.remove(tourPendingKey);
    needsProductTour = false;
    api.token = null;
    user = null;
    needsOnboarding = false;
    await storage.delete(key: 'auth_token');
    for (final key in [
      'wellness_interests',
      'wellness_onboarding_completed',
      'reminder_enabled',
      'reminder_hour',
      'reminder_minute',
    ]) {
      await preferences.remove(key);
    }
    notifyListeners();
  }

  Future<void> acceptDisclaimer() async {
    await preferences.setBool('disclaimer_accepted', true);
    disclaimerAccepted = true;
    notifyListeners();
  }

  void expireSession() {
    needsProductTour = false;
    needsOnboarding = false;
    api.token = null;
    user = null;
    storage.delete(key: 'auth_token').catchError((_) {});
    notifyListeners();
  }

  Future<void> logout() async {
    try {
      await api.call('/auth/logout', method: 'POST');
    } finally {
      api.token = null;
      user = null;
      try {
        await storage.delete(key: 'auth_token');
      } finally {
        notifyListeners();
      }
    }
  }

  Future<void> setLanguage(String value) async {
    await preferences.setString('language', value);
    language = value;
    notifyListeners();
  }

  void updateUser(Json changes) {
    user = {...?user, ...changes};
    notifyListeners();
  }

  Future<void> setTheme(ThemeMode value) async {
    await preferences.setString('theme', value.name);
    themeMode = value;
    notifyListeners();
  }
}

class AppScope extends InheritedNotifier<AppState> {
  const AppScope({super.key, required AppState state, required super.child})
    : super(notifier: state);
  static AppState of(BuildContext context) =>
      context.dependOnInheritedWidgetOfExactType<AppScope>()!.notifier!;
}

extension AppContext on BuildContext {
  AppState get app => AppScope.of(this);
  String tr(String ru, String en) => app.tr(ru, en);
}
