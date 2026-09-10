import sharp from 'sharp';
import fs from 'node:fs';
const SRC = '/Users/aitest/bible-work/Bible-game/img/style-ref/p0/';
const OUT = './cut/';
// 白底轉透明：距離白色越近越透明，並還原邊緣色（去掉混入的白）
async function keyWhite(input) {
  const { data, info } = await sharp(input).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const px = data;
  for (let i = 0; i < px.length; i += 4) {
    const r = px[i], g = px[i+1], b = px[i+2];
    const d = 255 - Math.min(r, g, b);          // 0=純白
    let a = Math.round(Math.max(0, Math.min(1, (d - 10) / 40)) * 255);
    if (a === 0) { px[i+3] = 0; continue; }
    if (a < 255) { const k = a / 255; px[i] = Math.max(0, Math.min(255, (r - (1-k)*255) / k)); px[i+1] = Math.max(0, Math.min(255, (g - (1-k)*255) / k)); px[i+2] = Math.max(0, Math.min(255, (b - (1-k)*255) / k)); }
    px[i+3] = a;
  }
  return sharp(px, { raw: { width: info.width, height: info.height, channels: 4 } }).png();
}
async function splitCols(file, names, pad = 0.02) {
  const meta = await sharp(SRC + file).metadata();
  const n = names.length, w = Math.floor(meta.width / n);
  for (let i = 0; i < n; i++) {
    const left = Math.max(0, Math.floor(i * w - meta.width * pad));
    const width = Math.min(meta.width - left, Math.floor(w + meta.width * pad * 2));
    const buf = await sharp(SRC + file).extract({ left, top: 4, width, height: meta.height - 18 }).png().toBuffer();
    const keyed = await keyWhite(buf);
    await keyed.trim({ threshold: 10 }).toBuffer().then(b => sharp(b).webp({ quality: 92, alphaQuality: 90 }).toFile(OUT + names[i] + '.webp'));
  }
}
fs.mkdirSync(OUT, { recursive: true });
await splitCols('p0-1-modelsheet.png', ['trav-front', 'trav-34', 'trav-back']);
await splitCols('p0-2-cloaks.png', ['cloak-oat', 'cloak-blue', 'cloak-purple']);
await splitCols('p0-5-items.png', ['item-lamp', 'item-crook', 'item-ark']);
{ const keyed = await keyWhite(await sharp(SRC + 'p0-3-fox.png').extract({ left: 10, top: 4, width: 896, height: 980 }).png().toBuffer()); await keyed.trim({ threshold: 10 }).toBuffer().then(b => sharp(b).webp({ quality: 92, alphaQuality: 90 }).toFile(OUT + 'fox.webp')); }
await sharp(SRC + 'p0-4-map.png').webp({ quality: 85 }).toFile(OUT + 'map.webp');
for (const f of fs.readdirSync(OUT)) { const m = await sharp(OUT + f).metadata(); console.log(f, m.width + 'x' + m.height, Math.round(fs.statSync(OUT + f).size / 1024) + 'KB'); }
