/* Management reporting and notice-routing. No automated approval or denial. */
(function(root){
'use strict';
const F=typeof module!=='undefined'&&module.exports?require('./finance.js'):root.CRMFinance;
const C=typeof module!=='undefined'&&module.exports?require('./factoring.js'):root.CRMFactoring;
const noticeKinds={bankruptcy:'自己破産',restructuring:'任意整理'};
const activeNotices=c=>(c.legalNotices||[]).filter(n=>!n.void);
function noticeStats(customers){const active=customers.filter(c=>activeNotices(c).length);return {customers:active.length,bankruptcy:active.filter(c=>activeNotices(c).some(n=>n.kind==='bankruptcy')).length,restructuring:active.filter(c=>activeNotices(c).some(n=>n.kind==='restructuring')).length,unverified:active.filter(c=>activeNotices(c).some(n=>n.verification==='pending')).length,records:active.reduce((sum,c)=>sum+activeNotices(c).length,0)};}
function validateNotice(n,asOf=F.today()){
 if(!Object.hasOwn(noticeKinds,n.kind))throw Error('通知種別を選択してください。');
 F.parse(n.receivedDate);if(n.receivedDate<'2000-01-01'||n.receivedDate>asOf)throw Error('受領日は2000年以降、今日までにしてください。');
 if(!['pending','verified'].includes(n.verification))throw Error('確認状況を選択してください。');
 if(!n.source?.trim())throw Error('通知元・受領経路を記録してください。');
 if(!n.recorder?.trim())throw Error('記録担当者を入力してください。');
 return n;
}
function decisionGuard(customer,previous,next,review){
 if(!activeNotices(customer).length)return null;
 if(!['approved','rejected','purchased'].includes(next.status))return null;
 if(previous?.status===next.status)return null; // Existing cash/record corrections remain available.
 if(!review?.ack||!review.reviewer?.trim()||!review.reason?.trim())throw Error('通知のある顧客です。責任者が内容を確認し、判断理由と確認者を記録してください。自動で否決にはしません。');
 return {noticeIds:activeNotices(customer).map(n=>n.id),decision:next.status,reviewer:review.reviewer.trim(),reason:review.reason.trim(),at:new Date().toISOString()};
}
function cashEvents(customers){const events=[];
 for(const customer of customers)for(const c of customer.factoringCases||[]){
  if(c.void||c.status!=='purchased')continue;
  events.push({date:c.purchaseDate,purchase:c.purchaseAmount,recovery:0,fee:c.invoiceAmount-c.purchaseAmount,cost:c.cost,profit:c.invoiceAmount-c.purchaseAmount-c.cost,count:1,id:c.id});
  for(const r of c.receipts||[])if(!r.void)events.push({date:r.date,purchase:0,recovery:r.amount,fee:0,cost:0,profit:0,count:0,id:c.id});
 }
 return events;
}
function summarize(events,start,end){return events.reduce((s,e)=>{if(e.date>=start&&e.date<=end){for(const key of ['purchase','recovery','fee','cost','profit','count'])s[key]+=e[key];}return s},{purchase:0,recovery:0,fee:0,cost:0,profit:0,count:0});}
function overview(customers,mode,anchor){const range=F.range(mode,anchor),events=cashEvents(customers),n={day:7,week:8,month:6}[mode];return {...range,...summarize(events,range.start,range.end),series:Array.from({length:n},(_,i)=>{const r=F.range(mode,F.shift(mode,anchor,i-n+1));return {...r,...summarize(events,r.start,r.end)}})};}
const api={noticeKinds,activeNotices,noticeStats,validateNotice,decisionGuard,cashEvents,summarize,overview};if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.CRMOperations=api;
})(typeof window==='undefined'?globalThis:window);
