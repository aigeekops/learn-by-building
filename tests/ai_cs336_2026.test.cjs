const {test}=require('node:test'),assert=require('node:assert/strict');
const M=require('../web/ai-course-models.js'),register=require('../web/ai-cs336-2026.js');
const ids=register(M),data=require('../config/ai_cs336_2026.json');
const near=(a,b,eps=1e-8)=>assert.ok(Math.abs(a-b)<eps,`${a} != ${b}`);
test('CS336 BPE counts, boundaries, reversibility and deterministic tie order',()=>{
 for(const [merges,count] of [[0,11],[1,8],[2,5],[4,3]]){const r=M.run('cs336-bpe',{merges}).result;assert.equal(r.tokenCount,count);assert.deepEqual(r.decoded,['low','low','lower']);}
 assert.deepEqual(M.run('cs336-bpe').result.merges,[['l','o'],['lo','w']]);
});
test('CS336 normalization, residual gating and standard FFN shape count',()=>{
 const r=M.run('cs336-rms').result;near(r.rms,Math.sqrt(2.5+1e-6));near(r.norm.reduce((s,v)=>s+v*v,0)/4,2.5/(2.5+1e-6));assert.equal(r.ffnParameters,96);
 assert.deepEqual(M.run('cs336-rms',{scale:0}).result.residual,[1,-1,2,-2]);
 assert.equal(M.run('cs336-rms',{width:8,ratio:4}).result.ffnParameters,768);
});
test('CS336 MoE routing and recurrent linear attention match independent arithmetic',()=>{
 const moe=M.run('cs336-moe').result;near(moe.output,2.5378828427399904);assert.equal(moe.activeParameters,200);assert.equal(moe.totalExpertParameters,400);
 assert.equal(M.run('cs336-moe',{topk:1,x:3,experts:8}).result.output,3);
 const lin=M.run('cs336-linear-attention',{tokens:4}).result;assert.deepEqual(lin.S,[[5,7],[2,6]]);near(lin.output[0],1);near(lin.output[1],13/7);
});
test('CS336 roofline units and explicit matrix tiling have numerical reference values',()=>{
 const r=M.run('cs336-roofline').result;assert.equal(r.bytes,62.5e9);near(r.computeSeconds,.02);near(r.memorySeconds,.0625);assert.equal(r.roofTF,16);assert.equal(r.bottleneck,'memory');
 const c=M.run('cs336-roofline',{intensity:64}).result;assert.equal(c.roofTF,50);assert.equal(c.bottleneck,'compute');
 for(const tile of [2,4,8]){assert.equal(M.run('cs336-tiling',{size:8,tile}).result.c00,10);assert.equal(M.run('cs336-tiling',{size:4,tile}).result.c00,5);}
 const t=M.run('cs336-tiling').result;assert.equal(t.naiveLoads,1024);assert.equal(t.idealTiledLoads,256);
});
test('CS336 tensor layouts produce same matrix result and pipeline does not invent utilization',()=>{
 for(const mode of ['output','input'])for(const gpus of [2,4])assert.deepEqual(M.run('cs336-tensorparallel',{mode,gpus}).result.output,[11,12,13,14]);
 const p=M.run('cs336-pipeline').result;assert.equal(p.slots,7);assert.equal(p.activeCells,16);assert.equal(p.idleCells,12);near(p.utilization,4/7);
 for(let stages=2;stages<=4;stages++)for(let microbatches=1;microbatches<=8;microbatches++){
  const r=M.run('cs336-pipeline',{stages,microbatches}).result;assert.equal(r.schedule.flat().filter(x=>x!==null).length,stages*microbatches);r.schedule.forEach((row,t)=>row.forEach((b,s)=>{if(b!==null)assert.equal(b+s,t)}));assert.ok(r.utilization>0&&r.utilization<=1);
 }
});
test('CS336 scaling law assumptions, fitted coefficient and heldout predictions are explicit',()=>{
 const r=M.run('cs336-scaling').result;assert.equal(r.D,80);assert.equal(r.optimalN,20);near(r.loss,1+2*Math.sqrt(5));
 const f=M.run('cs336-fit').result;near(f.alpha,1);near(f.coefficient,20);near(f.predicted,2.125);near(f.absoluteError,0);
 assert.ok(M.run('cs336-fit',{floor:1}).result.absoluteError>0);
});
test('CS336 per-layer KV cache has correct K/V and precision factors',()=>{
 const r=M.run('cs336-kv').result;assert.equal(r.cacheBytesPerLayer,32768);assert.equal(r.nextCacheBytes,33280);assert.equal(r.decodeScoresPerHead,65);
 assert.equal(M.run('cs336-kv',{batch:1,length:32,kvheads:2,headDim:16}).result.cacheBytesPerLayer,4096);
 near(M.run('cs336-kv',{kvheads:8}).result.cacheBytesPerLayer/M.run('cs336-kv',{kvheads:1}).result.cacheBytesPerLayer,8);
});
test('CS336 pass@k combinatorics and tokenizer normalization use different denominators',()=>{
 const r=M.run('cs336-evaluation').result;near(r.macro,7/12);assert.deepEqual(r.passAtK.slice(1),[0,.5,1]);
 near(M.run('cs336-evaluation',{k:1}).result.macro,7/16);near(M.run('cs336-evaluation',{k:4}).result.macro,.75);
 const a=M.run('cs336-bpb',{tokenizer:'A'}).result,b=M.run('cs336-bpb',{tokenizer:'B'}).result;near(a.bpb,8/(Math.log(2)*20));near(a.bpb,b.bpb);assert.equal(a.totalNLL,b.totalNLL);assert.notEqual(a.perplexity,b.perplexity);
});
test('CS336 data transformations keep provenance; Jaccard and ideal LSH are distinct',()=>{
 const r=M.run('cs336-data-sources').result;assert.deepEqual(r.records.map(x=>x.id),['w1','w4']);assert.ok(r.records.every(x=>x.source&&x.license&&x.text));assert.equal(M.run('cs336-data-sources',{minChars:35}).result.retainedCount,1);
 const j=M.run('cs336-jaccard').result;assert.equal(j.intersection,3);assert.equal(j.union,5);near(j.similarity,.6);near(j.candidateProbability,.83222784);
 assert.equal(M.run('cs336-jaccard',{overlap:0}).result.candidateProbability,0);assert.equal(M.run('cs336-jaccard',{overlap:4}).result.candidateProbability,1);
});
test('CS336 masked SFT and DPO retain reference-relative meaning',()=>{
 const r=M.run('cs336-posttrain').result;assert.equal(r.sftLoss,.5);near(r.dpoLoss,.47407698418010663);
 const neutral=M.run('cs336-posttrain',{mode:'dpo',chosen:1,rejected:1}).result;near(neutral.dpoLoss,Math.log(2));
 assert.ok(M.run('cs336-posttrain',{mode:'dpo',chosen:1,rejected:2}).result.dpoLoss>r.dpoLoss);
});
test('CS336 GRPO verifies rewards, zero-variance groups and negative-advantage clipping',()=>{
 const r=M.run('cs336-grpo').result;assert.deepEqual(r.rewards,[0,1,0,1]);assert.deepEqual(r.advantage,[-1,1,-1,1]);assert.equal(r.std,.5);
 for(const group of ['allwrong','allcorrect']){const z=M.run('cs336-grpo',{group}).result;assert.equal(z.std,0);assert.deepEqual(z.advantage,[0,0,0,0]);assert.equal(z.objective,0);}
 near(M.run('cs336-grpo',{ratio:1.5}).result.objective,-.125);near(M.run('cs336-grpo',{ratio:.5}).result.objective,.05);
});
test('CS336 multimodal patches and contrastive labels give concrete checks',()=>{
 const r=M.run('cs336-patches').result;assert.equal(r.patchesPerImage,196);assert.equal(r.totalTokens,229);assert.deepEqual(r.toyPatchMeans,[2.5,4.5,10.5,12.5]);assert.equal(M.run('cs336-patches',{patch:32}).result.totalTokens,82);
 const a=M.run('cs336-clip').result,b=M.run('cs336-clip',{pairing:'swapped'}).result;assert.ok(b.imageToTextLoss>a.imageToTextLoss);a.probabilities.forEach(row=>near(row.reduce((s,x)=>s+x,0),1));near(a.probabilities[0][0],.8077940197223569,1e-7);
});
test('CS336 Dan Fu guest: identical token work, real bounded scheduler and no fictional GPU times',()=>{
 for(const [slots,staticTicks,continuousTicks] of [[1,11,11],[2,8,6],[3,8,5],[4,5,5]]){const r=M.run('cs336-serving',{slots}).result;assert.equal(r.tokens,11);assert.equal(r.staticTicks,staticTicks);assert.equal(r.continuousTicks,continuousTicks);assert.equal(r.schedule.flat().length,11);assert.ok(r.utilization>0&&r.utilization<=1);}
});
test('CS336 17 core lectures plus one verified guest each have all teaching components',()=>{
 assert.equal(data.lessons.length,18);assert.equal(data.lessons.filter(l=>/^\d+$/.test(l.unit)).length,17);assert.equal(data.course.published.length,18);
 assert.equal(new Set(data.lessons.map(l=>l.id)).size,18);
 for(const l of data.lessons){assert.ok(l.sections.length>=4);assert.ok(l.sections.every(s=>s.explanation.length>70&&s.code&&s.exercise));assert.ok(l.formula&&l.worked&&l.misconception);assert.ok(l.practice.length>=3);assert.ok(l.exercise.transfer&&Number.isFinite(l.exercise.expected));l.sources.forEach(id=>assert.ok(data.sources[id]||id==='original-code'));for(const d of l.demos){const t=M.run(d.modelId);assert.ok(t.steps.length>=2);assert.ok(t.code.length>=4);}}
});
test('CS336 all model defaults and each individual control boundary return finite, bounded traces',()=>{
 function finite(x){if(typeof x==='number')assert.ok(Number.isFinite(x));else if(x&&typeof x==='object')Object.values(x).forEach(finite);}
 for(const id of ids){const r=M.run(id);finite(r);assert.ok(r.steps.length<80);for(const spec of M.specs[id]){const values=spec.type==='range'?[spec.min,spec.max]:spec.options.map(x=>x[0]);for(const value of values){const trace=M.run(id,{[spec.id]:value});finite(trace);assert.ok(trace.steps.length<80);}}}
});
