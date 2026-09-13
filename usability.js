'use strict';
// Read-only list preferences and reusable form feedback. Existing storage keys stay unchanged.
window.CRMUsability=(()=>{
 let filter='all',errorNumber=0,firstInvalid=null;
 const modes={priority:'対応日超過 → 今日 → 今後 → 未設定 → 完了',outstanding:'未回収額が多い順',profit:'累計見込利益が多い順（確定利益ではありません）',updated:'最終更新が新しい順（顧客・案件・取引・通知の記録を含む）'};
 function updated(c){
  let latest=0;
  for(const record of [c,...(c.history||[]),...(c.transactions||[]),...(c.factoringCases||[]),...(c.legalNotices||[]),...(c.factoringCases||[]).flatMap(a=>a.history||[]),...(c.legalNotices||[]).flatMap(n=>n.history||[])]){
   for(const key of ['at','created','updated']){const time=Date.parse(record[key]);if(Number.isFinite(time))latest=Math.max(latest,time);}
  }
  return latest;
 }
 function info(c){return {...CRMManagement.customer(c),late:(c.status!=='done'&&!!c.due&&c.due<today())||CRMManagement.recovery([c]).some(r=>r.bucket==='late'),today:c.status!=='done'&&c.due===today(),updated:updated(c)};}
 function matches(m){return filter==='all'||filter==='late'&&m.late||filter==='today'&&m.today||filter==='outstanding'&&m.outstanding>0;}
 function compare(a,b,cache){const key=document.getElementById('customer-sort').value;return key==='priority'?CRMManagement.priority(a,b):cache.get(b.id)[key]-cache.get(a.id)[key]||CRMManagement.priority(a,b);}
 function renderFilters(){
  document.querySelectorAll('[data-customer-filter]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.customerFilter===filter)));
  document.querySelector('.list-sort-label:not(#customer-filter-help)').textContent=modes[document.getElementById('customer-sort').value];
  document.getElementById('customer-filter-help').textContent=filter==='late'?'期限超過：未完了の対応日超過、または未回収の回収期限超過':filter==='today'?'今日対応：次回対応日が今日の顧客（完了を除く）':filter==='outstanding'?'未回収あり：買取済案件の残額が1円以上の顧客':'';
 }
 function reveal(field){for(let node=field.parentElement;node;node=node.parentElement)if(node.tagName==='DETAILS')node.open=true;}
 function clear(field){
  const id=field.dataset.fieldError;if(!id)return;
  document.getElementById(id)?.remove();field.removeAttribute('aria-invalid');
  const rest=(field.getAttribute('aria-describedby')||'').split(' ').filter(x=>x!==id).join(' ');
  if(rest)field.setAttribute('aria-describedby',rest);else field.removeAttribute('aria-describedby');delete field.dataset.fieldError;
 }
 function error(field,message,focus=true){
  if(!field)return;clear(field);reveal(field);
  const hint=document.createElement('span');hint.id='field-error-'+(++errorNumber);hint.className='field-error';hint.textContent=message;hint.setAttribute('role','alert');field.after(hint);
  field.dataset.fieldError=hint.id;field.setAttribute('aria-invalid','true');field.setAttribute('aria-describedby',((field.getAttribute('aria-describedby')||'')+' '+hint.id).trim());
  if(focus){field.focus();field.scrollIntoView({block:'nearest'});}
 }
 function validationMessage(field){
  const label=field.labels?.[0],name=label?[...label.childNodes].filter(n=>n.nodeType===3).map(n=>n.textContent.trim()).join(''):(field.getAttribute('aria-label')||'この項目');
  const v=field.validity;
  if(v.badInput)return name+'は数字で入力してください。';
  if(v.valueMissing)return name+(field.type==='checkbox'?'を確認してチェックしてください。':field.tagName==='SELECT'?'を選択してください。':'を入力してください。');
  if(v.rangeOverflow)return field.name==='amount'&&field.form?.id==='fc-receipt-form'?'入金額が未回収額を超えています。今回の上限は'+yen(Number(field.max))+'です。':name+'は'+field.max+'以下で入力してください。';
  if(v.rangeUnderflow)return name+'は'+field.min+'以上で入力してください。';
  if(v.stepMismatch)return name+'は小数なしの整数で入力してください。';
  if(v.tooLong)return name+'は'+field.maxLength+'文字以内で入力してください。';
  return name+'の入力形式を確認してください。';
 }
 function feedback(message){
  document.querySelectorAll('.dialog-feedback').forEach(e=>e.remove());
  const dialogs=[...document.querySelectorAll('dialog[open]')],d=dialogs.at(-1);if(!d)return;
  const el=document.createElement('div');el.className='dialog-feedback';if(/できません|失敗|ロック|入力してください|確認してください/.test(message))el.dataset.error='true';el.setAttribute('role','status');el.textContent=message;const header=d.querySelector('.drawer-header');el.style.top=(header?.offsetHeight||0)+'px';header?.after(el);
 }
 document.addEventListener('DOMContentLoaded',()=>{
  document.getElementById('customer-sort').addEventListener('change',render);
  document.getElementById('customer-reset').onclick=()=>setView('all');
  document.addEventListener('click',e=>{const chip=e.target.closest('[data-customer-filter]');if(chip){filter=chip.dataset.customerFilter;quick='';render();}if(e.target.closest('[data-reset-customers]'))setView('all');if(e.target.closest('[data-add-demo]'))document.getElementById('simulate').click();});
  document.addEventListener('invalid',e=>{
   const field=e.target;if(!field.form)return;e.preventDefault();error(field,validationMessage(field),false);
   if(!firstInvalid){firstInvalid=field;queueMicrotask(()=>{firstInvalid.focus();firstInvalid.scrollIntoView({block:'nearest'});firstInvalid=null;});}
   const summary=field.form.querySelector('p[role=alert]');if(summary)summary.textContent='入力内容を確認してください。赤枠の項目に修正方法を表示しています。';
  },true);
  document.addEventListener('input',e=>{const field=e.target;if(field.matches('input,select,textarea')){clear(field);field.closest('dialog')?.querySelectorAll('.dialog-feedback').forEach(e=>e.remove());const summary=field.form?.querySelector('p[role=alert]');if(summary)summary.textContent='';}});
  document.addEventListener('reset',e=>{e.target.querySelectorAll('[data-field-error]').forEach(clear);});
  // Validation is native; domain errors remain visible and bring the relevant form into view.
  document.querySelectorAll('p[role=alert]').forEach(el=>new MutationObserver(()=>{
   if(!el.textContent.trim()||!el.checkVisibility())return;
   el.classList.add('form-error-summary');el.tabIndex=-1;
   if(el.textContent.startsWith('入力内容を確認'))return;
   const form=el.closest('form');if(!form)return;
   const rules=[[/希望買取額/,'requestedAmount'],[/回収期日/,'dueDate'],[/買取日/,'purchaseDate'],[/審査日/,'decisionDate'],[/申込日/,'applicationDate'],[/買取額/,'purchaseAmount'],[/請求書額面/,'invoiceAmount'],[/否決理由/,'reason']];
   const match=form.id==='fc-form'?rules.find(([re])=>re.test(el.textContent)):null;
   if(match)error(form.elements[match[1]],el.textContent);else {el.focus();el.scrollIntoView({block:'nearest'});}
  }).observe(el,{childList:true,characterData:true,subtree:true}));
  document.querySelectorAll('dialog').forEach(d=>d.addEventListener('toggle',()=>{if(!d.open){d.querySelectorAll('[data-field-error]').forEach(clear);d.querySelectorAll('.dialog-feedback').forEach(e=>e.remove());}}));
 });
 function axisAmount(value){const n=Math.abs(value);const [unit,label]=n>=1e12?[1e12,'兆']:n>=1e8?[1e8,'億']:n>=1e4?[1e4,'万']:[1,''];return String(Math.round(value/unit*10)/10)+label;}
 return {axisAmount,info,matches,compare,renderFilters,reset(){filter='all';},error,feedback};
})();
