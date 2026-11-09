const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const {execFileSync} = require('node:child_process');
const R = require('../web/static-records.js');
const root = path.resolve(__dirname, '..');
const config = JSON.parse(execFileSync('python3', ['-c',
  'import json; from scripts.build_static import public_configuration; print(json.dumps(public_configuration()))'
], {cwd: root, maxBuffer: 8 * 1024 * 1024}));
const routeId = 'focus-test-route-12345678', key = 'focus-test-session-12345678';
const task = {id: 42, title: '测试学习任务', evidence: '', note: '[个人路线 '+routeId+']'};
const pending = {task_id: 42, routeId, session_key: key, minutes: 0, timer_seconds: 6,
  complete: false, evidence: '原证据', note: '原收获'};

class Store {
  constructor() { this.value = R.empty(); }
  async read() { return structuredClone(this.value); }
  async commit(value, revision) {
    if (this.value.revision !== revision) return false;
    this.value = structuredClone({...value, revision: revision + 1}); return true;
  }
}
function engine() {
  const store = new Store(), api = new R.Records(config, store, () => {}), storage = new Map();
  let source = fs.readFileSync(path.join(root, 'web/learning-app/data-engine.js'), 'utf8')
    .replace('__LEARNING_APP_PUBLIC_CONFIG__', '{}').replace('__LEARNING_APP_COURSE_LIST__', '[]')
    .replace("  addEventListener('message',async event=>{", "  globalThis.methods=methods;\n  addEventListener('message',async event=>{");
  const context = {StaticRecords: {Records: function() { return api; }, IndexedRecords: function() { return store; }},
    StaticPlan: {}, URL, URLSearchParams, location: {search: '?integration-qa=focus-tests', href: 'https://example.test/learning/'},
    navigator: {}, addEventListener() {}, localStorage: {getItem: k => storage.get(k) || null, removeItem: k => storage.delete(k)}};
  vm.runInNewContext(source, context);
  return {methods: context.methods, store, api, storage};
}

function ui({tasks = [], finishPayload = pending, call} = {}) {
  const elements = new Map(), storage = new Map(), calls = [], modals = [], messages = [];
  const focus = {key, taskId: 42, routeId, seconds: 6, running: false, started: 0, finishPayload};
  storage.set('qa:focus-v2', JSON.stringify(focus));
  function element() { return {dataset: {}, innerHTML: '', hidden: false, setAttribute() {},
    querySelector: () => ({textContent: ''}), querySelectorAll: () => []}; }
  const rootElement = {querySelector: s => s === '.app-workspace' ? {insertBefore(el) { elements.set('#'+el.id, el); }} : elements.get(s)};
  const context = {root: rootElement, document: {createElement: element}, Date, crypto: globalThis.crypto,
    localStorage: {getItem: k => storage.get(k) || null, setItem: (k, v) => storage.set(k, v)},
    personalStoreKey: 'qa', workspaceLoaded: false, workspaceData: {tasks: [], sessions: [], entries: []},
    personalRoutes: {items: [{id: routeId, name: '测试路线'}]}, state: {view: 'map'},
    taskRoute: () => routeId, esc: s => String(s), button: (label, action) => `<button data-action="${action}">${label}</button>`,
    workspaceField: (label, name, control) => control, workspaceToast: message => messages.push(message), paintWorkspace() {},
    refreshWorkspace: async () => { const snapshot = await context.workbenchCall('snapshot'); context.workspaceData = snapshot; context.workspaceLoaded = true; },
    workbenchCall: async (method, payload) => { calls.push({method, payload: structuredClone(payload)});
      if (call) { const result = await call(method, payload); if (result !== undefined) return result; }
      if (method === 'snapshot') return {tasks, sessions: [], entries: []};
      if (method === 'focusStatus') return {saved: false};
      return {ok: true}; },
    workspaceModal: (title, html, handler) => { const modal = {title, html, handler}; modals.push(modal);
      return {form: {elements: {complete: {addEventListener() {}}, evidence: {}}}}; }};
  const source = fs.readFileSync(path.join(root, 'web/learning-app/workspace.js'), 'utf8');
  const start = source.indexOf('  let personalFocus=null,'), end = source.indexOf('  function editWorkspaceNote(', start);
  vm.createContext(context); vm.runInContext(source.slice(start, end), context);
  return {context, storage, calls, modals, messages, elements,
    run: expression => vm.runInContext(expression, context),
    submit: (values = {}, checked = false) => modals.at(-1).handler({note: '', evidence: '', ...values}, {elements: {complete: {checked}}})};
}

