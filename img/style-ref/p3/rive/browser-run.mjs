// 用法：node browser-run.mjs <riv> <outDir>  → rest / inhale / blink 三張截圖＋每 0.5s 連拍條
import { chromium } from "/Users/aitest/bible-work/tools/rive-mcp/node_modules/playwright-core/index.mjs";
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { pathToFileURL } from "node:url";
const [riv, outDir] = process.argv.slice(2);
mkdirSync(outDir, { recursive: true });
const b64 = readFileSync(riv).toString("base64");
writeFileSync(`${outDir}/page.html`, readFileSync("browser-test.html", "utf8").replace(/^const b64=.*$/m, `const b64="${b64}";`));
const browser = await chromium.launch({ headless: true, channel: "chrome" });
const page = await browser.newPage({ viewport: { width: 700, height: 1050 } });
page.on("pageerror", (e) => console.log("[pageerror]", e.message));
page.on("console", (m) => { if (m.type() === "error") console.log("[console]", m.text()); });
await page.goto(pathToFileURL(process.cwd() + `/${outDir}/page.html`).href);
await page.waitForFunction(() => window.__ready === true, null, { timeout: 30000 });
await page.waitForTimeout(100); await page.screenshot({ path: `${outDir}/rest.png` });
await page.waitForTimeout(1800); await page.screenshot({ path: `${outDir}/inhale.png` });
await page.evaluate(() => window.fire("blink")); await page.waitForTimeout(110); await page.screenshot({ path: `${outDir}/blink.png` });
await browser.close(); console.log("done", outDir);
