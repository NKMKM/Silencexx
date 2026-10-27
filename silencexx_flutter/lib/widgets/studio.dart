import 'package:flutter/material.dart';
import '../core/app_state.dart';
import '../core/theme/app_motion.dart';

enum StudioTone { quiet, elevated, accent, danger }

Duration studioDuration(
  BuildContext context, [
  Duration value = AppMotion.control,
]) => MediaQuery.disableAnimationsOf(context) ? Duration.zero : value;

/// A bounded symbol, shared by navigation, form sections and action lists.
class StudioGlyph extends StatelessWidget {
  const StudioGlyph(this.icon, {super.key, this.size = 40, this.color});
  final IconData icon;
  final double size;
  final Color? color;
  @override
  Widget build(BuildContext context) {
    final ink = color ?? Theme.of(context).colorScheme.primary;
    return Align(
      alignment: Alignment.centerLeft,
      widthFactor: 1,
      heightFactor: 1,
      child: ExcludeSemantics(
        child: Container(
          width: size,
          height: size,
          decoration: BoxDecoration(
            color: ink.withValues(alpha: .10),
            borderRadius: BorderRadius.circular(size * .32),
            border: Border.all(color: ink.withValues(alpha: .13)),
          ),
          child: Icon(icon, size: size * .48, color: ink),
        ),
      ),
    );
  }
}

/// Content takes the space it needs; only the hero surface carries illumination.
class StudioPanel extends StatelessWidget {
  const StudioPanel({
    super.key,
    required this.child,
    this.tone = StudioTone.quiet,
    this.padding = const EdgeInsets.all(20),
    this.radius = 24,
  });
  final Widget child;
  final StudioTone tone;
  final EdgeInsetsGeometry padding;
  final double radius;
  @override
  Widget build(BuildContext context) {
    final c = Theme.of(context).colorScheme;
    final accent = tone == StudioTone.danger ? c.error : c.primary;
    final highlighted = tone == StudioTone.accent || tone == StudioTone.danger;
    return Container(
      padding: padding,
      decoration: BoxDecoration(
        color: tone == StudioTone.elevated
            ? c.surfaceContainerHigh
            : c.surfaceContainerLow,
        gradient: highlighted
            ? LinearGradient(
                begin: Alignment.topLeft,
                end: Alignment.bottomRight,
                colors: [
                  Color.alphaBlend(
                    accent.withValues(alpha: .16),
                    c.surfaceContainerLow,
                  ),
                  c.surfaceContainerLow,
                ],
              )
            : null,
        borderRadius: BorderRadius.circular(radius),
        border: Border.all(
          color: highlighted
              ? accent.withValues(alpha: .22)
              : c.outlineVariant.withValues(alpha: .65),
        ),
      ),
      child: child,
    );
  }
}

