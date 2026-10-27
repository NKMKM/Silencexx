import 'studio.dart';
import 'dart:math' as math;
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_markdown_plus/flutter_markdown_plus.dart';
import 'package:share_plus/share_plus.dart';
import 'package:url_launcher/url_launcher.dart';
import '../core/app_state.dart';
import '../core/chat_workspace.dart';
import '../core/theme/app_colors.dart';
import 'common.dart';
import 'glass.dart';

Future<void> shareChatText(BuildContext context, String text) async {
  final box = context.findRenderObject() as RenderBox?;
  try {
    await SharePlus.instance.share(
      ShareParams(
        text: text,
        sharePositionOrigin: box == null
            ? null
            : box.localToGlobal(Offset.zero) & box.size,
      ),
    );
  } catch (error) {
    if (context.mounted) showError(context, error);
  }
}

/// Only this isolated painter ticks; the conversation is not rebuilt each frame.
class ChatAtmosphere extends StatefulWidget {
  const ChatAtmosphere({
    super.key,
    required this.child,
    this.phase = ReplyPhase.idle,
    this.recording = false,
  });
  final Widget child;
  final ReplyPhase phase;
  final bool recording;
  @override
  State<ChatAtmosphere> createState() => _ChatAtmosphereState();
}

class _ChatAtmosphereState extends State<ChatAtmosphere>
    with SingleTickerProviderStateMixin, WidgetsBindingObserver {
  late final controller = AnimationController(
    vsync: this,
    duration: const Duration(seconds: 32),
  );
  bool foreground = true;
  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addObserver(this);
  }

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    updateMotion();
  }

  @override
  void didUpdateWidget(covariant ChatAtmosphere oldWidget) {
    super.didUpdateWidget(oldWidget);
    updateMotion();
  }

  void updateMotion() {
    if ((widget.recording || widget.phase == ReplyPhase.thinking) &&
        foreground &&
        TickerMode.valuesOf(context).enabled &&
        !MediaQuery.disableAnimationsOf(context) &&
        !MediaQuery.highContrastOf(context)) {
      if (!controller.isAnimating) controller.repeat();
    } else {
      controller.stop();
    }
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    foreground = state == AppLifecycleState.resumed;
    if (mounted) updateMotion();
  }

  @override
  void dispose() {
    WidgetsBinding.instance.removeObserver(this);
    controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) => Stack(
    fit: StackFit.expand,
    children: [
      Positioned.fill(
        child: IgnorePointer(
          child: RepaintBoundary(
            child: AnimatedOpacity(
              duration: MediaQuery.disableAnimationsOf(context)
                  ? Duration.zero
                  : const Duration(milliseconds: 800),
              opacity: MediaQuery.highContrastOf(context)
                  ? 0
                  : widget.recording
                  ? .85
                  : widget.phase == ReplyPhase.thinking
                  ? .9
                  : .5,
              child: CustomPaint(
                painter: _AtmospherePainter(
                  controller,
                  Theme.of(context).brightness == Brightness.dark,
                ),
              ),
            ),
          ),
        ),
      ),
      widget.child,
    ],
  );
}

class _AtmospherePainter extends CustomPainter {
  _AtmospherePainter(this.animation, this.dark) : super(repaint: animation);
  final Animation<double> animation;
  final bool dark;
  @override
  void paint(Canvas canvas, Size size) {
    final angle = animation.value * math.pi * 2;
    final radius = size.longestSide * .5;
    for (var i = 0; i < 2; i++) {
      final center = Offset(
        size.width * (.35 + .26 * math.sin(angle + i * math.pi)),
        size.height * (.35 + .3 * math.cos(angle + i * 2)),
      );
      canvas.drawCircle(
        center,
        radius,
        Paint()
          ..shader = RadialGradient(
            colors: [
              (i == 0 ? AppColors.primary : AppColors.primaryBright).withValues(
                alpha: dark ? .045 : .04,
              ),
              Colors.transparent,
            ],
          ).createShader(Rect.fromCircle(center: center, radius: radius)),
      );
    }
  }

