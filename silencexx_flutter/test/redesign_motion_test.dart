import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:silencexx/core/chat_workspace.dart';
import 'package:silencexx/widgets/chat_visuals.dart';
import 'package:silencexx/widgets/common.dart';

Widget harness(Widget child, {bool reducedMotion = false}) => MaterialApp(
  home: MediaQuery(
    data: MediaQueryData(disableAnimations: reducedMotion),
    child: Scaffold(body: child),
  ),
);

void main() {
  testWidgets('idle conversation does not continually schedule frames', (
    tester,
  ) async {
    await tester.pumpWidget(
      harness(const ChatAtmosphere(child: Text('Conversation'))),
    );
    await tester.pumpAndSettle();
    await tester.pump(const Duration(seconds: 2));
    expect(tester.binding.hasScheduledFrame, isFalse);
    expect(find.text('Conversation'), findsOneWidget);
  });

  testWidgets('thinking animates then settles when conversation becomes idle', (
    tester,
  ) async {
    await tester.pumpWidget(
      harness(
        const ChatAtmosphere(
          phase: ReplyPhase.thinking,
          child: Text('Conversation'),
        ),
      ),
    );
    await tester.pump(const Duration(milliseconds: 100));
    expect(tester.binding.hasScheduledFrame, isTrue);
    await tester.pumpWidget(
      harness(const ChatAtmosphere(child: Text('Conversation'))),
    );
    await tester.pumpAndSettle();
    expect(tester.binding.hasScheduledFrame, isFalse);
  });

  testWidgets('reduced motion keeps thinking and recording background static', (
    tester,
  ) async {
    await tester.pumpWidget(
      harness(
        const ChatAtmosphere(
          phase: ReplyPhase.thinking,
          recording: true,
          child: Text('Conversation'),
        ),
        reducedMotion: true,
      ),
    );
    await tester.pumpAndSettle();
    await tester.pump(const Duration(seconds: 2));
    expect(tester.binding.hasScheduledFrame, isFalse);
    expect(find.text('Conversation'), findsOneWidget);
  });

  for (final reducedMotion in [false, true]) {
    testWidgets(
      'action is submitted once while pending (reduced=$reducedMotion)',
      (tester) async {
        final pending = Completer<void>();
        var requests = 0;
        await tester.pumpWidget(
          harness(
            Center(
              child: ActionButton(
                label: 'Save',
                action: () async {
                  requests++;
                  await pending.future;
                },
              ),
            ),
            reducedMotion: reducedMotion,
          ),
        );
        await tester.tap(find.text('Save'));
        await tester.pump();
        expect(requests, 1);
        expect(find.byType(CircularProgressIndicator), findsOneWidget);
        await tester.tap(find.text('Save'));
        await tester.pump(const Duration(milliseconds: 300));
        expect(requests, 1);
        if (reducedMotion) {
          expect(find.byKey(const ValueKey('icon')), findsNothing);
        }
        pending.complete();
        await tester.pumpAndSettle();
        expect(find.byType(CircularProgressIndicator), findsNothing);
        await tester.tap(find.text('Save'));
        await tester.pumpAndSettle();
        expect(requests, 2);
        expect(tester.takeException(), isNull);
      },
    );
  }
}