class StudioHeader extends StatelessWidget {
  const StudioHeader({
    super.key,
    required this.title,
    this.eyebrow,
    this.description,
    this.action,
    this.icon,
  });
  final String title;
  final String? eyebrow, description;
  final Widget? action;
  final IconData? icon;
  @override
  Widget build(BuildContext context) {
    final t = Theme.of(context);
    return Padding(
      padding: const EdgeInsets.only(bottom: 20),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          if (eyebrow != null) ...[
            Row(
              children: [
                if (icon != null) ...[
                  Icon(icon, size: 14, color: t.colorScheme.primary),
                  const SizedBox(width: 7),
                ],
                Expanded(
                  child: Text(
                    eyebrow!,
                    style: t.textTheme.labelSmall?.copyWith(
                      letterSpacing: 1.2,
                      color: t.colorScheme.onSurfaceVariant,
                    ),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 8),
          ],
          if (action != null &&
              MediaQuery.textScalerOf(context).scale(14) > 19) ...[
            Text(title, style: t.textTheme.headlineMedium),
            const SizedBox(height: 8),
            Align(alignment: Alignment.centerRight, child: action!),
          ] else
            Row(
              crossAxisAlignment: CrossAxisAlignment.center,
              children: [
                Expanded(child: Text(title, style: t.textTheme.headlineMedium)),
                if (action != null) ...[const SizedBox(width: 12), action!],
              ],
            ),
          if (description?.trim().isNotEmpty == true) ...[
            const SizedBox(height: 10),
            Text(description!, style: t.textTheme.bodyMedium),
          ],
        ],
      ),
    );
  }
}

/// Purpose-built row: stable leading column, flexible content, contextual action.
class StudioRow extends StatefulWidget {
  const StudioRow({
    super.key,
    this.leading,
    required this.title,
    this.subtitle,
    this.trailing,
    this.onTap,
    this.onLongPress,
    this.selected = false,
    this.enabled = true,
    this.dense = false,
    this.contentPadding,
    this.selectedTileColor,
    this.shape,
  });
  final Widget? leading, subtitle, trailing;
  final Widget title;
  final VoidCallback? onTap, onLongPress;
  final bool selected, enabled, dense;
  final EdgeInsetsGeometry? contentPadding;
  final Color? selectedTileColor;
  final ShapeBorder? shape;
  @override
  State<StudioRow> createState() => _StudioRowState();
}

class _StudioRowState extends State<StudioRow> {
  bool pressed = false, hovered = false;
  @override
  Widget build(BuildContext context) {
    final t = Theme.of(context);
    final c = t.colorScheme;
    final interactive = widget.enabled && widget.onTap != null;
    return Semantics(
      selected: widget.selected,
      enabled: widget.enabled,
      child: MouseRegion(
        onEnter: (_) => setState(() => hovered = true),
        onExit: (_) => setState(() {
          hovered = false;
          pressed = false;
        }),
        child: AnimatedScale(
          duration: studioDuration(context, AppMotion.press),
          scale: pressed ? .985 : 1,
          child: Material(
            color: widget.selected
                ? widget.selectedTileColor ?? c.primary.withValues(alpha: .10)
                : hovered && interactive
                ? c.surfaceContainerHigh
                : Colors.transparent,
            shape:
                widget.shape ??
                RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
            clipBehavior: Clip.antiAlias,
            child: InkWell(
              onTap: interactive ? widget.onTap : null,
              onLongPress: widget.enabled ? widget.onLongPress : null,
              onHighlightChanged: (value) => setState(() => pressed = value),
              child: Opacity(
                opacity: widget.enabled ? 1 : .45,
                child: ConstrainedBox(
                  constraints: BoxConstraints(
                    minHeight: widget.dense ? 48 : 60,
                  ),
                  child: Padding(
                    padding:
                        widget.contentPadding ??
                        EdgeInsets.symmetric(
                          horizontal: 12,
                          vertical: widget.dense ? 8 : 12,
                        ),
                    child: Row(
                      children: [
                        if (widget.leading != null) ...[
                          IconTheme(
                            data: IconThemeData(
                              color: c.onSurfaceVariant,
                              size: 20,
                            ),
                            child: widget.leading!,
                          ),
                          const SizedBox(width: 14),
                        ],
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              DefaultTextStyle(
                                style: t.textTheme.titleSmall!.copyWith(
                                  color: c.onSurface,
                                ),
                                child: widget.title,
                              ),
                              if (widget.subtitle != null) ...[
                                const SizedBox(height: 4),
                                DefaultTextStyle(
                                  style: t.textTheme.bodySmall!,
                                  child: widget.subtitle!,
                                ),
                              ],
                            ],
                          ),
                        ),
                        if (widget.trailing != null) ...[
                          const SizedBox(width: 12),
                          IconTheme(
                            data: IconThemeData(
                              size: 18,
                              color: c.onSurfaceVariant,
                            ),
                            child: widget.trailing!,
                          ),
                        ],
                      ],
                    ),
                  ),
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }
}

class StudioTabs<T> extends StatelessWidget {
  const StudioTabs({
    super.key,
    required this.segments,
    required this.selected,
    required this.onSelectionChanged,
    this.showSelectedIcon = false,
  });
  final List<ButtonSegment<T>> segments;
  final Set<T> selected;
  final ValueChanged<Set<T>>? onSelectionChanged;
  final bool showSelectedIcon;
  @override
  Widget build(BuildContext context) {
    final t = Theme.of(context);
    return Container(
      padding: const EdgeInsets.all(4),
      decoration: BoxDecoration(
        color: t.colorScheme.surfaceContainerHigh.withValues(alpha: .65),
        borderRadius: BorderRadius.circular(16),
      ),
      child: IntrinsicHeight(
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            for (final item in segments)
              Expanded(
                child: Semantics(
                  selected: selected.contains(item.value),
                  button: true,
                  child: AnimatedContainer(
                    duration: studioDuration(context, AppMotion.fast),
                    decoration: BoxDecoration(
                      color: selected.contains(item.value)
                          ? t.colorScheme.surface
                          : Colors.transparent,
                      borderRadius: BorderRadius.circular(12),
                      border: Border.all(
                        color: selected.contains(item.value)
                            ? t.colorScheme.outlineVariant
                            : Colors.transparent,
                      ),
                    ),
                    child: TextButton(
                      onPressed: item.enabled && onSelectionChanged != null
                          ? () => onSelectionChanged!({item.value})
                          : null,
                      style: TextButton.styleFrom(
                        foregroundColor: selected.contains(item.value)
                            ? t.colorScheme.onSurface
                            : t.colorScheme.onSurfaceVariant,
                        padding: const EdgeInsets.symmetric(
                          horizontal: 6,
                          vertical: 10,
                        ),
                        minimumSize: const Size(44, 44),
                      ),
                      child: DefaultTextStyle(
                        style: t.textTheme.labelMedium!,
                        textAlign: TextAlign.center,
                        child: item.label ?? const SizedBox.shrink(),
                      ),
                    ),
                  ),
                ),
              ),
          ],
        ),
      ),
    );
  }
}

class StudioChoice extends StatelessWidget {
  const StudioChoice({
    super.key,
    required this.label,
    required this.selected,
    this.onSelected,
  });
  final Widget label;
  final bool selected;
  final ValueChanged<bool>? onSelected;
  @override
  Widget build(BuildContext context) {
    final c = Theme.of(context).colorScheme;
    return Semantics(
      selected: selected,
      button: true,
      child: AnimatedContainer(
        duration: studioDuration(context, AppMotion.fast),
        decoration: BoxDecoration(
          color: selected
              ? c.primary.withValues(alpha: .14)
              : c.surfaceContainerLow,
          borderRadius: BorderRadius.circular(14),
          border: Border.all(
            color: selected
                ? c.primary.withValues(alpha: .5)
                : c.outlineVariant,
          ),
        ),
        child: TextButton(
          onPressed: onSelected == null ? null : () => onSelected!(!selected),
          style: TextButton.styleFrom(
            foregroundColor: selected ? c.onSurface : c.onSurfaceVariant,
          ),
          child: label,
        ),
      ),
    );
  }
}

class StudioDisclosure extends StatefulWidget {
  const StudioDisclosure({
    super.key,
    required this.title,
    this.subtitle,
    this.leading,
    required this.children,
    this.tilePadding,
    this.childrenPadding,
    this.expandedCrossAxisAlignment = CrossAxisAlignment.start,
  });
  final Widget title;
  final Widget? subtitle, leading;
  final List<Widget> children;
  final EdgeInsetsGeometry? tilePadding, childrenPadding;
  final CrossAxisAlignment expandedCrossAxisAlignment;
  @override
  State<StudioDisclosure> createState() => _StudioDisclosureState();
}

class _StudioDisclosureState extends State<StudioDisclosure> {
  bool expanded = false;
  @override
  Widget build(BuildContext context) => Column(
    crossAxisAlignment: CrossAxisAlignment.stretch,
    children: [
      Semantics(
        expanded: expanded,
        child: StudioRow(
          title: widget.title,
          subtitle: widget.subtitle,
          leading: widget.leading,
          contentPadding: widget.tilePadding,
          trailing: AnimatedRotation(
            turns: expanded ? .25 : 0,
            duration: studioDuration(context),
            child: const Icon(Icons.chevron_right_rounded),
          ),
          onTap: () => setState(() => expanded = !expanded),
        ),
      ),
      StudioResize(
        duration: studioDuration(context),
        curve: AppMotion.enter,
        alignment: Alignment.topCenter,
        child: ClipRect(
          child: Align(
            heightFactor: expanded ? 1 : 0,
            alignment: Alignment.topCenter,
            child: ExcludeFocus(
              excluding: !expanded,
              child: ExcludeSemantics(
                excluding: !expanded,
                child: Padding(
                  padding:
                      widget.childrenPadding ??
                      const EdgeInsets.fromLTRB(16, 4, 16, 20),
                  child: Column(
                    crossAxisAlignment: widget.expandedCrossAxisAlignment,
                    children: widget.children,
                  ),
                ),
              ),
            ),
          ),
        ),
      ),
    ],
  );
}

class StudioNotice extends StatelessWidget {
  const StudioNotice({
    super.key,
    required this.message,
    this.icon = Icons.info_outline_rounded,
    this.action,
    this.error = false,
  });
  final String message;
  final IconData icon;
  final Widget? action;
  final bool error;
  @override
  Widget build(BuildContext context) => StudioPanel(
    tone: error ? StudioTone.danger : StudioTone.quiet,
    radius: 16,
    padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
    child: Row(
      children: [
        Icon(
          icon,
          size: 18,
          color: error
              ? Theme.of(context).colorScheme.error
              : Theme.of(context).colorScheme.primary,
        ),
        const SizedBox(width: 10),
        Expanded(
          child: Text(message, style: Theme.of(context).textTheme.bodySmall),
        ),
        if (action != null) ...[const SizedBox(width: 8), action!],
      ],
    ),
  );
}

class StudioSheet extends StatelessWidget {
  const StudioSheet({
    super.key,
    required this.title,
    required this.child,
    this.icon,
    this.footer,
  });
  final String title;
  final Widget child;
  final IconData? icon;
  final Widget? footer;
  @override
  Widget build(BuildContext context) => SafeArea(
    top: false,
    child: Material(
      color: Theme.of(context).colorScheme.surface,
      borderRadius: const BorderRadius.vertical(top: Radius.circular(28)),
      clipBehavior: Clip.antiAlias,
      child: ConstrainedBox(
        constraints: BoxConstraints(
          maxHeight: MediaQuery.sizeOf(context).height * .85,
        ),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Center(
              child: Container(
                margin: const EdgeInsets.only(top: 10),
                width: 32,
                height: 4,
                decoration: BoxDecoration(
                  color: Theme.of(context).colorScheme.outlineVariant,
                  borderRadius: BorderRadius.circular(4),
                ),
              ),
            ),
            Padding(
              padding: const EdgeInsets.fromLTRB(20, 12, 12, 8),
              child: Row(
                children: [
                  if (icon != null) ...[
                    StudioGlyph(icon!, size: 34),
                    const SizedBox(width: 12),
                  ],
                  Expanded(
                    child: Text(
                      title,
                      style: Theme.of(context).textTheme.titleLarge,
                    ),
                  ),
                  IconButton(
                    tooltip: context.tr('Закрыть', 'Close'),
                    onPressed: () => Navigator.pop(context),
                    icon: const Icon(Icons.close_rounded, size: 20),
                  ),
                ],
              ),
            ),
            Flexible(
              child: SingleChildScrollView(
                padding: const EdgeInsets.fromLTRB(12, 0, 12, 16),
                child: child,
              ),
            ),
            if (footer != null)
              Padding(
                padding: const EdgeInsets.fromLTRB(20, 0, 20, 20),
                child: footer!,
              ),
          ],
        ),
      ),
    ),
  );
}

class StudioTopBar extends StatelessWidget implements PreferredSizeWidget {
  const StudioTopBar({super.key, required this.title});
  final Widget title;
  @override
  Size get preferredSize => const Size.fromHeight(60);
  @override
  Widget build(BuildContext context) => SafeArea(
    bottom: false,
    child: Padding(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
      child: Row(
        children: [
          if (Navigator.canPop(context))
            BackButton(color: Theme.of(context).colorScheme.onSurface),
          const SizedBox(width: 8),
          Expanded(
            child: DefaultTextStyle(
              style: Theme.of(context).textTheme.labelLarge!,
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
              child: title,
            ),
          ),
          const SizedBox(width: 16),
        ],
      ),
    ),
  );
}

/// The primary action stays in reach; content scrolls only when it needs to.
class StudioActionLayout extends StatelessWidget {
  const StudioActionLayout({
    super.key,
    required this.content,
    required this.action,
    this.maxWidth = 720,
  });
  final Widget content, action;
  final double maxWidth;
  @override
  Widget build(BuildContext context) => LayoutBuilder(
    builder: (context, constraints) {
      final padding = constraints.maxWidth < 600 ? 22.0 : 32.0;
      final small =
          constraints.maxHeight < 420 ||
          MediaQuery.textScalerOf(context).scale(14) > 22;
      Widget body() => Padding(
        padding: EdgeInsets.fromLTRB(padding, 12, padding, 24),
        child: content,
      );
      return Align(
        alignment: Alignment.topCenter,
        child: ConstrainedBox(
          constraints: BoxConstraints(maxWidth: maxWidth),
          child: small
              ? SingleChildScrollView(
                  keyboardDismissBehavior:
                      ScrollViewKeyboardDismissBehavior.onDrag,
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.stretch,
                    children: [
                      body(),
                      Padding(padding: EdgeInsets.all(padding), child: action),
                    ],
                  ),
                )
              : Column(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    Expanded(
                      child: SingleChildScrollView(
                        keyboardDismissBehavior:
                            ScrollViewKeyboardDismissBehavior.onDrag,
                        child: body(),
                      ),
                    ),
                    Padding(
                      padding: EdgeInsets.fromLTRB(padding, 12, padding, 16),
                      child: action,
                    ),
                  ],
                ),
        ),
      );
    },
  );
}

