import {test} from 'node:test';
import assert from 'node:assert/strict';
import {restoreModel, saveModel, MODEL_STORAGE_KEY} from './model-preference.js';
const allowed = ['small', 'large'];
test('valinta säilyy myös uudelleenavauksessa', () => {
  const data = new Map();
  const storage = () => ({getItem: k => data.get(k), setItem: (k,v) => data.set(k,v)});
  assert.equal(saveModel('large', allowed, storage), true);
  assert.equal(restoreModel(allowed, 'small', storage).model, 'large');
  assert.deepEqual([...data.keys()], [MODEL_STORAGE_KEY]);
});
test('puuttuva tai vanhentunut malli palautuu oletukseen', () => {
  for (const saved of [null, '', 'removed']) assert.equal(restoreModel(allowed,'small',()=>({getItem:()=>saved})).model,'small');
});
test('tallennuksen esto ei kaada sovellusta', () => {
  const blocked=()=>{throw Error('SecurityError');};
  assert.deepEqual(restoreModel(allowed,'small',blocked),{model:'small',available:false});
  assert.equal(saveModel('large',allowed,blocked),false);
});
test('tuntematonta mallia ei tallenneta', () => {
  assert.equal(saveModel('unknown',allowed,()=>{throw Error('Must not access');}),false);
});
test('täysi tallennustila käsitellään', () => {
  assert.equal(saveModel('large',allowed,()=>({setItem(){throw Error('QuotaExceededError');}})),false);
});
