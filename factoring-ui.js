'use strict';
(()=>{
const C=window.CRMFactoring;const pct=x=>x===null?'—':(x*100).toFixed(1)+'%';
let edit=null,receiptEdit=null,clean='',caseFilter='all',activeRange={start:'',end:''};
const flatten=()=>customers.flatMap(c=>(c.factoringCases||[]).map(a=>({...a,customerId:c.id,customerName:c.name})));
const find=id=>flatten().find(c=>c.id===id);
const opts=()=>({...activeRange,asOf:today(),scope:$('#fc-scope').value});
const metric=(name,value,note='')=>`<div><span>${name}</span><strong>${value}</strong><small>${note}</small></div>`;
const bar=(label,value,note,kind='')=>`<div class="fc-bar"><div><strong>${label}</strong><span>${value===null?'対象なし':pct(value)}</span></div><div class="fc-track ${kind}" role="img" aria-label="${esc(label)} ${value===null?'対象なし':pct(value)}"><i style="width:${value===null?0:Math.max(0,Math.min(100,value*100))}%"></i></div><small>${note}</small></div>`;
function renderFactoring(){
 const rows=flatten(),o=opts(),s=C.analyze(rows,o),r=s.recovery;
 $('#fc-kpis').innerHTML=metric('申込案件数',s.cases+'件','取消を除く')+metric('申込顧客数',s.customers+'人','同一顧客の重複を除く')+metric('審査済件数',(s.approved+s.rejected)+'件',new Set(s.cohort.filter(c=>['approved','rejected','purchased'].includes(c.status)).map(c=>c.customerId)).size+'顧客 / 進行中 '+s.pending+'件')+metric('否決数',s.rejected+'件',s.rejectedCustomers+'人 / 否決率 '+pct(s.rejectionRate))+metric('承認数',s.approved+'件','買取済を含む / 取下げ '+s.withdrawn+'件')+metric('実行買取額',yen(s.purchaseTotal),s.purchaseCount+'件・先払い額合計');
 $('#fc-recovery').innerHTML=metric('弁済率（金額）',pct(r.rate),yen(r.collected)+' / '+yen(r.expected))+metric('対象の未回収額',yen(r.remaining),r.count+'案件 / '+r.customers+'顧客')+metric('延滞残額',yen(r.overdue),r.overdueCount+'件・期日が昨日以前')+metric('期限前の未回収額',yen(r.future),'延滞には含めません');
 $('#fc-status-caption').textContent=`${o.start||'開始日指定なし'} 〜 ${o.end||'終了日指定なし'}に申し込んだ案件の、現在の審査状況・${today()}時点の入金を集計。`;
 $('#fc-rate-caption').textContent=(o.scope==='due'?'期日が今日以前の買取済案件':'期限前も含む全買取済案件')+'が対象。弁済率＝回収済額 ÷ 請求書額面（回収予定額）。対象0円は「—」。';
 $('#fc-rate-extra').textContent=`完済案件率 ${pct(r.caseRate)}（${r.settled}/${r.count}件） ／ 完済顧客率 ${pct(r.customerRate)}（${r.settledCustomers}/${r.customers}人）。顧客率は対象案件をすべて回収済みの顧客の割合です。`;
 $('#fc-bars').innerHTML=s.bands.map(b=>bar(b.label,b.recovery.rate,`${b.purchaseCount}件の買取 / 対象 ${yen(b.recovery.expected)}・回収 ${yen(b.recovery.collected)}`)).join('');
 $('#fc-band-rows').innerHTML=s.bands.map(b=>`<tr><th scope="row">${b.label}</th><td>${b.purchaseCount}</td><td>${yen(b.purchaseTotal)}</td><td>${yen(b.recovery.expected)}</td><td>${yen(b.recovery.collected)}</td><td>${pct(b.recovery.rate)}</td><td>${yen(b.recovery.overdue)}</td></tr>`).join('');
 $('#fc-review-rows').innerHTML=s.bands.map(b=>`<tr><th scope="row">${b.label}</th><td>${b.review.cases}</td><td>${b.review.customers}</td><td>${b.review.approved}</td><td>${b.review.rejected}</td><td>${pct(b.review.approved+b.review.rejected?b.review.rejected/(b.review.approved+b.review.rejected):null)}</td></tr>`).join('');
 const reasons=new Map();for(const c of s.cohort.filter(c=>c.status==='rejected'))reasons.set(c.reason,(reasons.get(c.reason)||0)+1);
 $('#fc-reasons').innerHTML=reasons.size?[...reasons].map(([k,v])=>`<span class="fc-tag">${esc(k)}：${v}件</span>`).join(''):'否決案件はありません。';
 $('#fc-customers').innerHTML=customers.filter(c=>s.cohort.some(a=>a.customerId===c.id)).map(c=>{const a=C.analyze(s.cohort.filter(a=>a.customerId===c.id),o);return `<tr><th scope="row">${esc(c.name)}</th><td>${a.cases}</td><td>${a.rejected}</td><td>${yen(a.purchaseTotal)}</td><td>${pct(a.recovery.rate)}</td><td>${yen(a.recovery.overdue)}</td><td>${yen(a.expectedMargin)}</td></tr>`}).join('')||'<tr><td colspan="7">該当する顧客はいません。</td></tr>';
 const q=$('#fc-search').value.trim().toLowerCase();
 const shown=rows.filter(c=>(!o.start||c.applicationDate>=o.start)&&(!o.end||c.applicationDate<=o.end)&&(!q||[c.customerName,c.id,c.reference,c.debtor,c.reason].join(' ').toLowerCase().includes(q))&&(caseFilter==='void'?c.void:!c.void&&(caseFilter==='all'||caseFilter==='late'&&C.state(c).startsWith('延滞')||c.status===caseFilter)));
 $('#fc-case-count').textContent=shown.length+'件表示';
 $('#fc-cases').innerHTML=shown.length?shown.sort((a,b)=>b.applicationDate.localeCompare(a.applicationDate)).map(c=>`<button class="fc-case" data-case="${esc(c.id)}"><div><strong>${esc(c.customerName)}</strong><span class="fc-tag ${C.state(c).startsWith('延滞')?'fc-alert':''}">${esc(C.state(c))}</span></div>${window.CRMOperations.activeNotices(customers.find(x=>x.id===c.customerId)).length?'<span class="fc-tag fc-alert">通知あり・責任者確認</span>':''}<small>${esc(c.id)} · ${esc(c.reference||'請求書番号未入力')}</small><p>希望 ${yen(c.requestedAmount)}${c.status==='purchased'?' / 買取 '+yen(c.purchaseAmount):''}</p>${c.status==='purchased'?`<small>回収 ${yen(C.paid(c))} / ${yen(c.invoiceAmount)} · 期日 ${esc(c.dueDate)}</small>`:`<small>申込 ${esc(c.applicationDate)}${c.status==='rejected'?' · '+esc(c.reason):''}</small>`}<span class="fc-open">詳細・審査・入金 →</span></button>`).join(''):'<p class="empty">案件はありません。「申込を登録」から追加できます。</p>';
 $('#fc-load-demo').hidden=rows.length>0;
}
async function update(id,next,text){
 const customer=customers.find(c=>(c.factoringCases||[]).some(a=>a.id===id))||customers.find(c=>c.id===next.customerId);if(!customer)return false;
 const exists=(customer.factoringCases||[]).find(a=>a.id===id);const record={...next,history:[...(exists?.history||[]),{at:stamp(),text}]};delete record.customerName;delete record.customerId;
 const entries=exists?customer.factoringCases.map(a=>a.id===id?record:a):[...(customer.factoringCases||[]),record];
 if(!await persist(customers.map(c=>c.id===customer.id?{...c,factoringCases:entries,history:[...c.history,{at:stamp(),text:'案件 '+id+'：'+text}]}:c)))return false;
 render();refreshCustomerAfterSale();return true;
}
function snapshot(){return JSON.stringify([...new FormData($('#fc-form')).entries()])}
function syncFields(){const p=$('#fc-form').elements.status.value;$('#fc-purchase-fields').hidden=p!=='purchased';$('#fc-decision-fields').hidden=!['approved','rejected','purchased'].includes(p);$('#fc-reason-label').hidden=p!=='rejected';for(const n of ['purchaseAmount','purchaseDate','dueDate'])$('#fc-form').elements[n].required=p==='purchased';$('#fc-form').elements.decisionDate.required=['approved','rejected','purchased'].includes(p);$('#fc-form').elements.reason.required=p==='rejected';for(const n of ['purchaseAmount','purchaseDate','dueDate','cost'])$('#fc-form').elements[n].disabled=p!=='purchased';$('#fc-form').elements.decisionDate.disabled=!['approved','rejected','purchased'].includes(p);$('#fc-form').elements.reason.disabled=p!=='rejected';}
function openCase(id=null,customerId=''){
 edit=id;receiptEdit=null;const c=id?find(id):null;const f=$('#fc-form');f.reset();$('#fc-error').textContent='';$('#fc-receipt-error').textContent='';
 f.elements.customer.innerHTML=customers.map(c=>`<option value="${esc(c.id)}">${esc(c.name)} · ${esc(c.id)}</option>`).join('');f.elements.customer.disabled=!!c;
 if(c||customerId)f.elements.customer.value=c?.customerId||customerId;
 for(const k of ['reference','debtor','status','decisionDate','invoiceAmount','requestedAmount','purchaseAmount','cost','purchaseDate','dueDate','reason','memo'])f.elements[k].value=c?.[k]??({status:'received',cost:0,purchaseAmount:0}[k]??'');
 f.elements.applicationDate.value=c?.applicationDate||today();
 for(const n of ['applicationDate','decisionDate','purchaseDate'])f.elements[n].max=today();
 $('#fc-dialog-title').textContent=c?c.id+' · '+C.state(c):'申込案件を登録';
 $('#fc-form-fields').disabled=!!c?.void;$('#fc-save').hidden=!!c?.void;
 $('#fc-toggle').hidden=!c;$('#fc-toggle').textContent=c?.void?'この案件を復元':'この案件を取消';
 syncFields();renderReceipts(c);window.dispatchEvent(new CustomEvent('crm-case-open',{detail:{id,customerId:f.elements.customer.value}}));clean=snapshot();if(!$('#fc-dialog').open)$('#fc-dialog').showModal();
}
function closeCase(){if((snapshot()!==clean||$('#fc-receipt-form').elements.amount.value||$('#fc-receipt-form').elements.memo.value)&&!confirm('保存していない入力を破棄して閉じますか？'))return;$('#fc-dialog').close();edit=null;}
function renderReceipts(c){
 const f=$('#fc-receipt-form');f.reset();f.elements.date.value=today();f.elements.date.max=today();f.elements.date.min=c?.purchaseDate||'2000-01-01';receiptEdit=null;$('#fc-receipt-save').textContent='入金を保存';
 $('#fc-receipt-section').hidden=!c||c.status!=='purchased'||c.void;
 $('#fc-receipt-summary').textContent=c?`回収済 ${yen(C.paid(c))} / 予定 ${yen(c.invoiceAmount)}（請求書額面）`:'';
 $('#fc-receipts').innerHTML=(c?.receipts||[]).map(r=>`<article class="transaction ${r.void?'void':''}"><strong>${esc(r.date)} · ${yen(r.amount)}</strong><p>${esc(r.memo)} ${r.void?'（取消済）':''}</p><div class="transaction-actions">${!r.void?`<button data-receipt-edit="${esc(r.id)}">編集</button>`:''}<button data-receipt-toggle="${esc(r.id)}">${r.void?'復元':'取消'}</button></div></article>`).join('');
 $('#fc-history').innerHTML=(c?.history||[]).slice().reverse().map(h=>`<p><small>${esc(timeLabel(h.at))}</small><br>${esc(h.text)}</p>`).join('')||'保存すると変更履歴が残ります。';
}
$('#fc-add').onclick=()=>openCase();$('#fc-close').onclick=closeCase;$('#fc-dialog').addEventListener('cancel',e=>{e.preventDefault();closeCase()});
$('#fc-nav').onclick=()=>$('#factoring-panel').scrollIntoView({behavior:'smooth'});
$('#fc-cases').onclick=e=>{const b=e.target.closest('[data-case]');if(b)openCase(b.dataset.case)};
$('#fc-form').elements.status.onchange=syncFields;
$('#fc-form').onsubmit=async e=>{e.preventDefault();const f=e.currentTarget;const c=edit?find(edit):null;
 try{
 const next={...(c||{}),id:c?.id||'FC-'+crypto.randomUUID().slice(0,8),customerId:f.elements.customer.value,void:false,receipts:c?.receipts||[]};
 for(const k of ['reference','debtor','status','decisionDate','applicationDate','purchaseDate','dueDate','reason','memo'])next[k]=f.elements[k].value.trim();
 for(const k of ['invoiceAmount','requestedAmount','purchaseAmount','cost'])next[k]=F.amount(f.elements[k].value||'0');
 if(c?.status==='purchased'&&next.status!=='purchased')throw Error('買取済の審査履歴は巻き戻せません。誤登録は案件取消で除外してください。');
 if(next.status!=='purchased'){next.purchaseAmount=0;next.cost=0;next.purchaseDate='';next.dueDate='';}
 if(!['approved','rejected','purchased'].includes(next.status))next.decisionDate='';if(next.status!=='rejected')next.reason='';
 const selectedCustomer=customers.find(c=>c.id===next.customerId);if(!selectedCustomer)throw Error('顧客を選択してください。');const review=window.CRMOperations.decisionGuard(selectedCustomer,c,next,{ack:f.elements.reviewAck.checked,reviewer:f.elements.reviewer.value,reason:f.elements.reviewReason.value});if(review)next.noticeReview=review;C.validate(next);
 const desc=`${C.labels[next.status]} / 希望 ${yen(next.requestedAmount)} / 買取 ${yen(next.purchaseAmount)} / 額面 ${yen(next.invoiceAmount)} / 費用 ${yen(next.cost)} / 申込 ${next.applicationDate} / 審査 ${next.decisionDate||'未設定'} / 買取日 ${next.purchaseDate||'未設定'} / 期日 ${next.dueDate||'未設定'}`;
 if(await update(next.id,next,(c?'更新':'登録')+'：'+desc+(review?'\n責任者確認：'+review.reviewer+' / '+review.reason:'')+(c?'\n変更前：'+JSON.stringify({status:c.status,requestedAmount:c.requestedAmount,purchaseAmount:c.purchaseAmount,invoiceAmount:c.invoiceAmount,cost:c.cost,applicationDate:c.applicationDate,decisionDate:c.decisionDate,purchaseDate:c.purchaseDate,dueDate:c.dueDate,reference:c.reference,debtor:c.debtor,reason:c.reason,memo:c.memo}):''))){openCase(next.id);notify('案件を保存し、審査・買取・弁済集計を更新しました。');}
 }catch(err){$('#fc-error').textContent=err.message;}
};
$('#fc-toggle').onclick=async ()=>{const c=find(edit);if(!c||!confirm(c.void?'案件を復元して集計に戻しますか？':'案件を取消して集計から除外しますか？ 入金履歴は残り、復元できます。'))return;const next={...c,void:!c.void};try{C.validate(next);if(await update(c.id,next,next.void?'案件を取消（入金履歴を保持）':'案件を復元'))openCase(c.id);}catch(err){$('#fc-error').textContent=err.message;}};
$('#fc-receipt-form').onsubmit=async e=>{e.preventDefault();const c=find(edit),f=e.currentTarget;if(!c||c.void||c.status!=='purchased')return;try{
 const prior=c.receipts.find(r=>r.id===receiptEdit);const r={id:prior?.id||'RC-'+crypto.randomUUID(),date:f.elements.date.value,amount:F.amount(f.elements.amount.value),memo:f.elements.memo.value.trim(),void:false};
 const next={...c,receipts:prior?c.receipts.map(x=>x.id===r.id?r:x):[...c.receipts,r]};C.validate(next);
 if(await update(c.id,next,`${prior?'入金編集':'入金登録'}：${r.date} / ${yen(r.amount)}${prior?'（変更前 '+prior.date+' / '+yen(prior.amount)+'）':''}`)){renderReceipts(find(c.id));$('#fc-dialog-title').textContent=c.id+' · '+C.state(find(c.id));$('#fc-receipt-error').textContent='';notify('入金を保存しました。');}
 }catch(err){$('#fc-receipt-error').textContent=err.message;}
};
$('#fc-receipts').onclick=async e=>{const c=find(edit),b=e.target.closest('[data-receipt-edit],[data-receipt-toggle]');if(!b||!c)return;const id=b.dataset.receiptEdit||b.dataset.receiptToggle,r=c.receipts.find(r=>r.id===id);if(!r)return;
 if(b.dataset.receiptEdit){if(r.bankRowId){notify('銀行照合から登録した入金は、取消してから入金照合でやり直してください。');return;}receiptEdit=id;const f=$('#fc-receipt-form');for(const k of ['date','amount','memo'])f.elements[k].value=r[k];$('#fc-receipt-save').textContent='入金の変更を保存';f.scrollIntoView({block:'nearest',behavior:'smooth'});return;}
 if(!confirm(r.void?'この入金を復元しますか？':'この入金を取消しますか？ 記録は残ります。'))return;
 const next={...c,receipts:c.receipts.map(x=>x.id===id?{...x,void:!x.void}:x)};try{C.validate(next);if(await update(c.id,next,`入金${r.void?'復元':'取消'}：${r.date} / ${yen(r.amount)}`)){renderReceipts(find(c.id));$('#fc-dialog-title').textContent=c.id+' · '+C.state(find(c.id));$('#fc-receipt-error').textContent='';}}catch(err){$('#fc-receipt-error').textContent=err.message;}
};
$('#fc-receipt-cancel').onclick=()=>{renderReceipts(find(edit));$('#fc-receipt-error').textContent='';};
function rangeChange(){const o={start:$('#fc-from').value,end:$('#fc-to').value};try{for(const value of [o.start,o.end])if(value){F.parse(value);if(value<'2000-01-01')throw Error();}}catch{$('#fc-range-error').textContent='2000年以降の有効な日付を指定してください。';return;}if(o.start&&o.end&&o.start>o.end){$('#fc-range-error').textContent='開始日は終了日以前にしてください。';return;}if(o.start>today()||o.end>today()){$('#fc-range-error').textContent='今日までの日付を指定してください。';return;}$('#fc-range-error').textContent='';activeRange=o;renderFactoring();}
for(const id of ['fc-from','fc-to']){$('#'+id).max=today();$('#'+id).onchange=rangeChange;}
$('#fc-scope').onchange=rangeChange;$('#fc-search').oninput=renderFactoring;$('#fc-status-filter').onchange=e=>{caseFilter=e.target.value;renderFactoring()};
$('#fc-all-time').onclick=()=>{$('#fc-from').value='';$('#fc-to').value='';rangeChange()};
$('#fc-this-month').onclick=()=>{$('#fc-from').value=F.range('month',today()).start;$('#fc-to').value=today();rangeChange()};
$('#fc-load-demo').onclick=async ()=>{if(flatten().length||!confirm('既存顧客・取引はそのままに、サンプル顧客へ架空の審査・入金案件を追加しますか？'))return;const next=C.seed(customers);if(!next.some(c=>c.factoringCases.length)){notify('対応するサンプル顧客がいません。申込を登録してお試しください。');return;}if(await persist(next)){render();notify('架空の審査サンプルを追加しました。');}};
window.addEventListener('crm-render',renderFactoring);
window.addEventListener('crm-open-case',e=>{if(find(e.detail.id))openCase(e.detail.id)});
renderFactoring();
})();
