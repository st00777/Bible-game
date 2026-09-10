import { chromium } from "/Users/aitest/bible-work/tools/rive-mcp/node_modules/playwright-core/index.mjs";
import { pathToFileURL } from "node:url";
const browser = await chromium.launch({ headless: true, channel: "chrome" });
for (const rate of [1, 4, 6]) {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 3, isMobile: true });
  const page = await ctx.newPage();
  const cdp = await ctx.newCDPSession(page);
  await cdp.send("Emulation.setCPUThrottlingRate", { rate });
  await page.goto(pathToFileURL(process.cwd() + "/browser-test.html").href);
  await page.waitForFunction(() => window.__ready === true, null, { timeout: 30000 });
  await page.waitForTimeout(500);
  // 邊舉手邊量 3 秒的 rAF 幀率（rive 用 rAF 驅動）
  const fps = await page.evaluate(() => new Promise((res) => {
    let n = 0; const t0 = performance.now();
    const kick = () => { window.fire("lift"); };
    kick(); const iv = setInterval(kick, 900);
    const tick = () => { n++; if (performance.now() - t0 < 3000) requestAnimationFrame(tick); else { clearInterval(iv); res((n / 3).toFixed(1)); } };
    requestAnimationFrame(tick);
  }));
  console.log(`CPU x${rate} throttle, 390x844 @3x mobile: ~${fps} fps`);
  await ctx.close();
}
await browser.close();
