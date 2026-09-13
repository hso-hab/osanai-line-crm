/* Deterministic management metrics, all based on dated factoring records. */
(function(root){'use strict';
const F=typeof module!=='undefined'&&module.exports?require('./finance.js'):root.CRMFinance;
const C=typeof module!=='undefined'&&module.exports?require('./factoring.js'):root.CRMFactoring;
const ranks={good:'優良',normal:'通常',watch:'要注意'};
const live=c=>(c.factoringCases||[]).filter(a=>!a.void);
const bought=(c,asOf=F.today())=>live(c).filter(a=>a.status==='purchased'&&a.purchaseDate<=asOf).sort((a,b)=>a.purchaseDate.localeCompare(b.purchaseDate)||a.id.localeCompare(b.id));
const profit=a=>a.invoiceAmount-a.purchaseAmount-a.cost;
const remaining=(a,asOf)=>Math.max(0,a.invoiceAmount-C.paid(a,asOf));
const days=(a,b)=>Math.round((F.parse(a)-F.parse(b))/86400000);
function comparison(asOf=F.today()){const now={start:F.range('month',asOf).start,end:asOf},p=F.range('month',F.shift('month',asOf,-1));return {now,previous:{start:p.start,end:F.addDays(p.start,Math.min(Number(asOf.slice(8)),Number(p.end.slice(8)))-1)}};}
function change(current,previous){return previous===0?(current===0?0:null):(current-previous)/Math.abs(previous)*100;}
function stats(customers,start,end){const s={count:0,purchase:0,profit:0,fee:0,recovery:0,outstanding:0,overdue:0,overdueCount:0,newCustomers:0,repeatCustomers:0,avgPurchase:null,avgProfit:null};
 for(const c of customers){const all=bought(c,end),period=all.filter(a=>a.purchaseDate>=start);if(period.length)s[all[0].purchaseDate>=start?'newCustomers':'repeatCustomers']++;
 for(const a of all){const r=remaining(a,end);s.outstanding+=r;if(r&&a.dueDate<end){s.overdue+=r;s.overdueCount++;}for(const p of a.receipts||[])if(!p.void&&p.date>=start&&p.date<=end)s.recovery+=p.amount;}
 for(const a of period){s.count++;s.purchase+=a.purchaseAmount;s.profit+=profit(a);s.fee+=a.invoiceAmount-a.purchaseAmount;}}
 if(s.count){s.avgPurchase=s.purchase/s.count;s.avgProfit=s.profit/s.count;}return s;
}
function customer(c,asOf=F.today()){const apps=live(c).filter(a=>a.applicationDate<=asOf).sort((a,b)=>a.applicationDate.localeCompare(b.applicationDate)),purchases=bought(c,asOf);return {firstApplication:apps[0]?.applicationDate||'',lastTrade:purchases.at(-1)?.purchaseDate||'',applications:apps.length,purchases:purchases.length,purchase:purchases.reduce((n,a)=>n+a.purchaseAmount,0),profit:purchases.reduce((n,a)=>n+profit(a),0),outstanding:purchases.reduce((n,a)=>n+remaining(a,asOf),0),lateCount:purchases.filter(a=>a.dueDate<asOf&&remaining(a,a.dueDate)>0).length,lastContact:c.lastContactDate||'',next:c.due||'',channel:c.acquisition?.channel||'不明',rank:Object.hasOwn(ranks,c.customerRank)?c.customerRank:'normal'};}
function recovery(customers,asOf=F.today()){return customers.flatMap(c=>bought(c,asOf).filter(a=>remaining(a,asOf)>0).map(a=>({id:a.id,customerId:c.id,name:c.name,owner:c.owner||'担当未設定',due:a.dueDate,amount:remaining(a,asOf),days:Math.max(0,days(asOf,a.dueDate)),bucket:a.dueDate<asOf?'late':a.dueDate===asOf?'today':a.dueDate<=F.addDays(asOf,7)?'soon':'later'}))).sort((a,b)=>a.due.localeCompare(b.due)||b.amount-a.amount);}
function groups(customers,start,end,key){const map=new Map();for(const c of customers){const all=bought(c,end);for(const a of all.filter(a=>a.purchaseDate>=start)){const k=key(c,a,all);if(!map.has(k))map.set(k,{name:k,count:0,purchase:0,fee:0,profit:0,ids:new Set()});const r=map.get(k);r.count++;r.purchase+=a.purchaseAmount;r.fee+=a.invoiceAmount-a.purchaseAmount;r.profit+=profit(a);r.ids.add(c.id);}}return [...map.values()].map(({ids,...r})=>({...r,customers:ids.size})).sort((a,b)=>b.profit-a.profit||a.name.localeCompare(b.name));}
function analysis(customers,start,end){return {totals:stats(customers,start,end),ranking:customers.map(c=>({id:c.id,name:c.name,...stats([c],start,end)})).filter(c=>c.count).sort((a,b)=>b.profit-a.profit||a.id.localeCompare(b.id)),owners:groups(customers,start,end,c=>c.owner||'担当未設定'),channels:groups(customers,start,end,c=>c.acquisition?.channel||'不明'),types:groups(customers,start,end,(c,a,all)=>all[0].purchaseDate>=start?'新規':'リピート')};}
function validateProfile(c){if(c.customerRank!==undefined&&!Object.hasOwn(ranks,c.customerRank))throw Error('顧客ランクを確認してください。');if(c.lastContactDate){F.parse(c.lastContactDate);if(c.lastContactDate<'2000-01-01'||c.lastContactDate>F.today())throw Error('最終連絡日は今日までの日付にしてください。');}}
const api={ranks,comparison,change,stats,customer,recovery,analysis,validateProfile};if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.CRMManagement=api;
})(typeof window==='undefined'?globalThis:window);
