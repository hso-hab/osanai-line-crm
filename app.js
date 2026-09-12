'use strict';
const KEY='osanai-line-crm-demo-v1';
const labels={new:'未対応',active:'対応中',waiting:'お客様の返信待ち',done:'完了'};
const $=s=>document.querySelector(s);
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const dateOffset=(n=0)=>{const d=new Date();d.setDate(d.getDate()+n);return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`};
const stamp=()=>new Date().toISOString();
const today=()=>dateOffset();
const timeLabel=s=>new Intl.DateTimeFormat('ja-JP',{month:'short',day:'numeric',hour:'2-digit',minute:'2-digit'}).format(new Date(s));
function seed(){return [
 {id:'DEMO-001',name:'青木（サンプル）',status:'new',owner:'',due:today(),next:'お問い合わせ内容を確認する',message:'サービスについて詳しく知りたいです。',created:stamp(),history:[{at:stamp(),text:'LINEから初回のお問い合わせを受信（デモ）'}]},
 {id:'DEMO-002',name:'佐藤（サンプル）',status:'active',owner:'自分',due:dateOffset(-1),next:'ご希望の条件を確認する',message:'先ほど相談した件、条件を教えてください。',created:stamp(),history:[{at:stamp(),text:'ご希望の条件を確認中（サンプル記録）'}]},
 {id:'DEMO-003',name:'高橋（サンプル）',status:'waiting',owner:'担当A',due:dateOffset(1),next:'ご返信があるか確認する',message:'内容を確認して、改めてご連絡します。',created:stamp(),history:[{at:stamp(),text:'ご案内済み。お客様の返信待ち（サンプル記録）'}]},
 {id:'DEMO-004',name:'伊藤（サンプル）',status:'new',owner:'',due:'',next:'',message:'初めて利用します。相談はできますか？',created:stamp(),history:[{at:stamp(),text:'LINEから初回のお問い合わせを受信（デモ）'}]},
 {id:'DEMO-005',name:'田中（サンプル）',status:'done',owner:'担当B',due:'',next:'',message:'ご案内ありがとうございました。',created:stamp(),history:[{at:stamp(),text:'お問い合わせへの対応を完了（サンプル記録）'}]},
 {id:'DEMO-006',name:'渡辺（サンプル）',status:'active',owner:'自分',due:today(),next:'次のご案内を準備する',message:'次はどのように進めればよいですか？',created:stamp(),history:[{at:stamp(),text:'進め方の案内を準備中（サンプル記録）'}]}
]}
let customers;let loadError=false;
try{const raw=localStorage.getItem(KEY);customers=raw?JSON.parse(raw):seed();if(!Array.isArray(customers)||!customers.every(c=>c&&typeof c.id==='string'&&typeof c.name==='string'&&c.status in labels&&typeof c.owner==='string'&&typeof c.due==='string'&&typeof c.next==='string'&&Array.isArray(c.history)&&c.history.every(h=>typeof h.text==='string'&&Number.isFinite(Date.parse(h.at)))))throw Error('Invalid demo data');}catch{customers=seed();loadError=true;}
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
 $('#today-label').textContent=new Intl.DateTimeFormat('ja-JP',{month:'long',day:'numeric',weekday:'short'}).format(new Date());
 $('#quick-filter').hidden=!quick;$('#quick-filter span').textContent=quick==='due'?'今日・期限超過の予定を表示（完了は除く）':'担当者なしを表示（完了は除く）';
 document.querySelectorAll('[data-metric]').forEach(b=>b.setAttribute('aria-pressed',String(['due','unassigned'].includes(b.dataset.metric)?quick===b.dataset.metric:!quick&&status===b.dataset.metric)));
 document.querySelectorAll('[data-view]').forEach(b=>b.classList.toggle('selected',b.dataset.view===(quick==='due'?'due':'all')));
 $('#customer-list').innerHTML=rows.length?rows.map(c=>`<button class="customer-row" data-customer="${esc(c.id)}" aria-label="${esc(c.name)}の顧客詳細を開く"><span class="customer-name"><span class="avatar" aria-hidden="true">${esc(c.name.slice(0,1))}</span><span><strong>${esc(c.name)}</strong><small>${esc(c.id)} · LINE（デモ）</small></span></span><span class="status-cell"><span class="status ${esc(c.status)}">${esc(labels[c.status])}</span></span><span class="owner-cell">${esc(c.owner||'担当者なし')}</span><span class="next-cell"><strong>${esc(c.status==='done'?'対応完了':c.next||'次の対応を設定')}</strong><span class="due-date ${c.status!=='done'&&c.due&&c.due<today()?'overdue':''}">${esc(c.status==='done'?'予定なし':c.due?(c.due<today()?'期限超過 · ':c.due===today()?'今日 · ':'')+c.due.replaceAll('-','/'):'日付未設定')}</span></span><span class="row-arrow" aria-hidden="true">›</span></button>`).join(''):'<div class="empty"><strong>該当するお客様はいません</strong>検索条件や対応状況を変更してください。</div>';
}
function formState(){return JSON.stringify([...new FormData($('#customer-form')).entries()])}
function openCustomer(id){const c=customers.find(c=>c.id===id);if(!c)return;selectedId=id;
 $('#customer-heading').innerHTML=`<span class="avatar" aria-hidden="true">${esc(c.name.slice(0,1))}</span><div><h2 id="detail-title">${esc(c.name)}</h2><small>${esc(c.id)} · LINE流入（デモ）</small></div>`;
 $('#customer-message').innerHTML=`<small>最初のお問い合わせ · サンプル</small><p>${esc(c.message)}</p>`;
 const form=$('#customer-form');for(const k of ['status','owner','due','next'])form.elements[k].value=c[k];form.elements.note.value='';
 $('#timeline').innerHTML=[...c.history].reverse().map(h=>`<div class="event"><small>${esc(timeLabel(h.at))}</small><p>${esc(h.text)}</p></div>`).join('');
 cleanState=formState();if(!$('#detail').open)$('#detail').showModal();
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
document.querySelectorAll('[data-metric]').forEach(b=>b.onclick=()=>setView(b.dataset.metric));document.querySelectorAll('[data-view]').forEach(b=>b.onclick=()=>setView(b.dataset.view));$('#clear-filter').onclick=()=>setView('all');
$('#simulate').onclick=()=>{const number=Math.max(0,...customers.map(c=>Number(c.id.replace('DEMO-',''))||0))+1;const id='DEMO-'+String(number).padStart(3,'0');const c={id,name:'新しいお客様（サンプル）',status:'new',owner:'',due:'',next:'',message:'はじめまして。サービスについて相談したいです。',created:stamp(),history:[{at:stamp(),text:'LINEから初回のお問い合わせを受信（デモ操作）'}]};if(!persist([c,...customers]))return;setView('new');openCustomer(id);notify('架空のお客様を追加しました。LINEには接続していません。');};
$('#reset').onclick=()=>{if(!confirm('このブラウザのデモ顧客と変更履歴を消して、最初の6件に戻しますか？'))return;if(persist(seed())){setView('all');notify('デモを最初の状態に戻しました。')}};
$('#help').onclick=()=>$('#help-dialog').showModal();$('#close-help').onclick=()=>$('#help-dialog').close();
window.addEventListener('storage',e=>{if(e.key===KEY)notify('別のタブでデモが更新されました。再読み込みすると反映されます。')});
render();if(loadError)notify('保存データを読み込めなかったため、初期サンプルを表示しています。');
