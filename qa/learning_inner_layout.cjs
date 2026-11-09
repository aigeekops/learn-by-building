const {chromium} = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const draft = process.env.INNER_LAYOUT_DRAFT_FILE || path.resolve(__dirname,
  '../../../output/learning-inner-layout-20261108/stage/index.html');
const output = process.env.INNER_LAYOUT_QA_OUTPUT || path.join(path.dirname(draft), 'browser-qa');
const courses = [
  ...['cs234','bonn','manipulation','nav2','moveit','cs224r','underactuated','arduino','lerobot'].map(id => ({id, node: 'plan-'+id, family: 'extension'})),
  ...['linear','probability','cs229'].map(id => ({id, node: 'plan-'+id, family: 'foundation'})),
  {id: 'fsdl', node: 'plan-fsdl', family: 'application'},
  {id: 'hfagents', node: 'plan-hfagents', family: 'application'},
  {id: 'cs231n', node: 'plan-cs231n', family: 'extension'},
  {id: 'cme295', node: 'a3', family: 'ai'},
  {id: 'cs336', node: 'a4', family: 'ai'},
  {id: 'cs146s', node: 'b4', family: 'ai'},
  {id: 'cs50p', node: 'plan-cs50p', family: 'foundation'},
  {id: 'tools', node: 'plan-tools', family: 'foundation'},
  {id: 'd2l', node: 'plan-d2l', family: 'foundation'},
  {id: 'mit2007', node: 'plan-mit2007', family: 'robotics'},
  {id: 'modern', node: 'plan-modern', family: 'robotics'},
  {id: 'pid', node: 'plan-pid', family: 'robotics'},
  {id: 'kalman', node: 'plan-kalman', family: 'robotics'},
  {id: 'ros', node: 'plan-ros', family: 'robotics'},
];
fs.mkdirSync(output, {recursive: true});

