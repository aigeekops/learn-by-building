/* Original, bounded teaching computations. No eval, network, clock or records. */
(function (root, factory) {
  const api = factory();
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.AICourseModels = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';
  const clone = value => JSON.parse(JSON.stringify(value));
  const dot = (a, b) => a.reduce((sum, x, i) => sum + x * b[i], 0);
  function softmax(values) {
    const max = Math.max(...values.filter(x => x !== null));
    const exps = values.map(x => x === null ? 0 : Math.exp(x - max));
    const sum = exps.reduce((a, b) => a + b, 0);
    return exps.map(x => x / sum);
  }
  const range = (id, label, min, max, step, value, unit = '') => ({ id, label, type: 'range', min, max, step, value, unit });
  const select = (id, label, options, value) => ({ id, label, type: 'select', options, value });
  const SPECS = {
    attention: [select('position', '正在计算的位置', [[0, '位置 0 · 我'], [1, '位置 1 · 学'], [2, '位置 2 · AI']], 2), range('key', 'K₂ 第一维 · 改变匹配分数', 0, 4, 0.5, 1), range('value', 'V₂ 第一维 · 改变取回内容', 0, 4, 0.5, 1), select('causal', '可见范围', [['yes', '因果注意力'], ['no', '双向注意力']], 'yes')],
    sampling: [range('temperature', '温度 T', 0.25, 2, 0.25, 1), range('topk', '保留候选 k', 1, 4, 1, 4), range('u', '固定抽样点 u', 0, 0.99, 0.01, 0.7)],
    lora: [range('rank', '适配器秩 r', 1, 4, 1, 1), range('alpha', '缩放 α', 0, 4, 0.5, 1), range('x0', '输入 x 的第一维', 0, 3, 0.5, 1)],
    compute: [range('parameters', '参数量 N', 0.5, 10, 0.5, 1, 'B'), range('tokens', '训练 Token D', 5, 100, 5, 20, 'B'), range('gpus', 'GPU 数', 1, 32, 1, 8, '张'), range('peak', '每卡峰值算力（教学值）', 50, 400, 50, 100, 'TFLOP/s'), range('mfu', '模型算力利用率 MFU', 0.1, 0.8, 0.05, 0.5)],
    parallel: [range('parameters', '参数量', 0.5, 8, 0.5, 2, 'B'), range('gpus', 'GPU 数', 1, 8, 1, 4, '张'), select('zero', '状态分片', [[0, 'DDP · 全部复制'], [1, 'ZeRO-1 · 分优化器'], [2, 'ZeRO-2 · 加分梯度'], [3, 'ZeRO-3 · 再分参数']], 0)],
    dedup: [select('normalize', '空白处理', [['yes', '合并连续空白'], ['no', '保留原始空白']], 'yes'), select('decontaminate', '训练集去污染', [['yes', '移除评测集精确重合'], ['no', '仅训练集内去重']], 'yes')],
    agent: [select('scenario', '修复过程', [['success', '一次修好'], ['retry', '先修错再修好'], ['stall', '反复无效修改'], ['error', '工具报错']], 'retry'), range('budget', '最多工具调用', 1, 10, 1, 7)],
    context: [range('budget', '总上下文预算（教学值）', 32, 96, 4, 56, 'token'), range('reserve', '预留输出空间', 8, 24, 4, 16, 'token'), select('strategy', '可选片段的顺序', [['priority', '按本任务相关性'], ['file', '按文件原顺序']], 'priority')],
    tools: [select('mode', '工具请求', [['read', '读取问题列表'], ['write', '更新状态并重试同一请求']], 'read'), range('limit', '读取数量 limit', 0, 5, 1, 2), range('version', '写入时预期版本', 0, 2, 1, 1)]
  };
  function parameters(model, supplied = {}) {
    if (!Object.hasOwn(SPECS, model)) throw Error('未知教学模型');
    const result = {};
    for (const s of SPECS[model]) {
      let value = Object.hasOwn(supplied, s.id) ? supplied[s.id] : s.value;
      if (s.type === 'range') {
        if (typeof value === 'boolean' || value === '' || value === null) throw Error(s.label + '无效');
        value = Number(value);
        if (!Number.isFinite(value) || value < s.min || value > s.max || Math.abs((value - s.min) / s.step - Math.round((value - s.min) / s.step)) > 1e-7) throw Error(s.label + '超出范围或步长');
      } else {
        const found = s.options.find(([id]) => String(id) === String(value));
        if (!found) throw Error(s.label + '选项无效');
        value = found[0];
      }
      result[s.id] = value;
    }
    return result;
  }
  function recorder(model, p, code) {
    const steps = [];
    return {
      add(line, title, detail, variables, visual) { steps.push(clone({ line, title, detail, variables, visual })); },
      finish(result) { return { model, params: p, code: code.split('\n'), steps, result: clone(result) }; }
    };
  }
  const bars = (title, rows, unit = '', max = null) => ({ kind: 'bars', title, rows: rows.map(([label, value]) => ({ label, value })), unit, max });
  const flow = (title, nodes) => ({ kind: 'flow', title, nodes: nodes.map(([label, detail, active]) => ({ label, detail, active: !!active })) });

  function attention(p) {
    const r = recorder('attention', p, `const q = queries[position];
const dots = keys.map(k => dot(q, k));
const scaled = dots.map(x => x / Math.sqrt(2));
const scores = scaled.map((x,j) => causal === 'yes' && j > position ? null : x);
const weights = softmax(scores); // null 表示被遮住
const output = [0,1].map(d => dot(weights, values.map(v => v[d])));`);
    const tokens = ['我', '学', 'AI'];
    const queries = [[1, 0], [0, 1], [1, 1]], keys = [[1, 0], [0, 1], [p.key, 1]], values = [[2, 0], [0, 2], [p.value, 1]], q = queries[p.position];
    const dots = keys.map(k => dot(q, k));
    const scaled = dots.map(x => x / Math.sqrt(2));
    const scores = scaled.map((x, j) => p.causal === 'yes' && j > p.position ? null : x);
    const weights = softmax(scores);
    const output = [0, 1].map(d => dot(weights, values.map(v => v[d])));
    const maximum = Math.max(...scores.filter(x => x !== null));
    const exps = scores.map(x => x === null ? 0 : Math.exp(x - maximum));
    const denominator = exps.reduce((a, b) => a + b, 0);
    const products = keys.map(k => q.map((x, d) => x * k[d]));
    const contributions = [0, 1].map(d => weights.map((w, j) => w * values[j][d]));
    const number = x => Number(x.toFixed(4)).toString();
    function cell(stage, index, line, title, detail, variables, expression) {
      const visual = flow(title, [[stage, expression, true]]);
      visual.attention = { stage, cell: index, expression };
      r.add(line, title, detail, variables, visual);
    }
    cell('inputs', 0, 1, '先认出输入：一个 Query，三个 Key / Value',
      '三个教学 token 是“我、学、AI”。只展开所选位置的一个头；Q/K/V 是给定数值，不是运行语言模型得到的表示。点击阶段或结果格，可以直接查看对应计算。',
      { position: p.position, q, keys, values }, `q = Q[${p.position}] = [${q.join(', ')}]\nq: 1 × 2；K: 3 × 2；V: 3 × 2；输出: 1 × 2`);
    keys.forEach((k, j) => cell('dots', j, 2, `点积格 [${p.position}, ${j}]：与“${tokens[j]}”匹配`,
      '左侧高亮 Query 的两个数，以及 Kᵀ 中对应的一列。对应维相乘，再把两个乘积相加；此时得到的是分数。',
      { q, key: k, products: products[j], dot: dots[j] },
      `${q[0]} × ${k[0]} + ${q[1]} × ${k[1]}\n= ${products[j].join(' + ')} = ${number(dots[j])}`));
    dots.forEach((x, j) => cell('scaled', j, 3, `缩放格 [${p.position}, ${j}]：除以 √dₖ`,
      '本例每个 Key 有两个维度，dₖ = 2。缩放保持分数顺序，但会影响接下来 Softmax 的集中程度。',
      { dot: x, dk: 2, divisor: Math.sqrt(2), scaled: scaled[j] }, `${number(x)} / √2 = ${number(scaled[j])}`));
    scores.forEach((x, j) => cell('scores', j, 4, `遮罩格 [${p.position}, ${j}]：${x === null ? '未来位置被遮住' : '保留可见位置'}`,
      x === null ? '位置 j 大于当前 Query 位置，因此在 Softmax 前设为 −∞。它的指数、注意力权重和对输出的贡献都严格为 0。' :
        p.causal === 'yes' ? '该位置在当前或过去，保留缩放分数。因果遮罩按位置决定可见性，不按分数大小决定。' : '双向模式允许读取三个位置，保留这个缩放分数。',
      { queryPosition: p.position, keyPosition: j, visible: x !== null, scaled: scaled[j], maskedScore: x },
      `j = ${j}，Query 位置 = ${p.position}\n${x === null ? 'j > Query 位置 → −∞；exp(−∞) = 0' : `保留分数 ${number(x)}`}`));
    weights.forEach((w, j) => cell('weights', j, 5, `权重格 [${p.position}, ${j}]：指数除以共同分母`,
      '先减去可见分数的最大值 m，再取指数。三个位置共用同一个分母；被遮位置的指数取 0。完整精度参与计算，画面保留四位小数。',
      { scores, maximum, exps, denominator, weight: w, weightSum: weights.reduce((a, b) => a + b, 0) },
      `m = ${number(maximum)}；分母 = ${exps.map(number).join(' + ')} = ${number(denominator)}\n${scores[j] === null ? '0' : `exp(${number(scores[j])} − m)`} / 分母 = ${number(w)}`));
    output.forEach((x, d) => cell('output', d, 6, `输出格 [${p.position}, ${d}]：汇总 Value 的第 ${d} 维`,
      '三个注意力权重分别乘 V 的同一列，再把三个贡献相加。改变 Value 不会改变 Q/K 产生的权重；不同权重也可能恰好得到相同输出。',
      { weights, valueColumn: values.map(v => v[d]), contributions: contributions[d], output: x },
      `${weights.map((w, j) => `${number(w)} × ${number(values[j][d])}`).join(' + ')}\n= ${contributions[d].map(number).join(' + ')} = ${number(x)}`));
    return r.finish({ q, keys, values, dots, scaled, scores, weights, output, tokens, queries,
      products, contributions, maximum, exps, denominator });
  }

  function sampling(p) {
    const r = recorder('sampling', p, `const logits = [3, 2, 1, 0];
const scaled = logits.map(x => x / temperature);
const kept = scaled.map((x,i) => i < topk ? x : null);
const probs = softmax(kept);
const cdf = probs.map((_,i) => probs.slice(0,i+1).reduce((a,b)=>a+b,0));
const token = cdf.findIndex(x => u < x);`);
    const logits = [3, 2, 1, 0], labels = ['猫', '狗', '鸟', '鱼'];
    r.add(1, '从 logits 出发', '这四个数是给定的小例子，未运行语言模型；logit 不必落在 0 与 1 之间。', { logits }, bars('候选 token 的 logits', labels.map((x, i) => [x, logits[i]])));
    const scaled = logits.map(x => x / p.temperature);
    r.add(2, '调整温度', 'T 较小会拉大相对差距；正温度不改变候选排序，也不增加知识。', { temperature: p.temperature, scaled }, bars('logit / T', labels.map((x, i) => [x, scaled[i]])));
    const kept = scaled.map((x, i) => i < p.topk ? x : null);
    r.add(3, '保留 top-k', '本例 logits 已从大到小排列；移除其余候选，再对保留项归一化。', { kept }, flow('可采样候选', labels.map((x, i) => [x, kept[i] === null ? '已移除' : '保留', kept[i] !== null])));
    const probs = softmax(kept);
    r.add(4, '重新计算概率', 'k = 1 时，保留项的概率为 1。温度与候选截断是两个独立步骤。', { probs }, bars('最终采样分布', labels.map((x, i) => [x, probs[i]]), '比例', 1));
    const cdf = probs.map((_, i) => probs.slice(0, i + 1).reduce((a, b) => a + b, 0));
    r.add(5, '把概率排成区间', '把 0 到 1 切成四段，长度就是概率。固定的 u 方便重复核算，不是重新抽随机数。', { cdf, u: p.u }, { kind: 'segments', title: '概率区间与抽样点', segments: labels.map((label, i) => ({ label, value: probs[i] })), capacity: 1, marker: p.u, unit: '比例' });
    let token = cdf.findIndex(x => p.u < x);
    if (token < 0) token = probs.findLastIndex(x => x > 0);
    r.add(6, '取出落点所在 token', '一次结果不代表整体分布。换 u 看落点，换 T 看区间长度，分开比较。', { u: p.u, token: labels[token] }, flow('本次采样结果', labels.map((x, i) => [x, `${(probs[i] * 100).toFixed(1)}%`, i === token])));
    return r.finish({ logits, scaled, kept, probs, cdf, token, label: labels[token] });
  }

  function lora(p) {
    const r = recorder('lora', p, `const x = [x0, 2, 0, -1];
const base = x.slice(); // W₀ = 4×4 单位矩阵，冻结
const hidden = A.slice(0,rank).map(row => dot(row,x));
const delta = B.map(row => dot(row.slice(0,rank),hidden) * alpha/rank);
const output = base.map((x,i) => x + delta[i]);
const trainable = rank * (4 + 4);`);
    const A = [[1, 0, 0, 0], [0, 1, 0, 0], [0, 0, 1, 0], [0, 0, 0, 1]], B = [[1, 0, 0, 0], [0.5, 1, 0, 0], [0, 0.5, 1, 0], [0, 0, 0.5, 1]], x = [p.x0, 2, 0, -1];
    r.add(1, '给定一个四维输入', '只演示一次前向计算：A、B 是给定的适配器，没有在浏览器里训练。', { x }, bars('输入向量', x.map((v, i) => [`x${i}`, v])));
    const base = x.slice();
    r.add(2, '保留冻结的基座', 'W₀ 取单位矩阵便于复算；真实模型的 W₀ 通常是预训练得到的稠密矩阵。', { base, frozenParameters: 16 }, flow('两条计算路径', [['基座 W₀', '4 × 4 · 16 个冻结参数', true], ['适配器 A、B', `${p.rank} × 4 和 4 × ${p.rank}`, false]]));
    const hidden = A.slice(0, p.rank).map(row => dot(row, x));
    r.add(3, '先经过较窄的 A', 'A 把四维输入映射到 r 维。r 控制中间空间，不能保证更大的 r 在任务上总是更好。', { hidden }, bars('中间向量 A x', hidden.map((v, i) => [`h${i}`, v])));
    const delta = B.map(row => dot(row.slice(0, p.rank), hidden) * p.alpha / p.rank);
    r.add(4, '再经 B 回到四维', '计算 (α/r) B A x。α = 0 时，适配器对输出没有贡献。', { alpha: p.alpha, rank: p.rank, delta }, bars('适配器贡献 Δy', delta.map((v, i) => [`维 ${i}`, v])));
    const output = base.map((v, i) => v + delta[i]);
    r.add(5, '与基座输出相加', 'y = W₀x + (α/r)BAx。LoRA 学的是增量，不是用低秩矩阵替掉整个 W₀。', { base, delta, output }, bars('最终输出向量', output.map((v, i) => [`维 ${i}`, v])));
    const trainable = p.rank * 8;
    r.add(6, '核算可训练参数', '4×4 的玩具矩阵很小：r ≥ 2 已没有参数数目优势。工程中通常要求 r 远小于输入和输出维度。', { full: 16, trainable, savedFraction: 1 - trainable / 16 }, bars('全量微调与 LoRA 的可训练参数', [['全量微调', 16], ['LoRA', trainable]], '个'));
    return r.finish({ A: A.slice(0, p.rank), B: B.map(row => row.slice(0, p.rank)), x, base, hidden, delta, output, trainable });
  }

  function compute(p) {
    const r = recorder('compute', p, `const N = parameters * 1e9, D = tokens * 1e9;
const flops = 6 * N * D;
const peakPerSecond = gpus * peak * 1e12;
const effective = peakPerSecond * mfu;
const hours = flops / effective / 3600;
const stateGB = N * (2 + 2 + 4 + 4 + 4) / 1e9;`);
    const N = p.parameters * 1e9, D = p.tokens * 1e9;
    r.add(1, '先统一单位', 'B 表示十亿。N 是参数个数，D 是整个训练过程处理的 token 总数，不是 batch size。', { N, D }, flow('本次训练的输入', [['模型', `${p.parameters}B 参数`, true], ['数据', `${p.tokens}B token`, true]]));
    const flops = 6 * N * D;
    r.add(2, '估算总工作量', '6ND 是稠密模型训练的粗估，长上下文注意力、重计算等额外工作需另算；不直接用于 MoE 总参数。', { flops }, flow('计算工作量', [['前向', '约 2ND', false], ['反向', '约 4ND', false], ['合计', `${(flops / 1e18).toFixed(1)} EFLOP`, true]]));
    const peakPerSecond = p.gpus * p.peak * 1e12;
    r.add(3, '加总峰值速度', '使用人为设置的每卡算力，不代表某型号 GPU 的实测值。FLOP 是工作量，FLOP/s 是速度。', { gpus: p.gpus, peakPerSecond }, bars('总峰值算力', [['峰值', peakPerSecond / 1e12]], 'TFLOP/s'));
    const effective = peakPerSecond * p.mfu;
    r.add(4, '考虑实际利用率', 'MFU = 模型有效 FLOP/s ÷ 所选精度的峰值 FLOP/s。比较时保持精度与是否稀疏等口径一致。', { mfu: p.mfu, effective }, bars('相同口径下的峰值与有效速度', [['峰值', peakPerSecond / 1e12], ['模型有效', effective / 1e12]], 'TFLOP/s'));
    const hours = flops / effective / 3600;
    r.add(5, '工作量除以速度', 'GPU 数翻倍只有在 MFU 等条件不变时，才得到理想的用时减半。这里不预测实际多卡扩展效率。', { seconds: hours * 3600, hours }, flow('预计计算用时', [['工作量', `${(flops / 1e18).toFixed(1)} EFLOP`, false], ['有效速度', `${(effective / 1e12).toFixed(0)} TFLOP/s`, false], ['用时', `${hours.toFixed(2)} 小时`, true]]));
    const stateGB = N * 16 / 1e9;
    r.add(6, '单独核算状态显存', '本站另设 mixed precision Adam 案例：低精度参数 2B、梯度 2B、主参数 4B、两组矩 8B，共 16 字节/参数。实际实现可不同；此数不含激活和缓冲。', { stateGB, bytesPerParameter: 16 }, { kind: 'segments', title: '未分片的训练状态', capacity: stateGB, unit: 'GB（十进制）', segments: [['参数', 2], ['梯度', 2], ['主参数', 4], ['一阶矩', 4], ['二阶矩', 4]].map(([label, b]) => ({ label, value: b * N / 1e9 })) });
    return r.finish({ N, D, flops, peakPerSecond, effective, hours, stateGB });
  }

  function parallel(p) {
    const r = recorder('parallel', p, `const bytes = {parameters: 2*N, gradients: 2*N, optimizer: 12*N};
const local = [0,1,2].map(i => i >= 3-zero ? bytesByType[i]/gpus : bytesByType[i]);
const grads = Array.from({length:gpus},(_,i) => [i+1, 2-i/4]);
const mean = [0,1].map(d => grads.reduce((s,g)=>s+g[d],0)/gpus);
const updated = [1,1].map((x,d) => x - 0.1*mean[d]);
const perCardGB = local.reduce((a,b)=>a+b,0)/1e9;`);
    const N = p.parameters * 1e9, bytesByType = [2 * N, 2 * N, 12 * N];
    r.add(1, '分清三类训练状态', '沿用本站 Adam 教学口径：参数 2 字节、梯度 2 字节、主参数和两组矩合计 12 字节。只核算持久状态。', { bytesByType }, bars('未分片的状态', [['参数', 2 * p.parameters], ['梯度', 2 * p.parameters], ['优化器与主参数', 12 * p.parameters]], 'GB'));
    const local = bytesByType.map((b, i) => i >= 3 - p.zero ? b / p.gpus : b);
    r.add(2, '决定哪些复制、哪些分片', 'ZeRO 分的是状态；数据并行仍让不同卡处理不同样本。这里使用理想均分，未计 padding、峰值 all-gather 与临时缓冲。', { zero: p.zero, gpus: p.gpus, perCard: local.map(b => b / 1e9) }, { kind: 'segments', title: '每张卡持久保存的状态', unit: 'GB', capacity: local.reduce((a, b) => a + b, 0) / 1e9, segments: ['参数', '梯度', '优化器与主参数'].map((label, i) => ({ label, value: local[i] / 1e9 })) });
    const grads = Array.from({ length: p.gpus }, (_, i) => [i + 1, 2 - i / 4]);
    r.add(3, '各卡算本地梯度', '为了展示同步，用两维梯度替代真实模型。各卡样本数量相同；不等量时不能直接取这种简单平均。', { grads }, flow('不同卡处理不同数据', grads.map((g, i) => [`GPU ${i}`, `g = [${g.join(', ')}]`, false])));
    const mean = [0, 1].map(d => grads.reduce((s, g) => s + g[d], 0) / p.gpus);
    r.add(4, '汇总同一个逻辑梯度', 'DDP 可用 all-reduce 求和再除以卡数。分片实现可用 reduce-scatter 等组合；这里只核对数值等价，不模拟通信耗时。', { mean }, bars('所有数据的平均梯度', mean.map((v, i) => [`维 ${i}`, v])));
    const updated = [1, 1].map((x, d) => x - 0.1 * mean[d]);
    r.add(5, '用同一个梯度更新', '此步以普通 SGD 说明同步语义；上面的 16 字节估算是 Adam 状态口径，两者是分开的教学示例。', { learningRate: 0.1, updated }, bars('逻辑参数更新后的值', updated.map((v, i) => [`维 ${i}`, v])));
    const perCardGB = local.reduce((a, b) => a + b, 0) / 1e9;
    r.add(6, '比较每卡持久显存', 'DDP 在每卡复制状态，不会因卡数增加而自动降低每卡状态显存。ZeRO-3 的理想持久状态约为 16N/G。', { perCardGB, unshardedGB: 16 * p.parameters }, bars('每卡状态对比', [['DDP', 16 * p.parameters], ['当前方案', perCardGB]], 'GB'));
    return r.finish({ local, grads, mean, updated, perCardGB, zero: p.zero });
  }

  function dedup(p) {
    const r = recorder('dedup', p, `const key = text => normalize === 'yes' ? text.trim().replace(/\\s+/gu,' ') : text;
const normalized = train.map(d => ({...d,key:key(d.text)}));
const unique = normalized.filter(d => !seen.has(d.key) && seen.add(d.key));
const evaluationKeys = new Set(evaluation.map(d => key(d.text)));
const clean = unique.filter(d => decontaminate !== 'yes' || !evaluationKeys.has(d.key));
const retained = clean.map(d => d.id);`);
    const train = [{ id: 'train-a', text: '学习 注意力' }, { id: 'train-b', text: '学习  注意力' }, { id: 'train-c', text: '测试 上下文' }, { id: 'train-d', text: '不同 文本' }], evaluation = [{ id: 'eval-e', text: '测试 上下文' }];
    const key = text => p.normalize === 'yes' ? text.trim().replace(/\s+/gu, ' ') : text;
    r.add(1, '固定匹配规则', '合并空白只是本站最小例子；不转小写、不去标点，不把语义相近当作相同。评测集始终保持原样。', { train, evaluation }, flow('训练和评测分开', [['训练集', '4 条', true], ['评测集', '1 条 · 固定保留', false]]));
    const normalized = train.map(d => ({ ...d, key: key(d.text) }));
    r.add(2, '为训练样本生成比较键', '是否归一化会改变精确相同的定义。先检查文本，再决定规则；不要悄悄更改原始数据。', { normalized }, flow('原文 → 比较键', normalized.map(d => [d.id, JSON.stringify(d.text) + ' → ' + JSON.stringify(d.key), true])));
    const seen = new Set(), unique = normalized.filter(d => !seen.has(d.key) && seen.add(d.key));
    r.add(3, '训练集内去重', '按固定顺序保留第一次出现的样本。本例使用完整字符串作键，不存在哈希碰撞。', { retained: unique.map(d => d.id), removedDuplicates: train.length - unique.length }, flow('训练集内保留结果', normalized.map(d => [d.id, unique.includes(d) ? '保留' : '重复，移除', unique.includes(d)])));
    const evaluationKeys = new Set(evaluation.map(d => key(d.text)));
    r.add(4, '单独建立评测集比较键', '去污染有方向：从训练集排除与评测重合的内容；不要把两边混在一起保留先出现的记录。', { evaluationKeys: [...evaluationKeys] }, flow('评测集是固定参照', evaluation.map(d => [d.id, d.text, true])));
    const clean = unique.filter(d => p.decontaminate !== 'yes' || !evaluationKeys.has(d.key));
    r.add(5, '从训练集移除精确重合', '本例 train-c 与 eval-e 完全相同。关闭去污染时它仍留在训练集；训练集内去重不能解决这个问题。', { removedContamination: unique.length - clean.length }, flow('去污染后的训练集', unique.map(d => [d.id, clean.includes(d) ? '保留' : '评测重合，移除', clean.includes(d)])));
    const retained = clean.map(d => d.id);
    r.add(6, '核对数量和 ID', '精确匹配无法检出改写、近似重复和语义污染。真实数据需扩展匹配策略，并审计误删与漏删。', { retained, evaluationRetained: evaluation.map(d => d.id) }, bars('每一阶段的训练样本数', [['原始', train.length], ['集内去重', unique.length], ['去污染后', clean.length]], '条', 4));
    return r.finish({ normalized, unique: unique.map(d => d.id), retained, evaluation: evaluation.map(d => d.id) });
  }

  function agent(p) {
    const r = recorder('agent', p, `let implementation = 'subtract', calls = 0, passed = false, toolError = false;
while (calls < budget && !passed && !toolError) {
  const tool = scriptedPolicy(calls, scenario); // 固定决策，无模型调用
  const observation = dispatchInMemory(tool);
  calls += 1;
  context.push({tool, observation});
  passed = tool === 'test' && observation.allPassed;
}
const stop = passed ? 'tests_passed' : toolError ? 'tool_error' : 'budget_exhausted';`);
    let implementation = 'subtract', calls = 0, passed = false, toolError = false;
    const context = [];
    const tests = [{ a: 1, b: 2, expected: 3 }, { a: 2, b: 3, expected: 5 }, { a: 0, b: 4, expected: 4 }];
    r.add(1, '从有错的函数开始', '内存里的 add(a,b) 暂时执行减法。策略是预设的，测试会真实计算；未调用模型，也未修改你的文件。', { implementation, calls, budget: p.budget }, flow('最小 Agent 循环', [['观察', '读代码与失败', true], ['行动', '选择工具', false], ['反馈', '保存结果', false], ['停止', '测试通过或预算耗尽', false]]));
    while (calls < p.budget && !passed && !toolError) {
      const tool = calls === 0 ? 'read' : calls % 2 === 1 ? 'test' : 'edit';
      r.add(3, `选择工具：${tool}`, '固定策略只负责选动作；工具结果随后回到上下文。这条轨迹用来解释 harness 的状态变化。', { calls, tool, implementation }, flow('当前调用', [['策略', '预设决策', false], [tool, `第 ${calls + 1} 次工具调用`, true], ['上下文', `${context.length} 条观察`, false]]));
      let observation;
      if (p.scenario === 'error' && tool === 'edit') {
        observation = { error: 'patch_rejected', message: '案例文件版本不匹配' }; toolError = true;
      } else if (tool === 'read') observation = { implementation };
      else if (tool === 'edit') {
        implementation = p.scenario === 'stall' ? 'subtract' : p.scenario === 'retry' && calls === 2 ? 'multiply' : 'add';
        observation = { implementation };
      } else {
        const fn = implementation === 'add' ? (a, b) => a + b : implementation === 'multiply' ? (a, b) => a * b : (a, b) => a - b;
        const results = tests.map(t => ({ ...t, actual: fn(t.a, t.b) }));
        observation = { results, allPassed: results.every(t => t.actual === t.expected) };
      }
      calls += 1;
      r.add(4, '执行工具并接收结果', '测试返回实际值和预期值；工具错误与“测试没通过”保留不同状态，便于决定下一步。', { tool, observation, calls }, tool === 'test' ? bars('每个用例实际值（预期分别为 3、5、4）', observation.results.map((t, i) => [`用例 ${i + 1} · ${t.actual === t.expected ? '通过' : '失败'}`, t.actual])) : flow('工具返回', [[tool, JSON.stringify(observation), !toolError]]));
      context.push({ tool, observation });
      r.add(6, '把观察加入上下文', '下一次决策需要看到工具结果。动画播放不是新增调用；这里展示刚才计算出的事件快照。', { calls, contextEntries: context.length, latest: context.at(-1) }, flow('已收到的工具事件', context.map((e, i) => [`${i + 1}. ${e.tool}`, e.observation.error || (e.tool === 'test' ? e.observation.allPassed ? '测试通过' : '测试失败' : e.observation.implementation), i === context.length - 1])));
      passed = tool === 'test' && observation.allPassed === true;
      r.add(7, '检查停止条件', '案例通过三个测试才标为 tests_passed；这不证明对所有输入都正确。超预算和工具错误都不算修复成功。', { passed, calls, budget: p.budget }, flow('是否继续', [['测试', passed ? '案例全部通过' : '尚未全部通过', passed], ['预算', `${calls} / ${p.budget}`, calls < p.budget && !passed && !toolError]]));
    }
    const stop = passed ? 'tests_passed' : toolError ? 'tool_error' : 'budget_exhausted';
    r.add(9, '明确结束原因', '有限预算保证无效修改不会无限重试。把“停止”和“成功”分别记录。', { stop, calls, passed, implementation }, flow('运行结束', [[stop, `${calls} 次工具调用`, passed]]));
    return r.finish({ stop, calls, passed, implementation, context });
  }

  function context(p) {
    const r = recorder('context', p, `const inputBudget = budget - reserve;
const mandatory = [{name:'约束',cost:8}, {name:'任务',cost:7}];
let used = mandatory.reduce((s,x)=>s+x.cost,0);
const ordered = strategy === 'priority' ? byTaskPriority : byFileOrder;
for (const item of ordered) {
  if (used + item.cost <= inputBudget) { selected.push(item); used += item.cost; }
}
const remaining = inputBudget - used;`);
    const inputBudget = p.budget - p.reserve;
    r.add(1, '先给输出留位置', '这里的 token 开销是人工设定的教学数字，不来自某个真实 tokenizer。预算也不是 API 的统一协议。', { budget: p.budget, reserve: p.reserve, inputBudget }, { kind: 'segments', title: '总预算的分配', unit: 'token', capacity: p.budget, segments: [{ label: '输入上限', value: inputBudget }, { label: '输出预留', value: p.reserve }] });
    const mandatory = [{ name: '约束', cost: 8 }, { name: '任务', cost: 7 }];
    let used = 15;
    const selected = [...mandatory];
    r.add(3, '固定必须保留的内容', '任务和约束不能为了塞进更多文件而被静默丢掉。如果它们都放不下，就明确报容量不足。', { mandatory, used, inputBudget }, flow('必须内容', mandatory.map(x => [x.name, `${x.cost} token`, true])));
    const items = [{ name: '项目历史说明', cost: 18, priority: 0 }, { name: '目标函数', cost: 14, priority: 3 }, { name: '相关测试', cost: 10, priority: 2 }, { name: '失败日志', cost: 6, priority: 1 }];
    const ordered = p.strategy === 'priority' ? [...items].sort((a, b) => b.priority - a.priority) : items;
    r.add(4, '按当前任务排顺序', '本例相关性由作者预先标注；不是模型评估，也不是普适的最优装箱算法。正式流程应先研究，再提方案和计划。', { ordered: ordered.map(x => ({ name: x.name, cost: x.cost })) }, flow('候选片段顺序', ordered.map(x => [x.name, `${x.cost} token`, false])));
    if (used > inputBudget) {
      r.add(6, '必须内容已超预算', '拒绝继续装入；可以增大总预算、减少输出预留，或重新组织必须内容。', { status: 'insufficient_capacity', used, inputBudget }, flow('输入容量不足', [['必须内容', `${used} token`, true], ['可用容量', `${inputBudget} token`, false]]));
      return r.finish({ status: 'insufficient_capacity', selected: [], used: 0, inputBudget, missing: items.map(x => x.name) });
    }
    for (const item of ordered) {
      const fits = used + item.cost <= inputBudget;
      if (fits) { selected.push(item); used += item.cost; }
      r.add(6, fits ? `装入：${item.name}` : `暂不装入：${item.name}`, fits ? '片段完整放入后再计入预算；不从中间截断代码。' : '放不下整个片段就跳过，继续检查后面的较小片段。', { item: item.name, accepted: fits, used, inputBudget }, { kind: 'segments', title: '当前输入上下文', capacity: inputBudget, unit: 'token', segments: selected.map(x => ({ label: x.name, value: x.cost })) });
    }
    const missing = items.filter(x => !selected.includes(x)).map(x => x.name), remaining = inputBudget - used;
    r.add(8, '核对实际装入的内容', '窗口有空位也可能缺少关键代码。只看使用率无法判断上下文是否足够，更不能据此推断任务成功率。', { selected: selected.map(x => x.name), missing, remaining }, { kind: 'segments', title: '本次保留的片段', capacity: inputBudget, unit: 'token', segments: selected.map(x => ({ label: x.name, value: x.cost })) });
    return r.finish({ status: 'packed', selected: selected.map(x => x.name), missing, used, remaining, inputBudget });
  }

  function tools(p) {
    const r = recorder('tools', p, `const definition = toolsList(); // name + description + inputSchema
const args = mode === 'read' ? {limit} : {expected_version:version,key:'demo-001'};
const error = validateArguments(definition,args);
if (error) return {isError:true,message:error};
const first = dispatchInMemory(args);
const retry = mode === 'write' ? dispatchInMemory(args) : null;
const output = {first,retry,writes};`);
    const definition = p.mode === 'read' ? { name: 'issues_list', description: '读取本案例的问题', inputSchema: { type: 'object', properties: { limit: { type: 'integer', minimum: 1, maximum: 3 } }, required: ['limit'], additionalProperties: false } } : { name: 'issue_close', description: '关闭本案例的问题', inputSchema: { type: 'object', properties: { expected_version: { type: 'integer', minimum: 0 }, key: { type: 'string', minLength: 1 } }, required: ['expected_version', 'key'], additionalProperties: false } };
    r.add(1, '先发现工具契约', '对应 MCP 的 tools/list 概念。展示名称、说明和 JSON Schema；案例不启动 MCP 服务或网络连接。', { definition }, flow('工具发现', [['Host / Client', '请求 tools/list', false], ['Server', definition.name, true], ['Model', '收到定义后才选择工具', false]]));
    const args = p.mode === 'read' ? { limit: p.limit } : { expected_version: p.version, key: 'demo-001' };
    r.add(2, '构造结构化参数', '读工具和写工具使用各自的 schema。服务器应校验实际参数，不能只在自然语言说明里约定。', { name: definition.name, args }, flow('结构化工具调用', [[definition.name, JSON.stringify(args), true]]));
    const error = p.mode === 'read' && (p.limit < 1 || p.limit > 3) ? 'limit 必须是 1 到 3 的整数' : null;
    r.add(3, '在执行前校验', '这里为两个固定 schema 手写对应检查；没有实现通用 JSON Schema 解释器。', { valid: !error, error }, flow('校验结果', [['输入校验', error || '通过', !error]]));
    if (error) {
      r.add(4, '返回可处理的错误', '无效参数不触发数据读取或写入。修正 limit 后可重新计算。', { isError: true, message: error, writes: 0 }, flow('工具结果', [['参数错误', error, false]]));
      return r.finish({ status: 'invalid_arguments', writes: 0, error });
    }
    const record = { id: 101, status: 'open', version: 1 }, receipts = new Map();
    let writes = 0;
    function dispatchInMemory(a) {
      if (p.mode === 'read') return { issues: [{ id: 101, title: '修复舍入' }, { id: 102, title: '增加边界测试' }, { id: 103, title: '更新说明' }].slice(0, a.limit) };
      // Receipt lookup must precede version validation for an identical retry.
      if (receipts.has(a.key)) return { ...receipts.get(a.key), replayed: true };
      if (record.version !== a.expected_version) return { isError: true, message: '版本冲突，请重新读取', currentVersion: record.version };
      record.status = 'closed'; record.version += 1; writes += 1;
      const result = { ...record }; receipts.set(a.key, result); return result;
    }
    const first = dispatchInMemory(args);
    r.add(5, '执行一次案例工具', '本步真实修改浏览器内存中的案例对象。expected_version 是本站加入的并发控制例子，不是 MCP 自动提供的事务能力。', { first, writes }, flow('第一次返回', [[definition.name, JSON.stringify(first), !first.isError]]));
    const retry = p.mode === 'write' ? dispatchInMemory(args) : null;
    r.add(6, '相同写请求再次到达', '先查同一幂等键的回执，再校验版本，才能安全重放成功结果。幂等与权限、事务需由具体工具实现。', { retry, writes }, flow('重试后的状态', [['第一次调用', first.isError ? '版本冲突' : '成功', !first.isError], ['相同请求重试', retry ? retry.replayed ? '返回已有回执' : '仍为版本冲突' : '读工具无重试写入', !!retry?.replayed], ['实际写入', `${writes} 次`, writes === 1]]));
    r.add(7, '把结果返回给 Agent', '协议让工具能够被发现和调用；schema、简洁输出和可恢复错误让它更易使用。MCP 本身不会消除鉴权、限流和数据一致性的工程工作。', { output: { first, retry }, writes }, flow('完整调用链', [['发现', 'tools/list', false], ['调用', definition.name, false], ['返回', first.isError ? '结构化错误' : '结构化结果', true]]));
    return r.finish({ status: first.isError ? 'version_conflict' : 'ok', first, retry, writes });
  }

  const implementations = { attention, sampling, lora, compute, parallel, dedup, agent, context, tools };
  function register(id, controls, implementation) {
    if (!/^[a-z][a-z0-9-]*$/.test(id) || Object.hasOwn(implementations, id)) throw Error('教学模型 ID 无效或重复：' + id);
    if (!Array.isArray(controls) || typeof implementation !== 'function') throw Error('教学模型定义无效');
    SPECS[id] = controls; implementations[id] = implementation;
  }
  function run(model, supplied) {
    if (!Object.hasOwn(implementations, model)) throw Error('未知教学模型');
    const trace = implementations[model](parameters(model, supplied));
    if (!Array.isArray(trace?.code) || !trace.code.length || !Array.isArray(trace.steps) || !trace.steps.length) throw Error('教学模型缺少代码或过程：' + model);
    for (const step of trace.steps) if (!Number.isInteger(step.line) || step.line < 1 || step.line > trace.code.length || !step.visual || !step.variables) throw Error('教学模型步骤无效：' + model);
    return trace;
  }
  function checkNumeric(value, expected, tolerance = 1e-6) {
    const text = String(value ?? '').trim();
    if (!/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:e[+-]?\d+)?$/i.test(text)) return { valid: false, correct: false, message: '请填写一个有限数值。' };
    const number = Number(text);
    if (!Number.isFinite(number)) return { valid: false, correct: false, message: '请填写一个有限数值。' };
    const correct = Math.abs(number - expected) <= tolerance;
    return { valid: true, correct, message: correct ? '这道数值检查通过。请继续解释推理并完成独立验证。' : '结果还不一致。检查条件、单位和中间步骤后再试。' };
  }
  return { specs: SPECS, parameters, run, register, checkNumeric, softmax };
});
