'use strict';
const F=window.CRMFinance;
const yen=n=>new Intl.NumberFormat('ja-JP',{style:'currency',currency:'JPY',maximumFractionDigits:0}).format(n);
let reportMode='day',reportAnchor=F.today(),saleEditId=null,saleCleanState='';
const KEY='osanai-line-crm-demo-v1';
const labels={new:'未対応',active:'対応中',waiting:'お客様の返信待ち',done:'完了'};
const $=s=>document.querySelector(s);
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const dateOffset=(n=0)=>F.addDays(F.today(),n);
const stamp=()=>new Date().toISOString();
const today=()=>dateOffset();
const timeLabel=s=>new Intl.DateTimeFormat('ja-JP',{month:'short',day:'numeric',hour:'2-digit',minute:'2-digit',timeZone:'Asia/Tokyo'}).format(new Date(s));
function seed(){const base=[
 {id:'DEMO-001',name:'青木（サンプル）',status:'new',owner:'',due:today(),next:'お問い合わせ内容を確認する',message:'サービスについて詳しく知りたいです。',created:stamp(),history:[{at:stamp(),text:'LINEから初回のお問い合わせを受信（デモ）'}]},
 {id:'DEMO-002',name:'佐藤（サンプル）',status:'active',owner:'自分',due:dateOffset(-1),next:'ご希望の条件を確認する',message:'先ほど相談した件、条件を教えてください。',created:stamp(),history:[{at:stamp(),text:'ご希望の条件を確認中（サンプル記録）'}]},
 {id:'DEMO-003',name:'高橋（サンプル）',status:'waiting',owner:'担当A',due:dateOffset(1),next:'ご返信があるか確認する',message:'内容を確認して、改めてご連絡します。',created:stamp(),history:[{at:stamp(),text:'ご案内済み。お客様の返信待ち（サンプル記録）'}]},
 {id:'DEMO-004',name:'伊藤（サンプル）',status:'new',owner:'',due:'',next:'',message:'初めて利用します。相談はできますか？',created:stamp(),history:[{at:stamp(),text:'LINEから初回のお問い合わせを受信（デモ）'}]},
 {id:'DEMO-005',name:'田中（サンプル）',status:'done',owner:'担当B',due:'',next:'',message:'ご案内ありがとうございました。',created:stamp(),history:[{at:stamp(),text:'お問い合わせへの対応を完了（サンプル記録）'}]},
 {id:'DEMO-006',name:'渡辺（サンプル）',status:'active',owner:'自分',due:today(),next:'次のご案内を準備する',message:'次はどのように進めればよいですか？',created:stamp(),history:[{at:stamp(),text:'進め方の案内を準備中（サンプル記録）'}]}
];return window.CRMFactoring.seed(seedTransactions(base))}
let customers;let loadError=false;
try{const raw=localStorage.getItem(KEY);customers=raw?JSON.parse(raw):seed();if(!Array.isArray(customers)||!customers.every(c=>c&&typeof c.id==='string'&&typeof c.name==='string'&&Object.hasOwn(labels,c.status)&&typeof c.owner==='string'&&typeof c.due==='string'&&typeof c.next==='string'&&Array.isArray(c.history)&&c.history.every(h=>typeof h.text==='string'&&Number.isFinite(Date.parse(h.at)))))throw Error('Invalid demo data');customers=customers.map(c=>({...c,transactions:c.transactions??[],factoringCases:c.factoringCases??[]}));if(!customers.every(c=>Array.isArray(c.transactions)&&c.transactions.every(t=>typeof t.id==='string'&&Number.isSafeInteger(t.revenue)&&Number.isSafeInteger(t.cost)&&(()=>{try{F.validate(t,'9999-12-31');return true}catch{return false}})())))throw Error('Invalid transaction data');if(!customers.every(c=>Array.isArray(c.factoringCases)&&c.factoringCases.every(a=>{try{window.CRMFactoring.validate(a,'9999-12-31');return true}catch{return false}})))throw Error('Invalid factoring data');}catch{customers=seed();loadError=true;}
let quick='';let selectedId=null;let toastTimer;let cleanState='';
function notify(t){$('#toast').textContent=t;clearTimeout(toastTimer);toastTimer=setTimeout(()=>{$('#toast').textContent=''},4500)}
function persist(next){try{localStorage.setItem(KEY,JSON.stringify(next));customers=next;return true}catch{notify('保存できませんでした。ブラウザの保存設定をご確認ください。');return false}}
const dueNow=c=>c.status!=='done'&&c.due&&c.due<=today();
function render(){
 const counts={new:customers.filter(c=>c.status==='new').length,active:customers.filter(c=>c.status==='active').length,due:customers.filter(dueNow).length,unassigned:customers.filter(c=>!c.owner&&c.status!=='done').length};
 for(const [key,n]of Object.entries(counts))$('#count-'+key).textContent=n;
 const query=$('#search').value.trim().toLocaleLowerCase();const status=$('#status-filter').value;const owner=$('#owner-filter').value;
 const rows=customers.filter(c=>(status==='all'||c.status===status)&&(owner==='all'||c.owner===owner)&&(!quick||quick==='due'&&dueNow(c)||quick==='unassigned'&&!c.owner&&c.status!=='done')&&(!query||[c.name,c.id,c.next,...c.history.map(h=>h.text)].join(' ').toLocaleLowerCase().includes(query)));
 rows.sort((a,b)=>Number(dueNow(b))-Number(dueNow(a))||(a.due||'9999').localeCompare(b.due||'9999')||Number(b.status==='new')-Number(a.status==='new'));
 $('#result-count').textContent=rows.length+'件 / 全'+customers.length+'件';$('#list-title').textContent=quick==='due'?'今日までの対応予定':quick==='unassigned'?'担当者がいないお客様':'顧客一覧';
 $('#today-label').textContent=new Intl.DateTimeFormat('ja-JP',{month:'long',day:'numeric',weekday:'short',timeZone:'Asia/Tokyo'}).format(new Date());
 $('#quick-filter').hidden=!quick;$('#quick-filter span').textContent=quick==='due'?'今日・期限超過の予定を表示（完了は除く）':'担当者なしを表示（完了は除く）';
 document.querySelectorAll('[data-metric]').forEach(b=>b.setAttribute('aria-pressed',String(['due','unassigned'].includes(b.dataset.metric)?quick===b.dataset.metric:!quick&&status===b.dataset.metric)));
 document.querySelectorAll('[data-view]').forEach(b=>b.classList.toggle('selected',b.dataset.view===(quick==='due'?'due':'all')));
 $('#customer-list').innerHTML=rows.length?rows.map(c=>`<button class="customer-row" data-customer="${esc(c.id)}" aria-label="${esc(c.name)}の顧客詳細を開く"><span class="customer-name"><span class="avatar" aria-hidden="true">${esc(c.name.slice(0,1))}</span><span><strong>${esc(c.name)}</strong><small>${esc(c.id)} · LINE（デモ）</small></span></span><span class="status-cell"><span class="status ${esc(c.status)}">${esc(labels[c.status])}</span></span><span class="owner-cell">${esc(c.owner||'担当者なし')}</span><span class="money-cell"><span>売上 ${yen(customerTotals(c).revenue)}</span><strong class="${customerTotals(c).profit<0?'negative':''}">利益 ${yen(customerTotals(c).profit)}</strong></span><span class="next-cell"><strong>${esc(c.status==='done'?'対応完了':c.next||'次の対応を設定')}</strong><span class="due-date ${c.status!=='done'&&c.due&&c.due<today()?'overdue':''}">${esc(c.status==='done'?'予定なし':c.due?(c.due<today()?'期限超過 · ':c.due===today()?'今日 · ':'')+c.due.replaceAll('-','/'):'日付未設定')}</span></span><span class="row-arrow" aria-hidden="true">›</span></button>`).join(''):'<div class="empty"><strong>該当するお客様はいません</strong>検索条件や対応状況を変更してください。</div>';
 renderSales();window.dispatchEvent(new Event('crm-render'));
}
function formState(){return JSON.stringify([...new FormData($('#customer-form')).entries()])}
function openCustomer(id){const c=customers.find(c=>c.id===id);if(!c)return;selectedId=id;
 $('#customer-heading').innerHTML=`<span class="avatar" aria-hidden="true">${esc(c.name.slice(0,1))}</span><div><h2 id="detail-title">${esc(c.name)}</h2><small>${esc(c.id)} · LINE流入（デモ）</small></div>`;
 $('#customer-message').innerHTML=`<small>最初のお問い合わせ · サンプル</small><p>${esc(c.message)}</p>`;
 const form=$('#customer-form');for(const k of ['status','owner','due','next'])form.elements[k].value=c[k];form.elements.note.value='';
 $('#timeline').innerHTML=[...c.history].reverse().map(h=>`<div class="event"><small>${esc(timeLabel(h.at))}</small><p>${esc(h.text)}</p></div>`).join('');
 renderCustomerFinance(c);cleanState=formState();if(!$('#detail').open)$('#detail').showModal();
}
function closeDetail(){if(formState()!==cleanState&&!confirm('保存していない変更を破棄して閉じますか？'))return;$('#detail').close();selectedId=null;}
$('#close-detail').onclick=closeDetail;$('#detail').addEventListener('cancel',e=>{e.preventDefault();closeDetail()});
$('#customer-list').addEventListener('click',e=>{const row=e.target.closest('[data-customer]');if(row)openCustomer(row.dataset.customer)});
$('#customer-form').addEventListener('submit',e=>{e.preventDefault();const c=customers.find(c=>c.id===selectedId);if(!c)return;const form=e.currentTarget;const status=form.elements.status.value;const owner=form.elements.owner.value;const due=form.elements.due.value;const next=form.elements.next.value.trim();const note=form.elements.note.value.trim();
 if(status!=='done'&&Boolean(due)!==Boolean(next)){notify('次回対応日と「次にすること」はセットで入力してください。');(due?form.elements.next:form.elements.due).focus();return;}
 if(!(status in labels))return;const changes=[];if(c.status!==status)changes.push('対応状況：'+labels[c.status]+' → '+labels[status]);if(c.owner!==owner)changes.push('担当者：'+(owner||'担当者なし'));
 const newDue=status==='done'?'':due,newNext=status==='done'?'':next;
 if(c.due!==newDue||c.next!==newNext)changes.push(newDue?'次回対応：'+newDue+' / '+newNext:'次回対応の予定を解除');
 if(note)changes.push('メモ：'+note);if(!changes.length){notify('変更はありません。');return;}
 const updated={...c,status,owner,due:newDue,next:newNext,history:[...c.history,{at:stamp(),text:changes.join('\n')}]};if(!persist(customers.map(item=>item.id===c.id?updated:item)))return;render();openCustomer(c.id);notify('変更を保存しました。お客様への送信はありません。');
});
for(const name of ['search','status-filter','owner-filter'])$('#'+name).addEventListener(name==='search'?'input':'change',render);
function setView(view){quick=['due','unassigned'].includes(view)?view:'';$('#status-filter').value=['new','active'].includes(view)?view:'all';$('#owner-filter').value='all';$('#search').value='';render()}
document.querySelectorAll('[data-metric]').forEach(b=>b.onclick=()=>setView(b.dataset.metric));document.querySelectorAll('[data-view]').forEach(b=>b.onclick=()=>{setView(b.dataset.view);$('.customer-panel').scrollIntoView({behavior:'smooth',block:'start'})});$('#clear-filter').onclick=()=>setView('all');
$('#simulate').onclick=()=>{const number=Math.max(0,...customers.map(c=>Number(c.id.replace('DEMO-',''))||0))+1;const id='DEMO-'+String(number).padStart(3,'0');const c={id,name:'新しいお客様（サンプル）',transactions:[],status:'new',owner:'',due:'',next:'',message:'はじめまして。サービスについて相談したいです。',created:stamp(),history:[{at:stamp(),text:'LINEから初回のお問い合わせを受信（デモ操作）'}]};if(!persist([c,...customers]))return;setView('new');openCustomer(id);notify('架空のお客様を追加しました。LINEには接続していません。');};
$('#reset').onclick=()=>{if(!confirm('このブラウザのデモ顧客・取引・審査案件・入金・変更履歴を消して、最初のサンプルに戻しますか？'))return;if(persist(seed())){reportAnchor=F.today();$('#report-date').value=reportAnchor;setView('all');notify('デモを最初の状態に戻しました。')}};
$('#help').onclick=()=>$('#help-dialog').showModal();$('#close-help').onclick=()=>$('#help-dialog').close();
window.addEventListener('storage',e=>{if(e.key===KEY)notify('別のタブでデモが更新されました。再読み込みすると反映されます。')});
initFinance();render();if(loadError)notify('保存データを読み込めなかったため、初期サンプルを表示しています。');

