'use strict';
(()=>{const normalize=value=>String(value||'').normalize('NFKC').toLowerCase().replace(/[ァ-ヶ]/g,c=>String.fromCharCode(c.charCodeAt(0)-0x60)).replace(/[\s\-‐‑–—ー()（）]+/g,'');
 const matches=(c,query)=>{const haystack=normalize([c.name,c.phone,c.lineName,c.id,c.next,...(c.history||[]).map(h=>h.text)].join(' '));return String(query||'').trim().split(/\s+/).every(part=>haystack.includes(normalize(part)));};
 window.CRMSearch={normalize,matches};
})();
