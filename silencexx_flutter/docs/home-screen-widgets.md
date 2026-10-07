# Home screen daily wish

The widget is native: WidgetKit on iOS 15+, RemoteViews and WorkManager on Android.
There is no daily wish card in the chat. Both widgets call the authenticated
`GET /api/daily-wish?language=ru|en&offset=<minutes east of UTC>` endpoint.
The server derives the local date and persists one wish per user/date/language
in PostgreSQL. Identical wishes for different users or days are allowed.
The existing Ollama configuration is used. Restart the updated backend before testing.
The DB role needs CREATE TABLE permission on first use of `daily_wishes`.
Both backend copies contain the endpoint because this repository has two entry points.

## iOS

Open `ios/Runner.xcworkspace` in Xcode. The `DailyWishWidget` extension target
is already added as a Runner dependency and embedded in the application.
Select the same Apple development team for Runner and DailyWishWidget.
Enable/register App Group `group.com.silencexx.silencexx` for both App IDs
and refresh their provisioning profiles. Both targets also share the Keychain
group `$(AppIdentifierPrefix)com.silencexx.silencexx.widgets`.
Credentials are stored in the shared Keychain, not App Group preferences.
The extension reads only the token for the currently signed-in account.
The extension inherits FLUTTER_BUILD_NUMBER and FLUTTER_BUILD_NAME from
Flutter/Generated.xcconfig so its version stays in sync with Runner.

Build and install the application, open it and sign in. Long-press the Home
Screen → Add Widget → CloudMind → choose small or medium. Rebuild the native
app after changes; hot reload cannot install the extension.
WidgetKit requests the next timeline at local midnight; the OS controls when
it actually runs. Network failures retry after 30 minutes. A midnight timeline
entry hides yesterday's wish while a replacement is being fetched.

## Android

Requires an Android SDK and the project's usual Flutter/Gradle toolchain.
Build/install the app, open it and sign in. Long-press the Home screen → Widgets
→ CloudMind → A wish for today. The widget can be resized and tapped to open
CloudMind. It updates immediately when added and checks for the day's wish
through network-constrained WorkManager work hourly. The backend cache avoids
repeat AI generation. Android power management may delay background work;
force-stopping the app suspends updates until the app is opened again.
Account, language, URL and display cache use app-private preferences, with
Android backup disabled in the manifest. No credentials are in widget XML.

## Session behavior and validation

Changing account or app language clears the previous display before requesting
new text. Signing out, deleting an account or receiving HTTP 401 clears the
widget credentials and message. Old in-flight responses are rejected after an
account/language change. Offline failures do not replace a valid current-day
wish; stale messages are not presented as today's wish on the next update.

Verify on devices: add two widget instances; reopen the app; switch RU/EN;
switch accounts; sign out; disable connectivity; cross local midnight; reboot
Android; check a slow first Ollama response. Flutter bridge regression tests:
`flutter test test/home_widget_test.dart`.

## iOS gallery troubleshooting

Check the icon's system “Require Face ID” setting first. During on-device
investigation, SpringBoard reported AppProtection shields for CloudMind even
while WidgetKit had a valid descriptor for both supported families. The user
confirmed that disabling “Require Face ID” made the widget appear in the gallery.
Ask the user to test with “Don't Require Face ID”; do not change their privacy
setting automatically. Descriptor registration alone does not prove gallery visibility.
The extension includes CFBundleDevelopmentRegion and CFBundleInfoDictionaryVersion;
validate the built app and appex versions before installation.