test('a restored focus loads its task on a map or lesson page and can save immediately', async () => {
  const page = ui({tasks: [task]});
  await page.run('hydratePersonalFocus(); focusHydration');
  assert.match(page.elements.get('#lbb-personal-focus').innerHTML, /测试学习任务/);
  assert.match(page.elements.get('#lbb-personal-focus').innerHTML, /等待保存/);
  assert.doesNotMatch(page.elements.get('#lbb-personal-focus').innerHTML, /workspace-focus-toggle/);
  await page.run('openPersonalFocusResult()');
  assert.match(page.modals.at(-1).html, /原收获/);
  assert.match(page.modals.at(-1).html, /原证据/);
  await page.submit({note: '修改后的收获', evidence: '修改后的证据'}, true);
  const saved = page.calls.find(c => c.method === 'finish').payload;
  assert.equal(saved.note, '修改后的收获'); assert.equal(saved.evidence, '修改后的证据');
  assert.equal(saved.complete, true); assert.equal(saved.timer_seconds, 6); assert.equal(saved.session_key, key);
  assert.equal(JSON.parse(page.storage.get('qa:focus-v2')), null);
});

test('failed saves preserve seconds and edits through reload, and retries use the newest form values', async () => {
  let fail = true;
  const page = ui({tasks: [task], finishPayload: null, call: async method => {
    if (method === 'finish' && fail) throw Error('模拟写入失败');
  }});
  await page.run('openPersonalFocusResult()');
  await assert.rejects(page.submit({note: '第一次填写'}), /模拟写入失败/);
  const savedFocus = JSON.parse(page.storage.get('qa:focus-v2'));
  assert.equal(savedFocus.seconds, 6); assert.equal(savedFocus.finishPayload.note, '第一次填写');
  assert.equal(page.run('focusSaving'), false);
  fail = false;
  const reload = ui({tasks: [task], finishPayload: savedFocus.finishPayload});
  await reload.run('openPersonalFocusResult()');
  assert.match(reload.modals.at(-1).html, /第一次填写/);
  await reload.submit({note: '重试修改'});
  assert.equal(reload.calls.find(c => c.method === 'finish').payload.note, '重试修改');
});

test('missing tasks expose a download and explicit discard while preserving the pending result', async () => {
  const page = ui(); await page.run('openPersonalFocusResult()');
  assert.equal(page.modals.at(-1).title, '处理保留的专注计时');
  assert.match(page.modals.at(-1).html, /workspace-focus-export/);
  assert.match(page.modals.at(-1).html, /name="discard" required/);
  assert.notEqual(JSON.parse(page.storage.get('qa:focus-v2')), null);
  assert.equal(page.calls.filter(c => c.method === 'finish').length, 0);
  await page.submit(); assert.equal(JSON.parse(page.storage.get('qa:focus-v2')), null);
});

test('an acknowledged receipt clears an orphan focus without resubmitting or discarding time', async () => {
  const page = ui({call: async method => method === 'focusStatus' ? {saved: true} : undefined});
  await page.run('openPersonalFocusResult()');
  assert.equal(page.modals.length, 0); assert.equal(page.calls.filter(c => c.method === 'finish').length, 0);
  assert.equal(JSON.parse(page.storage.get('qa:focus-v2')), null); assert.match(page.messages[0], /已经保存/);
});