(async () => {
  const browser = await chromium.launch({headless: true}), results = [];
  try {
    for (const [width, height] of [[1440, 1000], [390, 844]]) {
      const context = await browser.newContext({viewport: {width, height}, reducedMotion: 'reduce'});
      const page = await context.newPage(), errors = [], visits = [];
      const namespace = 'inner-layout-'+width+'-'+Date.now();
      page.on('pageerror', error => errors.push(error.message));
      await page.route(/^https?:/, route => route.abort());

      async function assertLayout(course, view) {
        await page.waitForFunction(expected => document.querySelector('#lbb-course-prototype')?.dataset.view === expected, view);
        const layout = await page.evaluate(() => {
          const root = document.querySelector('#lbb-course-prototype');
          const main = root.querySelector('#lbb-main'), header = root.querySelector('.app-topbar');
          const crumbs = root.querySelector('#lbb-breadcrumbs');
          const visible = el => !!el.getClientRects().length && getComputedStyle(el).visibility !== 'hidden';
          const tools = [...header.querySelectorAll('.module-tools')].filter(el => visible(el) &&
            (el.textContent.trim() || el.querySelector('button, input, select, [role="tablist"]')));
          const allTabs = [...root.querySelectorAll('[role="tablist"]')];
          const sidebarCourseControls = root.querySelectorAll('.app-sidebar [data-action="course"], '+
            '.app-sidebar [data-action="aid-open"], .app-sidebar [data-action="teaching-open"], '+
            '.app-sidebar [data-rf-action="open"], #lbb-context-nav button');
          return {
            breadcrumbsInHeader: header.contains(crumbs),
            breadcrumbsAboveMain: crumbs.getBoundingClientRect().bottom <= main.getBoundingClientRect().top + 1,
            breadcrumbsVisible: visible(crumbs) && !!crumbs.textContent.trim(),
            visibleHeaderTools: tools.length,
            headerTablists: header.querySelectorAll('[role="tablist"]').length,
            headerCourseActions: header.querySelectorAll('[data-action="module-directory"], [data-action="sample"], '+
              '[data-action="aid-open"], [data-action="teaching-open"], [data-rf-action="open"]').length,
            mainHeading: main.querySelector('h1')?.textContent.trim(),
            bodyBackLinks: main.querySelectorAll('.back-link').length,
            sidebarCourseControls: sidebarCourseControls.length,
            tablists: allTabs.length,
            allTabsInMain: allTabs.every(el => main.contains(el)),
            hasDirectory: !!main.querySelector('.teaching-course-units, .aid-course-grid, .rf-course-directory, .syllabus-grid'),
            hasLesson: !!main.querySelector('.teaching-player, [data-aid-lesson], [data-rf-lesson], #lbb-lesson-content'),
            bodyOverflow: document.documentElement.scrollWidth > innerWidth + 1,
            rootOverflow: root.scrollWidth > root.clientWidth + 2,
            mainOverflow: main.scrollWidth > main.clientWidth + 2,
          };
        });
        const label = width+' '+course.id+' '+view;
        assert.equal(layout.breadcrumbsInHeader, true, label+' breadcrumb parent');
        assert.equal(layout.breadcrumbsAboveMain, true, label+' breadcrumb position');
        assert.equal(layout.breadcrumbsVisible, true, label+' visible breadcrumb');
        assert.equal(layout.visibleHeaderTools, 0, label+' course tools stay in content');
        assert.equal(layout.headerTablists, 0, label+' tabs stay in content');
        assert.equal(layout.headerCourseActions, 0, label+' course actions stay in content');
        assert.ok(layout.mainHeading, label+' content heading');
        assert.equal(layout.bodyBackLinks, 0, label+' no duplicate content return link');
        assert.equal(layout.sidebarCourseControls, 0, label+' sidebar remains global navigation');
        assert.equal(layout.allTabsInMain, true, label+' all tabs belong to main');
        assert.equal(layout.bodyOverflow, false, label+' body overflow');
        assert.equal(layout.rootOverflow, false, label+' root overflow');
        assert.equal(layout.mainOverflow, false, label+' main overflow');
        if (view === 'course') assert.equal(layout.hasDirectory, true, label+' course directory');
        else {
          assert.equal(layout.hasLesson, true, label+' lesson content');
          assert.ok(layout.tablists === 1 || (course.family === 'legacy' && layout.tablists === 0), label+' one lesson tablist');
        }
        return layout;
      }

      async function openCourse(course) {
        await page.goto('file://'+draft+'?integration-qa='+namespace);
        await page.locator('#atlas-expand-control').waitFor();
        if (await page.locator('#atlas-expand-control').getAttribute('aria-expanded') !== 'true') {
          await page.locator('#atlas-expand-control').click();
        }
        // Use the page's existing navigation controls, including an offscreen map node.
        await page.evaluate(course => {
          const node = document.querySelector('.learning-atlas [data-action="node"][data-value="'+course.node+'"]') ||
            document.querySelector('.learning-atlas [data-action="node"][data-map-key="'+course.id+'"]');
          if (!node) throw Error('Missing course map node: '+course.id);
          node.click();
        }, course);
        const courseSelector = '#lbb-node-detail [data-action="course"][data-value="'+course.id+'"]';
        await page.waitForFunction(selector => !!document.querySelector(selector), courseSelector);
        await page.evaluate(selector => document.querySelector(selector).click(), courseSelector);
        await assertLayout(course, 'course');
      }

      for (const course of courses) {
        console.log('Checking '+width+' '+course.id);
        await openCourse(course);
        if (course.id === 'fsdl') {
          await page.screenshot({path: path.join(output, 'fsdl-course-'+width+'.png'), fullPage: true});
        }
        const entrance = await page.evaluate(() => {
          const main = document.querySelector('#lbb-main');
          const button = main.querySelector('[data-action="aid-open"]') ||
            main.querySelector('[data-rf-action="open"]') ||
            main.querySelector('[data-action="teaching-open"]') ||
            main.querySelector('[data-action="sample"]');
          if (!button) throw Error('Course has no lesson entrance');
          const kind = button.dataset.action || button.dataset.rfAction;
          button.click(); return kind;
        });
        await assertLayout(course, 'lesson');
        const tabs = page.locator('#lbb-main [role="tablist"] [role="tab"]');
        const tabIds = await tabs.evaluateAll(nodes => nodes.map(el => el.id));
        for (const id of tabIds) {
          await page.locator('#'+id).click();
          assert.equal(await page.locator('#'+id).getAttribute('aria-selected'), 'true', course.id+' selects '+id);
          await assertLayout(course, 'lesson');
        }
        // Selecting another AI/foundation demonstration rebuilds the lesson without a full page render.
        const demo = page.locator('#aid-demo');
        let demoSwitch = false;
        if (await demo.count() && await demo.locator('option').count() > 1) {
          await page.locator('#aid-tab-lab').click();
          const values = await demo.locator('option').evaluateAll(options => options.map(option => option.value));
          const current = await demo.inputValue(), next = values.find(value => value !== current);
          await demo.evaluate(el => { const details = el.closest('details'); if (details) details.open = true; });
          await demo.selectOption(next); await assertLayout(course, 'lesson'); demoSwitch = true;
        }
        if (['cs50p', 'modern'].includes(course.id)) {
          if (tabIds.length) await page.locator('#'+tabIds[0]).click();
          await page.locator('#lbb-main').evaluate(el => { el.scrollTop = 0; });
          await page.screenshot({path: path.join(output, course.id+'-lesson-'+width+'.png'), fullPage: true});
        }
        const crumbCourse = page.locator('#lbb-breadcrumbs [data-action="course"][data-value="'+course.id+'"]');
        assert.ok(await crumbCourse.count(), course.id+' has course breadcrumb');
        await crumbCourse.first().click(); await assertLayout(course, 'course');
        await page.locator('#lbb-breadcrumbs [data-action="map"]').first().click();
        await page.waitForFunction(() => document.querySelector('#lbb-course-prototype')?.dataset.view === 'map');
        await page.locator('.learning-atlas').waitFor();
        visits.push({id: course.id, family: course.family, entrance, lessonTabs: tabIds.length, demoSwitch,
          courseBreadcrumbReturns: true, mapBreadcrumbReturns: true});
      }
      const records = await page.evaluate(async () => {
        const snapshot = await LBBLearningEngine.snapshot(), backup = await LBBLearningEngine.backup();
        return {tasks: snapshot.tasks.length, sessions: snapshot.sessions.length, entries: snapshot.entries.length,
          receipts: backup.tables.study_receipts.length, routes: (await LBBLearningEngine.routeIndex()).length};
      });
      assert.deepEqual(records, {tasks: 0, sessions: 0, entries: 0, receipts: 0, routes: 0});
      assert.deepEqual(errors, []);
      results.push({width, height, visits, records, errors});
      await context.close();
    }
    fs.writeFileSync(path.join(output, 'results.json'), JSON.stringify(results, null, 2)+'\n');
    console.log(JSON.stringify(results));
  } catch (error) {
    const page = browser.contexts().at(-1)?.pages().at(-1);
    if (page) await page.screenshot({path: path.join(output, 'failure.png'), fullPage: true}).catch(() => {});
    throw error;
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
