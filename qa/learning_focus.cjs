const {chromium} = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const assert = require('node:assert/strict'), fs = require('node:fs'), path = require('node:path');
const draft = process.env.FOCUS_DRAFT_FILE || path.resolve(__dirname, '../../../output/learning-focus-fix-20261108/stage/index.html');
const output = process.env.FOCUS_QA_OUTPUT || path.resolve(__dirname, '../../../output/learning-focus-fix-20261108/browser-qa');
fs.mkdirSync(output, {recursive: true});
(async () => {
  const browser = await chromium.launch({headless: true}), results = [];
  try {
    for (const width of [1440, 390]) {
      const context = await browser.newContext({viewport: {width, height: 1000}, reducedMotion: 'reduce', acceptDownloads: true});
      const page = await context.newPage(), errors = [], qa = 'focus-'+width+'-'+Date.now();
      page.on('pageerror', e => errors.push(e.message));
      await page.route(/^https?:/, route => route.abort());
      await page.goto('file://'+draft+'?integration-qa='+qa);
      await page.waitForFunction(() => !!globalThis.LBBLearningEngine?.focusStatus);
      const seed = await page.evaluate(async qa => {
        const profile = {id: crypto.randomUUID(), name: '计时流程回归', goal: 'agent', courseIds: ['cs50p'],
          startCourseId: 'cs50p', currentCourseId: 'cs50p', minutes: 30, days: 7, start: '2026-11-08',
          progression: 'current', device: 'browser', status: 'active'};
        const adopted = await LBBLearningEngine.adopt(profile); profile.taskIds = adopted.taskIds;
        const task = (await LBBLearningEngine.snapshot()).tasks.find(t => t.id === profile.taskIds[0]);
        const key = 'lbb-personal-routes-v1:qa:'+qa, session = crypto.randomUUID();
        const payload = {task_id: task.id, routeId: profile.id, session_key: session, minutes: 0, timer_seconds: 6,
          complete: false, evidence: '原证据', note: '原收获'};
        const focus = {key: session, taskId: task.id, routeId: profile.id, seconds: 6, running: false, started: 0, finishPayload: payload};
        localStorage.setItem(key, JSON.stringify({version: 1, activeId: profile.id, items: [profile]}));
        localStorage.setItem(key+':focus-v2', JSON.stringify(focus)); return {key, task, profile, focus};
      }, qa);
      await page.reload();
      const dock = page.locator('#lbb-personal-focus'), dialog = page.locator('#lbb-workspace-dialog');
      await page.waitForFunction(title => document.querySelector('#lbb-personal-focus b')?.textContent === title, seed.task.title);
      assert.match(await dock.innerText(), /等待保存/);
      assert.equal(await dock.locator('[data-action="workspace-focus-toggle"]').count(), 0);
      await page.screenshot({path: path.join(output, 'pending-'+width+'.png'), fullPage: true});
      await dock.locator('[data-action="workspace-focus-finish"]').click();
      assert.equal(await dialog.locator('[name="note"]').inputValue(), '原收获');
      await page.evaluate(() => { const original = LBBLearningEngine.finish; let fail = true;
        LBBLearningEngine.finish = async payload => { if (fail) { fail = false; throw Error('模拟保存失败'); } return original(payload); }; });
      await dialog.locator('[name="note"]').fill('失败后保留的收获');
      await dialog.locator('[type="submit"]').click();
      await page.waitForFunction(() => document.querySelector('.workspace-form-error')?.textContent.includes('模拟保存失败'));
      await dialog.locator('[data-action="workspace-dialog-close"]').first().click();
      await dock.locator('[data-action="workspace-focus-finish"]').click();
      assert.equal(await dialog.locator('[name="note"]').inputValue(), '失败后保留的收获');
      await dialog.locator('[name="note"]').fill('重试后修改并保存的收获');
      await dialog.locator('[name="evidence"]').fill('重试后修改并保存的证据');
      await dialog.locator('[name="complete"]').check();
      await dialog.locator('[type="submit"]').click();
      await page.waitForFunction(() => !document.querySelector('#lbb-workspace-dialog')?.open);
      assert.equal(await dock.isVisible(), false);
      const saved = await page.evaluate(async () => ({snapshot: await LBBLearningEngine.snapshot(), backup: await LBBLearningEngine.backup()}));
      assert.equal(saved.snapshot.entries.length, 1); assert.equal(saved.snapshot.sessions.length, 0);
      assert.equal(saved.snapshot.entries[0].procedure, '重试后修改并保存的收获');
      assert.equal(saved.snapshot.entries[0].result, '重试后修改并保存的证据');
      assert.match(saved.snapshot.entries[0].body, /0 分 6 秒/);
      assert.equal(saved.backup.tables.study_receipts.length, 1);
      assert.equal(saved.snapshot.tasks.find(t => t.id === seed.task.id).state, 'done');
      // A stale browser timer whose earlier save committed must clear without another write.
      await page.evaluate(seed => localStorage.setItem(seed.key+':focus-v2', JSON.stringify(seed.focus)), seed);
      await page.reload(); await dock.locator('[data-action="workspace-focus-finish"]').click();
      await page.waitForFunction(() => document.querySelector('#lbb-personal-focus')?.hidden);
      assert.equal((await page.evaluate(() => LBBLearningEngine.backup())).tables.study_receipts.length, 1);
      // A genuinely missing task retains a downloadable result until explicit confirmation.
      await page.evaluate(seed => {
        const focus = structuredClone(seed.focus); focus.key = crypto.randomUUID(); focus.taskId = 999999;
        focus.finishPayload = {...focus.finishPayload, task_id: focus.taskId, session_key: focus.key};
        localStorage.setItem(seed.key+':focus-v2', JSON.stringify(focus));
      }, seed);
      await page.reload();
      await page.waitForFunction(() => document.querySelector('#lbb-personal-focus')?.textContent.includes('处理计时'));
      await dock.locator('[data-action="workspace-focus-finish"]').click();
      await dialog.waitFor({state: 'visible'});
      await page.screenshot({path: path.join(output, 'orphan-'+width+'.png'), fullPage: true});
      const downloadPromise = page.waitForEvent('download');
      await dialog.locator('[data-action="workspace-focus-export"]').click();
      const download = await downloadPromise, downloadPath = path.join(output, 'pending-focus-'+width+'.json');
      await download.saveAs(downloadPath);
      assert.equal(JSON.parse(fs.readFileSync(downloadPath)).focus.seconds, 6);
      await dialog.locator('[type="submit"]').click(); assert.equal(await dialog.isVisible(), true);
      assert.notEqual(await page.evaluate(key => JSON.parse(localStorage.getItem(key+':focus-v2')), seed.key), null);
      await dialog.locator('[name="discard"]').check(); await dialog.locator('[type="submit"]').click();
      await page.waitForFunction(() => document.querySelector('#lbb-personal-focus')?.hidden);
      // Simulate a successful 96-second save followed by a lost acknowledgement.
      await page.evaluate(seed => {
        const focus = {...seed.focus, key: crypto.randomUUID(), seconds: 96, finishPayload: null};
        localStorage.setItem(seed.key+':focus-v2', JSON.stringify(focus));
      }, seed);
      await page.reload(); await dock.locator('[data-action="workspace-focus-finish"]').click();
      await page.evaluate(() => { const original = LBBLearningEngine.finish;
        LBBLearningEngine.finish = async payload => { await original(payload); throw Error('模拟回执丢失'); }; });
      await dialog.locator('[name="note"]').fill('回执丢失仍只保存一次'); await dialog.locator('[type="submit"]').click();
      await page.waitForFunction(() => !document.querySelector('#lbb-workspace-dialog')?.open);
      assert.equal(await dock.isVisible(), false);
      const final = await page.evaluate(async () => ({snapshot: await LBBLearningEngine.snapshot(), backup: await LBBLearningEngine.backup()}));
      assert.equal(final.backup.tables.study_receipts.length, 2);
      assert.equal(final.snapshot.sessions.length, 1); assert.equal(final.snapshot.sessions[0].minutes, 1);
      assert.equal(final.snapshot.entries.length, 2);
      assert.deepEqual(errors, []);
      results.push({width, taskHydration: true, editedRetry: true, secondsPreserved: true,
        staleTimerReconciled: true, orphanDownload: true, explicitDiscard: true, lostAcknowledgement: true, errors});
      await context.close();
    }
    fs.writeFileSync(path.join(output, 'results.json'), JSON.stringify(results, null, 2)+'\n');
    console.log(JSON.stringify(results));
  } catch (error) {
    const page = browser.contexts().at(-1)?.pages().at(-1);
    if (page) await page.screenshot({path: path.join(output, 'failure.png'), fullPage: true});
    throw error;
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
