#!/usr/bin/env node
/* Validates _data/tracker/records.yml and the island Jekyll emits into the
   homepage. Run by the tracker-smoke-test workflow; exits non-zero on any
   violation so the push gets a red check. */
'use strict';
const fs = require('fs');
const { execSync } = require('child_process');

const TASKS = new Set(['exercise', 'study', 'diet', 'sleep']);
const file = fs.readFileSync('_data/tracker/records.yml', 'utf8');
const errors = [];
const days = {}; // day -> { tasks: [], note: '' }

const lineRe = /^"(\d{4}-\d{2}-\d{2})"\s*:\s*\[(.*)\]\s*$/;
file.split('\n').forEach((line, i) => {
  const m = line.match(lineRe);
  if (!m) return; // comment or blank
  const day = m[1];
  if (!/^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/.test(day)) {
    errors.push(`line ${i + 1}: bad date "${day}"`);
  }
  if (days[day]) errors.push(`line ${i + 1}: duplicate entry for ${day}`);

  const inner = m[2].trim();
  if (!inner) { errors.push(`line ${i + 1}: empty list for ${day}`); return; }

  // split on commas that are not inside quotes
  const items = [];
  let cur = '', inQ = false;
  for (const ch of inner) {
    if (ch === '"') { inQ = !inQ; cur += ch; }
    else if (ch === ',' && !inQ) { items.push(cur); cur = ''; }
    else cur += ch;
  }
  items.push(cur);

  const rec = { tasks: [], note: '' };
  for (const rawIt of items) {
    const it = rawIt.trim();
    if (!it) continue;
    if (it.startsWith('"')) {
      const body = it.replace(/^"|"$/g, '');
      if (!body.startsWith('#')) errors.push(`line ${i + 1}: quoted item that is not a note (must start with #) in ${day}`);
      if (body.includes('|')) errors.push(`line ${i + 1}: "|" is not allowed inside a note for ${day}`);
      rec.note = body.replace(/#/g, '').trim();
    } else if (it.startsWith('#')) {
      errors.push(`line ${i + 1}: note must be quoted: "# ..." in ${day}`);
    } else {
      if (!TASKS.has(it)) errors.push(`line ${i + 1}: unknown task "${it}" in ${day} (valid: exercise, study, diet, sleep)`);
      rec.tasks.push(it);
    }
  }
  days[day] = rec;
});

if (Object.keys(days).length === 0) errors.push('no entries found in records.yml');

// End-to-end: build the site and assert the real island in _site/index.html
try {
  execSync('bundle exec jekyll build --quiet', { stdio: 'pipe' });
  const html = fs.readFileSync('_site/index.html', 'utf8');
  const pre = html.match(/<pre id="ct-data"[^>]*>([\s\S]*?)<\/pre>/);
  if (!pre) {
    errors.push('island <pre id="ct-data"> not found in _site/index.html');
  } else {
    const built = pre[1];
    const count = (built.match(/\d{4}-\d{2}-\d{2}\|/g) || []).length;
    if (count < Object.keys(days).length) {
      errors.push(`island has ${count} day line(s), expected ${Object.keys(days).length}`);
    }
    for (const day of Object.keys(days)) {
      const line = built.split('\n').find((l) => l.trim().startsWith(day + '|'));
      if (!line) { errors.push(`island missing line for ${day}`); continue; }
      const content = line.trim().slice(day.length + 1);
      for (const t of days[day].tasks) {
        if (!content.includes(t)) errors.push(`island line for ${day} missing task "${t}" (got: "${line.trim()}")`);
      }
    }
  }
} catch (e) {
  errors.push('jekyll build failed during check: ' + String(e).slice(0, 300));
}

if (errors.length) {
  console.error('TRACKER CHECK FAILED:');
  errors.forEach((e) => console.error('  - ' + e));
  process.exit(1);
}
console.log(`tracker check OK: ${Object.keys(days).length} day(s) logged, island is well-formed`);