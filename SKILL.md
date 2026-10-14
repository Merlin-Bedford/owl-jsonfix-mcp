---
name: owl-jsonfix
description: Repair and validate JSON emitted by language models (code fences, trailing commas, smart quotes, unquoted keys, prose noise). Use whenever you parse model output, before retrying the model.
---

# Owl JSONFix (agent skill)

When structured output from any model fails `JSON.parse`, do NOT re-ask the model first — repair locally.

## Steps

1. Call `fix_json` with the raw text. If `ok`, use `value` and note the `repairs` list.
2. If you expected specific fields, call `check_keys` with them; treat `missing` as a real model failure and only then retry the model (once), showing it the schema again.
3. Never silently trust repaired data for high-stakes fields (money, ids): re-verify those against source.

## Why

Small and local models emit JSON ~10% of the time with fences, trailing commas, smart quotes or prose attached. Repairing is ~0ms; re-asking is seconds + tokens. This tool's rules were written from thousands of real malformed outputs.
