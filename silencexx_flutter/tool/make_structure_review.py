"""Evidence gallery for the navigation and journal architecture change."""
from pathlib import Path
from html import escape
import json
root = Path(__file__).resolve().parents[1]
out = root / 'build/structure-after'
shots = sorted(out.glob('*.png'))
pairs = [
    ('home-mobile', 'today-mobile', 'Start: conversation → daily entrance'),
    ('history-390', 'conversations-mobile', 'Drawer → conversation destination'),
    ('journal-mobile', 'journal-collection-mobile', 'Editor first → collection first'),
    ('journal-mobile', 'journal-writing-mobile', 'Collection → focused writing'),
]
html = ['''<!doctype html><html lang="ru"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>CloudMind — новая структура</title><style>
:root{color-scheme:dark}*{box-sizing:border-box}body{margin:0;background:#101113;color:#eee;font:16px/1.5 system-ui}main{max-width:1400px;margin:auto;padding:28px}p{max-width:900px;color:#adb0b8}.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(290px,1fr));gap:20px}figure{margin:0;padding:16px;border:1px solid #34363c;border-radius:20px;background:#181a1e}img{display:block;width:100%;max-height:850px;object-fit:contain}.pair{display:grid;grid-template-columns:1fr 1fr;gap:12px}.pair img{filter:grayscale(1)}.color .pair img{filter:none}figcaption{padding-top:12px;color:#c7c4d4;font-size:13px}button{padding:12px 20px;background:#7050d8;border:0;border-radius:12px;color:white;font:inherit;cursor:pointer}a{color:#c4b4ff}.motion{max-width:390px}input{width:100%}</style><main><h1>Изменение структуры CloudMind</h1>
<p>Слева — предыдущая итерация, справа — новая. Сравнение по умолчанию в сером: вход в приложение, библиотека и сценарий дневника изменены в Flutter-коде. Снимки получены в widget tests с тестовыми данными. Это не снимки личного аккаунта и не проверка на физическом iPhone.</p><button onclick="document.body.classList.toggle('color')">Цвет / оттенки серого</button><h2>До и после</h2><div class="grid">''']
for old, new, caption in pairs:
    if (root / f'build/structure-before/{old}.png').exists() and (out / f'{new}.png').exists():
        html.append(f'<figure><div class="pair"><a href="../structure-before/{old}.png"><img src="../structure-before/{old}.png" alt="До"></a><a href="{new}.png"><img src="{new}.png" alt="После"></a></div><figcaption>{escape(caption)}</figcaption></figure>')
html.append('</div>')
frames = sorted(p.name for p in out.glob('motion-navigation-*.png'))
if frames:
    html.append(f'''<h2>Реальные кадры перехода Flutter</h2><p>Шаг 50 мс. Это последовательность тестового перехода, не замер FPS устройства.</p><figure class="motion"><img id="motion" src="{frames[0]}" alt="Переход"><input id="seek" type="range" min="0" max="{len(frames)-1}" value="0"><button id="play">Воспроизвести</button></figure><script>const frames={json.dumps(frames)};const seek=document.getElementById('seek');function show(i){{seek.value=i;document.getElementById('motion').src=frames[i];}}seek.oninput=()=>show(+seek.value);let timer;document.getElementById('play').onclick=()=>{{clearInterval(timer);let i=0;show(i);timer=setInterval(()=>{{if(++i>=frames.length){{clearInterval(timer);return;}}show(i);}},50);}};</script>''')
html.append(f'<h2>Все снимки этой проверки ({len(shots)})</h2><div class="grid">')
for p in shots:
    caption = 'iOS simulator: actual startup error; signed-in UI not verified here' if p.stem == 'device-ios-simulator' else p.stem
    html.append(f'<figure><a href="{p.name}"><img loading="lazy" src="{p.name}" alt="{escape(caption)}"></a><figcaption>{escape(caption)}</figcaption></figure>')
html.append('</div></main></html>')
(out / 'index.html').write_text('\n'.join(html))
try:
    from PIL import Image, ImageDraw
    names = ['today-mobile', 'conversations-mobile', 'journal-collection-mobile', 'journal-writing-mobile']
    sheet = Image.new('RGB', (1560, 880), '#131418')
    draw = ImageDraw.Draw(sheet)
    for index, name in enumerate(names):
        pic = Image.open(out / f'{name}.png').convert('RGB');pic.thumbnail((380, 834))
        x = index * 390
        draw.text((x + 10, 10), name, fill='white')
        sheet.paste(pic, (x + (390 - pic.width)//2, 36))
    sheet.save(out / 'new-structure.jpg', quality=94)
except ImportError:
    pass
print(f'{len(shots)} screenshots; gallery: {out / "index.html"}')
