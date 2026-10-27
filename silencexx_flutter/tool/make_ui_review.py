"""Build an honest before/after gallery from Flutter screenshots and frame captures."""
from pathlib import Path
from html import escape
try:
    from PIL import Image, ImageDraw
except ImportError:
    Image = ImageDraw = None
import json

root = Path(__file__).resolve().parents[1]
after = root / 'build/full-ui-after'
before = root / 'build/full-ui-before'
after.mkdir(parents=True, exist_ok=True)
shots = sorted(after.glob('*.png'))
frames = sorted(after.glob('motion-navigation-*.png'))
contacts = after / 'contact-sheets'
contacts.mkdir(exist_ok=True)
groups = [
    ['auth-390', 'disclaimer-390', 'wellness-onboarding-390', 'privacy-390'],
    ['safety-about-390', 'profile-390', 'sessions-390', 'language-390'],
    ['subscription-390', 'payment-390', 'reminders-390', 'support-390'],
    ['journal-mobile', 'inbox-compose-390', 'inbox-letter-reading', 'chat-active-390'],
]
for index, names in enumerate(groups if Image is not None else []):
    sheet = Image.new('RGB', (800, 1740), '#17181d')
    draw = ImageDraw.Draw(sheet)
    for n, name in enumerate(names):
        path = after / f'{name}.png'
        if not path.exists():
            continue
        pic = Image.open(path).convert('RGB')
        pic.thumbnail((390, 830))
        x, y = (n % 2) * 400, (n // 2) * 870
        draw.text((x + 10, y + 8), name, fill='white')
        sheet.paste(pic, (x + (400 - pic.width) // 2, y + 30))
    sheet.save(contacts / f'review-{index+1}.jpg', quality=92)

html = ['''<!doctype html><html lang="ru"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>CloudMind · полный UI-редизайн</title><style>
:root{color-scheme:dark}*{box-sizing:border-box}body{margin:0;background:#0c0d0f;color:#f8f8fc;font:15px/1.5 system-ui,sans-serif}header,main{max-width:1500px;margin:auto;padding:28px}h1{font-size:32px;line-height:1.1;letter-spacing:-1px}p{color:#b7babf;max-width:900px}.gallery,.comparisons{display:grid;grid-template-columns:repeat(auto-fit,minmax(290px,1fr));gap:20px}figure{margin:0;padding:12px;background:#17191c;border:1px solid #35383e;border-radius:18px}img{display:block;width:100%;height:auto;max-height:850px;object-fit:contain;border-radius:10px}figcaption{padding:10px 2px;color:#b7babf;font-size:12px}.pair{display:grid;grid-template-columns:1fr 1fr;gap:8px}.pair img{filter:grayscale(1)}body.color .pair img{filter:none}button,input{font:inherit}button{background:#7455e8;color:white;border:0;padding:12px 18px;border-radius:12px;cursor:pointer}.clip{max-width:390px}.clip input{width:100%}summary{font-size:22px;padding:20px 0;cursor:pointer}a{color:#c4b7ff}.meta{display:inline-block;padding:6px 12px;background:#202225;border-radius:12px;margin:0 6px 8px 0}</style>
<header><span class="meta">CloudMind Studio</span><span class="meta">25.10.2026</span><h1>Весь интерфейс — одна система</h1>
<p>Снимки получены из реального Flutter-кода в widget tests. Данные аккаунта, история и ответы в этих снимках — тестовые. Это не макеты и не подтверждение проверки на физическом iPhone. Кадры с префиксом device-ios — отдельные снимки запущенного iOS-симулятора.</p>''']
html.append(f'<p>{len(shots)} PNG-снимков. Проверки покрывают светлую и тёмную темы, узкий экран, планшет, desktop, увеличенный текст и клавиатуру. Галерея показывает конечные состояния; отдельная последовательность ниже показывает движение.</p></header><main>')
html.append('<h2>Композиция до и после</h2><p>Слева — предыдущая версия, справа — текущая. По умолчанию сравнение в оттенках серого.</p><button onclick="document.body.classList.toggle(\'color\')">Показать / скрыть цвет</button><br><br><div class="comparisons">')
for name in ['home-mobile','journal-mobile','tasks-mobile','inbox-mobile','settings-mobile','auth-390','profile-390','subscription-390','support-390']:
    old, new = before / f'{name}.png', after / f'{name}.png'
    if old.exists() and new.exists():
        html.append(f'<figure><div class="pair"><a href="../full-ui-before/{old.name}"><img loading="lazy" src="../full-ui-before/{old.name}" alt="До"></a><a href="{new.name}"><img loading="lazy" src="{new.name}" alt="После"></a></div><figcaption>{escape(name)} · до / после</figcaption></figure>')
html.append('</div>')
if frames:
    names = [p.name for p in frames]
    html.append(f'''<h2>Движение: реальные кадры перехода</h2><p>Последовательность кадров Flutter с шагом 50 мс. Это покадровая запись тестового перехода; она не измеряет FPS устройства.</p>
<figure class="clip"><img id="motion" src="{names[0]}" alt="Flutter navigation animation"><figcaption id="time">0 мс</figcaption><input id="frame" type="range" min="0" max="{len(names)-1}" value="0"><button id="play">Воспроизвести</button></figure>
<script>const frames={json.dumps(names)};let timer=null;const slider=document.getElementById('frame');function show(i){{slider.value=i;document.getElementById('motion').src=frames[i];document.getElementById('time').textContent=(i*50)+' мс';}}slider.oninput=()=>show(+slider.value);document.getElementById('play').onclick=()=>{{clearInterval(timer);let i=0;show(i);timer=setInterval(()=>{{i++;if(i>=frames.length){{clearInterval(timer);return;}}show(i);}},50);}};</script>''')
html.append('<details open><summary>Все новые снимки и состояния</summary><div class="gallery">')
for path in shots:
    if path in frames:
        continue
    html.append(f'<figure><a href="{path.name}"><img loading="lazy" src="{path.name}" alt="{escape(path.stem)}"></a><figcaption>{escape(path.stem)}</figcaption></figure>')
html.append('</div></details><p>Полный реестр компонентов и выполненных проверок: <a href="../../docs/FULL_UI_REDESIGN_2026-10-25.md">отчёт в репозитории</a>.</p></main></html>')
(after / 'index.html').write_text('\n'.join(html))
print(f"{len(shots)} screenshots, {len(frames)} real motion frames, {len(list(contacts.glob('review-*.jpg')))} contact sheets")
