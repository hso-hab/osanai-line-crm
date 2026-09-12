/* Calendar dates and integer-yen arithmetic; shared by the UI and tests. */
(function(root){
'use strict';
const pad=n=>String(n).padStart(2,'0');
const iso=d=>`${d.getUTCFullYear()}-${pad(d.getUTCMonth()+1)}-${pad(d.getUTCDate())}`;
function parse(s){if(typeof s!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(s))throw Error('日付を確認してください');const d=new Date(s+'T00:00:00Z');if(!Number.isFinite(d.getTime())||iso(d)!==s)throw Error('日付を確認してください');return d;}
function today(now=new Date()){const p=new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Tokyo',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(now);const v=t=>p.find(x=>x.type===t).value;return `${v('year')}-${v('month')}-${v('day')}`;}
function addDays(s,n){const d=parse(s);d.setUTCDate(d.getUTCDate()+n);return iso(d);}
function range(mode,anchor){const d=parse(anchor);if(mode==='day')return{start:anchor,end:anchor};if(mode==='week'){const start=addDays(anchor,-((d.getUTCDay()+6)%7));return{start,end:addDays(start,6)};}if(mode==='month'){const y=d.getUTCFullYear(),m=d.getUTCMonth();return{start:iso(new Date(Date.UTC(y,m,1))),end:iso(new Date(Date.UTC(y,m+1,0)))};}throw Error('集計単位を確認してください');}
function shift(mode,anchor,amount){if(mode==='day')return addDays(anchor,amount);if(mode==='week')return addDays(anchor,7*amount);if(mode==='month'){const d=parse(anchor);return iso(new Date(Date.UTC(d.getUTCFullYear(),d.getUTCMonth()+amount,1)));}throw Error('集計単位を確認してください');}
function amount(raw){const s=String(raw).trim();if(!/^\d+$/.test(s))throw Error('金額は0以上の整数で入力してください');const n=Number(s);if(!Number.isSafeInteger(n)||n>1000000000)throw Error('金額は10億円以下で入力してください');return n;}
function validate(t,lastDate=today()){parse(t.date);if(t.date<'2000-01-01'||t.date>lastDate)throw Error('売上日は2000年以降、今日までの日付にしてください');amount(t.revenue);amount(t.cost);if(!['posted','void'].includes(t.status))throw Error('取引状態が不正です');return t;}
function sum(rows,start='0000-01-01',end='9999-12-31'){return rows.reduce((r,t)=>{if(t.status==='posted'&&t.date>=start&&t.date<=end){r.revenue+=t.revenue;r.cost+=t.cost;r.profit+=t.revenue-t.cost;r.count++;}return r},{revenue:0,cost:0,profit:0,count:0});}
function series(rows,mode,anchor){const count={day:7,week:8,month:6}[mode];if(!count)throw Error('集計単位を確認してください');return Array.from({length:count},(_,i)=>{const period=range(mode,shift(mode,anchor,i-count+1));return{...period,...sum(rows,period.start,period.end)};});}
const api={parse,today,addDays,range,shift,amount,validate,sum,series};if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.CRMFinance=api;
})(typeof window==='undefined'?globalThis:window);
