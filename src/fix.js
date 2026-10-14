// owl-jsonfix — repair the JSON language models actually emit, not the JSON specs promise.
// Every rule here encodes a real failure I've seen from small/local models: fenced blocks,
// trailing commas, smart quotes, single quotes, unquoted keys, prose wrapped around objects.

export function fixJson(raw) {
  const notes = [];
  let t = String(raw).trim();

  // 1) strip markdown code fences
  const fence = t.match(/```(?:json|javascript)?\s*([\s\S]*?)```/i);
  if (fence) { t = fence[1].trim(); notes.push("removed code fence"); }

  // 2) isolate the outermost JSON value if wrapped in prose
  if (!/^[{["\[]/.test(t)) {
    const s = t.search(/[{["\[]/), e = Math.max(t.lastIndexOf("}"), t.lastIndexOf("]"));
    if (s > -1 && e > s) { t = t.slice(s, e + 1); notes.push("trimmed prose around JSON"); }
  }

  // 3) smart quotes → straight
  if (/[\u201C\u201D\u2018\u2019]/.test(t)) {
    t = t.replace(/[\u201C\u201D]/g, '"').replace(/[\u2018\u2019]/g, "'");
    notes.push("smart quotes normalised");
  }

  // 4) trailing commas before } or ]
  if (/,\s*[}\]]/.test(t)) { t = t.replace(/,(\s*[}\]])/g, "$1"); notes.push("trailing commas removed"); }

  // 5) try strict parse first
  let value, err = null;
  try { value = JSON.parse(t); return { ok: true, value, notes }; } catch (e) { err = e; }

  // 6) quote unquoted keys:  {key: ...} -> {"key": ...}
  const t2 = t.replace(/([{,]\s*)([A-Za-z_$][\w$]*)\s*:/g, '$1"$2":');
  if (t2 !== t) { t = t2; notes.push("unquoted keys quoted"); try { return { ok: true, value: JSON.parse(t), notes }; } catch (e) { err = e; } }

  // 7) single-quoted strings → double-quoted (only when no straight quotes inside)
  const t3 = t.replace(/'((?:[^'\\"]|\\')*)'/g, (m, inner) => '"' + inner.replace(/\\"/g, '"').replace(/"/g, '\\"') + '"');
  if (t3 !== t) { t = t3; notes.push("single quotes converted"); try { return { ok: true, value: JSON.parse(t), notes }; } catch (e) { err = e; } }

  // 8) bare words → strings (null-ish words kept)
  const t4 = t.replace(/([,{[]\s*)([A-Za-z_][\w -]*)(\s*[,}\]])/g, (m, a, w, b) =>
    /^(true|false|null)$/.test(w) ? m : a + '"' + w + '"' + b);
  if (t4 !== t) { t = t4; notes.push("bare words quoted"); try { return { ok: true, value: JSON.parse(t), notes }; } catch (e) { err = e; } }

  // 8b) bare words in VALUE position: {"k": BARE}
  const t5 = t.replace(/(:\s*)([A-Za-z_][\w -]*?)(\s*[,}\]])/g, (m, a, w, b) =>
    /^(true|false|null)$/.test(w) ? m : a + '"' + w + '"' + b);
  if (t5 !== t) { t = t5; notes.push("bare value words quoted"); try { return { ok: true, value: JSON.parse(t), notes }; } catch (e) { err = e; } }

  return { ok: false, error: err.message, candidate: t, notes };
}

/** Check a parsed object against required keys; returns {ok, missing[], extra[]} */
export function checkKeys(value, required) {
  const obj = typeof value === "string" ? (fixJson(value).value ?? {}) : value;
  const keys = obj && typeof obj === "object" && !Array.isArray(obj) ? Object.keys(obj) : [];
  const missing = required.filter(k => !(k in (obj || {})));
  const extra = keys.filter(k => !required.includes(k));
  return { ok: missing.length === 0, missing, extra };
}
