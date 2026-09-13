/* One ledger: acquisition events and advertising costs; outcomes derive from CRM cases. */
(function(root){'use strict';
const F=typeof module!=='undefined'&&module.exports?require('./finance.js'):root.CRMFinance;
const A=typeof module!=='undefined'&&module.exports?require('./ad-note-core.js'):root.AdCore;
const channels=['不明','LINE自然流入','広告','紹介','その他'];
const defaults=()=>({version:1,records:[],leads:[],catalog:{lp:[],medium:[]}});
const data=w=>w.ads||defaults(), clone=x=>JSON.parse(JSON.stringify(x));
const str=(v,n=100)=>{if(typeof v!=='string'||v.length>n)throw Error('広告データの文字数・形式を確認してください。');return v;};
const id=v=>{if(!/^[\w-]{1,100}$/.test(str(v)))throw Error('広告データのIDが不正です。');};
const date=v=>{if(!A.validDate(v))throw Error('広告・送客日は2000〜2099年の日付にしてください。');};
const amount=v=>{if(!Number.isSafeInteger(v)||v<0||v>1e10)throw Error('広告の金額・件数は0〜100億の整数にしてください。');};
function source(s={}){return {channel:s.channel||'不明',lp:s.lp||'',medium:s.medium||''};}
function checkSource(s){str(s.lp,100);str(s.medium,80);if(!channels.includes(s.channel))throw Error('流入経路を選択してください。');}
const sourceKey=s=>JSON.stringify([s.channel,s.lp,s.medium]);
const bucketKey=r=>JSON.stringify([r.date,...JSON.parse(sourceKey(r))]);
function validate(d){if(!d||d.version!==1||!Array.isArray(d.records)||!Array.isArray(d.leads)||d.records.length>10000||d.leads.length>10000)throw Error('広告・送客データの形式または件数を確認してください。');
 if(!d.catalog||!Array.isArray(d.catalog.lp)||!Array.isArray(d.catalog.medium))throw Error('LP・媒体の登録リストが不正です。');A.catalog([],d.catalog);const ids=new Set(),keys=new Set();for(const r of d.records){id(r.id);date(r.date);checkSource(r);str(r.note,500);for(const k of ['spend','impressions','clicks','other'])amount(r[k]);if(r.visits!==null)amount(r.visits);if(ids.has(r.id)||keys.has(bucketKey(r)))throw Error('日付・LP・媒体・経路が重複しています。');ids.add(r.id);keys.add(bucketKey(r));if(r.legacy)A.validate(r.legacy);}
 const leadIds=new Set();for(const l of d.leads){id(l.id);date(l.date);checkSource(l);str(l.name,160);str(l.note,500);str(l.customerId,100);if(leadIds.has(l.id))throw Error('送客IDが重複しています。');leadIds.add(l.id);}return d;}
function validateLinks(cs,w){const d=data(w);validate(d);const map=new Map(cs.map(c=>[c.id,c])),ls=new Map(d.leads.map(l=>[l.id,l]));for(const l of d.leads)if(l.customerId&&!map.has(l.customerId))throw Error('送客に紐付く顧客が見つかりません。');
 for(const c of cs){if(c.acquisition){checkSource(source(c.acquisition));if(c.acquisition.date)date(c.acquisition.date);if(c.acquisition.leadId&&ls.get(c.acquisition.leadId)?.customerId!==c.id)throw Error('顧客と送客の紐付けが一致しません。');}
 for(const a of c.factoringCases||[])if(a.adLeadId&&ls.get(a.adLeadId)?.customerId!==c.id)throw Error('案件の送客は同じ顧客の記録から選択してください。');}return cs;}
function acquiredDate(c){if(c.acquisition?.date)return c.acquisition.date;if(c.created&&Number.isFinite(Date.parse(c.created)))return F.today(new Date(c.created));return '';}
function customerSource(c,d){const lead=d.leads.find(l=>l.id===c.acquisition?.leadId&&l.customerId===c.id);return source(lead||c.acquisition);}
function events(cs,w){const d=data(w),out=d.leads.map(l=>({...l,implicit:false})),leadMap=new Map(d.leads.map(l=>[l.id,l]));for(const c of cs){if(c.acquisition?.leadId&&leadMap.get(c.acquisition.leadId)?.customerId===c.id)continue;out.push({id:'customer-'+c.id,customerId:c.id,name:c.name,date:acquiredDate(c),...source(c.acquisition),note:'',implicit:true});}return out;}
const empty=()=>({spend:0,impressions:0,clicks:0,visits:0,identified:0,customers:0,applications:0,conversions:0,revenue:0,grossProfit:0,other:0,profit:0});
const ratio=(a,b,m=1)=>b?a/b*m:null;
function metrics(t){return {...t,cpa:ratio(t.spend,t.conversions),ctr:ratio(t.clicks,t.impressions,100),cvr:ratio(t.conversions,t.clicks,100),roas:ratio(t.revenue,t.spend,100),cpc:ratio(t.spend,t.clicks),cpm:ratio(t.spend,t.impressions,1000),visitRate:ratio(t.visits,t.clicks,100),closeRate:ratio(t.conversions,t.visits,100),margin:ratio(t.profit,t.revenue,100),costPerVisit:ratio(t.spend,t.visits),profitPerVisit:ratio(t.profit,t.visits)};}
function analyze(cs,w,options={}){const {start='2000-01-01',end=F.today(),lp='',medium='',channel=''}=options,d=data(w),inside=v=>v&&v>=start&&v<=end,match=s=>(!lp||s.lp===lp)&&(!medium||s.medium===medium)&&(!channel||s.channel===channel),map=new Map(),buckets=new Map(),journeys=[];
 const row=(s,day)=>{const k=JSON.stringify([day,sourceKey(s)]);if(!map.has(k))map.set(k,{date:day,...source(s),...empty()});return map.get(k);};
 for(const r of d.records)if(inside(r.date)&&match(r)){const t=row(r,r.date);for(const k of ['spend','impressions','clicks','other'])t[k]+=r[k];if(r.visits!==null)buckets.set(bucketKey(r),{record:r,count:0});}
 const ev=events(cs,w);for(const l of ev)if(inside(l.date)&&match(l)){const t=row(l,l.date);t.identified++;const b=buckets.get(bucketKey(l));if(b)b.count++;else t.visits++;journeys.push(l);}
 for(const {record:r,count}of buckets.values())row(r,r.date).visits+=Math.max(r.visits,count);
 const ls=new Map(d.leads.map(l=>[l.id,l]));for(const c of cs){const s=source(ls.get(c.acquisition?.leadId)||c.acquisition),day=acquiredDate(c);if(inside(day)&&match(s))row(s,day).customers++;
 for(const a of c.factoringCases||[]){if(a.void)continue;const at=source(ls.get(a.adLeadId)||s);if(!match(at))continue;if(inside(a.applicationDate))row(at,a.applicationDate).applications++;
 if(a.status==='purchased'&&inside(a.purchaseDate)){const t=row(at,a.purchaseDate);t.conversions++;t.revenue+=a.invoiceAmount-a.purchaseAmount;t.grossProfit+=a.invoiceAmount-a.purchaseAmount-a.cost;}}}
 const rows=[...map.values()].map(r=>({...r,profit:r.grossProfit-r.spend-r.other}));const total=empty();for(const r of rows)for(const k of Object.keys(total))total[k]+=r[k];
 return {rows,total:metrics(total),journeys,missingDates:ev.filter(l=>!l.date).length,manualRemainder:Math.max(0,total.visits-total.identified),overReported:[...buckets.values()].filter(b=>b.count>b.record.visits).length};}
function group(rows,mode){const m=new Map();for(const r of rows){const label=mode==='month'?r.date.slice(0,7):mode==='day'?r.date:r[mode]||'未設定';if(!m.has(label))m.set(label,{label,...empty()});const t=m.get(label);for(const k of Object.keys(empty()))t[k]+=r[k];}return [...m.values()].map(metrics);}
function importNote(w,text){if(text.length>12000000)throw Error('取込は12MB以内にしてください。');const old=A.parseState(text),next=clone(w),d=next.ads=clone(data(w));let added=0,skipped=0;
 for(const r of old.records){const n={id:'ad-'+r.id,date:r.date,lp:r.lp,medium:r.medium,channel:'広告',spend:r.spend,impressions:r.impressions,clicks:r.clicks,other:r.other,visits:r.visits,note:r.note,legacy:r};const existing=d.records.find(x=>x.id===n.id||bucketKey(x)===bucketKey(n));if(existing){if(JSON.stringify(existing.legacy)===JSON.stringify(r)){skipped++;continue;}throw Error('同じ日付・LP・媒体の記録が既にあります。既存記録を確認してください（上書きしていません）。');}d.records.push(n);added++;}
 d.catalog=A.catalog([],Object.fromEntries(['lp','medium'].map(k=>[k,[...new Set([...d.catalog[k],...old.catalog[k]])]])));validate(d);return {work:next,added,skipped};}
function rename(cs,w,field,oldName,newName){if(!['lp','medium'].includes(field))throw Error('登録種別を確認してください。');newName=str(newName.trim(),field==='lp'?100:80);if(!newName)throw Error('名前を入力してください。');const next=clone(w),people=clone(cs),d=next.ads=clone(data(w));const values=catalog(cs,w)[field];if(values.includes(newName)&&oldName!==newName)throw Error('同じ名前が登録済みです。');d.catalog[field]=[...new Set([...values.filter(v=>v!==oldName),newName])];if(oldName){for(const r of [...d.records,...d.leads])if(r[field]===oldName)r[field]=newName;for(const c of people)if(c.acquisition?.[field]===oldName)c.acquisition[field]=newName;}validateLinks(people,next);return {customers:people,work:next};}
function catalog(cs,w){const d=data(w);return A.catalog([...d.records,...d.leads,...cs.map(c=>source(c.acquisition))],d.catalog);}
const api={defaults,data,channels,source,sourceKey,bucketKey,validate,validateLinks,acquiredDate,customerSource,events,analyze,group,metrics,importNote,rename,catalog};if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.CRMAds=api;
})(typeof window==='undefined'?globalThis:window);
