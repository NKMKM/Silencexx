import 'package:flutter/material.dart';
import '../core/app_state.dart';
import '../core/theme/app_motion.dart';
import 'studio.dart';

class AppNavigation extends StatefulWidget {
  const AppNavigation({
    super.key,
    required this.selected,
    required this.onSelected,
    required this.labels,
    required this.icons,
    this.vertical = false,
    this.initiallyExpanded = true,
    this.onCustomize,
    this.destinationKeys,
  });
  final List<GlobalKey>? destinationKeys;
  final int selected;
  final ValueChanged<int> onSelected;
  final List<String> labels;
  final List<IconData> icons;
  final bool vertical, initiallyExpanded;
  final VoidCallback? onCustomize;
  @override
  State<AppNavigation> createState() => _AppNavigationState();
}

class _AppNavigationState extends State<AppNavigation> {
  late bool expanded = widget.initiallyExpanded;
  @override
  void didUpdateWidget(AppNavigation oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.initiallyExpanded != widget.initiallyExpanded) {
      expanded = widget.initiallyExpanded;
    }
  }

  Widget destination(int i) {
    final t = Theme.of(context);
    final active = i == widget.selected;
    final color = active
        ? t.colorScheme.onSurface
        : t.colorScheme.onSurfaceVariant;
    return Tooltip(
      key: widget.destinationKeys?[i],
      message: widget.labels[i],
      child: Semantics(
        selected: active,
        button: true,
        label: widget.labels[i],
        excludeSemantics: true,
        child: Material(
          color: Colors.transparent,
          child: InkWell(
            borderRadius: BorderRadius.circular(15),
            onTap: () => widget.onSelected(i),
            onLongPress: widget.onCustomize,
            child: Padding(
              padding: EdgeInsets.symmetric(
                horizontal: widget.vertical ? 12 : 3,
                vertical: 9,
              ),
              child: widget.vertical
                  ? Row(
                      children: [
                        Icon(widget.icons[i], size: 21, color: color),
                        if (expanded) ...[
                          const SizedBox(width: 14),
                          Expanded(
                            child: Text(
                              widget.labels[i],
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis,
                              style: t.textTheme.labelLarge?.copyWith(
                                color: color,
                              ),
                            ),
                          ),
                        ],
                      ],
                    )
                  : Column(
                      mainAxisSize: MainAxisSize.min,
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        AnimatedScale(
                          scale: active ? 1.05 : 1,
                          duration: studioDuration(context, AppMotion.fast),
                          child: Icon(widget.icons[i], size: 21, color: color),
                        ),
                        const SizedBox(height: 5),
                        Text(
                          widget.labels[i],
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                          style: t.textTheme.labelSmall?.copyWith(
                            fontSize: 10,
                            fontWeight: active
                                ? FontWeight.w600
                                : FontWeight.w400,
                            color: color,
                          ),
                        ),
                      ],
                    ),
            ),
          ),
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final c = Theme.of(context).colorScheme;
    if (!widget.vertical) {
      return SafeArea(
        top: false,
        child: Padding(
          padding: const EdgeInsets.fromLTRB(14, 4, 14, 8),
          child: Container(
            key: const ValueKey('mobile-primary-dock'),
            padding: const EdgeInsets.all(5),
            decoration: BoxDecoration(
              color: c.surface,
              borderRadius: BorderRadius.circular(24),
              border: Border.all(color: c.outlineVariant.withValues(alpha: .7)),
            ),
            child: LayoutBuilder(
              builder: (context, constraints) {
                final width = constraints.maxWidth / widget.labels.length;
                final height =
                    48.0 + MediaQuery.textScalerOf(context).scale(12) * 1.4;
                return SizedBox(
                  height: height,
                  child: Stack(
                    children: [
                      AnimatedPositioned(
                        duration: studioDuration(context),
                        curve: AppMotion.enter,
                        left: widget.selected * width,
                        top: 0,
                        bottom: 0,
                        width: width,
                        child: DecoratedBox(
                          decoration: BoxDecoration(
                            color: c.primary.withValues(alpha: .12),
                            borderRadius: BorderRadius.circular(18),
                          ),
                        ),
                      ),
                      Row(
                        crossAxisAlignment: CrossAxisAlignment.stretch,
                        children: [
                          for (var i = 0; i < widget.labels.length; i++)
                            Expanded(child: destination(i)),
                        ],
                      ),
                    ],
                  ),
                );
              },
            ),
          ),
        ),
      );
    }
    return AnimatedContainer(
      duration: studioDuration(context),
      curve: AppMotion.enter,
      width: expanded ? 224 : 76,
      margin: const EdgeInsets.fromLTRB(10, 12, 8, 12),
      padding: const EdgeInsets.all(10),
      decoration: BoxDecoration(
        color: c.surfaceContainerLow,
        borderRadius: BorderRadius.circular(24),
        border: Border.all(color: c.outlineVariant.withValues(alpha: .6)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Padding(
            padding: const EdgeInsets.symmetric(vertical: 12),
            child: Row(
              children: [
                const StudioGlyph(Icons.blur_on_rounded, size: 34),
                if (expanded) ...[
                  const SizedBox(width: 12),
                  Expanded(
                    child: Text(
                      'CloudMind',
                      style: Theme.of(context).textTheme.titleMedium,
                    ),
                  ),
                ],
              ],
            ),
          ),
          const SizedBox(height: 22),
          Expanded(
            child: SingleChildScrollView(
              child: Column(
                children: [
                  for (var i = 0; i < widget.labels.length; i++)
                    Padding(
                      padding: const EdgeInsets.only(bottom: 6),
                      child: AnimatedContainer(
                        duration: studioDuration(context),
                        decoration: BoxDecoration(
                          color: i == widget.selected
                              ? c.primary.withValues(alpha: .12)
                              : Colors.transparent,
                          borderRadius: BorderRadius.circular(15),
                        ),
                        child: destination(i),
                      ),
                    ),
                ],
              ),
            ),
          ),
          if (widget.onCustomize != null)
            IconButton(
              tooltip: context.tr('Порядок разделов', 'Arrange navigation'),
              onPressed: widget.onCustomize,
              icon: const Icon(Icons.tune_rounded, size: 20),
            ),
          const Divider(),
          IconButton(
            tooltip: expanded
                ? context.tr('Свернуть меню', 'Collapse sidebar')
                : context.tr('Развернуть меню', 'Expand sidebar'),
            onPressed: () => setState(() => expanded = !expanded),
            icon: AnimatedRotation(
              turns: expanded ? 0 : .5,
              duration: studioDuration(context),
              child: const Icon(
                Icons.keyboard_double_arrow_left_rounded,
                size: 20,
              ),
            ),
          ),
        ],
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
