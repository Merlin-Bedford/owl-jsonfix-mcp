#!/usr/bin/env node
// owl-jsonfix-mcp — MCP server: repair + validate model-emitted JSON. Offline, deterministic.
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { fixJson, checkKeys } from "./fix.js";

const server = new McpServer({ name: "owl-jsonfix", version: "1.0.0" });

server.registerTool(
  "fix_json",
  {
    title: "Repair malformed JSON from a model",
    description:
      "Best-effort repair of broken JSON (code fences, trailing commas, smart quotes, unquoted keys, single quotes, prose around the object, bare words). Returns the parsed value as clean JSON plus a list of the repairs applied — or, if unrepairable, the error and the closest candidate. Call this before re-asking the model.",
    inputSchema: { text: z.string().describe("the raw broken JSON text") },
  },
  async ({ text }) => {
    const r = fixJson(text);
    if (r.ok) return { content: [{ type: "text", text: JSON.stringify({ ok: true, value: r.value, repairs: r.notes }, null, 2) }] };
    return { isError: true, content: [{ type: "text", text: JSON.stringify({ ok: false, error: r.error, repairs: r.notes, candidate: r.candidate }) }] };
  }
);

server.registerTool(
  "check_keys",
  {
    title: "Check required keys",
    description: "Verify an object (repairs it first if it is text) has all required keys; reports missing and extra keys. Use after getting a structured answer from any model.",
    inputSchema: { value: z.string().describe("JSON text or object"), required: z.array(z.string()).describe("keys that must be present") },
  },
  async ({ value, required }) => {
    const r = checkKeys(value, required);
    return { content: [{ type: "text", text: JSON.stringify(r, null, 2) }] };
  }
);

await server.connect(new StdioServerTransport());
