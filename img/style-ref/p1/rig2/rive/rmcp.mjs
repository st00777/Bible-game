// 小型 JSON-RPC client：不經 MCP 註冊，直接 spawn rive-mcp server 呼叫工具
// 用法：node rmcp.mjs <tool> <args.json|-> [outDir]
//       node rmcp.mjs list            → 列出工具與 schema（寫到 tools.json）
import { spawn } from "node:child_process";
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";

const SERVER = "/Users/aitest/bible-work/tools/rive-mcp/dist/index.js";
const [tool, argFile, outDir = "."] = process.argv.slice(2);
const env = { ...process.env }; delete env.FIGMA_TOKEN;
const child = spawn(process.execPath, [SERVER], { stdio: ["pipe", "pipe", "inherit"], env });
let buf = ""; const pending = new Map(); let nid = 1;
child.stdout.on("data", (c) => {
  buf += c.toString(); let i;
  while ((i = buf.indexOf("\n")) >= 0) {
    const line = buf.slice(0, i).trim(); buf = buf.slice(i + 1); if (!line) continue;
    let m; try { m = JSON.parse(line); } catch { continue; }
    if (m.id && pending.has(m.id)) { const p = pending.get(m.id); pending.delete(m.id); m.error ? p.reject(new Error(JSON.stringify(m.error))) : p.resolve(m.result); }
  }
});
const rpc = (method, params) => new Promise((resolve, reject) => {
  const id = nid++; pending.set(id, { resolve, reject });
  child.stdin.write(JSON.stringify({ jsonrpc: "2.0", id, method, params }) + "\n");
  setTimeout(() => { if (pending.has(id)) { pending.delete(id); reject(new Error("timeout " + method)); } }, 180000);
});
const notify = (method, params) => child.stdin.write(JSON.stringify({ jsonrpc: "2.0", method, params }) + "\n");

await rpc("initialize", { protocolVersion: "2024-11-05", capabilities: {}, clientInfo: { name: "rmcp-cli", version: "0" } });
notify("notifications/initialized", {});
try {
  if (tool === "list") {
    const r = await rpc("tools/list", {});
    writeFileSync(join(outDir, "tools.json"), JSON.stringify(r.tools, null, 1));
    console.log(r.tools.map((t) => t.name).join("\n"));
  } else {
    const args = argFile === "-" ? {} : JSON.parse(readFileSync(argFile, "utf8"));
    const r = await rpc("tools/call", { name: tool, arguments: args });
    mkdirSync(outDir, { recursive: true });
    let n = 0;
    for (const c of r.content ?? []) {
      if (c.type === "text") console.log(c.text);
      else if (c.type === "image") { const f = join(outDir, `${tool}-${n++}.png`); writeFileSync(f, Buffer.from(c.data, "base64")); console.log("[image]", f); }
      else console.log("[" + c.type + "]");
    }
    if (r.isError) { console.error("TOOL ERROR"); process.exitCode = 2; }
  }
} catch (e) { console.error("RPC ERROR", e.message); process.exitCode = 1; }
finally { child.kill(); setTimeout(() => process.exit(), 200); }
