import 'package:flutter/material.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'api.dart';

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
    api.onUnauthorized = expireSession;
  }

  final Api api;
  final SharedPreferences preferences;
  final FlutterSecureStorage storage;
  Json? user;
  bool ready = false;
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
    startupError = null;
    notifyListeners();
  }

  void expireSession() {
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
      await storage.delete(key: 'auth_token');
      notifyListeners();
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
