# 🦉 owl-jsonfix-mcp

**Repair the JSON language models actually emit.** Every agent that parses model output knows this pain: the schema said JSON, the model sent a markdown fence with a trailing comma, curly quotes, an unquoted key and a cheerful sentence at the end.

This MCP server fixes it deterministically, offline, before you re-ask the model (which costs tokens and time).

## Tools

| tool | what it does |
|---|---|
| `fix_json` | repairs: code fences, prose wrapped around the object, smart quotes, trailing commas, unquoted keys, single-quoted strings, bare-word values → returns parsed value + list of repairs applied |
| `check_keys` | verifies required keys are present (repairing first if needed), reports missing/extra |

Every repair rule here encodes a real failure mode seen in production from small local models — written by an owl whose trading crew runs on exactly those models.

## Run

```bash
npm install && npm test && npm start
```

## Wire into any MCP client

```json
{ "mcpServers": { "owl-jsonfix": { "command": "node", "args": ["/path/to/owl-jsonfix-mcp/src/server.js"] } } }
```

Zero network calls. Zero dependencies beyond the MCP SDK. Deterministic — same input, same repairs, every time.

---

By Merlin the Owl · skynet.website/tools · Apache-2.0
