/* Attention cell inspector: pure rendering of the shared local computation trace. */
(function (root, factory) {
  const api = factory();
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.AttentionWorkbench = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';
  const stages = [
    ['inputs', '输入 Q / K / V'], ['dots', '点积'], ['scaled', '缩放'],
    ['scores', '因果遮罩'], ['weights', 'Softmax'], ['output', '输出']
  ];
  const experiments = {
    key: { label: '只改 Key', question: '权重变了，输出一定会变吗？',
      before: { position: 2, key: 1, value: 1, causal: 'yes' }, after: { position: 2, key: 3, value: 1, causal: 'yes' } },
    value: { label: '只改 Value', question: '只把 V₂ 第一维从 1 改为 3，哪些数保持不变？',
      before: { position: 2, key: 1, value: 1, causal: 'yes' }, after: { position: 2, key: 1, value: 3, causal: 'yes' } },
    mask: { label: '检查因果遮罩', question: '在位置 1 改变未来位置的 Key 和 Value，输出会变吗？',
      before: { position: 1, key: 1, value: 1, causal: 'yes' }, after: { position: 1, key: 4, value: 4, causal: 'yes' } }
  };
  const esc = x => String(x ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const fmt = x => x === null ? '−∞' : Number(x.toFixed(4)).toString();
  const vector = xs => '[' + xs.map(fmt).join(', ') + ']';
  const same = (a, b) => a.length === b.length && a.every((x, i) => Math.abs(x - b[i]) < 1e-10);
  function stepFor(trace, stage, cell = 0) {
    return trace.steps.findIndex(s => s.visual.attention?.stage === stage && s.visual.attention.cell === cell);
  }
  function render(trace, index = 0, baseline = null) {
    if (trace?.model !== 'attention' || !trace.steps?.[0]?.visual.attention) return '';
    const currentIndex = Math.max(0, Math.min(trace.steps.length - 1, Math.trunc(Number(index)) || 0));
    const current = trace.steps[currentIndex].visual.attention, R = trace.result, p = trace.params;
    const stage = current.stage, active = current.cell, order = stages.findIndex(([id]) => id === stage);
    function matrix(name, rows, rowNames, colNames, options = {}) {
      const resultStage = options.stage;
      return `<table class="attn-matrix ${options.color || ''}"><caption><strong>${esc(name)}</strong><small>${rows.length} × ${rows[0].length}${options.transpose ? ' · 转置后' : ''}</small></caption><thead><tr><th></th>${colNames.map(x => `<th scope="col">${esc(x)}</th>`).join('')}</tr></thead><tbody>${rows.map((row, i) => `<tr><th scope="row">${esc(rowNames[i])}</th>${row.map((value, j) => {
        const highlight = options.highlight?.(i, j), target = resultStage ? stepFor(trace, resultStage, j) : -1;
        const ready = !resultStage || target <= currentIndex;
        const selected = resultStage === stage && j === active;
        const classes = 'attn-cell' + (highlight ? ' is-source' : '') + (selected ? ' is-current' : '') + (value === null && ready ? ' is-masked' : '');
        const text = ready ? fmt(value) : '·';
        return `<td>${target >= 0 ? `<button type="button" class="${classes}" data-attn-step="${target}" aria-label="${esc(name)} [${p.position},${j}]：${ready ? esc(fmt(value)) : '尚未展开'}，点击查看计算" ${selected ? 'aria-current="step"' : ''}>${text}</button>` : `<span class="${classes}">${text}</span>`}</td>`;
      }).join('')}</tr>`).join('')}</tbody></table>`;
    }
    const q = () => matrix('q', [R.q], [R.tokens[p.position]], ['维 0', '维 1'], { color: 'attn-query', highlight: () => stage === 'dots' });
    const K = () => matrix('K', R.keys, R.tokens, ['维 0', '维 1'], { color: 'attn-key' });
    const V = (highlight = false) => matrix('V', R.values, R.tokens, ['维 0', '维 1'], { color: 'attn-value', highlight: (_, j) => highlight && j === active });
    const row = (name, values, s, color) => matrix(name, [values], [R.tokens[p.position]], R.tokens, { stage: s, color,
      highlight: (_, j) => s !== stage && (stage === 'output' && s === 'weights' || stage === 'weights' && s === 'scores' || j === active && (stage === 'scaled' || stage === 'scores')) });
    const weights = () => row('a · 权重', R.weights, 'weights', 'attn-weight');
    let scene = '';
    if (stage === 'inputs') scene = q() + K() + V();
    if (stage === 'dots') scene = q() + '<span class="attn-op">×</span>' +
      matrix('Kᵀ', [0, 1].map(d => R.keys.map(k => k[d])), ['维 0', '维 1'], R.tokens, { color: 'attn-key', transpose: true, highlight: (_, j) => j === active }) +
      '<span class="attn-op">=</span>' + row('qKᵀ', R.dots, 'dots', 'attn-score');
    if (stage === 'scaled') scene = row('qKᵀ', R.dots, 'dots', 'attn-score') + '<span class="attn-op">÷ √2 =</span>' + row('缩放分数', R.scaled, 'scaled', 'attn-score');
    if (stage === 'scores') scene = row('缩放分数', R.scaled, 'scaled', 'attn-score') + '<span class="attn-op">+ mask =</span>' + row('遮罩后分数', R.scores, 'scores', 'attn-mask');
    if (stage === 'weights') scene = row('遮罩后分数', R.scores, 'scores', 'attn-mask') + '<span class="attn-op">→</span>' + weights();
    if (stage === 'output') scene = weights() + '<span class="attn-op">×</span>' + V(true) + '<span class="attn-op">=</span>' +
      matrix('y · 输出', [R.output], [R.tokens[p.position]], ['维 0', '维 1'], { stage: 'output', color: 'attn-output' });
    const compared = baseline?.model === 'attention' && baseline.result;
    const comparison = compared ? `<div class="attn-comparison" role="status"><strong>${same(baseline.result.weights, R.weights) ? '权重保持不变' : '权重发生变化'} · ${same(baseline.result.output, R.output) ? '输出保持不变' : '输出发生变化'}</strong><div><span>对照 · 位置 ${baseline.params.position} / ${baseline.params.causal === 'yes' ? '因果' : '双向'}</span><code>a = ${vector(baseline.result.weights)}<br>y = ${vector(baseline.result.output)}</code></div><div><span>当前 · 位置 ${p.position} / ${p.causal === 'yes' ? '因果' : '双向'}</span><code>a = ${vector(R.weights)}<br>y = ${vector(R.output)}</code></div><p>K₂[0]：${baseline.params.key} → ${p.key}；V₂[0]：${baseline.params.value} → ${p.value}。${same(baseline.result.output, R.output) && !same(baseline.result.weights, R.weights) && p.position === 2 && baseline.params.position === 2 && p.value === 1 && baseline.params.value === 1 ? '本例 V₀ 与 V₁ 对称，V₂ 恰好等于二者的均值，所以权重变化仍得到 [1, 1]。' : '按当前输入重新计算，比较使用完整精度。'}</p></div>` : '';
    return `<section class="attn-workbench" aria-label="Attention 逐格计算样板"><header class="attn-heading"><div><span>ATTENTION / 单头 · 一个位置</span><h3>“${esc(R.tokens[p.position])}”怎样读取三个位置？</h3></div><span class="attn-position">Query 位置 ${p.position}</span></header><nav class="attn-stages" aria-label="Attention 计算阶段">${stages.map(([id, title], i) => `<button type="button" data-attn-step="${stepFor(trace, id)}" class="attn-stage ${i === order ? 'is-current' : ''}" ${i === order ? 'aria-current="step"' : ''}><small>${i}</small>${title}</button>`).join('')}</nav><p class="attn-hint">点击结果格复算；金色标出参与运算的输入，蓝框标出当前结果。</p><div class="attn-matrices" tabindex="0" aria-label="矩阵计算，可横向滚动">${scene}</div><div class="attn-calculation"><span>当前这一格怎么算</span><pre>${esc(current.expression)}</pre></div><div class="attn-verification"><strong>先预测，再选一组变化核对</strong><div class="attn-experiments">${Object.entries(experiments).map(([id, e]) => `<button type="button" data-attn-experiment="${id}" title="${esc(e.question)}">${esc(e.label)}</button>`).join('')}</div>${comparison}<div class="attn-tools"><button type="button" data-attn-pin>将当前输入设为对照</button><button type="button" data-attn-step="${trace.steps.length - 1}">查看完整结果</button><button type="button" data-attn-reset>恢复默认输入</button></div><p class="attn-footnote">三个 token、两维向量均为教学数值；显示四位小数，计算保留完整精度。</p></div></section>`;
  }
  return { stages, experiments, stepFor, render };
});
