(function(g){'use strict';
 let token='',bridge=null,source=null,origin='',ready=null,seq=0;const pending=new Map();
 const trusted=o=>o==='https://script.google.com'||/^https:\/\/(?:[a-z0-9-]+-)?script\.googleusercontent\.com$/.test(o);
 function setToken(v,persist){token=String(v||'');if(persist&&token)try{localStorage.setItem('mcq_member_token',token);}catch{}}
 function getToken(){return token;}
 function initialToken(){const u=new URL(location.href),hash=new URLSearchParams(u.hash.slice(1));let t=u.searchParams.get('token')||hash.get('t')||'';if(!t)try{t=localStorage.getItem('mcq_member_token')||'';}catch{}if(t)setToken(t,true);if(u.searchParams.has('token')||hash.has('t')){u.searchParams.delete('token');u.hash='';history.replaceState(null,'',u.pathname+u.search);}}
 function connect(){
  if(ready)return ready;
  ready=new Promise((resolve,reject)=>{
   const url=g.MANDALA_CONFIG?.apiUrl;if(!/^https:\/\/script\.google\.com\/(?:macros|a\/macros\/ai-jissen\.com)\/s\/[\w-]+\/exec$/.test(url||'')){ready=null;reject(Error('接続先の設定を確認してください。'));return;}
   const nonce=Array.from(crypto.getRandomValues(new Uint8Array(16)),n=>n.toString(16).padStart(2,'0')).join('');
   bridge=document.createElement('iframe');bridge.hidden=true;bridge.title='達成記録の接続';bridge.referrerPolicy='no-referrer';bridge.src=url+'?view=bridge&nonce='+nonce+'&origin='+encodeURIComponent(location.origin);
   const timer=setTimeout(()=>{removeEventListener('message',receive);bridge.remove();bridge=null;ready=null;reject(Error('接続に時間がかかっています。もう一度お試しください。'));},45000);
   function receive(e){if(!trusted(e.origin)||e.data?.nonce!==nonce)return;
    if(e.data.type==='j61Ready'&&!source){source=e.source;origin=e.origin;clearTimeout(timer);resolve({nonce});}
    if(e.data.type==='j61Result'&&e.source===source){const p=pending.get(e.data.id);if(!p)return;pending.delete(e.data.id);clearTimeout(p.timer);p.resolve(e.data.result);}}
   addEventListener('message',receive);document.body.appendChild(bridge);
  });return ready;
 }
 async function call(op,input){if(!token)throw Error('マイページから入り直してください。');const {nonce}=await connect();return new Promise((resolve,reject)=>{const id=++seq,timer=setTimeout(()=>{pending.delete(id);reject(Error('読み込みが終わりませんでした。もう一度お試しください。'));},60000);pending.set(id,{resolve,reject,timer});source.postMessage({type:'j61Request',nonce,id,op,token,input:input||{}},origin);});}
 function link(path){return path+(token?'#t='+encodeURIComponent(token):'');}
 function verify(number){return new Promise((resolve,reject)=>{const callback='j61_'+Array.from(crypto.getRandomValues(new Uint8Array(12)),n=>n.toString(16).padStart(2,'0')).join(''),s=document.createElement('script');let timer;function clear(){clearTimeout(timer);delete g[callback];s.remove();}g[callback]=r=>{clear();resolve(r)};s.onerror=()=>{clear();reject(Error('番号を確認できませんでした。もう一度お試しください。'))};timer=setTimeout(s.onerror,30000);s.src=g.MANDALA_CONFIG.apiUrl+'?action=verify&number='+encodeURIComponent(number)+'&callback='+callback;document.head.append(s);});}
 g.MandalaAPI={call,setToken,getToken,initialToken,link,verify};
})(window);
