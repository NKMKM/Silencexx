const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(process.argv[2] || 'build');
const before = path.join(root, 'structural-before');
const after = path.join(root, 'structural-after');
const pairs = [
  ['home-mobile.png', 'home-mobile.png'],
  ['journal-mobile.png', 'journal-mobile.png'],
  ['settings-mobile.png', 'settings-mobile.png'],
  ['auth-320.png', 'auth-320.png'],
  ['inbox-320.png', 'inbox-320.png'],
  ['tasks-320.png', 'tasks-320.png'],
  ['subscription-320.png', 'subscription-320.png'],
  ['support-320.png', 'support-320.png'],
];
const escape = (text) => text.replace(/[&<>\"]/g, (char) => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '\"': '&quot;',
}[char]));
const pngs = (directory) => fs.readdirSync(directory)
  .filter((file) => file.toLowerCase().endsWith('.png')).sort();
const html = [`<!doctype html><html lang="ru"><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>CloudMind — структурный редизайн</title>
<style>
:root{color-scheme:dark}*{box-sizing:border-box}body{margin:0;background:#08080d;color:#f8f8fc;font:16px -apple-system,BlinkMacSystemFont,sans-serif}
header{padding:24px 5vw;background:#101017;border-bottom:1px solid #343444}h1{font-size:clamp(22px,4vw,34px);margin:0 0 8px}p{color:#b1b1c2;line-height:1.55;margin:4px 0}
main{padding:24px 5vw;max-width:1500px;margin:auto}h2{margin:38px 0 8px}.compare,.gallery{display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:16px}
.pair{background:#171720;border:1px solid #343444;border-radius:14px;padding:12px}.pair h3{margin:4px 0 10px;font-size:16px}.sides{display:grid;grid-template-columns:1fr 1fr;gap:8px}.sides figure,.gallery figure{margin:0}.sides img{width:100%;height:auto;filter:grayscale(1);border-radius:8px;border:1px solid #343444}.sides figcaption,.gallery figcaption{font-size:12px;color:#b1b1c2;padding:6px 0}
.gallery figure{background:#171720;border:1px solid #343444;border-radius:12px;overflow:hidden}.gallery img{width:100%;display:block}.gallery figcaption{padding:10px}
</style><header><h1>CloudMind · структурная перестройка</h1>
<p>Реальные PNG-снимки Flutter-приложения, снятые в widget tests. Тестовые формы и диалоги заполнены фиктивными данными.</p>
<p>Сравнения переведены браузером в оттенки серого, чтобы показать изменения компоновки независимо от палитры.</p></header><main>
<h2>До и после · grayscale</h2><p>Парные снимки взяты из предыдущего и текущего проходов, одного viewport.</p><div class="compare">`];
for (const [oldName, newName] of pairs) {
  if (!fs.existsSync(path.join(before, oldName)) || !fs.existsSync(path.join(after, newName))) continue;
  const title = escape(newName.replace('.png', '').replaceAll('-', ' '));
  html.push(`<article class="pair"><h3>${title}</h3><div class="sides">
<figure><a href="../structural-before/${oldName}"><img loading="lazy" src="../structural-before/${oldName}"></a><figcaption>До · grayscale</figcaption></figure>
<figure><a href="${newName}"><img loading="lazy" src="${newName}"></a><figcaption>После · grayscale</figcaption></figure>
</div></article>`);
}
html.push('</div><h2>Все новые Flutter-снимки</h2><div class="gallery">');
for (const name of pngs(after)) {
  html.push(`<figure><a href="${name}"><img loading="lazy" src="${name}"></a><figcaption>${escape(name.replace('.png', ''))}</figcaption></figure>`);
}
html.push('</div><h2>Исходные снимки</h2><div class="gallery">');
for (const name of pngs(before)) {
  html.push(`<figure><a href="../structural-before/${name}"><img loading="lazy" src="../structural-before/${name}"></a><figcaption>${escape(name)}</figcaption></figure>`);
}
html.push('</div></main></html>');
const output = path.join(after, 'index.html');
fs.writeFileSync(output, html.join('\n'));
console.log(`Gallery: ${output}; ${pngs(after).length} current Flutter screenshots`);
