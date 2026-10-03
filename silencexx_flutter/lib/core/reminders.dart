import 'package:flutter/foundation.dart';
import 'package:flutter_local_notifications/flutter_local_notifications.dart';
import 'package:flutter_timezone/flutter_timezone.dart';
import 'package:timezone/data/latest.dart' as tzdata;
import 'package:timezone/timezone.dart' as tz;
import 'api.dart';

class Reminders {
  static final plugin = FlutterLocalNotificationsPlugin();
  static bool initialized = false;
  static bool get supported =>
      !kIsWeb &&
      (defaultTargetPlatform == TargetPlatform.android ||
          defaultTargetPlatform == TargetPlatform.iOS);
  static Future<void> initialize() async {
    if (!supported || initialized) return;
    tzdata.initializeTimeZones();
    tz.setLocalLocation(
      tz.getLocation(await FlutterTimezone.getLocalTimezone()),
    );
    await plugin.initialize(
      const InitializationSettings(
        android: AndroidInitializationSettings('@drawable/ic_notification'),
        iOS: DarwinInitializationSettings(
          requestAlertPermission: false,
          requestBadgePermission: false,
          requestSoundPermission: false,
        ),
      ),
    );
    initialized = true;
  }

  static Future<void> daily(int hour, int minute, String body) async {
    if (!supported) {
      throw const ApiException('Reminders are available on Android and iOS');
    }
    await initialize();
    final android = plugin
        .resolvePlatformSpecificImplementation<
          AndroidFlutterLocalNotificationsPlugin
        >();
    final ios = plugin
        .resolvePlatformSpecificImplementation<
          IOSFlutterLocalNotificationsPlugin
        >();
    final allowed = android != null
        ? await android.requestNotificationsPermission()
        : await ios?.requestPermissions(alert: true, badge: true, sound: true);
    if (allowed != true) {
      throw const ApiException('Notification permission is required');
    }
    final now = tz.TZDateTime.now(tz.local);
    var next = tz.TZDateTime(
      tz.local,
      now.year,
      now.month,
      now.day,
      hour,
      minute,
    );
    if (!next.isAfter(now)) {
      next = tz.TZDateTime(
        tz.local,
        now.year,
        now.month,
        now.day + 1,
        hour,
        minute,
      );
    }
    await plugin.zonedSchedule(
      1,
      'CloudMind',
      body,
      next,
      const NotificationDetails(
        android: AndroidNotificationDetails(
          'journal_reminder',
          'Journal reminders',
          channelDescription: 'Daily reminder to reflect on your day',
        ),
        iOS: DarwinNotificationDetails(),
      ),
      androidScheduleMode: AndroidScheduleMode.inexactAllowWhileIdle,
      matchDateTimeComponents: DateTimeComponents.time,
    );
  }

  static Future<void> cancel() async {
    await initialize();
    if (supported) await plugin.cancel(1);
  }
}
