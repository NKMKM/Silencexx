import 'dart:async';
import 'package:flutter/material.dart';
import 'package:flutter/foundation.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';
import 'package:sign_in_with_apple/sign_in_with_apple.dart';
import 'package:silencexx/screens/auth_screen.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:silencexx/core/api.dart';
import 'package:silencexx/core/app_state.dart';
import 'package:silencexx/core/theme.dart';
import 'package:silencexx/widgets/common.dart';
import 'package:silencexx/widgets/studio.dart';
import 'package:silencexx/screens/subscription_screen.dart';

void main() {
  Future<void> mount(
    WidgetTester tester,
    Widget child, {
    bool reduced = false,
    Api? api,
  }) async {
    SharedPreferences.setMockInitialValues({});
    final state = AppState(
      api: api ?? Api(),
      preferences: await SharedPreferences.getInstance(),
    )..language = 'en';
    await tester.pumpWidget(
      AppScope(
        state: state,
        child: MaterialApp(
          theme: auroraTheme(Brightness.dark),
          home: Scaffold(
            body: MediaQuery(
              data: MediaQueryData(disableAnimations: reduced),
              child: child,
            ),
          ),
        ),
      ),
    );
  }

  testWidgets(
    'refresh and retry keep an edited form mounted and show stale content',
    (tester) async {
      final requests = <Completer<Json>>[];
      await mount(
        tester,
        AsyncPanel(
          load: () {
            final request = Completer<Json>();
            requests.add(request);
            return request.future;
          },
          builder: (context, data, reload) => Column(
            children: [
              Text('${data['name']}'),
              const TextField(key: ValueKey('draft')),
              TextButton(onPressed: reload, child: const Text('Refresh')),
            ],
          ),
        ),
      );
      requests.first.complete({'name': 'First result'});
      await tester.pumpAndSettle();
      await tester.enterText(
        find.byKey(const ValueKey('draft')),
        'Keep this thought',
      );
      await tester.tap(find.text('Refresh'));
      await tester.pump();
      expect(find.text('First result'), findsOneWidget);
      expect(find.text('Keep this thought'), findsOneWidget);
      requests[1].completeError(StateError('network unavailable'));
      await tester.pumpAndSettle();
      expect(find.text('Keep this thought'), findsOneWidget);
      expect(
        find.text('Could not refresh. Showing your previous data.'),
        findsOneWidget,
      );
      await tester.tap(find.text('Retry'));
      await tester.pump();
      requests[2].complete({'name': 'Fresh result'});
      await tester.pumpAndSettle();
      expect(find.text('Fresh result'), findsOneWidget);
      expect(find.text('Keep this thought'), findsOneWidget);
      expect(tester.takeException(), isNull);
    },
  );

  for (final reduced in [false, true]) {
    testWidgets(
      'closed disclosures exclude form focus and toggle safely (reduced=$reduced)',
      (tester) async {
        final node = FocusNode();
        addTearDown(node.dispose);
        await mount(
          tester,
          StudioDisclosure(
            title: const Text('Security'),
            children: [TextField(focusNode: node)],
          ),
          reduced: reduced,
        );
        await tester.pumpAndSettle();
        expect(node.canRequestFocus, isFalse);
        await tester.tap(find.text('Security'));
        await tester.pumpAndSettle();
        expect(node.canRequestFocus, isTrue);
        await tester.tap(find.text('Security'));
        await tester.pumpAndSettle();
        expect(node.canRequestFocus, isFalse);
        expect(tester.takeException(), isNull);
        await tester.pumpWidget(const SizedBox.shrink());
      },
    );
  }

  testWidgets(
    'disabled action rows cannot activate and press cancellation does not submit',
    (tester) async {
      var activations = 0;
      await mount(
        tester,
        Column(
          children: [
            StudioRow(
              title: const Text('Unavailable'),
              enabled: false,
              onTap: () => activations++,
            ),
            StudioRow(
              title: const Text('Available'),
              onTap: () => activations++,
            ),
          ],
        ),
      );
      await tester.tap(find.text('Unavailable'));
      expect(activations, 0);
      final gesture = await tester.startGesture(
        tester.getCenter(find.text('Available')),
      );
      await tester.pump(const Duration(milliseconds: 40));
      await gesture.cancel();
      await tester.pumpAndSettle();
      expect(activations, 0);
      await tester.tap(find.text('Available'));
      expect(activations, 1);
    },
  );
  testWidgets(
    'long modal content and title remain readable at 2x text in landscape',
    (tester) async {
      tester.view.physicalSize = const Size(844, 390);
      tester.view.devicePixelRatio = 1;
      addTearDown(tester.view.resetPhysicalSize);
      addTearDown(tester.view.resetDevicePixelRatio);
      await mount(
        tester,
        MediaQuery(
          data: const MediaQueryData(
            size: Size(844, 390),
            textScaler: TextScaler.linear(2),
            disableAnimations: true,
          ),
          child: Builder(
            builder: (context) => TextButton(
              onPressed: () => showAppDialog<void>(
                context: context,
                builder: (context) => MediaQuery(
                  data: const MediaQueryData(
                    size: Size(844, 390),
                    textScaler: TextScaler.linear(2),
                    disableAnimations: true,
                  ),
                  child: AppDialog(
                    title: const Text(
                      'An important account decision with a longer explanation',
                    ),
                    content: Text(
                      List.filled(
                        12,
                        'This information must stay readable.',
                      ).join(' '),
                    ),
                    actions: [
                      TextButton(
                        onPressed: () => Navigator.pop(context),
                        child: const Text('Cancel'),
                      ),
                      FilledButton(
                        onPressed: () {},
                        child: const Text('Confirm'),
                      ),
                    ],
                  ),
                ),
              ),
              child: const Text('Open'),
            ),
          ),
        ),
      );
      await tester.tap(find.text('Open'));
      await tester.pumpAndSettle();
      expect(tester.takeException(), isNull);
      expect(find.text('Cancel'), findsOneWidget);
      await tester.tap(find.text('Cancel'));
      await tester.pumpAndSettle();
      expect(find.text('Open'), findsOneWidget);
    },
  );
  testWidgets('payment remains unavailable after redesign', (tester) async {
    await mount(
      tester,
      const PaymentScreen(plan: {'name': 'Plus', 'price_monthly': 499}),
    );
    await tester.pumpAndSettle();
    final button = tester.widget<FilledButton>(find.byType(FilledButton));
    expect(button.onPressed, isNull);
    expect(find.text('Payments are not available yet'), findsOneWidget);
    expect(tester.takeException(), isNull);
  });
  testWidgets('failed actions recover their enabled state and can be retried', (
    tester,
  ) async {
    var attempts = 0;
    await mount(
      tester,
      ActionButton(
        label: 'Save',
        action: () async {
          attempts++;
          if (attempts == 1) throw const ApiException('Please try again');
        },
      ),
    );
    await tester.tap(find.text('Save'));
    await tester.pumpAndSettle();
    expect(find.text('Please try again'), findsOneWidget);
    expect(
      tester.widget<FilledButton>(find.byType(FilledButton)).onPressed,
      isNotNull,
    );
    await tester.tap(find.text('Save'));
    await tester.pumpAndSettle();
    expect(attempts, 2);
    expect(tester.takeException(), isNull);
  });

  testWidgets(
    'auth preserves fields and disables provider actions while email sign-up is pending',
    (tester) async {
      debugDefaultTargetPlatformOverride = TargetPlatform.iOS;
      try {
        final pending = Completer<http.Response>();
        final api = Api(client: MockClient((_) => pending.future));
        addTearDown(api.close);
        await mount(tester, const AuthScreen(), api: api, reduced: true);
        final fields = find.byType(TextField);
        for (var i = 0; i < 4; i++) {
          await tester.enterText(
            fields.at(i),
            ['alex@example.test', 'alex', 'ReadyPass123', 'ReadyPass123'][i],
          );
        }
        final submit = find.widgetWithText(FilledButton, 'Create account');
        await tester.ensureVisible(submit);
        await tester.tap(submit);
        await tester.pump();
        await tester.pump(const Duration(milliseconds: 100));
        expect(tester.widget<FilledButton>(submit).onPressed, isNull);
        final apple = tester.element(find.byType(SignInWithAppleButton));
        expect(
          apple.findAncestorWidgetOfExactType<IgnorePointer>()!.ignoring,
          isTrue,
        );
        expect(find.text('alex@example.test'), findsOneWidget);
        pending.completeError(const ApiException('Connection failed'));
        await tester.pumpAndSettle();
        expect(tester.widget<FilledButton>(submit).onPressed, isNotNull);
        expect(find.text('alex@example.test'), findsOneWidget);
        expect(tester.takeException(), isNull);
      } finally {
        debugDefaultTargetPlatformOverride = null;
      }
    },
  );
}
