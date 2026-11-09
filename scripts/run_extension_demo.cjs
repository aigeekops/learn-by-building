#!/usr/bin/env node
const M=require('../web/ai-course-models.js'),E=require('../web/extension-course-models.js');E.register(M);
const [id,input]=process.argv.slice(2);
if(id==='--list'){console.log(Object.keys(E.definitions).join('\n'));process.exit(0);}
if(!id){console.error('Usage: node scripts/run_extension_demo.cjs <lesson-id> [JSON-parameters]');process.exit(2);}
try{console.log(JSON.stringify(M.run(id,input?JSON.parse(input):undefined),null,2));}catch(error){console.error(error.message);process.exitCode=1;}
