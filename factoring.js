/* Factoring demo: case-based, integer JPY, JST dates. No automatic credit decisions. */
(function(root){
'use strict';
const F=typeof module!=='undefined'&&module.exports?require('./finance.js'):root.CRMFinance;
const labels={received:'受付',documents:'書類確認',review:'審査中',approved:'承認・買取前',rejected:'否決',withdrawn:'取下げ',purchased:'買取済'};
const bands=[{label:'10万円未満',min:0,max:100000},{label:'10万〜30万円未満',min:100000,max:300000},{label:'30万〜50万円未満',min:300000,max:500000},{label:'50万〜100万円未満',min:500000,max:1000000},{label:'100万円以上',min:1000000,max:Infinity}];
const rate=(n,d)=>d>0?n/d:null;
const paid=(c,asOf=F.today())=>(c.receipts||[]).filter(r=>!r.void&&r.date<=asOf).reduce((n,r)=>n+r.amount,0);
const purchased=(c,asOf)=>c.status==='purchased'&&c.purchaseDate<=asOf;
function validDate(s){F.parse(s);if(s<'2000-01-01')throw Error('日付は2000年以降で指定してください。');}
function validate(c,asOf=F.today()){
 if(!Object.hasOwn(labels,c.status))throw Error('審査状況を確認してください。');
 validDate(c.applicationDate);if(c.applicationDate>asOf)throw Error('申込日は今日までの日付にしてください。');
 for(const k of ['invoiceAmount','requestedAmount','purchaseAmount','cost'])F.amount(c[k]);
 if(!c.invoiceAmount||!c.requestedAmount)throw Error('請求書額面・希望買取額は1円以上で入力してください。');
 if(c.requestedAmount>c.invoiceAmount)throw Error('希望買取額は請求書額面以下にしてください。');
 if(['approved','rejected','purchased'].includes(c.status)){
  validDate(c.decisionDate);if(c.decisionDate<c.applicationDate||c.decisionDate>asOf)throw Error('審査日は申込日以降、今日までにしてください。');
 }
 if(c.status==='rejected'&&!c.reason.trim())throw Error('否決理由を入力してください。');
 if(c.status==='purchased'){
  if(c.purchaseAmount<=0||c.purchaseAmount>c.invoiceAmount)throw Error('買取額は1円以上、請求書額面以下にしてください。');
  validDate(c.purchaseDate);validDate(c.dueDate);
  if(c.purchaseDate<c.decisionDate||c.purchaseDate>asOf)throw Error('買取日は審査日以降、今日までにしてください。');
  if(c.dueDate<c.purchaseDate)throw Error('回収期日は買取日以降にしてください。');
 }else if(c.receipts?.length)throw Error('入金履歴のある案件は買取済のままにしてください。誤登録は案件取消で除外できます。');
 if(!Array.isArray(c.receipts))throw Error('入金履歴を確認してください。');
 for(const r of c.receipts){validDate(r.date);F.amount(r.amount);if(!r.amount||r.date<c.purchaseDate||r.date>asOf)throw Error('入金日は買取日以降、今日まで、入金額は1円以上にしてください。');}
 if(paid(c,'9999-12-31')>c.invoiceAmount)throw Error('入金合計が回収予定額（請求書額面）を超えています。');
 return c;
}
function recovery(rows,asOf,scope='due'){
 const active=rows.filter(c=>!c.void&&purchased(c,asOf));
 const targets=active.filter(c=>scope==='all'||c.dueDate<=asOf);
 const expected=targets.reduce((n,c)=>n+c.invoiceAmount,0),collected=targets.reduce((n,c)=>n+paid(c,asOf),0);
 const settled=targets.filter(c=>paid(c,asOf)>=c.invoiceAmount);
 const ids=[...new Set(targets.map(c=>c.customerId))];
 const settledCustomers=ids.filter(id=>targets.filter(c=>c.customerId===id).every(c=>paid(c,asOf)>=c.invoiceAmount)).length;
 const late=active.filter(c=>c.dueDate<asOf&&paid(c,asOf)<c.invoiceAmount);
 return {expected,collected,remaining:expected-collected,rate:rate(collected,expected),count:targets.length,settled:settled.length,caseRate:rate(settled.length,targets.length),customers:ids.length,settledCustomers,customerRate:rate(settledCustomers,ids.length),overdue:late.reduce((n,c)=>n+c.invoiceAmount-paid(c,asOf),0),overdueCount:late.length,future:active.filter(c=>c.dueDate>asOf).reduce((n,c)=>n+c.invoiceAmount-paid(c,asOf),0)};
}
function analyze(rows,{start='',end='',asOf=F.today(),scope='due'}={}){
 // A cohort by application date; repayment and status are CURRENT, not reconstructed history.
 const cohort=rows.filter(c=>!c.void&&(!start||c.applicationDate>=start)&&(!end||c.applicationDate<=end)&&c.applicationDate<=asOf);
 const approved=cohort.filter(c=>['approved','purchased'].includes(c.status));const rejected=cohort.filter(c=>c.status==='rejected');
 const bought=cohort.filter(c=>purchased(c,asOf));
 const review=group=>({cases:group.length,customers:new Set(group.map(c=>c.customerId)).size,rejected:group.filter(c=>c.status==='rejected').length,approved:group.filter(c=>['approved','purchased'].includes(c.status)).length});
 return {cohort,cases:cohort.length,customers:new Set(cohort.map(c=>c.customerId)).size,pending:cohort.filter(c=>['received','documents','review'].includes(c.status)).length,approved:approved.length,rejected:rejected.length,rejectedCustomers:new Set(rejected.map(c=>c.customerId)).size,withdrawn:cohort.filter(c=>c.status==='withdrawn').length,rejectionRate:rate(rejected.length,rejected.length+approved.length),purchaseCount:bought.length,purchaseTotal:bought.reduce((n,c)=>n+c.purchaseAmount,0),expectedMargin:bought.reduce((n,c)=>n+c.invoiceAmount-c.purchaseAmount-c.cost,0),recovery:recovery(cohort,asOf,scope),bands:bands.map(b=>{const reviews=cohort.filter(c=>c.requestedAmount>=b.min&&c.requestedAmount<b.max);const purchases=bought.filter(c=>c.purchaseAmount>=b.min&&c.purchaseAmount<b.max);return {...b,review:review(reviews),purchaseCount:purchases.length,purchaseTotal:purchases.reduce((n,c)=>n+c.purchaseAmount,0),recovery:recovery(purchases,asOf,scope)}})};
}
function state(c,asOf=F.today()){
 if(c.void)return '取消済';if(c.status!=='purchased')return labels[c.status];
 if(paid(c,asOf)>=c.invoiceAmount)return '回収完了';if(c.dueDate<asOf)return paid(c,asOf)?'延滞・一部入金':'延滞';if(paid(c,asOf))return '一部入金';return c.dueDate===asOf?'本日期日':'回収待ち';
}
function seed(base){
 const specs=[['DEMO-001','review',80000,0,0,0],['DEMO-002','purchased',90000,0,-3,50000],['DEMO-002','purchased',270000,1,-1,300000],['DEMO-003','rejected',100000,0,0,0],['DEMO-004','documents',500000,0,0,0],['DEMO-005','purchased',450000,0,-6,500000],['DEMO-006','purchased',900000,0,7,200000],['DEMO-003','rejected',300000,1,0,0],['DEMO-005','approved',1000000,1,0,0]];
 return base.map(customer=>({...customer,factoringCases:specs.flatMap(([id,status,amount,offset,due,receipt],i)=>id===customer.id?[{id:'FC-DEMO-'+String(i+1).padStart(3,'0'),reference:'架空請求書-'+(i+1),debtor:'サンプル売掛先'+(i+1),applicationDate:F.addDays(F.today(),-12-offset),status,decisionDate:['purchased','rejected','approved'].includes(status)?F.addDays(F.today(),-10):'',invoiceAmount:Math.round(amount/0.9),requestedAmount:amount,purchaseAmount:status==='purchased'?amount:0,cost:status==='purchased'?1000:0,purchaseDate:status==='purchased'?F.addDays(F.today(),-9):'',dueDate:status==='purchased'?F.addDays(F.today(),due):'',reason:status==='rejected'?'確認書類の不足（架空の例）':'',memo:'架空案件。実在の請求書ではありません。',receipts:receipt?[{id:'RC-DEMO-'+i,date:F.addDays(F.today(),-1),amount:receipt,memo:'サンプル入金',void:false}]:[],void:false,history:[{at:new Date().toISOString(),text:'サンプル案件を作成'}]}]:[])}));
}
const api={labels,bands,paid,validate,recovery,analyze,state,seed};if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.CRMFactoring=api;
})(typeof window==='undefined'?globalThis:window);
