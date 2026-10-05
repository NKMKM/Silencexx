import 'package:flutter/material.dart';
import '../core/app_state.dart';
import '../core/theme/app_colors.dart';
import '../core/theme/app_motion.dart';
import 'common.dart';
import 'glass.dart';

class AppNavigation extends StatefulWidget {
  const AppNavigation({
    super.key,
    required this.selected,
    required this.onSelected,
    required this.labels,
    required this.icons,
    this.vertical = false,
  });
  final int selected;
  final ValueChanged<int> onSelected;
  final List<String> labels;
  final List<IconData> icons;
  final bool vertical;
  @override
  State<AppNavigation> createState() => _AppNavigationState();
}

class _AppNavigationState extends State<AppNavigation> {
  bool expanded = true;
  @override
  Widget build(BuildContext context) {
    final duration = MediaQuery.disableAnimationsOf(context)
        ? Duration.zero
        : AppMotion.screen;
    final dark = Theme.of(context).brightness == Brightness.dark;
    Widget destinations(bool showLabels) => LayoutBuilder(
      builder: (context, constraints) {
        const rowHeight = 60.0;
        final itemWidth = widget.vertical
            ? constraints.maxWidth
            : constraints.maxWidth / widget.labels.length;
        return SizedBox(
          height: widget.vertical ? rowHeight * widget.labels.length : 68,
          child: Stack(
            children: [
              AnimatedPositioned(
                duration: duration,
                curve: AppMotion.enter,
                top: widget.vertical ? widget.selected * rowHeight + 4 : 4,
                left: widget.vertical ? 4 : widget.selected * itemWidth + 4,
                width: itemWidth - 8,
                height: widget.vertical ? rowHeight - 8 : 60,
                child: DecoratedBox(
                  decoration: BoxDecoration(
                    borderRadius: BorderRadius.circular(16),
                    color: dark
                        ? Colors.white.withValues(alpha: .085)
                        : Colors.white.withValues(alpha: .85),
                    border: Border.all(
                      color: dark
                          ? const Color(0x18FFFFFF)
                          : const Color(0x0D000000),
                    ),
                    boxShadow: const [
                      BoxShadow(
                        color: Color(0x12000000),
                        blurRadius: 8,
                        offset: Offset(0, 3),
                      ),
                    ],
                  ),
                ),
              ),
              for (var i = 0; i < widget.labels.length; i++)
                Positioned(
                  left: widget.vertical ? 0 : i * itemWidth,
                  top: widget.vertical ? i * rowHeight : 0,
                  width: itemWidth,
                  height: widget.vertical ? rowHeight : 68,
                  child: Semantics(
                    selected: i == widget.selected,
                    button: true,
                    child: Tooltip(
                      message: widget.labels[i],
                      child: PressScale(
                        child: Material(
                          color: Colors.transparent,
                          child: InkWell(
                            borderRadius: BorderRadius.circular(16),
                            onTap: () => widget.onSelected(i),
                            child: IconTheme(
                              data: IconThemeData(
                                size: 22,
                                color: i == widget.selected
                                    ? (dark
                                          ? AppColors.primaryBright
                                          : AppColors.primaryPressed)
                                    : Theme.of(context).colorScheme.onSurface
                                          .withValues(alpha: .55),
                              ),
                              child: widget.vertical
                                  ? Row(
                                      children: [
                                        SizedBox(
                                          width: 56,
                                          child: Icon(widget.icons[i]),
                                        ),
                                        Expanded(
                                          child: ClipRect(
                                            child: AnimatedOpacity(
                                              opacity: showLabels ? 1 : 0,
                                              duration: duration,
                                              child: Text(
                                                widget.labels[i],
                                                maxLines: 1,
                                                overflow: TextOverflow.clip,
                                                softWrap: false,
                                                style: Theme.of(
                                                  context,
                                                ).textTheme.labelLarge,
                                              ),
                                            ),
                                          ),
                                        ),
                                      ],
                                    )
                                  : Column(
                                      mainAxisAlignment:
                                          MainAxisAlignment.center,
                                      children: [
                                        Icon(widget.icons[i]),
                                        const SizedBox(height: 5),
                                        Text(
                                          widget.labels[i],
                                          maxLines: 1,
                                          overflow: TextOverflow.ellipsis,
                                          style: Theme.of(context)
                                              .textTheme
                                              .labelSmall
                                              ?.copyWith(fontSize: 11),
                                        ),
                                      ],
                                    ),
                            ),
                          ),
                        ),
                      ),
                    ),
                  ),
                ),
            ],
          ),
        );
      },
    );

    if (!widget.vertical) {
      return SafeArea(
        top: false,
        child: Padding(
          padding: const EdgeInsets.fromLTRB(16, 6, 16, 10),
          child: GlassSurface(
            radius: 24,
            opacity: .72,
            blur: 12,
            padding: const EdgeInsets.all(4),
            child: destinations(true),
          ),
        ),
      );
    }
    return AnimatedContainer(
      duration: duration,
      curve: AppMotion.enter,
      width: expanded ? 264 : 96,
      margin: const EdgeInsets.fromLTRB(16, 16, 0, 16),
      child: GlassSurface(
        radius: 24,
        opacity: .62,
        blur: 12,
        padding: const EdgeInsets.all(8),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            SizedBox(
              height: 76,
              child: Row(
                children: [
                  const SizedBox(width: 12),
                  ClipRRect(
                    borderRadius: BorderRadius.circular(12),
                    child: Image.asset(
                      'assets/images/cloudmind_icon.png',
                      width: 36,
                      height: 36,
                    ),
                  ),
                  Expanded(
                    child: ClipRect(
                      child: AnimatedOpacity(
                        opacity: expanded ? 1 : 0,
                        duration: duration,
                        child: const Padding(
                          padding: EdgeInsets.only(left: 12),
                          child: Text(
                            'CloudMind',
                            maxLines: 1,
                            softWrap: false,
                            style: TextStyle(
                              fontSize: 18,
                              fontWeight: FontWeight.w600,
                              letterSpacing: -.5,
                            ),
                          ),
                        ),
                      ),
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 24),
            destinations(expanded),
            const Spacer(),
            const Divider(indent: 12, endIndent: 12),
            Align(
              alignment: Alignment.centerLeft,
              child: IconButton(
                tooltip: expanded
                    ? context.tr('Свернуть меню', 'Collapse sidebar')
                    : context.tr('Развернуть меню', 'Expand sidebar'),
                onPressed: () => setState(() => expanded = !expanded),
                icon: AnimatedRotation(
                  turns: expanded ? 0 : .5,
                  duration: duration,
                  child: const Icon(
                    Icons.keyboard_double_arrow_left_rounded,
                    size: 20,
                  ),
                ),
              ),
            ),
            const SizedBox(height: 8),
          ],
        ),
      ),
    );
  }
}

/// Keeps every visited page mounted, including controllers and scroll positions.
class RetainedPageStack extends StatefulWidget {
  const RetainedPageStack({
    super.key,
    required this.index,
    required this.children,
  });
  final int index;
  final List<Widget> children;
  @override
  State<RetainedPageStack> createState() => _RetainedPageStackState();
}

class _RetainedPageStackState extends State<RetainedPageStack>
    with SingleTickerProviderStateMixin {
  late final controller = AnimationController(
    vsync: this,
    duration: AppMotion.screen,
    value: 1,
  );
  int? previous;
  double direction = 1;
  @override
  void didUpdateWidget(RetainedPageStack oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.index != widget.index) {
      previous = oldWidget.index;
      direction = widget.index > oldWidget.index ? 1 : -1;
      if (MediaQuery.disableAnimationsOf(context)) {
        controller.value = 1;
      } else {
        controller.forward(from: 0);
      }
    }
  }

  @override
  void dispose() {
    controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) => ClipRect(
    child: AnimatedBuilder(
      animation: controller,
      builder: (context, _) {
        final t = AppMotion.enter.transform(controller.value);
        return Stack(
          fit: StackFit.expand,
          children: [
            for (var i = 0; i < widget.children.length; i++)
              Offstage(
                offstage:
                    i != widget.index &&
                    (i != previous || controller.isCompleted),
                child: TickerMode(
                  enabled: i == widget.index,
                  child: IgnorePointer(
                    ignoring: i != widget.index,
                    child: ExcludeSemantics(
                      excluding: i != widget.index,
                      child: Opacity(
                        opacity: i == widget.index ? t : 1 - t,
                        child: FractionalTranslation(
                          translation: Offset(
                            i == widget.index
                                ? direction * .045 * (1 - t)
                                : -direction * .045 * t,
                            0,
                          ),
                          child: widget.children[i],
                        ),
                      ),
                    ),
                  ),
                ),
              ),
          ],
        );
      },
    ),
  );
}