  @override
  bool shouldRepaint(_AtmospherePainter oldDelegate) =>
      oldDelegate.dark != dark;
}

class AiActivity extends StatefulWidget {
  const AiActivity({super.key, required this.label, this.wave = false});
  final String label;
  final bool wave;
  @override
  State<AiActivity> createState() => _AiActivityState();
}

class _AiActivityState extends State<AiActivity>
    with SingleTickerProviderStateMixin {
  late final controller = AnimationController(
    vsync: this,
    duration: const Duration(milliseconds: 1400),
  );
  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    if (MediaQuery.disableAnimationsOf(context) ||
        !TickerMode.valuesOf(context).enabled) {
      controller.stop();
    } else {
      controller.repeat();
    }
  }

  @override
  void dispose() {
    controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) => Semantics(
    liveRegion: true,
    label: widget.label,
    child: ExcludeSemantics(
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          AnimatedBuilder(
            animation: controller,
            builder: (context, _) => SizedBox(
              width: widget.wave ? 62 : 34,
              height: 24,
              child: Row(
                mainAxisAlignment: MainAxisAlignment.spaceEvenly,
                children: [
                  for (var i = 0; i < (widget.wave ? 9 : 3); i++)
                    Container(
                      width: widget.wave ? 3 : 5,
                      height: widget.wave
                          ? 5 +
                                17 *
                                    (.5 +
                                        .5 *
                                            math.sin(
                                              controller.value * math.pi * 2 +
                                                  i,
                                            ))
                          : 5,
                      decoration: BoxDecoration(
                        borderRadius: BorderRadius.circular(4),
                        color: AppColors.primaryBright.withValues(
                          alpha:
                              .35 +
                              .65 *
                                  (.5 +
                                      .5 *
                                          math.sin(
                                            controller.value * math.pi * 2 + i,
                                          )),
                        ),
                      ),
                    ),
                ],
              ),
            ),
          ),
          const SizedBox(width: 10),
          Flexible(
            child: Text(
              widget.label,
              style: Theme.of(context).textTheme.bodySmall,
            ),
          ),
        ],
      ),
    ),
  );
}

class MessageContent extends StatelessWidget {
  const MessageContent({super.key, required this.text});
  final String text;
  @override
  Widget build(BuildContext context) {
    final blocks = <Widget>[];
    var offset = 0;
    final pattern = RegExp(r'```([^\n]*)\n([\s\S]*?)(?:```|$)');
    for (final match in pattern.allMatches(text)) {
      if (match.start > offset) {
        blocks.add(_markdown(context, text.substring(offset, match.start)));
      }
      blocks.add(
        _CodeBlock(
          language: match.group(1)!.trim(),
          code: match.group(2)!.trimRight(),
        ),
      );
      offset = match.end;
    }
    if (offset < text.length) {
      blocks.add(_markdown(context, text.substring(offset)));
    }
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: blocks,
    );
  }

  Widget _markdown(BuildContext context, String data) => MarkdownBody(
    data: data,
    selectable: true,
    styleSheet: MarkdownStyleSheet.fromTheme(Theme.of(context)).copyWith(
      p: Theme.of(context).textTheme.bodyLarge?.copyWith(height: 1.5),
      code: TextStyle(
        fontFamily: 'monospace',
        fontSize: 14,
        backgroundColor: Theme.of(context).colorScheme.surfaceContainerHigh,
      ),
      tableColumnWidth: const IntrinsicColumnWidth(),
      blockSpacing: 12,
      blockquoteDecoration: BoxDecoration(
        color: Theme.of(context).colorScheme.primary.withValues(alpha: .08),
        border: Border(
          left: BorderSide(
            color: Theme.of(context).colorScheme.primary,
            width: 2,
          ),
        ),
      ),
    ),
    onTapLink: (text, href, title) async {
      final uri = Uri.tryParse(href ?? '');
      if (uri == null || !['http', 'https', 'mailto'].contains(uri.scheme)) {
        return;
      }
      final failureMessage = context.tr(
        'Не удалось открыть ссылку',
        'Could not open link',
      );
      try {
        if (!await launchUrl(uri, mode: LaunchMode.externalApplication)) {
          throw Exception(failureMessage);
        }
      } catch (error) {
        if (context.mounted) showError(context, error);
      }
    },
  );
}