test('a lost response after commit is reconciled, and a list-refresh failure does not resurrect the timer', async () => {
  let committed = false;
  const page = ui({tasks: [task], finishPayload: null, call: async method => {
    if (method === 'finish') { committed = true; throw Error('响应丢失'); }
    if (method === 'focusStatus') return {saved: committed, matches: true};
    if (method === 'snapshot' && committed) throw Error('列表刷新失败');
  }});
  await page.run('openPersonalFocusResult()'); await page.submit({note: '成功写入'});
  assert.equal(JSON.parse(page.storage.get('qa:focus-v2')), null);
  assert.match(page.messages.at(-1), /已保存/);
});

test('concurrent finish clicks open one form and release the busy state after failure', async () => {
  let release;
  const wait = new Promise(resolve => { release = resolve; });
  const page = ui({tasks: [task], finishPayload: null, call: async method => { if (method === 'snapshot') await wait; }});
  const first = page.run('openPersonalFocusResult()'); await page.run('openPersonalFocusResult()');
  release(); await first; assert.equal(page.modals.length, 1); assert.equal(page.run('focusOpening'), false);
  const failed = ui({call: async method => { if (method === 'focusStatus') throw Error('数据暂不可用'); }});
  await assert.rejects(failed.run('openPersonalFocusResult()'), /数据暂不可用/);
  assert.equal(failed.run('focusOpening'), false); assert.notEqual(JSON.parse(failed.storage.get('qa:focus-v2')), null);
});

test('receipt reconciliation is read-only, preserves sub-minute seconds, and survives deleted tasks', async () => {
  const {methods, api, store} = engine();
  await api.request('tasks', {title: task.title, track: 'agent', learning_route: 'agent', minutes: 30, note: task.note});
  const payload = {...pending, task_id: 1};
  assert.equal((await methods.focusStatus(payload)).saved, false);
  await methods.finish(payload); const revision = store.value.revision;
  assert.equal(store.value.tables.sessions.length, 0); assert.equal(store.value.tables.study_receipts.length, 1);
  assert.match(store.value.tables.learning_entries[0].body, /0 分 6 秒/);
  assert.equal((await methods.focusStatus(payload)).matches, true); assert.equal(store.value.revision, revision);
  const retry = await methods.finish({...payload, note: '后来修改'});
  assert.equal(retry.alreadySaved, true); assert.equal(retry.matches, false);
  assert.equal(store.value.revision, revision); assert.match(store.value.tables.learning_entries[0].procedure, /原收获/);
  await api.request('tasks/delete', {id: 1});
  assert.equal((await methods.finish(payload)).alreadySaved, true);
  assert.equal(store.value.tables.study_receipts.length, 1);
});

test('a browser-storage failure leaves the timer retryable instead of retaining a busy lock', async () => {
  const opening = ui();
  opening.context.localStorage.setItem = () => { throw Error('浏览器存储不可用'); };
  await assert.rejects(opening.run('openPersonalFocusResult()'), /浏览器存储不可用/);
  assert.equal(opening.run('focusOpening'), false);
  const saving = ui({tasks: [task], finishPayload: null});
  await saving.run('openPersonalFocusResult()');
  saving.context.localStorage.setItem = () => { throw Error('浏览器存储不可用'); };
  await assert.rejects(saving.submit(), /浏览器存储不可用/);
  assert.equal(saving.run('focusSaving'), false);
  assert.equal(saving.calls.some(c => c.method === 'finish'), false);
});

test('legacy focus recovery ignores committed sessions and only releases the matching legacy key', async () => {
  const {methods, api, storage} = engine(), storageKey = 'learn-by-building-integration-qa:focus-tests:study-focus';
  const legacy = {key, taskId: 1, seconds: 6}; storage.set(storageKey, JSON.stringify(legacy));
  assert.equal((await methods.resumeFocus()).key, key);
  await methods.releaseFocus({key: 'another-focus-12345678'}); assert.ok(storage.has(storageKey));
  await api.request('tasks', {title: task.title, track: 'agent', learning_route: 'agent', minutes: 30, note: task.note});
  await methods.finish({...pending, task_id: 1}); assert.equal(await methods.resumeFocus(), null);
  await methods.releaseFocus({key}); assert.equal(storage.has(storageKey), false);
});
