import test from 'node:test';
import assert from 'node:assert/strict';
import {diagnostics} from './diagnostics.js';
function session(){const m=new Map;return ()=>({getItem:k=>m.get(k),setItem:(k,v)=>m.set(k,v),removeItem:k=>m.delete(k)})}
test('reload before or after first text selects fallback; loading alone does not',()=>{
 for(const [phase,g] of [['alustus',false],['odotus',true],['vastaus',true]]){
 const s=session(), d=diagnostics(s);d.phase(phase,g);const next=diagnostics(s);
 assert.equal(next.small,g);assert.equal(next.previous,phase);assert.equal(next.interrupted,g);
 assert.equal(diagnostics(s).interrupted,false);assert.equal(diagnostics(s).small,g);}
});
test('normal finish or handled error clears interruption flags',()=>{
 const s=session(), d=diagnostics(s);d.phase('generointi',true);d.clear();assert.equal(diagnostics(s).small,false);
});
test('storage unavailable does not break startup',()=>{assert.equal(diagnostics(()=>{throw Error()}).available,false)});
