import { fixJson, checkKeys } from "../src/fix.js";
import { spawn } from "node:child_process";
import assert from "node:assert";

// real failure modes collected from small local models
const cases = [
  ['```json\n{"a": 1}\n```', { a: 1 }, "fence"],
  ['{"a": 1, "b": [1,2,],}', { a: 1, b: [1, 2] }, "trailing commas"],
  ['{\u201Ca\u201D: \u201Chello\u201D}', { a: "hello" }, "smart quotes"],
  ['{a: 1, b: "x"}', { a: 1, b: "x" }, "unquoted keys"],
  ["{'a': 'ok'}", { a: "ok" }, "single quotes"],
  ['Sure! Here you go: {"verdict": "NO"} hope that helps', { verdict: "NO" }, "prose wrap"],
  ['{"bias": BULLISH}', { bias: "BULLISH" }, "bare word value"],
  ['{"n": 1} trailing ]', null, "hopeless-ish still parses prefix"],
];
for (const [input, want, label] of cases) {
  const r = fixJson(input);
  if (want === null) { console.log("case:", label, "->", r.ok ? "parsed prefix" : "refused cleanly"); continue; }
  assert.ok(r.ok, label + " should repair: " + r.error);
  assert.deepStrictEqual(r.value, want, label);
  console.log("case:", label, "OK, repairs:", r.notes.join("; "));
}
const k = checkKeys('{"verdict":"NO","size":2,"notes":"x"}', ["verdict", "risk", "size"]);
assert.equal(k.ok, false); assert.deepStrictEqual(k.missing, ["risk"]); assert.deepStrictEqual(k.extra, ["notes"]);
console.log("checkKeys: OK");

// MCP handshake
const p = spawn(process.execPath, ["src/server.js"], { stdio: ["pipe", "pipe", "inherit"] });
let buf = "";
const send = m => p.stdin.write(JSON.stringify(m) + "\n");
send({ jsonrpc: "2.0", id: 1, method: "initialize", params: { protocolVersion: "2024-11-05", capabilities: {}, clientInfo: { name: "test", version: "0" } } });
send({ jsonrpc: "2.0", method: "notifications/initialized" });
send({ jsonrpc: "2.0", id: 2, method: "tools/call", params: { name: "fix_json", arguments: { text: "```json\n{a: 1,}\n```" } } });
await new Promise((res, rej) => {
  const t = setTimeout(() => rej(new Error("mcp timeout: " + buf.slice(0, 300))), 15000);
  p.stdout.on("data", d => {
    buf += d;
    for (const line of buf.split("\n")) {
      try { const m = JSON.parse(line);
        if (m.id === 2) { const inner = JSON.parse(m.result.content[0].text); assert.deepStrictEqual(inner.value, { a: 1 }); clearTimeout(t); res(); }
      } catch {}
    }
  });
});
p.kill();
console.log("ALL TESTS PASS");