function seedTransactions(base){
 const specs=[['DEMO-002',0,38000,12000],['DEMO-005',0,24000,8000],['DEMO-006',-1,32000,11000],['DEMO-003',-3,18000,4000],['DEMO-005',-6,46000,16000],['DEMO-002',-8,22000,6000],['DEMO-006',-13,15000,18000],['DEMO-005',-20,52000,19000],['DEMO-003',-32,27000,8000],['DEMO-002',-60,36000,14000],['DEMO-005',-90,42000,16000]];
 return base.map(c=>({...c,transactions:specs.flatMap(([id,offset,revenue,cost],i)=>id===c.id?[{id:'TX-DEMO-'+String(i+1).padStart(3,'0'),date:dateOffset(offset),revenue,cost,status:'posted',memo:'サンプル取引',created:stamp()}]:[])}));
}
function customerTotals(c){return F.sum(c.transactions||[])}
function allTransactions(){return customers.flatMap(c=>c.transactions||[])}
function periodText(p){return p.start===p.end?p.start.replaceAll('-','/'):`${p.start.replaceAll('-','/')} 〜 ${p.end.replaceAll('-','/')}`;}
function renderSales(){
 const range=F.range(reportMode,reportAnchor),total=F.sum(allTransactions(),range.start,range.end),series=F.series(allTransactions(),reportMode,reportAnchor);
 $('#period-label').textContent=periodText(range)+(reportMode==='week'?'（月曜〜日曜）':reportMode==='month'?'（暦月）':'')+' · 全顧客';
 for(const key of ['revenue','cost','profit'])$('#sales-'+key).textContent=yen(total[key]);$('#sales-profit').classList.toggle('negative',total.profit<0);$('#sales-count').textContent=total.count+'件';
 document.querySelectorAll('[data-period]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.period===reportMode)));
 $('#report-date').value=reportAnchor;$('#report-date').max=today();$('#period-next').disabled=F.range(reportMode,reportAnchor).end>=today();$('#period-prev').disabled=F.range(reportMode,reportAnchor).start<='2000-01-01';
 $('#chart-title').textContent={day:'日別の推移 · 7日間',week:'週別の推移 · 8週間',month:'月別の推移 · 6か月'}[reportMode];
 const max=Math.max(1,...series.flatMap(p=>[p.revenue,p.profit]));const min=Math.min(0,...series.map(p=>p.profit));const height=210,top=22,bottom=165;const y=v=>top+(max-v)/(max-min)*(bottom-top);const zero=y(0),w=Math.max(240,Math.min(760,$('#sales-chart').clientWidth||640)),left=50,right=8,step=(w-left-right)/series.length;
 const ticks=[max,0,...(min<0?[min]:[])];const compact=n=>Math.abs(n)>=10000?(Math.round(n/1000)/10)+'万':String(n);
 let svg=`<svg viewBox="0 0 ${w} ${height}" role="img" aria-label="${esc($('#chart-title').textContent)}。各期間の売上と利益。詳細は下の数値表でも確認できます。">`;
 for(const t of [...new Set(ticks)])svg+=`<line x1="${left}" y1="${y(t)}" x2="${w-right}" y2="${y(t)}" stroke="${t===0?'#9db2a6':'#e4ebe7'}"/><text x="${left-8}" y="${y(t)+4}" text-anchor="end" class="axis-label">${esc(compact(t))}円</text>`;
 series.forEach((p,i)=>{const x=left+i*step;const label=reportMode==='month'?Number(p.start.slice(5,7))+'月':Number(p.start.slice(5,7))+'/'+Number(p.start.slice(8,10));const bw=Math.min(22,step*.26);
 svg+=`<g class="chart-period" data-chart-period="${i}" role="button" tabindex="0" aria-label="${esc(periodText(p))}、売上${yen(p.revenue)}、利益${yen(p.profit)}"><title>${esc(periodText(p))} 売上 ${yen(p.revenue)} / 利益 ${yen(p.profit)}</title><rect x="${x+2}" y="5" width="${step-4}" height="195" rx="5" fill="transparent" class="chart-hit"/>`;
 for(const [j,key]of ['revenue','profit'].entries()){const v=p[key];svg+=`<rect x="${x+step/2+(j?3:-bw-3)}" y="${Math.min(y(v),zero)}" width="${bw}" height="${v===0?0:Math.max(.6,Math.abs(zero-y(v)))}" rx="2" fill="${key==='revenue'?'#237c60':v<0?'#bc593c':'#82bca0'}"/>`;}
 if(w>=420||reportMode!=='week'||i%2===0||i===series.length-1)svg+=`<text x="${x+step/2}" y="190" text-anchor="middle" class="axis-label">${esc(label)}</text>`;svg+='</g>';
 });$('#sales-chart').innerHTML=svg+'</svg>';
 $('#chart-table').innerHTML=series.map(p=>`<tr><th scope="row">${esc(periodText(p))}</th><td>${yen(p.revenue)}</td><td>${yen(p.cost)}</td><td class="${p.profit<0?'negative':''}">${yen(p.profit)}</td><td>${p.count}</td></tr>`).join('');
 const detail=p=>`${periodText(p)}：売上 ${yen(p.revenue)} / 費用 ${yen(p.cost)} / 利益 ${yen(p.profit)} / ${p.count}件`;
 $('#chart-detail').textContent=series.every(p=>p.count===0)?'この期間の取引はありません。売上を記録するとグラフに反映されます。':detail(series.at(-1));
 document.querySelectorAll('[data-chart-period]').forEach(g=>{const show=()=>{$('#chart-detail').textContent=detail(series[Number(g.dataset.chartPeriod)]);};g.onclick=show;g.onkeydown=e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();show()}}});
}
function renderCustomerFinance(c){const total=customerTotals(c);$('#customer-finance').innerHTML=`<div><span>累計売上</span><strong>${yen(total.revenue)}</strong></div><div><span>累計利益</span><strong class="${total.profit<0?'negative':''}">${yen(total.profit)}</strong></div><p>全期間・有効な取引 ${total.count}件 ／ 顧客ステータスとは独立して集計</p>`;
 const rows=[...(c.transactions||[])].sort((a,b)=>b.date.localeCompare(a.date));
 $('#customer-transactions').innerHTML=rows.length?rows.map(t=>`<article class="transaction ${t.status==='void'?'void':''}"><div class="transaction-meta"><strong>${esc(t.date.replaceAll('-','/'))}</strong><span>${t.status==='void'?'取消済み':'計上済み'}</span></div><div class="transaction-amounts"><span>売上 ${yen(t.revenue)}</span><span>費用 ${yen(t.cost)}</span><strong class="${t.revenue-t.cost<0?'negative':''}">利益 ${yen(t.revenue-t.cost)}</strong></div><p>${esc(t.memo||'メモなし')}</p><div class="transaction-actions">${t.status==='posted'?`<button type="button" data-edit-sale="${esc(t.id)}">編集</button>`:''}<button type="button" data-toggle-sale="${esc(t.id)}">${t.status==='void'?'復元':'取消'}</button></div></article>`).join(''):'<p class="no-transactions">取引はまだありません。売上と費用を登録すると、累計額に反映されます。</p>';
}
function saleState(){return JSON.stringify([...new FormData($('#sale-form')).entries()])}
function openSale(customerId='',txId=null){saleEditId=txId;const c=customers.find(c=>c.id===customerId);const tx=c?.transactions?.find(t=>t.id===txId);if(txId&&(!tx||tx.status!=='posted'))return;const f=$('#sale-form');f.reset();f.elements.customer.innerHTML=customers.map(c=>`<option value="${esc(c.id)}">${esc(c.name)} · ${esc(c.id)}</option>`).join('');if(c)f.elements.customer.value=c.id;f.elements.customer.disabled=Boolean(tx);f.elements.saleDate.value=tx?.date||today();f.elements.saleDate.max=today();f.elements.revenue.value=tx?.revenue??'';f.elements.cost.value=tx?.cost??0;f.elements.saleMemo.value=tx?.memo||'';$('#sale-title').textContent=tx?'取引を編集':'売上を記録';$('#sale-error').textContent='';previewProfit();saleCleanState=saleState();$('#sale-dialog').showModal();}
function closeSale(){if(saleState()!==saleCleanState&&!confirm('保存していない取引を破棄しますか？'))return;$('#sale-dialog').close();saleEditId=null;}
function previewProfit(){try{const f=$('#sale-form');const profit=F.amount(f.elements.revenue.value)-F.amount(f.elements.cost.value);$('#profit-preview').textContent=yen(profit);$('#profit-preview').classList.toggle('negative',profit<0);}catch{$('#profit-preview').textContent='—';$('#profit-preview').classList.remove('negative');}}
function refreshCustomerAfterSale(){if(selectedId&&$('#detail').open){const c=customers.find(c=>c.id===selectedId);renderCustomerFinance(c);$('#timeline').innerHTML=[...c.history].reverse().map(h=>`<div class="event"><small>${esc(timeLabel(h.at))}</small><p>${esc(h.text)}</p></div>`).join('');}}
function initFinance(){
 $('#report-date').value=reportAnchor;$('#report-date').max=today();
 document.querySelectorAll('[data-period]').forEach(b=>b.onclick=()=>{reportMode=b.dataset.period;renderSales()});
 $('#report-date').onchange=e=>{try{F.parse(e.target.value);if(e.target.value<'2000-01-01'||e.target.value>today())throw Error();reportAnchor=e.target.value;renderSales()}catch{e.target.value=reportAnchor;notify('基準日は2000年以降、今日までで指定してください。')}};
 const move=n=>{const shifted=F.shift(reportMode,reportAnchor,n);reportAnchor=shifted>today()?today():shifted<'2000-01-01'?'2000-01-01':shifted;renderSales()};$('#period-prev').onclick=()=>move(-1);$('#period-next').onclick=()=>move(1);$('#period-today').onclick=()=>{reportAnchor=today();renderSales()};$('#sales-nav').onclick=()=>$('#sales-panel').scrollIntoView({behavior:'smooth',block:'start'});
 $('#add-sale').onclick=()=>openSale();$('#add-customer-sale').onclick=()=>openSale(selectedId);$('#close-sale').onclick=closeSale;$('#sale-dialog').addEventListener('cancel',e=>{e.preventDefault();closeSale()});
 for(const k of ['revenue','cost'])$('#sale-form').elements[k].addEventListener('input',previewProfit);
 $('#sale-form').onsubmit=e=>{e.preventDefault();const f=e.currentTarget;const customer=customers.find(c=>c.id===f.elements.customer.value);if(!customer){$('#sale-error').textContent='顧客を選択してください。';return;}
 try{const existing=customer.transactions?.find(t=>t.id===saleEditId);if(saleEditId&&(!existing||existing.status!=='posted'))throw Error('編集対象を確認してください。');const tx={id:existing?.id||'TX-'+crypto.randomUUID(),date:f.elements.saleDate.value,revenue:F.amount(f.elements.revenue.value),cost:F.amount(f.elements.cost.value),memo:f.elements.saleMemo.value.trim(),status:'posted',created:existing?.created||stamp(),updated:stamp()};F.validate(tx);
 const text=(existing?'取引を編集：':'取引を追加：')+tx.date+' / 売上 '+yen(tx.revenue)+' / 費用 '+yen(tx.cost)+' / 利益 '+yen(tx.revenue-tx.cost)+(existing?'\n変更前：'+existing.date+' / 売上 '+yen(existing.revenue)+' / 費用 '+yen(existing.cost):'');
 const next=customers.map(c=>c.id===customer.id?{...c,transactions:existing?c.transactions.map(t=>t.id===existing.id?tx:t):[...(c.transactions||[]),tx],history:[...c.history,{at:stamp(),text}]}:c);
 if(!persist(next))return;render();refreshCustomerAfterSale();$('#sale-dialog').close();saleEditId=null;notify('取引を保存し、売上・利益・グラフを更新しました。');
 }catch(error){$('#sale-error').textContent=error.message;}};
 $('#customer-transactions').onclick=e=>{const edit=e.target.closest('[data-edit-sale]');if(edit){openSale(selectedId,edit.dataset.editSale);return;}const btn=e.target.closest('[data-toggle-sale]');if(!btn)return;const c=customers.find(c=>c.id===selectedId),t=c.transactions.find(t=>t.id===btn.dataset.toggleSale);if(!t)return;const restoring=t.status==='void';if(!confirm(restoring?'この取引を復元して、集計に戻しますか？':'この取引を取り消して、集計から除外しますか？ 記録は残ります。'))return;
 const next=customers.map(x=>x.id===c.id?{...x,transactions:x.transactions.map(item=>item.id===t.id?{...item,status:restoring?'posted':'void',updated:stamp()}:item),history:[...x.history,{at:stamp(),text:(restoring?'取引を復元：':'取引を取消：')+t.date+' / 売上 '+yen(t.revenue)+' / 費用 '+yen(t.cost)}]}:x);if(persist(next)){render();refreshCustomerAfterSale();notify(restoring?'取引を復元しました。':'取引を取り消しました。');}};
}

let chartResizeTimer;window.addEventListener('resize',()=>{clearTimeout(chartResizeTimer);chartResizeTimer=setTimeout(renderSales,150)});