class StudioAvatar extends StatelessWidget {
  const StudioAvatar({super.key, required this.name, this.url, this.size = 52});
  final String name;
  final String? url;
  final double size;
  @override
  Widget build(BuildContext context) {
    final c = Theme.of(context).colorScheme;
    Widget fallback() => Center(
      child: Text(
        name.trim().isEmpty ? 'C' : name.trim().characters.first.toUpperCase(),
        style: Theme.of(context).textTheme.titleLarge?.copyWith(
          color: c.onSurface,
          fontSize: size * .34,
        ),
      ),
    );
    return Container(
      width: size,
      height: size,
      clipBehavior: Clip.antiAlias,
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(size * .32),
        gradient: LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: [
            c.primary.withValues(alpha: .28),
            c.primary.withValues(alpha: .08),
          ],
        ),
        border: Border.all(color: c.primary.withValues(alpha: .25)),
      ),
      child: url == null
          ? fallback()
          : Image.network(
              url!,
              fit: BoxFit.cover,
              errorBuilder: (_, _, _) => fallback(),
            ),
    );
  }
}

/// Bypass AnimatedSize entirely for reduced motion; a zero-duration controller
/// can re-dirty itself during layout on some Flutter versions.
class StudioResize extends StatelessWidget {
  const StudioResize({
    super.key,
    required this.child,
    this.duration = AppMotion.control,
    this.alignment = Alignment.center,
    this.curve = AppMotion.enter,
  });
  final Widget child;
  final Duration duration;
  final AlignmentGeometry alignment;
  final Curve curve;
  @override
  Widget build(BuildContext context) =>
      MediaQuery.disableAnimationsOf(context) || duration == Duration.zero
      ? child
      : AnimatedSize(
          duration: duration,
          alignment: alignment,
          curve: curve,
          child: child,
        );
}
