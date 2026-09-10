import fs from 'node:fs';
let html = fs.readFileSync('rig-mockup.tpl.html', 'utf8');
const map = {};
for (const f of fs.readdirSync('rig')) {
  if (!f.endsWith('.webp')) continue;
  map[f.replace('.webp','')] = 'data:image/webp;base64,' + fs.readFileSync('rig/' + f).toString('base64');
}
html = html.replace('@@IMGMAP@@', JSON.stringify(map));
fs.writeFileSync('rig-mockup.html', html);
console.log('size', Math.round(html.length/1024)+'KB', 'imgs', Object.keys(map).length, 'unresolved', (html.match(/@@[a-z0-9-]+@@/g)||['none']).join(','));
