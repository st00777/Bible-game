import { chromium } from "/Users/aitest/bible-work/tools/rive-mcp/node_modules/playwright-core/index.mjs";
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { pathToFileURL } from "node:url";
const [riv, outDir] = process.argv.slice(2); mkdirSync(outDir, { recursive: true });
writeFileSync(`${outDir}/page.html`, readFileSync("browser-test.html", "utf8").replace(/^const b64=.*$/m, `const b64="${readFileSync(riv).toString("base64")}";`));
const browser = await chromium.launch({ headless: true, channel: "chrome" });
const page = await browser.newPage({ viewport: { width: 700, height: 1050 } });
page.on("pageerror", (e) => console.log("[pageerror]", e.message));
await page.goto(pathToFileURL(process.cwd() + `/${outDir}/page.html`).href);
await page.waitForFunction(() => window.__ready === true, null, { timeout: 30000 });
await page.waitForTimeout(500);
console.log("inputs:", await page.evaluate(() => window.__inputs.map((i) => i.name + ":" + i.type)));
await page.evaluate(() => window.fire("blink"));
for (const t of [40, 100, 160, 260]) { await page.waitForTimeout(t === 40 ? 40 : 60); await page.screenshot({ path: `${outDir}/b${t}.png`, clip: { x: 150, y: 220, width: 200, height: 140 } }); }
await browser.close();
