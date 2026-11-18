import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {retrieve,resolveQuote} from './search.js';
const data=JSON.parse(fs.readFileSync(new URL('./samples.json',import.meta.url)));
for(const [q,expected] of [['paco tavoite mmhg','PaCO₂'],['systolisen verenpaineen tarkka tavoite mmHg','iänmukainen systolinen'],['glukoosin tavoite','normaali verensokeri']]){
 test(q,()=>assert.ok(retrieve(data.Lapset,q)[0].text.includes(expected)));
}
test('no match, no invented quote',()=>{
 assert.deepEqual(retrieve(data.Lapset,'satelliittipaikannus'),[]);
 const entries=retrieve(data.Lapset,'verenpaine');
 for(const raw of ['','0','1. lisätty numero 120–160','999'])assert.equal(resolveQuote(raw,entries),null);
 assert.equal(resolveQuote(String(entries[0].id),entries),entries[0]);
});
test('finds one passage in a 90k character Finnish corpus',()=>{
 const filler='Harjoituskansion tunnus on sininen.';
 const text=Array(2500).fill(filler).join('\n\n')+'\n\nTarkistuslista sijaitsee ylimmässä laatikossa.';
 assert.ok(text.length>90000);
 assert.match(retrieve(text,'Missä tarkistuslista sijaitsee?')[0].text,/ylimmässä/);
});