class _CodeBlock extends StatefulWidget {
  const _CodeBlock({required this.language, required this.code});
  final String language, code;
  @override
  State<_CodeBlock> createState() => _CodeBlockState();
}

class _CodeBlockState extends State<_CodeBlock> {
  bool copied = false;
  @override
  void didUpdateWidget(_CodeBlock oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.code != widget.code) copied = false;
  }

  @override
  Widget build(BuildContext context) => Container(
    margin: const EdgeInsets.symmetric(vertical: 12),
    clipBehavior: Clip.antiAlias,
    decoration: BoxDecoration(
      color: Theme.of(context).colorScheme.surface,
      borderRadius: BorderRadius.circular(18),
      border: Border.all(color: Theme.of(context).dividerColor),
    ),
    child: Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Padding(
          padding: const EdgeInsets.only(left: 16, right: 8),
          child: Row(
            children: [
              Expanded(
                child: Text(
                  widget.language.isEmpty ? 'Code' : widget.language,
                  style: Theme.of(context).textTheme.labelMedium,
                ),
              ),
              IconButton(
                tooltip: context.tr('Копировать код', 'Copy code'),
                icon: AnimatedSwitcher(
                  duration: studioDuration(context),
                  child: Icon(
                    copied ? Icons.check_rounded : Icons.copy_outlined,
                    key: ValueKey(copied),
                    size: 16,
                  ),
                ),
                onPressed: () async {
                  await Clipboard.setData(ClipboardData(text: widget.code));
                  if (mounted) setState(() => copied = true);
                },
              ),
            ],
          ),
        ),
        const Divider(height: 1),
        SingleChildScrollView(
          scrollDirection: Axis.horizontal,
          padding: const EdgeInsets.all(16),
          child: SelectableText(
            widget.code,
            style: const TextStyle(
              fontFamily: 'monospace',
              fontSize: 13,
              height: 1.6,
            ),
          ),
        ),
      ],
    ),
  );
}

Future<void> showModelPicker(
  BuildContext context,
  ConversationSession session,
) => showAppDialog<void>(
  context: context,
  builder: (context) => AppDialog(
    title: Text(context.tr('Модель', 'Model')),
    content: Column(
      mainAxisSize: MainAxisSize.min,
      children: [
        for (final model in chatModels)
          StudioRow(
            enabled: model.available,
            leading: Icon(
              model.available
                  ? Icons.auto_awesome_outlined
                  : Icons.hexagon_outlined,
              size: 20,
            ),
            title: Text(model.name),
            subtitle: Text(
              model.available
                  ? context.tr('Подключена', 'Connected')
                  : context.tr('Пока недоступна', 'Not available yet'),
            ),
            trailing: model.id == session.modelId
                ? const Icon(Icons.check_rounded, size: 18)
                : null,
            onTap: model.available
                ? () {
                    session.modelId = model.id;
                    session.changed();
                    Navigator.pop(context);
                  }
                : null,
          ),
      ],
    ),
  ),
);

class FloatingActionMenu extends StatelessWidget {
  const FloatingActionMenu({super.key, required this.children});
  final List<Widget> children;
  @override
  Widget build(BuildContext context) => GlassSurface(
    opacity: .98,
    blur: 0,
    radius: 20,
    padding: const EdgeInsets.all(6),
    child: Column(
      mainAxisSize: MainAxisSize.min,
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: children,
    ),
  );
}
