'use strict';
(()=>{const S=window.CRMServer;if(!S)return;
 document.title='つながる顧客ノート';document.body.classList.add('server-mode');
 document.querySelector('.demo-banner').innerHTML='<strong>共有ワークスペース</strong><span id="server-sync" role="status">サーバー接続済み</span><a href="account.html">アカウント・管理</a>';
 document.querySelector('.side-note').textContent=S.user.name+' / '+(S.user.role==='admin'?'管理者':'担当者');
 document.querySelector('.save-row p').textContent='保存すると全端末へ共有';
 document.querySelector('.ops-status p').textContent='AI・LINEは未接続です。登録・変更は手動で行います。';
 document.querySelector('footer p').textContent='共有データはサーバーに保存されます。AI・LINE・銀行連携は未接続です。';
 document.querySelectorAll('a[href="manual/"]').forEach(a=>a.href='manual/server.html');
 document.getElementById('help-title').textContent='共有版の使い方';
 document.querySelectorAll('#help-dialog p').forEach((p,i)=>p.textContent=[
  '顧客一覧で名前・電話番号・LINE名を検索し、顧客を開いて記録を更新します。保存完了後に他の端末でも確認できます。',
  '管理者は全体を管理、担当者は自分の担当顧客を更新できます。アカウント・変更履歴・自動バックアップは画面上部のアカウント・管理から開きます。',
  '別の端末で更新があると再表示を案内します。同時編集時は上書きを止めます。AI・LINE・銀行の自動連携は未接続です。'
 ][i]||'');
 document.querySelector('#fc-form>p.fc-note').textContent='審査結果は担当者が入力します。添付書類は書類・契約管理から登録します。';
 document.querySelector('#wb-case-form>p.fc-note').textContent='添付はサーバーに保存します（1ファイル500KB以下、合計約2MB）。自動OCR・内容審査はしません。';
 document.querySelector('#sale-form .save-row span').textContent='サーバーへ保存';
 for(const id of ['simulate','reset','fc-load-demo','wb-job-demo'])document.getElementById(id).hidden=true;
 const add=document.createElement('button');add.className='primary';add.textContent='＋ 顧客を登録';document.getElementById('simulate').after(add);
 add.onclick=()=>{document.getElementById('new-customer-form').reset();document.getElementById('new-customer').showModal();};
 const dialog=document.createElement('dialog');dialog.id='new-customer';dialog.innerHTML='<form id="new-customer-form"><h2>顧客を登録</h2><label>名前<input name="name" maxlength="160" required></label><label>電話番号<input name="phone" type="tel" maxlength="40"></label><label>LINE名<input name="lineName" maxlength="160"></label><p id="new-customer-error" role="alert"></p><button class="primary">登録</button><button type="button" id="new-customer-close">閉じる</button></form>';document.body.append(dialog);document.getElementById('new-customer-close').onclick=()=>dialog.close();
 document.getElementById('new-customer-form').onsubmit=async e=>{e.preventDefault();const f=e.currentTarget,c={id:'CU-'+crypto.randomUUID(),name:f.elements.name.value.trim(),phone:f.elements.phone.value.trim(),lineName:f.elements.lineName.value.trim(),ownerId:S.user.id,owner:S.user.name,status:'new',due:'',next:'',message:'',created:stamp(),history:[{at:stamp(),text:'顧客を手動登録'}],transactions:[],factoringCases:[],legalNotices:[]};if(!c.name)return;if(await persist([c,...customers])){dialog.close();render();openCustomer(c.id);}};
 function owners(){const f=document.querySelector('#customer-form [name=owner]');f.innerHTML='<option value="">担当者なし</option>'+S.directory.map(u=>'<option>'+esc(u.name)+'</option>').join('');const filter=document.getElementById('owner-filter');filter.innerHTML='<option value="all">すべて</option><option value="">担当者なし</option>'+[...new Set([...S.directory.map(u=>u.name),...customers.map(c=>c.owner).filter(Boolean)])].map(n=>'<option>'+esc(n)+'</option>').join('');}owners();
 window.addEventListener('crm-customer-open',()=>{const c=customers.find(c=>c.id===selectedId);if(!c)return;const writable=S.user.role==='admin'||c.ownerId===S.user.id;document.querySelectorAll('#customer-form input,#customer-form select,#customer-form textarea,#customer-form button[type=submit]').forEach(e=>e.disabled=!writable);document.querySelector('#customer-form [name=owner]').disabled=S.user.role!=='admin';document.querySelector('#customer-heading small').textContent=c.id;document.querySelector('#customer-message small').textContent='最初のお問い合わせ';});
 if(S.user.role!=='admin')for(const id of ['wb-import-file','wb-restore','wb-lock','wb-export'])document.getElementById(id).disabled=true;
 let checking=false;
 setInterval(async()=>{if(checking||S.busy||document.hidden)return;checking=true;try{const r=await S.request('/api/revision');if(r.revision!==S.state.revision){const indicator=document.getElementById('server-sync');indicator.replaceChildren(Object.assign(document.createElement('a'),{href:location.href,textContent:'他の端末で更新あり・最新を表示'}));if(!S.dirty&&!document.querySelector('dialog[open]')&&!document.activeElement?.matches('input,textarea,select'))location.reload();}}catch{document.getElementById('server-sync').textContent='接続を確認してください';}finally{checking=false}},15000);
})();
