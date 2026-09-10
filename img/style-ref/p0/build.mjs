import fs from 'node:fs';
let html = fs.readFileSync('p0-mockup.tpl.html', 'utf8');
const map = {};
for (const f of fs.readdirSync('cut')) {
  const name = f.replace('.webp', '');
  const uri = 'data:image/webp;base64,' + fs.readFileSync('cut/' + f).toString('base64');
  map[name] = uri;
}
html = html.replace('@@IMGMAP@@', JSON.stringify(map));
const left = html.match(/@@[a-z0-9-]+@@/g);
fs.writeFileSync('p0-mockup.html', html);
console.log('size', Math.round(html.length / 1024) + 'KB', 'unresolved', left ? left.join(',') : 'none');
