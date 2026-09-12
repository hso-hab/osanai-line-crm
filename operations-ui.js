'use strict';
(()=>{
const O=window.CRMOperations,C=window.CRMFactoring;let mode='month',anchor=today(),noticeId=null,noticeClean='',action=null,caseContext=null,activeNav='ops-nav';
const fields=['kind','receivedDate','verification','source','recorder'];
const rows=()=>customers.flatMap(c=>(c.factoringCases||[]).map(a=>({...a,customerId:c.id})));
const casesFor=c=>c.factoringCases||[];
const textRange=r=>r.start===r.end?r.start:`${r.start} 〜 ${r.end}`;
const tile=(name,value,note='')=>`<div><span>${name}</span><strong>${value}</strong><small>${note}</small></div>`;
const setNav=id=>{activeNav=id;document.querySelectorAll('.nav-item').forEach(b=>b.classList.toggle('selected',b.id===id||b.dataset.view===id))};
const openSection=id=>{const e=$('#'+id);e.open=true;e.scrollIntoView({behavior:'smooth',block:'start'})};
function openManual(){setNav('all');openSection('manual-details');}
function renderOps(){
 const s=O.overview(customers,mode,anchor),n=O.noticeStats(customers),r=C.recovery(rows(),today(),'due');
 $('#ops-period').textContent=textRange(s)+(mode==='week'?'（月曜〜日曜）':mode==='month'?'（暦月）':'')+' · 全顧客';
 $('#ops-metrics').innerHTML=tile('売上相当・手数料見込',yen(s.fee),'買取実行日基準 / 未回収分を含む')+tile('見込利益',yen(s.profit),'手数料見込 − 直接費用')+tile('実行買取額（支出）',yen(s.purchase),s.count+'件の先払い')+tile('入金回収額（入金）',yen(s.recovery),'各入金日基準 / 元本相当分を含む');
 $('#ops-date').value=anchor;$('#ops-date').max=today();$('#ops-next').disabled=F.range(mode,anchor).end>=today();$('#ops-prev').disabled=F.range(mode,anchor).start<='2000-01-01';
 document.querySelectorAll('[data-ops-period]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.opsPeriod===mode)));
 $('#ops-chart-title').textContent={day:'日別の売上・利益見込 · 7日間',week:'週別の売上・利益見込 · 8週間',month:'月別の売上・利益見込 · 6か月'}[mode];
 drawChart(s.series);
 $('#ops-table').innerHTML=s.series.map(v=>`<tr><th>${esc(textRange(v))}</th><td>${yen(v.fee)}</td><td>${yen(v.profit)}</td><td>${yen(v.purchase)}</td><td>${yen(v.recovery)}</td><td>${v.count}</td></tr>`).join('');
 $('#ops-attention').innerHTML=`<button id="ops-notice-link"><span>通知のある顧客</span><strong>${n.customers}人</strong><small>確認待ち ${n.unverified}人 · 責任者確認へ →</small></button><button id="ops-overdue-link"><span>延滞残額</span><strong>${yen(r.overdue)}</strong><small>${r.overdueCount}件 · 手動確認へ →</small></button><div><span>期日到来分の弁済率</span><strong>${r.rate===null?'—':(r.rate*100).toFixed(1)+'%'}</strong><small>現在までの全案件・日付切替の対象外</small></div>`;
 $('#ops-notice-link').onclick=()=>openSection('notices-details');$('#ops-overdue-link').onclick=()=>{openManual();$('#fc-status-filter').value='late';$('#fc-status-filter').dispatchEvent(new Event('change'));$('#fc-cases').scrollIntoView({behavior:'smooth'})};
 document.querySelectorAll('.ops-metrics strong').forEach(el=>{let size=parseFloat(getComputedStyle(el).fontSize);while(el.scrollWidth>el.clientWidth&&size>12){el.style.fontSize=(--size)+'px';}});setNav(activeNav);
 renderNotices();refreshCustomerAlert();refreshCaseGate();
}
function drawChart(series){
 const width=Math.max(250,$('#ops-chart').clientWidth||640),h=220,left=55,right=10,top=22,bottom=175;const max=Math.max(1,...series.map(v=>v.fee)),min=Math.min(0,...series.map(v=>v.profit));const y=v=>top+(max-v)/(max-min)*(bottom-top),step=(width-left-right)/series.length,bw=Math.min(22,step*.26);const zero=y(0);const compact=v=>Math.abs(v)>=10000?(Math.round(v/1000)/10)+'万':String(v);
 let svg=`<svg viewBox="0 0 ${width} ${h}" role="img" aria-label="手数料見込と見込利益の期間別グラフ。数値表もあります。">`;
 for(const t of new Set([max,0,...(min<0?[min]:[])]))svg+=`<line x1="${left}" y1="${y(t)}" x2="${width-right}" y2="${y(t)}" stroke="#d5e3da"/><text x="${left-7}" y="${y(t)+4}" text-anchor="end" class="axis-label">${compact(t)}円</text>`;
 series.forEach((v,i)=>{const x=left+i*step;svg+=`<g data-ops-bar="${i}" role="button" tabindex="0" class="chart-period" aria-label="${esc(textRange(v))} 手数料見込${yen(v.fee)} 見込利益${yen(v.profit)}"><rect x="${x}" y="0" width="${step}" height="${h}" fill="transparent" class="chart-hit"/>`;
 ['fee','profit'].forEach((k,j)=>{svg+=`<rect x="${x+step/2+(j?2:-bw-2)}" y="${Math.min(y(v[k]),zero)}" width="${bw}" height="${Math.abs(y(v[k])-zero)}" fill="${k==='fee'?'#237c60':v[k]<0?'#b74831':'#82bca0'}" rx="2"/>`;});
 if(width>450||mode!=='week'||i%2===0||i===series.length-1)svg+=`<text x="${x+step/2}" y="200" text-anchor="middle" class="axis-label">${mode==='month'?Number(v.start.slice(5,7))+'月':Number(v.start.slice(5,7))+'/'+Number(v.start.slice(8,10))}</text>`;svg+='</g>';
 });$('#ops-chart').innerHTML=svg+'</svg>';
 const detail=v=>`${textRange(v)}：手数料見込 ${yen(v.fee)} / 見込利益 ${yen(v.profit)} / 買取 ${yen(v.purchase)} / 入金 ${yen(v.recovery)}`;
 $('#ops-chart-detail').textContent=series.every(v=>v.count===0&&v.recovery===0)?'この期間の買取・入金はありません。案件を登録すると自動集計されます。':detail(series.at(-1));
 document.querySelectorAll('[data-ops-bar]').forEach(b=>{const show=()=>$('#ops-chart-detail').textContent=detail(series[Number(b.dataset.opsBar)]);b.onclick=show;b.onkeydown=e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();show()}}});
}
function renderNotices(){
 const n=O.noticeStats(customers);$('#notice-summary-count').textContent=`自己破産 ${n.bankruptcy}人 / 任意整理 ${n.restructuring}人 / 合計 ${n.customers}人`;
 $('#notice-metrics').innerHTML=tile('自己破産の通知',n.bankruptcy+'人','受領記録のある顧客')+tile('任意整理の通知',n.restructuring+'人','受領記録のある顧客')+tile('重複を除く合計',n.customers+'人',n.records+'通知 / 内容確認待ち '+n.unverified+'人');
 const q=$('#notice-search').value.trim().toLowerCase(),all=$('#notice-filter').value==='all';
 const records=customers.filter(c=>!q||[c.name,c.id].join(' ').toLowerCase().includes(q)).flatMap(c=>(c.legalNotices||[]).filter(n=>all||!n.void).map(n=>({c,n}))).sort((a,b)=>b.n.receivedDate.localeCompare(a.n.receivedDate));
 $('#notice-list').innerHTML=records.length?records.map(({c,n})=>`<article class="notice-card ${n.void?'void':''}"><header><div><strong>${esc(c.name)}</strong><small>${esc(c.id)}</small></div><span class="fc-tag ${n.void?'':'fc-alert'}">${esc(O.noticeKinds[n.kind])} · ${n.void?'取消済':n.verification==='verified'?'内容確認済':'内容確認待ち'}</span></header><p>受領日 ${esc(n.receivedDate)} / ${esc(n.source)}</p><p>${esc(n.memo||'')}</p><small>記録：${esc(n.recorder)} / 通知ID ${esc(n.id)}</small><div class="transaction-actions"><button data-notice-customer="${esc(c.id)}">顧客詳細</button>${!n.void?`<button data-notice-edit="${esc(n.id)}" data-cid="${esc(c.id)}">訂正・確認</button>`:''}<button data-notice-toggle="${esc(n.id)}" data-cid="${esc(c.id)}">${n.void?'復元':'誤登録を取消'}</button></div><details class="fc-definitions"><summary>変更履歴</summary>${(n.history||[]).slice().reverse().map(x=>`<p><small>${esc(timeLabel(x.at))}</small><br>${esc(x.text)}</p>`).join('')}</details></article>`).join(''):'<p class="empty">通知の記録はありません。受領時に「通知を記録」から追加します。</p>';
}
function refreshCustomerAlert(){const c=customers.find(c=>c.id===selectedId),el=$('#customer-notice-alert');el.hidden=!c||!O.activeNotices(c).length;el.textContent=el.hidden?'':'通知履歴あり：自動審査対象外・責任者確認が必要です。受領種別 '+[...new Set(O.activeNotices(c).map(n=>O.noticeKinds[n.kind]))].join(' / ');}
function refreshCaseGate(){
 const f=$('#fc-form'),c=customers.find(c=>c.id===f.elements.customer.value),previous=caseContext?casesFor(c||{}).find(a=>a.id===caseContext):null;const flagged=c&&O.activeNotices(c).length>0;
 $('#fc-notice-alert').hidden=!flagged;$('#fc-notice-alert').textContent=flagged?'この顧客には通知履歴があります。新しい審査結果は責任者が確認します。自動否決はしません。':'';
 const needs=flagged&&['approved','rejected','purchased'].includes(f.elements.status.value)&&previous?.status!==f.elements.status.value;
 const gate=$('#fc-human-review');gate.hidden=!needs;gate.disabled=!needs;
 for(const k of ['reviewer','reviewReason','reviewAck'])f.elements[k].required=!!needs;
}
function formState(){return JSON.stringify([...new FormData($('#notice-form')).entries()])}
function openNotice(cid='',id=null){noticeId=id;const c=customers.find(c=>c.id===cid),n=c?.legalNotices?.find(n=>n.id===id),f=$('#notice-form');f.reset();f.elements.noticeCustomer.innerHTML=customers.map(c=>`<option value="${esc(c.id)}">${esc(c.name)} · ${esc(c.id)}</option>`).join('');if(c)f.elements.noticeCustomer.value=c.id;f.elements.noticeCustomer.disabled=!!n;
 for(const k of fields)f.elements[k].value=n?.[k]??({kind:'bankruptcy',verification:'pending',receivedDate:today()}[k]||'');f.elements.receivedDate.max=today();f.elements.noticeMemo.value=n?.memo||'';$('#notice-dialog-title').textContent=n?'通知を訂正・確認':'通知を記録';$('#notice-error').textContent='';noticeClean=formState();$('#notice-dialog').showModal();}
function closeNotice(){if(formState()!==noticeClean&&!confirm('未保存の通知入力を破棄しますか？'))return;$('#notice-dialog').close();}
function saveNotice(cid,n,description){const c=customers.find(c=>c.id===cid);if(!c)return false;const previous=(c.legalNotices||[]).find(x=>x.id===n.id),record={...n,history:[...(previous?.history||[]),{at:stamp(),text:description}]};const next=customers.map(c=>c.id===cid?{...c,legalNotices:previous?c.legalNotices.map(x=>x.id===n.id?record:x):[...(c.legalNotices||[]),record],history:[...c.history,{at:stamp(),text:description}]}:c);if(!persist(next))return false;render();refreshCustomerAfterSale();return true;}
$('#notice-add').onclick=()=>openNotice();$('#notice-close').onclick=closeNotice;$('#notice-dialog').addEventListener('cancel',e=>{e.preventDefault();closeNotice()});
$('#notice-form').onsubmit=e=>{e.preventDefault();const f=e.currentTarget,cid=f.elements.noticeCustomer.value,c=customers.find(c=>c.id===cid),previous=c?.legalNotices?.find(n=>n.id===noticeId);if(!c)return;try{if(noticeId&&(!previous||previous.void))throw Error('通知の状態を確認してください。');const n={id:previous?.id||'NT-'+crypto.randomUUID(),void:false,memo:f.elements.noticeMemo.value.trim()};for(const k of fields)n[k]=f.elements[k].value.trim();O.validateNotice(n);
 const desc=`通知${previous?'訂正・確認':'受領'}：${O.noticeKinds[n.kind]} / ${n.receivedDate} / ${n.verification==='verified'?'内容確認済み':'内容確認待ち'} / 記録者 ${n.recorder} / ${n.source} / ${n.memo}`+(previous?'\n変更前：'+JSON.stringify({kind:previous.kind,date:previous.receivedDate,verification:previous.verification,source:previous.source,memo:previous.memo,recorder:previous.recorder}):'');
 if(saveNotice(cid,n,desc)){$('#notice-dialog').close();notify('通知を記録しました。審査結果は変更せず、責任者確認の対象にしました。');}
 }catch(err){$('#notice-error').textContent=err.message;}};
$('#notice-list').onclick=e=>{const cb=e.target.closest('[data-notice-customer]');if(cb){openCustomer(cb.dataset.noticeCustomer);return;}const b=e.target.closest('[data-notice-edit],[data-notice-toggle]');if(!b)return;const cid=b.dataset.cid,id=b.dataset.noticeEdit||b.dataset.noticeToggle;if(b.dataset.noticeEdit){openNotice(cid,id);return;}const c=customers.find(c=>c.id===cid),n=c.legalNotices.find(n=>n.id===id);action={cid,id};$('#notice-action-form').reset();$('#notice-action-title').textContent=n.void?'通知を復元':'誤登録の通知を取消';$('#notice-action-description').textContent=`${c.name} / ${O.noticeKinds[n.kind]}：${n.void?'通知履歴と責任者確認の対象へ戻します。':'履歴を残して有効な通知数から除外します。他に通知があれば責任者確認は継続します。'}`;$('#notice-action-error').textContent='';$('#notice-action-dialog').showModal();};
$('#notice-action-close').onclick=()=>$('#notice-action-dialog').close();
$('#notice-action-form').onsubmit=e=>{e.preventDefault();const f=e.currentTarget,c=customers.find(c=>c.id===action?.cid),n=c?.legalNotices.find(n=>n.id===action.id);if(!n)return;const actor=f.elements.actor.value.trim(),reason=f.elements.reason.value.trim();if(!actor||!reason){$('#notice-action-error').textContent='担当者と理由を入力してください。';return;}if(saveNotice(c.id,{...n,void:!n.void},`通知${n.void?'復元':'取消'}：${O.noticeKinds[n.kind]} / 担当 ${actor} / 理由 ${reason}`)){$('#notice-action-dialog').close();notify('通知の履歴と集計を更新しました。');}};
$('#notice-search').oninput=renderNotices;$('#notice-filter').onchange=renderNotices;
$('#ops-manual-toggle').onclick=()=>{const e=$('#manual-details');e.open=!e.open;setNav(e.open?'all':'ops-nav');if(e.open)e.scrollIntoView({behavior:'smooth'})};
$('#manual-details').addEventListener('toggle',()=>{const opened=$('#manual-details').open;$('#ops-view-label').textContent=opened?'手動操作窓口を表示中':'ダッシュボード表示中';$('#ops-manual-toggle').textContent=opened?'手動管理を閉じる':'手動管理を開く'});
$('#ops-nav').onclick=()=>{setNav('ops-nav');$('#ops-dashboard').scrollIntoView({behavior:'smooth'})};$('#fc-nav').onclick=()=>{setNav('fc-nav');openSection('analytics-details')};$('#notice-nav').onclick=()=>{setNav('notice-nav');openSection('notices-details')};$('#sales-nav').onclick=()=>{setNav('sales-nav');openSection('legacy-details');renderSales()};
$('#legacy-details').addEventListener('toggle',()=>{if($('#legacy-details').open)renderSales()});
document.querySelectorAll('[data-view]').forEach(b=>b.onclick=()=>{openManual();setNav(b.dataset.view);setView(b.dataset.view);$('.customer-panel').scrollIntoView({behavior:'smooth'})});
document.querySelectorAll('[data-ops-period]').forEach(b=>b.onclick=()=>{mode=b.dataset.opsPeriod;renderOps()});
$('#ops-date').value=anchor;$('#ops-date').onchange=e=>{try{F.parse(e.target.value);if(e.target.value<'2000-01-01'||e.target.value>today())throw Error();anchor=e.target.value;renderOps()}catch{e.target.value=anchor;notify('基準日は2000年以降、今日までで指定してください。')}};
const move=d=>{const next=F.shift(mode,anchor,d);anchor=next>today()?today():next<'2000-01-01'?'2000-01-01':next;renderOps()};$('#ops-prev').onclick=()=>move(-1);$('#ops-next').onclick=()=>move(1);$('#ops-today').onclick=()=>{anchor=today();renderOps()};
window.addEventListener('crm-render',renderOps);window.addEventListener('crm-customer-open',refreshCustomerAlert);window.addEventListener('crm-case-open',e=>{caseContext=e.detail.id;refreshCaseGate()});
for(const k of ['status','customer'])$('#fc-form').elements[k].addEventListener('change',()=>{$('#fc-form').elements.reviewAck.checked=false;refreshCaseGate()});
let resizeTimer;window.addEventListener('resize',()=>{clearTimeout(resizeTimer);resizeTimer=setTimeout(renderOps,150)});
renderOps();
})();
