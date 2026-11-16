import { CreateWebWorkerMLCEngine } from '@mlc-ai/web-llm';
import { buildMessages, PROMPT_VERSION } from './prompt.js';
const $ = (id) => document.getElementById(id);
let engine, worker, busy = false, stopped = false;
function controls() {
  $('load').disabled = busy || !!engine;
  $('model').disabled = busy || !!engine;
  $('unload').disabled = busy || !engine;
  $('send').disabled = busy || !engine || !$('source').value.trim() || !$('question').value.trim();
  $('source').disabled = busy;
  $('question').disabled = busy;
  $('example').disabled = busy;
}
$('source').oninput = $('question').oninput = controls;
$('load').onclick = async () => {
  busy = true; controls(); $('status').textContent = 'Tarkistetaan laitetta…';
  try {
    if (!window.isSecureContext || !navigator.gpu) throw new Error('Selain tarvitsee HTTPS-yhteyden ja WebGPU-tuen. Kokeile päivitettyä Safaria.');
    const adapter = await navigator.gpu.requestAdapter();
    if (!adapter) throw new Error('WebGPU-laitetta ei saatu käyttöön.');
    if (!adapter.features.has('shader-f16')) throw new Error('Valitut mallit tarvitsevat shader-f16-tuen, jota tämä laite ei ilmoita.');
    worker = new Worker(new URL('./worker.js', import.meta.url), {type: 'module'});
    engine = await CreateWebWorkerMLCEngine(worker, $('model').value, {
      initProgressCallback: (p) => { $('progress').value = p.progress; $('status').textContent = p.text; }
    }, {context_window_size: 4096});
    $('status').textContent = 'Malli valmis. Vastaukset tuotetaan tällä laitteella.';
  } catch (e) { worker?.terminate(); worker = null; engine = null; $('status').textContent = 'Käynnistys epäonnistui: ' + e.message; }
  finally { busy = false; controls(); }
};
$('unload').onclick = async () => {
  busy = true; controls();
  try { await engine.unload(); }
  finally {worker?.terminate(); worker = null; engine = null; busy = false; $('status').textContent = 'Malli vapautettu muistista. Välimuistitiedostot voivat jäädä selaimeen.'; controls();}
};
$('example').onclick = () => {
  $('source').value = 'Tämä on keksitty tekninen testiohje, ei hoito-ohje. Harjoitustilassa on kolme sinistä laatikkoa. Tarkistuslista säilytetään ylimmässä laatikossa. Harjoituksen jälkeen lista palautetaan samaan paikkaan. Ohje ei kerro harjoituksen kestoa.';
  $('question').value = 'Missä tarkistuslista säilytetään?'; controls();
};
$('form').onsubmit = async (event) => {
  event.preventDefault(); if (busy || !engine) return;
  let messages;
  try { messages = buildMessages($('source').value, $('question').value); }
  catch(e) { $('metrics').textContent = e.message; return; }
  $('request').textContent = messages.map((message) => message.role.toUpperCase() + '\n' + message.content).join('\n\n');
  $('request-info').textContent = `Ohje ${PROMPT_VERSION} · ${$('model').value} · lähde ${$('source').value.trim().length} merkkiä`;
  busy = true; stopped = false; controls(); $('stop').disabled = false; $('copy').disabled = true;
  $('answer').textContent = ''; $('metrics').textContent = 'Muodostetaan vastausta…';
  const start = performance.now(); let first = null, tokens = null;
  try {
    const chunks = await engine.chat.completions.create({messages, temperature: 0, max_tokens: 256, stream: true, stream_options: {include_usage: true}});
    for await (const chunk of chunks) {
      const text = chunk.choices[0]?.delta.content || '';
      if(text && first === null) first = performance.now();
      $('answer').textContent += text;
      if(chunk.usage) tokens = chunk.usage.completion_tokens;
    }
    const seconds = ((performance.now() - start)/1000).toFixed(1);
    $('metrics').textContent = `${stopped ? 'Keskeytetty' : 'Valmis'} · ${seconds} s · ensimmäinen teksti ${first === null ? '—' : ((first-start)/1000).toFixed(1) + ' s'}${tokens === null ? '' : ' · ' + tokens + ' tokenia'}`;
    if(!stopped && tokens >= 256) $('metrics').textContent += ' · vastaus voi olla katkennut pituusrajaan';
  } catch(e) { $('metrics').textContent = 'Vastaus epäonnistui: ' + e.message; }
  finally {busy = false; $('stop').disabled = true; $('copy').disabled = !$('answer').textContent; controls();}
};
$('stop').onclick = () => {stopped = true; engine?.interruptGenerate(); $('stop').disabled = true;};
$('copy').onclick = async () => {
  try {await navigator.clipboard.writeText($('answer').textContent); $('metrics').textContent = 'Vastaus kopioitu.';}
  catch { $('metrics').textContent = 'Kopiointi ei onnistunut. Valitse ja kopioi teksti käsin.'; }
};
controls();
