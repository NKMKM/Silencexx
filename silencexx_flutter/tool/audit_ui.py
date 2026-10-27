"""Inventory every UI source and constructor site; fail on unreviewed changes.

Run from anywhere: python3 tool/audit_ui.py --check
The review decisions are intentionally maintained separately from this generator.
"""
from pathlib import Path
import argparse
import hashlib
import json
import re

ROOT = Path(__file__).resolve().parents[1]
parser = argparse.ArgumentParser()
parser.add_argument('--check', action='store_true')
args = parser.parse_args()
manifest_path = ROOT / 'docs/ui_redesign_manifest.json'
manifest = json.loads(manifest_path.read_text())
paths = sorted({
    ROOT / 'lib/main.dart', ROOT / 'lib/core/theme.dart',
    *ROOT.glob('lib/screens/*.dart'), *ROOT.glob('lib/widgets/*.dart'),
    *ROOT.glob('lib/core/theme/*.dart'),
})
custom = set()
for path in paths:
    custom.update(re.findall(r'class\s+(\w+)\s+extends\s+(?:StatefulWidget|StatelessWidget)', path.read_text()))
standard = set('Text SelectableText RichText Icon Image Row Column Stack Wrap Container SizedBox Padding Align Center Expanded Flexible FractionallySizedBox ConstrainedBox DecoratedBox Material Ink InkWell GestureDetector Listener MouseRegion Semantics ExcludeSemantics ExcludeFocus Opacity Transform ClipRect ClipRRect ClipOval CustomPaint RepaintBoundary ListView SingleChildScrollView LayoutBuilder Builder ListenableBuilder ValueListenableBuilder FutureBuilder StreamBuilder Scaffold AppBar Drawer SafeArea Dialog AlertDialog TextField TextFormField Form FilledButton OutlinedButton TextButton IconButton PopupMenuButton PopupMenuItem CheckedPopupMenuItem CircleAvatar Checkbox Switch Radio Slider Divider LinearProgressIndicator CircularProgressIndicator Tooltip RefreshIndicator AnimatedContainer AnimatedPositioned AnimatedOpacity AnimatedScale AnimatedRotation AnimatedSwitcher AnimatedSize TweenAnimationBuilder AnimatedBuilder FadeTransition ScaleTransition SlideTransition SizeTransition Offstage TickerMode IgnorePointer ReorderableListView ReorderableDragStartListener DraggableScrollableSheet OverflowBar IntrinsicHeight InputDecoration MaterialApp'.split())
registry = []
missing = []
for path in paths:
    rel = str(path.relative_to(ROOT))
    source = path.read_text()
    digest = hashlib.sha256(source.encode()).hexdigest()
    decision = manifest.get(rel, {})
    if decision.get('sha256_reviewed') != digest:
        missing.append(rel)
    sites = []
    for match in re.finditer(r'\b([A-Z]\w*)(?:<[\w?, <>]+>)?(?:\.\w+)?\s*\(', source):
        # Include external widgets and value/style APIs too. A whitelist alone
        # would omit provider controls and newly introduced widget types.
        tail = source[match.end():].lstrip()
        if tail.startswith(('{', 'this.', 'super.')):
            continue  # Named constructor declarations, not call sites.
        sites.append({'component': match.group(1), 'line': source.count('\n', 0, match.start()) + 1,
            'kind': 'known_widget' if match.group(1) in standard | custom else 'external_widget_or_style_support_api'})
    registry.append({'file': rel, 'sha256': digest,
        'classes': re.findall(r'class\s+(\w+)', source), 'constructor_sites': sites,
        'review_status': decision.get('status', 'unreviewed'), 'decision': decision.get('decision', '')})
native = [
    'ios/DailyWishWidget/DailyWishWidget.swift',
    'macos/DailyWishWidget/DailyWishWidget.swift',
    'android/app/src/main/res/layout/daily_wish_widget.xml',
    'android/app/src/main/res/drawable/wish_background.xml',
]
for rel in native:
    source = (ROOT / rel).read_text()
    digest = hashlib.sha256(source.encode()).hexdigest()
    decision = manifest.get(rel, {})
    if decision.get('sha256_reviewed') != digest:
        missing.append(rel)
    registry.append({'file': rel, 'sha256': digest, 'classes': re.findall(r'(?:class|struct)\s+(\w+)', source),
      'constructor_sites': [], 'review_status': decision.get('status', 'unreviewed'), 'decision': decision.get('decision', '')})
output = ROOT / 'docs/ui_component_registry.json'
output.write_text(json.dumps(registry, ensure_ascii=False, indent=2) + '\n')
print(f'{len(paths)} Flutter UI sources + {len(native)} native UI sources; {sum(len(x["constructor_sites"]) for x in registry)} constructor/API references; {len(missing)} files need review')
if missing:
    print('\n'.join(missing))
if args.check and missing:
    raise SystemExit(1)
