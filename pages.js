'use strict';
(()=>{
 const page=document.body.dataset.page||'sales';
 const definitions={cases:['案件管理','申込・審査・買取・入金を管理します。','manual-details','cases-nav'],recovery:['回収管理','期日が近い案件と延滞の確認・入金記録。','mg-recovery-section','recovery-nav'],reports:['売上分析','前月比較・今年累計・顧客別・担当者別の実績。','mg-report-section','reports-nav'],sales:['今日のダッシュボード','今月の数字と、今日の対応を確認。','mg-dashboard','ops-nav'],customers:['顧客一覧','顧客の対応状況、申込案件、入金を管理します。','manual-details','all'],today:['今日の対応','今日までに対応が必要なお客様を確認します。','manual-details','due'],analytics:['審査・回収分析','審査結果と回収状況を、顧客・金額帯ごとに確認します。','analytics-details','fc-nav'],ledger:['旧売上台帳','以前の手入力売上・利益を確認します。案件集計とは別の台帳です。','legacy-details','sales-nav'],notices:['通知・責任者確認','受領した通知の記録と、人による確認を管理します。','notices-details','notice-nav'],tools:['業務ツール','使いたい機能を選ぶと、専用ページへ移動します。','wb-tools','wb-nav'],documents:['書類・契約管理','案件ごとの提出書類、契約の進捗、先払い予定を管理します。','wb-documents','wb-nav'],bank:['入金照合','CSVの入金明細と案件を、人が確認して照合します。','wb-bank','wb-nav'],cash:['資金繰り予定','現在残高と先払い・回収予定から、31日分を試算します。','wb-cash','wb-nav'],reminders:['期限・対応漏れ','期限が今日以前の未完了項目を確認します。','wb-reminders','wb-nav'],jobs:['AI・手動引継ぎ','担当・期限・対応結果を記録します。AIの実監視は未接続です。','wb-jobs','wb-nav'],acquisition:['集客分析','流入経路ごとの申込・契約・買取と広告費を確認します。','wb-acquisition','wb-nav'],backup:['保存・バックアップ','データの保存・復元と、誤操作防止ロックを設定します。','wb-backup','wb-nav']};
 const d=definitions[page]||definitions.sales,section=document.getElementById(d[2]);
 document.title=d[0]+'｜つながる顧客ノート';document.querySelector('h1').textContent=d[0];document.querySelector('.intro').textContent=d[1];document.querySelector('.eyebrow').textContent='ファクタリング / 管理画面';
 if(section.tagName==='DETAILS'){section.open=true;section.classList.add('page-content');section.addEventListener('toggle',()=>{if(!section.open)section.open=true})}
 if(page==='customers'||page==='today'){const head=section.querySelector('.ops-manual-head');section.insertBefore(section.querySelector('.metrics'),head);section.insertBefore(section.querySelector('.customer-panel'),head);}
 const header=document.getElementById('ops-manual-toggle');header.hidden=['sales','customers','today','cases'].includes(page);header.textContent='顧客・案件を管理';
 if(!['sales','customers','today'].includes(page)){const back=document.createElement('p');back.className='page-context';back.innerHTML='<a href="sales.html">売上・利益</a> ／ <a href="tools.html">業務ツール一覧</a>';section.before(back)}
 function sync(){document.querySelectorAll('.nav-item').forEach(a=>{const on=a.id===d[3]||a.dataset.view===d[3];a.classList.toggle('selected',on);if(on)a.setAttribute('aria-current','page');else a.removeAttribute('aria-current')});header.textContent='顧客・案件を管理';document.getElementById('ops-view-label').textContent=d[0]+'を表示中';}
 // Real links navigate to distinct documents, preserving native back/new-tab behavior.
 document.querySelectorAll('.sidebar a.nav-item,[data-wb-open]').forEach(a=>a.onclick=null);
 const special={'ops-manual-toggle':'customers.html','ops-notice-link':'notices.html','ops-overdue-link':'recovery.html?bucket=late','wb-nav':'tools.html'};
 document.addEventListener('click',e=>{const a=e.target.closest('a.nav-item,a[data-wb-open],.brand');if(a){e.stopImmediatePropagation();return}const b=e.target.closest('#ops-manual-toggle,#ops-notice-link,#ops-overdue-link');if(b){e.preventDefault();e.stopImmediatePropagation();location.assign(special[b.id])}},true);
 window.addEventListener('crm-render',sync);document.getElementById('manual-details').addEventListener('toggle',sync);window.addEventListener('resize',()=>setTimeout(sync,200));
 if(page==='today')setView('due');if(['customers','cases'].includes(page)&&new URLSearchParams(location.search).get('status')==='late'){document.getElementById('fc-status-filter').value='late';document.getElementById('fc-status-filter').dispatchEvent(new Event('change'));}
 // Back/forward cache must not revive a stale editable data snapshot.
 window.addEventListener('pageshow',e=>{if(e.persisted)location.reload()});
 // One closed help area per page. Live counts, errors and confirmation warnings stay in place.
 const help=document.createElement('details');help.className='mg-definitions daily-help page-help';help.innerHTML='<summary>このページの説明・集計について</summary>';
 const intro=document.querySelector('.page-header .intro');help.append(intro);
 if(['tools','analytics','ledger'].includes(page))section.querySelectorAll('.sales-header p').forEach(p=>p.remove());
 section.querySelectorAll('p.fc-note:not([id]),p.money-note,.ops-manual-head>p,.sales-header p,.ops-routing-note').forEach(p=>{const parent=p.closest('details');if(parent&&!parent.classList.contains('page-content'))return;help.append(p);});
 const connection=section.querySelector('div.ops-status');if(connection){const info=connection.querySelector('div');if(info)help.append(info);connection.remove();}
 section.append(help);
 sync();const navMore=document.querySelector('.mg-nav-more');if(navMore.querySelector('[aria-current=page]'))navMore.open=true;
})();
