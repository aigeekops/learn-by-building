const test = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const path = require('node:path');
const {execFileSync} = require('node:child_process');
const root = path.resolve(__dirname, '..');
function python(code) {
  return execFileSync(process.env.PYTHON || 'python3', ['-c', code], {cwd: root, maxBuffer: 8 * 1024 * 1024}).toString();
}
function runtime(name) {
  const code = python(`from scripts.build_learning_app import calendar_runtime; print(calendar_runtime('${name}'))`);
  const context = {module: {exports: {}}, require, structuredClone, TextEncoder, TextDecoder, URL, crypto: globalThis.crypto};
  vm.runInNewContext(code, context);
  return context.module.exports;
}
const R = runtime('static-records.js'), P = runtime('static-plan.js');
const original = require('../web/static-plan.js');
const config = JSON.parse(python('import json; from scripts.build_static import public_configuration; print(json.dumps(public_configuration()))'));
class Store {
  constructor() { this.value = R.empty(); }
  async read() { return structuredClone(this.value); }
  async commit(value, revision) {
    if (this.value.revision !== revision) return false;
    this.value = structuredClone({...value, revision: revision + 1}); return true;
  }
}
function setup() {
  const store = new Store(); return {store, api: new R.Records(config, store, P.preview)};
}
const profile = {id: 'long-plan-test-123456789', goal: 'robotics', level: 'zero', minutes: 30,
  days: 366, start: '2026-11-08', progression: 'current'};

test('long plans keep their last day, evidence and idempotent receipts through backup restore', async () => {
  const {api} = setup(); await api.request('plan', profile);
  const state = await api.request('state'); assert.equal(state.learning_plan.tasks.length, 366);
  assert.equal(state.learning_plan.tasks.at(-1).day_index, 366);
  const task = state.learning_plan.tasks[0];
  const finish = {session_key: 'long-plan-session-12345678', task_id: task.id, minutes: 1, timer_seconds: 90,
    complete: true, evidence: '独立计算并解释结果', note: ''};
  await api.request('study/finish', finish);
  const backup = await api.request('backup');
  const restored = setup().api, preview = await restored.request('backup/preview', {backup});
  await restored.request('backup/restore', {backup, ...preview, confirmation: 'replace-learning-records'});
  await restored.request('study/finish', finish);
  const result = await restored.request('state');
  assert.equal(result.sessions.length, 1);
  assert.equal(result.learning_plan.tasks.length, 366);
  assert.equal(result.tasks.find(t => t.id === task.id).evidence, finish.evidence);
});

test('extended calendar rejects invalid lengths and preserves standard Python-compatible plans', () => {
  for (const days of [0, 367, 1.5]) assert.throws(() => P.preview(config, {...profile, days}));
  for (const days of [7, 14]) assert.equal(JSON.stringify(P.preview(config, {...profile, days})),
    JSON.stringify(original.preview(config, {...profile, days})));
});
