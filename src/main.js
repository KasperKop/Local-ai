import { CreateWebWorkerMLCEngine } from '@mlc-ai/web-llm';
import { buildMessages, PROMPT_VERSION } from './prompt.js';
import samples from './samples.json';
import {retrieve,resolveQuote,quoteMessages} from './search.js';
const $ = (id) => document.getElementById(id);
let engine, worker, busy = false, stopped = false, activeModel = null;
const requestedModel = {id:'Qwen3-1.7B-q4f16_1-MLC', label:'Qwen3-1.7B'};

$('source').value=samples.Lapset;
$('sample').onchange=()=>{$('source').value=samples[$('sample').value] || ''; reset();};
function reset(){ $('hits').textContent=''; controls(); }
function hits(){
  let found; try {found=retrieve($('source').value,$('question').value);} catch(e){$('hits').textContent=e.message;return [];}
  $('hits').textContent=found.length?found.map(e=>'Ote '+e.id+' · '+e.text).join('\n\n'):'Ei sanahaun osumia. Kokeile lähteen käyttämää sanaa.';
  return found;
}
$('inspect').onclick=hits;
function controls() {
  for(const id of ['mode','sample']) $(id).disabled=busy;
  $('inspect').disabled=busy || !$('source').value.trim() || !$('question').value.trim();
  $('load').disabled = busy || !!engine;
  $('unload').disabled = busy || !engine;
  $('send').disabled = busy || !engine || !$('source').value.trim() || !$('question').value.trim();
  $('source').disabled = busy;
  $('question').disabled = busy;
  $('example').disabled = busy;
}
$('source').oninput=()=>{$('sample').value='';reset();};
$('question').oninput=reset;
$('mode').onchange=reset;
$('load').onclick = async () => {
  busy = true; controls(); $('status').textContent = 'Tarkistetaan laitetta…';
  try {
    if (!window.isSecureContext || !navigator.gpu) throw new Error('Selain tarvitsee HTTPS-yhteyden ja WebGPU-tuen. Kokeile päivitettyä Safaria.');
    const adapter = await navigator.gpu.requestAdapter();
    if (!adapter) throw new Error('WebGPU-laitetta ei saatu käyttöön.');
    if (!adapter.features.has('shader-f16')) throw new Error('Qwen3-1.7B tarvitsee shader-f16-tuen, jota tämä laite ei ilmoita.');
    worker = new Worker(new URL('./worker.js', import.meta.url), {type: 'module'});
    engine = await CreateWebWorkerMLCEngine(worker, requestedModel.id, {
      initProgressCallback: (p) => { $('progress').value = p.progress; $('status').textContent = p.text; }
    }, {context_window_size: 4096});
    activeModel = requestedModel;
    $('status').textContent = `Malli valmis: ${activeModel.label}. Vastaukset tuotetaan tällä laitteella.`;
  } catch (e) { worker?.terminate(); worker = null; engine = null; activeModel = null; $('status').textContent = 'Käynnistys epäonnistui: ' + e.message; }
  finally { busy = false; controls(); }
};
$('unload').onclick = async () => {
  busy = true; controls();
  try { await engine.unload(); }
  finally {worker?.terminate(); worker = null; engine = null; activeModel = null; busy = false; $('status').textContent = 'Malli vapautettu muistista. Välimuistitiedostot voivat jäädä selaimeen.'; controls();}
};
$('example').onclick = () => { $('sample').value=''; $('hits').textContent='';
  $('source').value = 'Tämä on keksitty tekninen testiohje, ei hoito-ohje. Harjoitustilassa on kolme sinistä laatikkoa. Tarkistuslista säilytetään ylimmässä laatikossa. Harjoituksen jälkeen lista palautetaan samaan paikkaan. Ohje ei kerro harjoituksen kestoa.';
  $('question').value = 'Missä tarkistuslista säilytetään?'; controls();
};
$('form').onsubmit = async (event) => {
  event.preventDefault(); if (busy || !engine || !activeModel) return;
  const responseModel = {...activeModel};
  let messages, entries=[], mode=$('mode').value;
  $('answer').textContent=''; $('request').textContent=''; $('copy').disabled=true;
  $('request-info').textContent=''; $('response-model').textContent='';
  if(mode!=='whole') {
    entries=hits();
    if(!entries.length){ $('metrics').textContent='Hakutulos puuttuu. Mallia ei ajettu.'; return; }
  }
  try { messages = mode==='quote'?quoteMessages(entries,$('question').value):buildMessages(mode==='whole'?$('source').value:entries.map(e=>e.text).join('\n\n'), $('question').value); }
  catch(e) { $('metrics').textContent = e.message; return; }
  $('request').textContent = messages.map((message) => message.role.toUpperCase() + '\n' + message.content).join('\n\n');
  $('request-info').textContent = `Ohje ${PROMPT_VERSION} · ${responseModel.id} · lähde ${$('source').value.trim().length} merkkiä`;
  $('response-model').textContent = `Vastauksen malli: ${responseModel.label}`;
  busy = true; stopped = false; controls(); $('stop').disabled = false; $('copy').disabled = true;
  $('answer').textContent = ''; $('metrics').textContent = 'Muodostetaan vastausta…';
  const start = performance.now(); let first = null, tokens = null, finishReason = null, output = '';
  const pendingNotice = setTimeout(() => {
    if (first === null) $('metrics').textContent = 'Vastausta odotetaan edelleen. Voit keskeyttää ja yrittää uudelleen.';
  }, 20000);
  try {
    const chunks = await engine.chat.completions.create({messages, extra_body: {enable_thinking:false}, temperature: 0, max_tokens: mode==='quote'?16:256, stream: true, stream_options: {include_usage: true}});
    for await (const chunk of chunks) {
      const text = chunk.choices[0]?.delta.content || '';
      if (chunk.choices[0]?.finish_reason) finishReason = chunk.choices[0].finish_reason;
      if(text && first === null) first = performance.now();
      output += text;
      // WebLLM can stream its prefilled empty reasoning header.
      output = output.replace(/^\s*<think>\s*<\/think>\s*/, '');
      if(mode!=='quote') $('answer').textContent = output;
      if(chunk.usage) tokens = chunk.usage.completion_tokens;
    }
    const seconds = ((performance.now() - start)/1000).toFixed(1);
    $('metrics').textContent = `${stopped ? 'Keskeytetty' : 'Valmis'} · ${seconds} s · ensimmäinen teksti ${first === null ? '—' : ((first-start)/1000).toFixed(1) + ' s'}${tokens === null ? '' : ' · ' + tokens + ' tokenia'}`;
    if(mode==='quote' && output.trim()){
      const picked=!stopped && resolveQuote(output,entries);
      output=picked?'Ote '+picked.id+' · '+picked.text:'';
      $('answer').textContent=output || 'Sovelluksen ilmoitus: malli ei valinnut kelvollista otetta. Tarkista lähdehaun osumat.';
    } else if (!output.trim()) {
      $('answer').textContent = stopped
        ? 'Sovelluksen ilmoitus: vastaus keskeytettiin ennen tekstin valmistumista.'
        : 'Sovelluksen ilmoitus: malli ei tuottanut vastaustekstiä. Tämä ei tarkoita, ettei lähteessä olisi vastausta. Yritä uudelleen.';
      $('metrics').textContent = `${stopped ? 'Keskeytetty' : 'Tyhjä vastaus'} · ${seconds} s · lopetussyy: ${finishReason || 'ei ilmoitettu'}${tokens === null ? '' : ' · ' + tokens + ' tokenia'}`;
    }
    if(!stopped && (tokens >= 256 || finishReason === 'length')) $('metrics').textContent += ' · vastaus voi olla katkennut pituusrajaan';
  } catch(e) { $('metrics').textContent = 'Vastaus epäonnistui: ' + e.message;
    if (!output.trim()) $('answer').textContent = 'Sovelluksen ilmoitus: vastauksen muodostaminen epäonnistui. Yritä uudelleen.';
  }
  finally {clearTimeout(pendingNotice); busy = false; $('stop').disabled = true; $('copy').disabled = !output.trim(); controls();}
};
$('stop').onclick = () => {stopped = true; engine?.interruptGenerate(); $('stop').disabled = true;};
$('copy').onclick = async () => {
  try {await navigator.clipboard.writeText($('answer').textContent); $('metrics').textContent = 'Vastaus kopioitu.';}
  catch { $('metrics').textContent = 'Kopiointi ei onnistunut. Valitse ja kopioi teksti käsin.'; }
};
controls();
