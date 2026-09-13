'use strict';
(()=>{
 const el=document.getElementById('crm-bootstrap');
 if(!el){
 const keys=['osanai-line-crm-demo-v1','osanai-crm-workbench-v5','osanai-crm-write-lock-v5'],snapshot=new Map(keys.map(k=>[k,localStorage.getItem(k)]));
 const check=()=>{for(const k of keys)if(localStorage.getItem(k)!==snapshot.get(k))throw Error('別のタブで更新されました。入力を控えて再読み込みしてください。上書きはしていません。');};
 window.CRMStore={getItem:k=>localStorage.getItem(k),setItem(k,v){check();localStorage.setItem(k,v);snapshot.set(k,v);},removeItem(k){check();localStorage.removeItem(k);snapshot.set(k,null);}};return;
 }
 const initial=JSON.parse(el.textContent);el.remove();let state=initial.state,busy=false,edits=0,savedEdits=0;
 for(const event of ['input','change'])document.addEventListener(event,e=>{if(e.target.closest('form'))edits++;});
 const keys={'osanai-line-crm-demo-v1':'customers','osanai-crm-workbench-v5':'work','osanai-crm-write-lock-v5':'locked'};
 async function request(url,method='GET',data){const r=await fetch(url,{method,credentials:'same-origin',headers:{'Content-Type':'application/json','X-CRM-Request':'1'},...(data?{body:JSON.stringify(data)}:{})});const result=await r.json();if(!r.ok){if(r.status===401){document.getElementById('server-sync')?.replaceChildren(Object.assign(document.createElement('a'),{href:'/login.html',textContent:'接続終了・ログインし直す'}));}throw Error(result.error||'サーバーに接続できません。');}return result;}
 async function commit(next,mode='save'){if(busy)throw Error('保存中です。完了してから操作してください。');busy=true;const version=edits,indicator=document.getElementById('server-sync');if(indicator)indicator.textContent='保存中…';try{const result=await request('/api/state','PUT',{...next,revision:state.revision,mode});state={...next,revision:result.revision};savedEdits=version;if(indicator)indicator.textContent='サーバー保存済み';return true;}catch(e){if(indicator)indicator.textContent='未保存・再確認が必要';throw e;}finally{busy=false;}}
 window.CRMServer={user:initial.user,directory:initial.directory,request,commit,get state(){return state},get busy(){return busy},get dirty(){return edits!==savedEdits}};
 window.CRMStore={getItem(key){const name=keys[key];return name?JSON.stringify(state[name]):null},async setItem(key,value){if(!keys[key])throw Error('未対応の保存項目です。');await commit({...state,[keys[key]]:JSON.parse(value)},key.endsWith('lock-v5')&&value==='false'?'unlock':'save');}};
 window.addEventListener('beforeunload',e=>{if(busy||edits!==savedEdits){e.preventDefault();e.returnValue='';}});
})();
