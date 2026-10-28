"""Review captured Flutter frames and screenshots; no mockup generation."""
from pathlib import Path
from html import escape
import json
from PIL import Image, ImageDraw
root=Path(__file__).resolve().parents[1]
out=root/'build/cloud-voice-review'
shots=sorted(out.glob('*.png'))
frames=sorted(out.glob('motion-*.png'))
if frames:
    images=[Image.open(p).convert('RGB').crop((20,260,370,570)) for p in frames]
    images[0].save(out/'cloud-motion.gif',save_all=True,append_images=images[1:],duration=100,loop=0,optimize=False)
sheet=Image.new('RGB',(930,560),'#0c0d10');draw=ImageDraw.Draw(sheet)
for i,name in enumerate(['neutral','calm','happy','sad','anxious','frustrated']):
    pic=Image.open(out/f'emotion-{name}.png').convert('RGB').crop((40,145,350,395))
    x,y=(i%3)*310,(i//3)*280
    sheet.paste(pic,(x,y+24));draw.text((x+16,y+6),name,fill='#d4cced')
sheet.save(out/'expressions.jpg',quality=94)
scene=Image.new('RGB',(780,844),'#0c0d10')
for i,name in enumerate(['voice-conversation','tour-2-mobile']):
    pic=Image.open(out/f'{name}.png').convert('RGB');pic.thumbnail((390,844));scene.paste(pic,(i*390,0))
scene.save(out/'voice-and-tour.jpg',quality=94)
html=['''<!doctype html><html lang="ru"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>CloudMind \u2014 \u043e\u0431\u043b\u0430\u0447\u043a\u043e \u0438 \u043e\u0431\u0443\u0447\u0435\u043d\u0438\u0435</title><style>
:root{color-scheme:dark}*{box-sizing:border-box}body{background:#0c0d10;color:#eceaf2;margin:0;font:16px/1.5 system-ui}main{max-width:1350px;margin:auto;padding:28px}p{color:#b6b3c2;max-width:900px}.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(290px,1fr));gap:18px}figure{margin:0;padding:14px;background:#191a20;border:1px solid #35333f;border-radius:20px}img{width:100%;max-height:860px;object-fit:contain;display:block}figcaption{padding-top:10px;font-size:13px;color:#beb7d0}a{color:#c8b6ff}button{background:#7850da;color:white;border:0;border-radius:12px;padding:12px;font:inherit}input{width:100%}.clip{max-width:390px}</style><main><h1>\u041e\u0431\u043b\u0430\u0447\u043a\u043e CloudMind \u0438 \u043e\u0431\u0443\u0447\u0435\u043d\u0438\u0435</h1><p>\u0421\u043d\u0438\u043c\u043a\u0438 \u0438 \u043a\u0430\u0434\u0440\u044b \u043d\u0438\u0436\u0435 \u043f\u043e\u043b\u0443\u0447\u0435\u043d\u044b \u0438\u0437 \u0440\u0435\u0430\u043b\u044c\u043d\u043e\u0433\u043e Flutter-\u043a\u043e\u0434\u0430 \u0432 widget tests. \u0413\u043e\u043b\u043e\u0441\u043e\u0432\u044b\u0435 \u0442\u0435\u043a\u0441\u0442\u044b, \u044d\u043c\u043e\u0446\u0438\u0438 \u0438 \u043e\u0442\u0432\u0435\u0442\u044b \u0432 \u044d\u0442\u0438\u0445 \u0441\u043d\u0438\u043c\u043a\u0430\u0445 \u2014 \u0442\u0435\u0441\u0442\u043e\u0432\u044b\u0435 \u0434\u0430\u043d\u043d\u044b\u0435. \u041c\u0438\u043a\u0440\u043e\u0444\u043e\u043d, Whisper \u0438 \u043f\u043b\u0430\u0442\u043d\u044b\u0435 \u0437\u0430\u043f\u0440\u043e\u0441\u044b Qwen \u043d\u0435 \u0438\u0441\u043f\u043e\u043b\u044c\u0437\u043e\u0432\u0430\u043b\u0438\u0441\u044c \u0434\u043b\u044f \u044d\u0442\u0438\u0445 \u0441\u043d\u0438\u043c\u043a\u043e\u0432. \u042d\u0442\u043e \u043d\u0435 \u043f\u0440\u043e\u0432\u0435\u0440\u043a\u0430 \u043d\u0430 \u0444\u0438\u0437\u0438\u0447\u0435\u0441\u043a\u043e\u043c \u0443\u0441\u0442\u0440\u043e\u0439\u0441\u0442\u0432\u0435.</p><h2>\u0428\u0435\u0441\u0442\u044c \u0432\u044b\u0440\u0430\u0436\u0435\u043d\u0438\u0439</h2><figure><img src="expressions.jpg" alt="\u0428\u0435\u0441\u0442\u044c \u044d\u043c\u043e\u0446\u0438\u0439 \u043e\u0431\u043b\u0430\u0447\u043a\u0430"></figure><h2>\u0414\u0432\u0438\u0436\u0435\u043d\u0438\u0435 \u2014 \u0440\u0435\u0430\u043b\u044c\u043d\u044b\u0435 \u043a\u0430\u0434\u0440\u044b Flutter</h2><p>48 \u043a\u0430\u0434\u0440\u043e\u0432 \u0441 \u0448\u0430\u0433\u043e\u043c 100 \u043c\u0441. \u0414\u0435\u043c\u043e\u043d\u0441\u0442\u0440\u0430\u0446\u0438\u044f \u0434\u0432\u0438\u0436\u0435\u043d\u0438\u044f \u0438 \u0441\u043c\u0435\u043d\u044b \u0432\u044b\u0440\u0430\u0436\u0435\u043d\u0438\u0439; \u043d\u0435 \u0438\u0437\u043c\u0435\u0440\u0435\u043d\u0438\u0435 FPS.</p><figure class="clip"><img src="cloud-motion.gif" alt="\u0410\u043d\u0438\u043c\u0430\u0446\u0438\u044f \u043e\u0431\u043b\u0430\u0447\u043a\u0430"></figure>''']
if frames:
    names=[p.name for p in frames]
    html.append(f'''<details><summary>\u041f\u0440\u043e\u0441\u043c\u043e\u0442\u0440\u0435\u0442\u044c \u043e\u0442\u0434\u0435\u043b\u044c\u043d\u044b\u0435 \u043a\u0430\u0434\u0440\u044b</summary><figure class="clip"><img id="frame" src="{names[0]}" alt="\u041a\u0430\u0434\u0440 Flutter"><input id="seek" type="range" min="0" max="{len(names)-1}" value="0"><button id="play">\u0412\u043e\u0441\u043f\u0440\u043e\u0438\u0437\u0432\u0435\u0441\u0442\u0438</button></figure></details><script>const frames={json.dumps(names)};const seek=document.getElementById('seek');function show(i){{seek.value=i;document.getElementById('frame').src=frames[i];}}seek.oninput=()=>show(+seek.value);let timer;document.getElementById('play').onclick=()=>{{clearInterval(timer);let i=0;show(i);timer=setInterval(()=>{{if(++i>=frames.length){{clearInterval(timer);return;}}show(i);}},100);}};</script>''')
html.append(f'<h2>\u0412\u0441\u0435 \u0441\u043d\u0438\u043c\u043a\u0438 ({len(shots)})</h2><div class="grid">')
for p in shots:html.append(f'<figure><a href="{p.name}"><img loading="lazy" src="{p.name}" alt="{escape(p.stem)}"></a><figcaption>{escape(p.stem)}</figcaption></figure>')
html.append('</div></main></html>')
(out/'index.html').write_text('\n'.join(html))
print(f'{len(shots)} PNGs; {len(frames)} actual animation frames; GIF and gallery ready')
