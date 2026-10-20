import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { JSDOM, VirtualConsole } from 'jsdom';
import { render } from '../dist-server/entry-server.js';

const sections=[{slug:'india',en:'India',hi:'भारत'},{slug:'world',en:'World',hi:'विश्व'}];
const page=path=>({path,locale:path.startsWith('/hi')?'hi':'en',kind:'section',category:path.split('/')[3],sections,articles:[],latest:[],breaking:[],origin:'https://digitaljagran.com',pagination:{page:1,pageSize:12,total:0,hasMore:false}});
const template=await readFile(new URL('../dist/index.html',import.meta.url),'utf8');
const bundlePath=template.match(/src="(\/assets\/[^"?]+\.js)"/)[1];
const bundle=await readFile(new URL('../dist'+bundlePath,import.meta.url),'utf8');

test('SSR hydration and section navigation retain exactly one listing and empty state',async t=>{
 const initial=page('/en/section/india');
 const errors=[];const virtualConsole=new VirtualConsole();virtualConsole.on('jsdomError',error=>errors.push(error));
 const dom=new JSDOM('<!doctype html><html><head></head><body><div id="root" data-ssr="true">'+render(initial.path,initial)+'</div><script id="news-data" type="application/json">'+JSON.stringify(initial)+'</script></body></html>',{url:initial.origin+initial.path,runScripts:'outside-only',pretendToBeVisual:true,virtualConsole});
 t.after(()=>dom.window.close());
 dom.window.scrollTo=()=>{};
 dom.window.fetch=async url=>({ok:true,status:200,headers:{get:()=> 'application/json'},json:async()=>page(new URL(url,initial.origin).searchParams.get('path'))});
 assert.equal(dom.window.document.querySelectorAll('.listing-heading').length,1,'Server renders one listing');
 dom.window.eval(bundle);
 const wait=()=>new Promise(resolve=>setTimeout(resolve,100));
 await wait();
 const verify=title=>{
  assert.equal(dom.window.document.querySelectorAll('.listing-heading').length,1,'Hydration/navigation must not append a second listing');
  assert.equal(dom.window.document.querySelectorAll('#main-content > .empty-state').length,1);
  assert.equal(dom.window.document.querySelector('h1').textContent,title);
 };
 verify('India');
 for(const [path,title]of [['/en/section/world','World'],['/en/section/india','India'],['/hi/section/india','भारत']]){
  const link=dom.window.document.querySelector('a[href="'+path+'"]');assert.ok(link,path);
  link.dispatchEvent(new dom.window.MouseEvent('click',{bubbles:true,cancelable:true,button:0}));
  await wait();verify(title);
 }
 assert.deepEqual(errors,[]);
});
