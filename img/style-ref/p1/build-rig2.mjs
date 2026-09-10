import fs from 'node:fs';
let html = fs.readFileSync('rig2-mockup.tpl.html', 'utf8');
const map = {};
for (const f of fs.readdirSync('rig2/parts')) {
  if (!f.endsWith('.webp')) continue;
  map[f.replace('.webp','')] = 'data:image/webp;base64,' + fs.readFileSync('rig2/parts/' + f).toString('base64');
}
html = html.replace('@@IMGMAP@@', JSON.stringify(map)).replace('@@PARTS@@', fs.readFileSync('rig2/parts.json','utf8'));
fs.writeFileSync('rig-mockup.html', html);
console.log('size', Math.round(html.length/1024)+'KB', 'imgs', Object.keys(map).length, 'unresolved', (html.match(/@@[A-Z]+@@/g)||['none']).join(','));
