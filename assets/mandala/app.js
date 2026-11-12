(async function(){'use strict';
 const $=id=>document.getElementById(id),C=MandalaCore,API=MandalaAPI,params=new URLSearchParams(location.search),mini=params.get('mini')==='1',demo=['zero','town','all'].includes(params.get('demo'))?params.get('demo'):null;
 let catalog=[],data=null,selected='',request=0;
 if(mini){document.body.classList.add('mini');$('full-link').hidden=false;}
 function status(s){$('status').textContent=s;}
 function node(tag,text,cls){const e=document.createElement(tag);e.textContent=text;if(cls)e.className=cls;return e;}
 function current(){return catalog.find(s=>s.id===selected)||catalog[0];}
 function goalKey(){return data?.memberKey?'j61_goal:'+data.memberKey+':'+selected:null;}
 function readGoal(){try{return goalKey()?localStorage.getItem(goalKey())||'':'';}catch{return '';}}
 function legacy(path,query){const u=new URL('stages/'+current().id+'/'+path,location.href);for(const[k,v]of Object.entries(query||{}))u.searchParams.set(k,v);if(API.getToken())u.searchParams.set('token',API.getToken());return u.href;}
 function city(a,state){const e=node('a',a+(state?.areas[a]?.done===8?' ✓':''),'cell city'+(state?.areas[a]?.done===8?' complete':''));e.href=legacy(current().townPage,{[current().areaParam]:a});e.target=mini?'_top':'_self';e.title=current().areas[a].title;e.setAttribute('aria-label',a+' '+current().areas[a].title+' 街をひらく');return e;}
 function draw(){const stage=current();if(!stage)return;const state=data?.stages?.[stage.id]||null;$('map').replaceChildren();
  C.positions.forEach(a=>{const block=node('div','','block'+(a?'':' center'));if(a){const cells=Array(9);cells[4]=city(a,state);C.slots.forEach((slot,i)=>{const q=a+(i+1),done=Number(state?.cells[q]?.pct)>=100,e=node('a',q,'cell'+(done?' done':'')+(state?.today===q?' today':''));e.href=legacy('quest.html',{id:q});e.target=mini?'_top':'_self';e.title=stage.quests[q];e.setAttribute('aria-label',q+' '+stage.quests[q]+(done?' 完了':state?.today===q?' 今日の1マス':''));if(done)e.append(node('small','完了'));cells[slot]=e;});cells.forEach(e=>block.append(e));}else C.positions.forEach(x=>{if(x)block.append(city(x,state));else{const e=node('span',readGoal()||'自分の目標','cell goal');e.title=readGoal()||'真ん中の目標';block.append(e);}});$('map').append(block);});
  $('summary').textContent=state?stage.name+' '+state.done+'/64（'+state.percent+'%）':'達成度を確認中';$('meter').style.width=state?state.percent+'%':'0%';const bar=$('meter').parentElement;if(state)bar.setAttribute('aria-valuenow',state.done);else bar.removeAttribute('aria-valuenow');
  $('next').textContent=state?(state.today?'今日の1マス：'+state.today+' '+stage.quests[state.today]:'64マス皆伝。おめでとうございます！'):'';
  $('goal').value=readGoal();$('goal').disabled=!goalKey();$('goal-form').querySelector('button').disabled=!goalKey();
  $('full-link').href=API.link('mandala.html?stage='+encodeURIComponent(stage.id));certificates(state);
 }
 function certificates(state){$('cert-actions').replaceChildren();$('certs').replaceChildren();if(!state)return;
  const records=(data.certificates||[]).filter(c=>c.stageId===selected);for(const a of [...C.areas,'ALL']){const complete=a==='ALL'?state.done===64:state.areas[a].done===8;if(!complete)continue;const existing=records.find(c=>c.area===a);if(existing){const link=node('a',(a==='ALL'?'皆伝':a+'の街')+'のお免状をひらく');link.href=API.link('certificate.html?number='+encodeURIComponent(existing.number));const li=node('li','');li.append(link);$('certs').append(li);}else{const b=node('button',(a==='ALL'?'皆伝':a+'の街')+(demo?'の見本を見る':'のお免状を発行'));b.onclick=()=>issue(a);$('cert-actions').append(b);}}
  $('cert-hint').textContent=state.done===64?'全64マスの皆伝と、8つの街のお免状を受け取れます。':'8マスそろった街のお免状を受け取れます。発行後も何度でも開けます。';
 }
 async function issue(area){if(demo){location.href='certificate.html?demo='+(area==='ALL'?'all':'town')+'&stage='+encodeURIComponent(selected);return;}$('cert-actions').querySelectorAll('button').forEach(b=>b.disabled=true);try{const r=await API.call('issue',{stage:selected,area});if(!r.ok)throw Error(r.message);if(!(data.certificates||[]).some(c=>c.number===r.certificate.number))(data.certificates||(data.certificates=[])).push(r.certificate);draw();status('お免状を発行しました。何度でも開けます。');}catch(e){status(e.message);draw();}}
 async function load(){const id=++request;$('reload').disabled=true;status('記録を読み込んでいます…');try{let result;if(demo){result={ok:true,memberKey:'dummy',nickname:'ダミー会員',stages:{},certificates:[]};for(const s of catalog)result.stages[s.id]=C.demo(demo);}else result=await API.call('progress');if(id!==request)return;if(!result.ok)throw Error(result.message);data=result;draw();status(demo?'表示確認用のダミーデータです。':result.nickname+'さんの、今ある報告から表示しています。');}catch(e){if(id===request){data=null;draw();status(e.message||'読み込めませんでした。もう一度お試しください。');}}finally{if(id===request)$('reload').disabled=false;}}
 $('stage').onchange=()=>{selected=$('stage').value;draw();};$('reload').onclick=load;
 $('goal-form').onsubmit=e=>{e.preventDefault();try{if(goalKey())localStorage.setItem(goalKey(),$('goal').value.trim());$('goal-note').textContent='この端末に保存しました。';draw();}catch{$('goal-note').textContent='この端末には保存できませんでした。';}};
 let miniToken=null;
 if(mini&&!demo){addEventListener('message',e=>{if(e.source!==parent||!/^https:\/\/(?:script\.google\.com|(?:[a-z0-9-]+-)?script\.googleusercontent\.com)$/.test(e.origin)||e.data?.type!=='j61MiniToken'||e.data.channel!==params.get('channel'))return;API.setToken(e.data.token,false);miniToken=true;if(catalog.length)load();});parent.postMessage({type:'j61MiniReady',channel:params.get('channel')},'*');}
 else API.initialToken();
 try{const r=await fetch('assets/mandala/stages.json?v=1',{cache:'no-cache'});if(!r.ok)throw Error();catalog=await r.json();if(!catalog.length)throw Error();for(const s of catalog){const option=node('option',s.name);option.value=s.id;$('stage').append(option);}selected=catalog.some(s=>s.id===params.get('stage'))?params.get('stage'):catalog[0].id;$('stage').value=selected;if(demo)$('demo').hidden=false;draw();if(!mini||demo||miniToken)load();else status('マイページの接続を確認しています…');}catch{status('編の一覧を読み込めませんでした。ページを開き直してください。');}
})();
