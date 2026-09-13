'use strict';
// Adds actions to the existing customer/history model; no storage migrations.
window.CRMQuick={actions(c){return `<div class="customer-actions" role="group" aria-label="${esc(c.name)}の操作"><button type="button" data-quick="contact" data-id="${esc(c.id)}">連絡した</button><button type="button" data-quick="schedule" data-id="${esc(c.id)}">次回対応日変更</button><button type="button" data-quick="payment" data-id="${esc(c.id)}">入金記録</button></div>`;}};
function renderHistory(c){
 const memoOnly=document.getElementById('history-filter').value==='memo';
 const rows=c.history.map((h,i)=>({...h,index:i})).filter(h=>!memoOnly||h.kind==='memo'||/(^|\n)メモ：/.test(h.text)).sort((a,b)=>Date.parse(b.at)-Date.parse(a.at)||b.index-a.index);
 const event=h=>`<div class="event"><small>${esc(new Intl.DateTimeFormat('ja-JP',{year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',timeZone:'Asia/Tokyo'}).format(new Date(h.at)))}</small><p>${esc(h.text)}</p></div>`;
 document.getElementById('timeline').innerHTML=rows.slice(0,5).map(event).join('')+(rows.length>5?`<details class="mg-definitions"><summary>以前の履歴 ${rows.length-5}件を見る</summary>${rows.slice(5).map(event).join('')}</details>`:'')||(memoOnly?'<p class="fc-note">対応メモはまだありません。</p>':'<p class="fc-note">履歴はまだありません。</p>');
}
document.addEventListener('DOMContentLoaded',()=>{
 document.addEventListener('invalid',e=>{for(let node=e.target.parentElement;node;node=node.parentElement)if(node.tagName==='DETAILS')node.open=true;},true);
 const dialog=document.createElement('dialog');dialog.id='quick-dialog';dialog.setAttribute('aria-labelledby','quick-title');
 dialog.innerHTML='<div class="drawer-header"><h2 id="quick-title"></h2><button type="button" class="icon-button" id="quick-close" aria-label="操作を閉じる">×</button></div><form id="quick-form"><p id="quick-customer"></p><div id="quick-fields"></div><p id="quick-error" class="fc-error" role="alert"></p><button id="quick-save" type="submit" class="primary">保存</button></form>';
 document.body.append(dialog);
 const form=$('#quick-form');let context=null,clean='',busy=false;
 const snapshot=()=>JSON.stringify([...new FormData(form)]);
 const close=()=>{if(busy)return;if(snapshot()!==clean&&!confirm('未保存の入力を破棄して閉じますか？'))return;dialog.close();context=null;};
 $('#quick-close').onclick=close;dialog.addEventListener('cancel',e=>{e.preventDefault();close();});
 function payment(id){dialog.close();context=null;window.dispatchEvent(new CustomEvent('crm-open-case',{detail:{id,receipt:true}}));}
 document.addEventListener('click',e=>{
  const button=e.target.closest('[data-quick]');if(!button)return;
  const c=customers.find(c=>c.id===button.dataset.id);if(!c)return;
  const mode=button.dataset.quick;context={id:c.id,mode};form.reset();$('#quick-error').textContent='';
  $('#quick-title').textContent={contact:'連絡したことを記録',schedule:'次回対応日を変更',payment:'入金する案件を選択'}[mode];$('#quick-customer').textContent=c.name;
  if(mode==='contact'){
   $('#quick-fields').innerHTML=`<label>連絡日<input name="date" type="date" min="2000-01-01" max="${today()}" value="${today()}" required></label><label>対応メモ（任意）<textarea name="memo" rows="3" maxlength="1000" placeholder="例：電話で条件を案内。明日返信予定"></textarea></label><p class="fc-note">連絡済みの記録だけを保存します。次回予定は変更せず、LINE送信も行いません。</p>`;
   $('#quick-save').textContent='連絡済みとして保存';
  }else if(mode==='schedule'){
   $('#quick-fields').innerHTML=`<label>次回対応日<input name="date" type="date" min="2000-01-01" value="${esc(c.due)}" required></label><div class="quick-date-buttons"><button type="button" data-set-day="0">今日</button><button type="button" data-set-day="1">明日</button><button type="button" data-set-day="7">1週間後</button></div><label>次にすること<input name="next" maxlength="500" value="${esc(c.next)}" placeholder="例：入金予定を確認" required></label><label class="quick-clear"><input name="clear" type="checkbox">次回予定を解除する</label>${c.status==='done'?'<p class="fc-note">予定を設定すると「対応中」に戻ります。</p>':''}`;
   form.elements.clear.onchange=()=>{for(const key of ['date','next']){form.elements[key].disabled=form.elements.clear.checked;form.elements[key].required=!form.elements.clear.checked;}};
   $('#quick-save').textContent='次回予定を保存';
  }else{
   const rows=CRMManagement.recovery([c]);
   if(rows.length===1){payment(rows[0].id);return;}
   $('#quick-fields').innerHTML=rows.length?`<label>対象案件<select name="caseId" required><option value="">案件を選択してください</option>${rows.map(r=>{const a=c.factoringCases.find(a=>a.id===r.id);return `<option value="${esc(r.id)}">${esc(a.reference||r.id)} · 期日 ${r.due} · 未回収額 ${yen(r.amount)}</option>`;}).join('')}</select></label>`:'<p>未回収の買取案件はありません。</p><a class="fc-secondary" href="cases.html">案件管理を開く →</a>';
   $('#quick-save').textContent='入金記録へ進む';$('#quick-save').hidden=!rows.length;
  }
  if(mode!=='payment')$('#quick-save').hidden=false;
  clean=snapshot();dialog.showModal();
 });
 form.addEventListener('click',e=>{const b=e.target.closest('[data-set-day]');if(!b)return;form.elements.clear.checked=false;form.elements.clear.onchange();form.elements.date.value=dateOffset(Number(b.dataset.setDay));});
 form.onsubmit=async e=>{
  e.preventDefault();if(!context||busy)return;const c=customers.find(c=>c.id===context.id);if(!c)return;
  if(context.mode==='payment'){payment(form.elements.caseId.value);return;}
  busy=true;$('#quick-save').disabled=true;$('#quick-error').textContent='';
  try{
   let updated;
   if(context.mode==='contact'){
    const date=form.elements.date.value,memo=form.elements.memo.value.trim();CRMManagement.validateProfile({lastContactDate:date});
    updated={...c,lastContactDate:c.lastContactDate&&c.lastContactDate>date?c.lastContactDate:date,history:[...c.history,{at:stamp(),text:'連絡済み：'+date+(memo?'\nメモ：'+memo:''),kind:'contact'}]};
   }else{
    const due=form.elements.clear.checked?'':form.elements.date.value,next=form.elements.clear.checked?'':form.elements.next.value.trim();
    if(due){F.parse(due);if(due<'2000-01-01'||!next)throw Error('次回対応日と次にすることを入力してください。');}
    const status=due&&c.status==='done'?'active':c.status;
    if(c.due===due&&c.next===next&&c.status===status)throw Error('変更はありません。');
    updated={...c,due,next,status,history:[...c.history,{at:stamp(),text:(due?'次回対応：'+due+' / '+next:'次回対応の予定を解除')+'\n変更前：'+(c.due||'未設定')+' / '+(c.next||'未設定')+(status!==c.status?'\n対応状況：完了 → 対応中':'')}]};
   }
   if(!await persist(customers.map(x=>x.id===c.id?updated:x))){$('#quick-error').textContent='保存できませんでした。書込ロックや保存設定を確認してください。';return;}
   render();dialog.close();context=null;notify('保存しました。');
  }catch(error){$('#quick-error').textContent=error.message;}finally{busy=false;$('#quick-save').disabled=false;}
 };
 $('#history-filter').onchange=()=>{const c=customers.find(c=>c.id===selectedId);if(c)renderHistory(c);};
 let noteBusy=false;
 $('#save-customer-note').onclick=async()=>{
  if(noteBusy)return;const c=customers.find(c=>c.id===selectedId),f=$('#customer-form'),note=f.elements.note.value.trim();
  if(!c||!note){$('#customer-note-result').textContent='メモを入力してください。';return;}
  noteBusy=true;$('#save-customer-note').disabled=true;
  try{
   const updated={...c,history:[...c.history,{at:stamp(),text:'メモ：'+note,kind:'memo'}]};
   if(!await persist(customers.map(x=>x.id===c.id?updated:x))){$('#customer-note-result').textContent='保存できませんでした。入力は残っています。';return;}
   f.elements.note.value='';render();renderHistory(updated);$('#customer-note-result').textContent='メモを保存しました。';
  }finally{noteBusy=false;$('#save-customer-note').disabled=false;}
 };
 window.addEventListener('crm-customer-open',()=>{$('#customer-note-result').textContent='';});
});
