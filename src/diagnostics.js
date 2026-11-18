// Store only runtime events. Never persist a question, passage or model answer.
export function diagnostics(storage) {
  let available=true;
  function get(k){try{return storage().getItem(k)}catch{available=false;return null}}
  function put(k,v){try{if(v==null)storage().removeItem(k);else storage().setItem(k,v)}catch{available=false}}
  const interrupted=get('generating')==='1';
  const previous=get('localai.phase');
  const small=interrupted || get('localai.small')==='1';
  if(small)put('localai.small','1');
  put('generating',null);put('localai.phase',null);
  let logs=(get('localai.events')||'').split('\n').filter(Boolean).slice(-24);
  return {small, previous, interrupted,get available(){return available},
    log(s){logs.push(new Date().toLocaleTimeString('fi')+' · '+s);logs=logs.slice(-24);put('localai.events',logs.join('\n'));return logs.join('\n')},
    phase(s,generating=false){put('localai.phase',s);put('generating',generating?'1':null)},
    clear(){put('generating',null);put('localai.phase',null)}
  };
}
