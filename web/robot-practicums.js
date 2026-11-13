/* Original cross-site practicum checks. Imports are data, never executable code. */
(function (root) {
  'use strict';
  const object = x => x !== null && typeof x === 'object' && !Array.isArray(x);
  function baseUrl(value, learningUrl) {
    if (!String(value || '').trim()) return '';
    const u = new URL(String(value).trim());
    if (!['http:', 'https:'].includes(u.protocol) || u.username || u.password || u.search || u.hash) throw Error('实验站地址请填写无账号、查询参数或锚点的 HTTP(S) 站点地址。');
    u.pathname = u.pathname.replace(/\/?$/, '/');
    if (learningUrl && u.href === new URL(learningUrl).href) throw Error('这里需要 Robot Radar 的独立地址；当前填写的是 learn-by-building 学习站。');
    return u.href;
  }
  function radarUrl(base, {robot, mode, part}) {
    if (!base) return '';
    const u = new URL(base);
    u.searchParams.set('robot', robot);
    u.searchParams.set('page', 'lab');
    u.searchParams.set('mode', mode);
    u.searchParams.set('lang', 'zh');
    if (part) u.searchParams.set('part', part);
    return u.href;
  }
  function robotJoint(config, robotId, jointId) {
    const robot = config.robots.find(x => x.id === robotId), joint = robot?.joints.find(x => x.id === jointId);
    if (!robot || !joint) throw Error('请选择当前参考版本中的机型和独立关节。');
    return {robot, joint};
  }
  function checkValues(values, robot) {
    if (!object(values) || !Object.keys(values).length || Object.keys(values).length > robot.joints.length) throw Error('每个采样必须包含已知关节及其数值。');
    for (const [name, value] of Object.entries(values)) {
      const j = robot.joints.find(x => x.id === name);
      if (!j) throw Error('未知或非独立关节：' + name);
      if (typeof value !== 'number' || !Number.isFinite(value)) throw Error(name + ' 的数值必须有限，旋转用 rad，移动用 m。');
      if (j.type !== 'continuous' && (value < Number(j.limit.lower) - 1e-9 || value > Number(j.limit.upper) + 1e-9)) throw Error(name + ' 超出本运动学模型的源限位。');
    }
  }
  function checkSeries(series, robot, kind) {
    if (!Array.isArray(series) || series.length < 2 || series.length > 1000) throw Error(kind + ' 需要 2–1000 个采样。');
    let last = -Infinity;
    const names = new Set();
    for (const row of series) {
      if (!object(row) || typeof row.time !== 'number' || !Number.isFinite(row.time) || row.time < 0 || row.time <= last || row.time > 60) throw Error(kind + ' 时间须为 0–60 秒内严格递增的有限数值。');
      const values = kind === '关键帧' ? row.joints : row.values;
      checkValues(values, robot);
      Object.keys(values).forEach(x => names.add(x));
      last = row.time;
    }
    return {count: series.length, endSeconds: last, joints: [...names]};
  }
  function inspectExperiment(value, config) {
    if (!object(value) || value.schemaVersion !== 1) throw Error('需要 schemaVersion=1 的运动学实验包。');
    const robot = config.robots.find(x => x.id === value.robotId);
    if (!robot || value.sourceCommit !== robot.sourceCommit) throw Error('机型或源版本不匹配；请核对本课固定版本。');
    if (typeof value.program !== 'string' || value.program.length > 80000) throw Error('program 应为有界的 JSON 字符串。');
    const program = JSON.parse(value.program);
    if (!object(program)) throw Error('关键帧程序格式无效。');
    const frames = checkSeries(program.frames, robot, '关键帧');
    if (program.frames.length > 100 || program.frames[0].time !== 0) throw Error('关键帧须从 0 秒开始，最多 100 帧。');
    // A blank trace is a template, not an observed run. Never execute its program.
    const trace = Array.isArray(value.trace) && value.trace.length ? checkSeries(value.trace, robot, '运行日志') : null;
    return {robotId: robot.id, sourceCommit: robot.sourceCommit, frames, trace, evidence: trace ? '用户导入的运动学记录；格式已检查，来源与解释仍需审核。' : '仅有程序模板，尚无运行日志。'};
  }
  function inspectBom(value, config) {
    if (!object(value) || value.configuration !== config.so101.configuration || value.commit !== config.so101.sourceCommit || !Array.isArray(value.rows)) throw Error('需要匹配本课 follower 配置与固定版本的 BOM JSON。');
    if (value.rows.length !== config.so101.rows.length) throw Error('BOM 行数不同，不能套用当前审核表。');
    const seen = new Set();
    for (const r of value.rows) {
      const expected = config.so101.rows.find(x => x.id === r.id);
      if (!expected || seen.has(r.id) || r.quantity !== expected.quantity || r.unit !== expected.unit || r.category !== expected.category) throw Error('BOM 内容不同：' + String(r.id || '缺少项目标识') + '，请独立核查差异。');
      seen.add(r.id);
    }
    return {rows: seen.size, unknown: value.rows.filter(r => r.quantity === null).map(r => r.id), evidence: '导入的是待审核参考资料，不会自动填入审核判断。'};
  }
  function auditRows(rows, config) {
    const issues = [], gaps = [];
    for (const reference of config.so101.rows) {
      const row = rows?.[reference.id] || {};
      if (!['match', 'different', 'unknown'].includes(row.status)) { issues.push(reference.name + ' 尚未审核'); continue; }
      if (reference.quantity === null) {
        if (row.status !== 'unknown' || String(row.quantity || '').trim()) issues.push(reference.name + ' 的参考数量未知，当前审核须保留未知，不填猜测数量');
      } else if (row.status === 'match' && (String(row.quantity || '').trim() === '' || Number(row.quantity) !== reference.quantity)) issues.push(reference.name + ' 的核对数量与“一致”判断矛盾');
      else if (row.status === 'different' && (!String(row.quantity || '').trim() || !Number.isFinite(Number(row.quantity)) || Number(row.quantity) <= 0)) issues.push(reference.name + ' 请填写有依据的正数数量');
      if (row.status !== 'match') {
        gaps.push(reference.name);
        if (!String(row.note || '').trim()) issues.push(reference.name + ' 的差异或资料不足需要说明依据与影响');
      }
    }
    return {issues, gaps, reviewed: config.so101.rows.filter(x => ['match', 'different', 'unknown'].includes(rows?.[x.id]?.status)).length};
  }
  function review(lab, draft, config) {
    const issues = [];
    for (const [key, label] of [['prediction', '预测'], ['observation', '观察与原始结果'], ['explanation', '解释'], ['transfer', '独立迁移'], ['limitations', '局限'], ['evidenceRef', '原始文件或资料依据']]) {
      if (!String(draft[key] || '').trim()) issues.push('请填写' + label);
    }
    let detail;
    if (lab.id === 'robot-coordinates') {
      try {
        const {joint} = robotJoint(config, draft.robotId, draft.jointId);
        const a = Number(draft.q0), b = Number(draft.q1);
        if (!String(draft.q0 ?? '').trim() || !String(draft.q1 ?? '').trim() || !Number.isFinite(a) || !Number.isFinite(b) || a === b) issues.push('请填写两组不同的有限关节输入');
        else checkValues({[joint.id]: a}, config.robots.find(r => r.id === draft.robotId)), checkValues({[joint.id]: b}, config.robots.find(r => r.id === draft.robotId));
        if (draft.rawImport) {
          detail = inspectExperiment(JSON.parse(draft.rawImport), config);
          if (detail.robotId !== draft.robotId || !detail.frames.joints.includes(draft.jointId)) issues.push('导入日志的机型或关节与当前记录不一致');
          if (!detail.trace) issues.push('导入文件只有模板，请实际运行并保存日志，或移除模板、提交手工观察依据');
          else if (!detail.trace.joints.includes(draft.jointId)) issues.push('运行日志中没有当前观察关节');
        }
      } catch (e) { issues.push(e.message); }
    } else {
      detail = auditRows(draft.rows, config);
      issues.push(...detail.issues);
    }
    if (!draft.selfReview) issues.push('请对照验收表自查并确认保留原始材料');
    return {issues, detail, passed: issues.length === 0, meaning: '检查填写完整性与数据格式；学习理解仍需按验收表评审。'};
  }
  function reviewNote(lab, draft, config) {
    const issues = [];
    if (!String(draft.prediction || '').trim()) issues.push('先写一句你的预测。');
    if (!String(draft.finding || '').trim()) issues.push('记下实际结果，并说说原因。');
    let detail;
    if (lab.id === 'robot-coordinates') {
      try {
        const {robot, joint} = robotJoint(config, draft.robotId, draft.jointId);
        const hasA = String(draft.q0 ?? '').trim() !== '', hasB = String(draft.q1 ?? '').trim() !== '';
        if (hasA !== hasB) issues.push('补充数值时，请同时填写 q0 和 q1；也可以都留空。');
        if (hasA && hasB) {
          checkValues({[joint.id]: Number(draft.q0)}, robot);
          checkValues({[joint.id]: Number(draft.q1)}, robot);
        }
        if (draft.rawImport) {
          detail = inspectExperiment(JSON.parse(draft.rawImport), config);
          if (detail.robotId !== robot.id || !detail.frames.joints.includes(joint.id)) issues.push('导入文件与当前机型、关节不一致。');
        }
      } catch (e) { issues.push(e.message); }
    } else {
      detail = auditRows(draft.rows, config);
      // A local observation is useful before every BOM row has been audited.
      // Its scope stays partial until the separate complete audit passes.
      for (const row of config.so101.rows) {
        if (draft.rows?.[row.id]?.status && detail.issues.some(x => x.startsWith(row.name + ' '))) issues.push(...detail.issues.filter(x => x.startsWith(row.name + ' ')));
      }
    }
    return {passed: issues.length === 0, issues, detail, scope: lab.id === 'so101-bom-audit' && (detail.reviewed !== config.so101.rows.length || detail.issues.length) ? 'partial-audit' : 'observation', meaning: '保存本次观察；不自动确认任务完成或知识掌握。'};
  }
  const api = {baseUrl, radarUrl, robotJoint, inspectExperiment, inspectBom, auditRows, review, reviewNote};
  root.RobotPracticums = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(globalThis);
