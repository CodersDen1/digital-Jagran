import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile,mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {createRequire} from 'node:module';
import {randomUUID} from 'node:crypto';
const require=createRequire(import.meta.url);
const {fileStore}=require('../../server/newsroom/store.js');
const {automationArticle}=require('../../server/newsroom/automation.js');
const worker=JSON.parse(await readFile(new URL('./worker.json',import.meta.url)));
const AsyncFunction=Object.getPrototypeOf(async function(){}).constructor;
const en='NASA has announced a lunar research mission focused on scientific observations and public research information. The agency described the work as part of its continuing programme to study the Moon and improve understanding of the lunar environment. Its announcement sets out the research priorities and explains why the observations matter to scientists. The information comes from the agency statement, which readers can consult for the underlying details and context. The mission brings together scientific planning, observations and analysis within the stated research programme. Researchers will use the findings to examine questions about the Moon and its environment. The announcement provides a basis for following the programme as further information becomes available. Readers should distinguish the objectives described in the statement from results that have yet to be reported. The agency statement remains the source for the details of this announcement.';
const hi='नासा ने चंद्रमा से जुड़े वैज्ञानिक अनुसंधान अभियान की घोषणा की है। एजेंसी के अनुसार अभियान का उद्देश्य चंद्र पर्यावरण को समझने के लिए वैज्ञानिक अवलोकन और अनुसंधान संबंधी जानकारी जुटाना है। घोषणा में शोध की प्राथमिकताओं और वैज्ञानिकों के लिए उनके महत्व का विवरण दिया गया है। इस जानकारी का आधार एजेंसी का वक्तव्य है। पाठक संबंधित विवरण और संदर्भ के लिए मूल वक्तव्य देख सकते हैं। अभियान में वैज्ञानिक योजना, अवलोकन और विश्लेषण को शामिल किया गया है। शोधकर्ता चंद्रमा और उसके पर्यावरण से जुड़े सवालों पर अध्ययन करेंगे। आगे की जानकारी उपलब्ध होने पर कार्यक्रम की प्रगति को समझा जा सकेगा। घोषणा में बताए गए उद्देश्यों को अभी तक प्रकाशित नहीं हुए परिणामों से अलग समझना जरूरी है। एजेंसी का मूल वक्तव्य इस घोषणा के विवरण का स्रोत है।';
const draft={translations:{en:{title:'NASA announces lunar research mission',summary:'NASA outlines its lunar scientific research mission.',body:en,metaTitle:'NASA lunar research mission',description:'NASA describes its lunar research announcement and scientific objectives.'},hi:{title:'नासा ने चंद्र अनुसंधान अभियान की घोषणा की',summary:'नासा ने चंद्र वैज्ञानिक अनुसंधान अभियान का विवरण दिया।',body:hi,metaTitle:'नासा का चंद्र अनुसंधान अभियान',description:'नासा की चंद्र अनुसंधान घोषणा और वैज्ञानिक उद्देश्यों का विवरण।'}},imageSearchQuery:'Moon lunar surface',warnings:[]};
async function harness(t,{unknownPaid=false,credits=100,draftValue=draft,verifierValue={pass:true,unsupportedClaims:[],warnings:[]},publishedAt=new Date().toISOString()}={}){
 const dir=await mkdtemp(path.join(tmpdir(),'dj-flow-')); t.after(()=>rm(dir,{recursive:true,force:true}));
 const store=await fileStore(path.join(dir,'state.json'),false,{dailyBudgetMicroUsd:900000});
 const packet={title:draft.translations.en.title,summary:en,category:'explained',canonicalUrl:'https://nasa.gov/news/lunar-test',newsPublishedAt:publishedAt,sources:[{url:'https://nasa.gov/news/lunar-test',title:draft.translations.en.title,summary:en,publishedAt,retrievedAt:new Date().toISOString()}]};
 const atomic=fn=>store.idempotent(randomUUID(),'fixture',fn);
 await atomic(()=>store.automation.enqueue({sourcePacket:packet,provenance:{sourceId:'nasa.gov',eventId:packet.canonicalUrl,sources:packet.sources.map(({summary,...s})=>s)}}));
 const data=new Map();let paid=0;
 const $=name=>({first:()=>data.get(name)?.[0],all:()=>data.get(name)||[]});
 async function run(start='Kie credit preflight',initial=[{json:{}}]){
  let current=start,input=initial;
  while(current){
   const node=worker.nodes.find(n=>n.name===current);assert.ok(node,current);let output=0,result;
   const $json=input[0]?.json||{},$input={all:()=>input,first:()=>input[0]};
   const expr=s=>s?.startsWith('=')?Function('$json','$','$execution','$itemIndex',`return (${s.slice(3,-2)});`)($json,$,{id:'test-run'},0):s;
   if(node.type.endsWith('.code'))result=await new AsyncFunction('$json','$input','$','$execution','$workflow','Buffer','require',node.parameters.jsCode).call({helpers:{}},$json,$input,$,{id:'test-run'},{id:'test-workflow'},Buffer,require);
   else if(node.type.endsWith('.if')) {output=expr(node.parameters.conditions.conditions[0].leftValue)?0:1;result=input;}
   else if(node.type.endsWith('.httpRequest')){
    const url=expr(node.parameters.url),body=node.parameters.jsonBody?expr(node.parameters.jsonBody):null;
    let value;
    if(url.endsWith('/api/v1/chat/credit'))value={code:200,data:credits};
    else if(url.includes('api.kie.ai')){paid++;assert.equal(url,'https://api.kie.ai/codex/v1/responses');assert.equal(body.model,'gpt-6-luna');assert.equal(body.stream,false);assert.equal(body.reasoning.effort,'low');assert.ok(body.input[0].content[0].text);if(unknownPaid)throw new Error('Unknown paid response');value={credits_consumed:0.15,usage:{input_tokens:1000,output_tokens:500},status:'completed',output:[{type:'reasoning',id:'rs-'+paid,summary:[]},{type:'message',role:'assistant',id:'msg-'+paid,status:'completed',content:[{type:'output_text',text:JSON.stringify(paid===1?draftValue:verifierValue)}]}]};}
    else if(url.includes('commons.wikimedia.org'))value={query:{pages:{}}};
    else{
     const pathname=new URL(url).pathname.replace('/api/v1/automation',''); const parts=pathname.split('/');
     value=await atomic(async()=>{let value;
     if(pathname==='/jobs/claim')value=await store.automation.claim(body);
     else if(pathname==='/articles')value=await store.ingestAutomation(automationArticle(body));
     else if(parts[1]==='jobs'&&parts[3]==='reservations')value=parts[4]?await store.automation.reconcile(parts[2],parts[4],body):await store.automation.reserve(parts[2],body);
     else if(parts[1]==='jobs')value=await store.automation.patch(parts[2],body);
     else throw new Error('Unexpected URL '+url);return value;});
    }
    result=value?[{json:value}]:[];
   } else throw new Error('Unsupported test node '+node.type);
   data.set(current,structuredClone(result));
   const next=worker.connections[current]?.main?.[output]?.[0]?.node;
   if(!result?.length||!next)break;current=next;input=result;
  }
 }
 return {store,data,run,get paid(){return paid;}};
}
test('generated worker performs two bounded paid calls and submits a bilingual review with honest missing-photo warning',async t=>{
 const h=await harness(t);await h.run();assert.equal(h.paid,2);
 const job=h.data.get('Complete durable job')[0].json.job;assert.equal(job.phase,'completed');
 assert.ok(h.data.get('Price guard draft')[0].json.reservationMicroUsd>=19200,'Reserve all 128K output tokens, including reasoning');
 assert.ok(h.data.get('Price guard factcheck')[0].json.reservationMicroUsd>=19200);
 const result=h.data.get('Submit for human approval')[0].json;assert.equal(result.article.status,'review');assert.equal(result.article.image,'');assert.equal(result.article.provenance.imageGenerated,false);
 assert.ok(result.article.provenance.warnings.some(w=>w.includes('No verified reusable photograph')));
 const day=await h.store.automation.day();assert.equal(day.counts.reviewed,1);assert.equal(day.spend.actualMicroUsd,1500);assert.equal(day.spend.reservedMicroUsd,0);
});
test('an unknown paid response retains the reservation and recovery never resubmits it',async t=>{
 const h=await harness(t,{unknownPaid:true});await assert.rejects(h.run(),/Unknown paid response/);assert.equal(h.paid,1);
 const state=h.data.get('Mark draft uncertain')[0].json;
 await assert.rejects(h.run('Recover safely',[{json:state}]),/PAID OUTCOME UNKNOWN/);assert.equal(h.paid,1);
 const day=await h.store.automation.day();assert.ok(day.spend.reservedMicroUsd>0);assert.equal(day.counts.reviewed,0);
});
test('workflow JSON has complete connections, restricted credentials and no paid retries or publication nodes',()=>{
 for(const node of worker.nodes.filter(n=>n.name.startsWith('Kie '))){assert.equal(node.retryOnFail,false);assert.equal(node.credentials.httpBearerAuth.name,'Kie.ai | Newsroom text');}
 for(const [from,edges]of Object.entries(worker.connections)){assert.ok(worker.nodes.some(n=>n.name===from));for(const out of edges.main)for(const edge of out||[])assert.ok(worker.nodes.some(n=>n.name===edge.node));}
 assert.equal(worker.active,false);assert.equal(worker.settings.timezone,'Asia/Kolkata');
 assert.ok(worker.nodes.every(n=>!String(n.parameters.url||'').includes('/admin')));
 for(const n of worker.nodes.filter(n=>n.parameters.jsonBody?.startsWith('={{')))assert.equal(n.parameters.jsonBody.slice(3,-2).includes('}}'),false,'Nested braces must not terminate the n8n expression: '+n.name);
});
test('thin evidence is quarantined once after reconciling the first paid response',async t=>{
 const h=await harness(t,{draftValue:{insufficientEvidence:true,warnings:['Source only supplies a headline.']}});await h.run();assert.equal(h.paid,1);
 const job=h.data.get('Quarantine rejected candidate')[0].json.job;assert.equal(job.phase,'failed');assert.match(job.checkpoint.lastError,/evidence|Draft quality/i);
 const day=await h.store.automation.day();assert.equal(day.counts.failed,1);assert.equal(day.counts.reviewed,0);assert.equal(day.spend.actualMicroUsd,750);assert.equal(day.spend.reservedMicroUsd,0);
});
test('a failed evidence check quarantines the draft and never submits it for approval',async t=>{
 const h=await harness(t,{verifierValue:{pass:false,unsupportedClaims:['Unverified assertion.'],warnings:[]}});await h.run();assert.equal(h.paid,2);assert.equal(h.data.has('Submit for human approval'),false);assert.equal((await h.store.automation.day()).counts.failed,1);
});
test('stale queued news is quarantined before any paid call',async t=>{
 const h=await harness(t,{publishedAt:new Date(Date.now()-37*3600000).toISOString()});await h.run();assert.equal(h.paid,0);assert.equal((await h.store.automation.day()).counts.failed,1);
});
test('low provider balance stops before any job is claimed or cost reserved',async t=>{
 const h=await harness(t,{credits:0});await assert.rejects(h.run(),/credit preflight/i);assert.equal(h.paid,0);const day=await h.store.automation.day();assert.equal(day.counts.claimed,0);assert.equal(day.spend.reservedMicroUsd,0);
});
