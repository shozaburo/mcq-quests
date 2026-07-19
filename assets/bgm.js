/* ============================================================
   MCQ オーディオ基盤（BGM＋会話ブリップ音）
   - BGM: assets/bgm/{key}.mp3 を再生（ファイルが無ければ静かに何もしない）
   - ブリップ: ドラクエ風の喋り音（WebAudio生成・音声ファイル不要）
   - 画面右下に「🔊/🔇ワンボタン・ミュート」＋音量スライダー
   - 🔇にすると BGM も効果音も全部止まる。設定は localStorage("mcq_audio") 共通。
   使い方:
     MCQBgm.play('A')   … エリアAのBGMを再生（assets/bgm/A.mp3）
     MCQBgm.blip()      … 喋り音を1回鳴らす
     MCQBgm.stop()      … BGM停止
   ============================================================ */
(function(){
  'use strict';
  if(window.MCQBgm) return;

  var VOL_CAP = 0.20;  // 実際の最大音量（スライダー100%でもこの値まで＝うるさくなりすぎない）

  // on=マスターのオン/オフ（🔇で全部停止）。vol=スライダー(0〜1)。
  // ★既定はオフ＝自動再生しない。🔊ボタンを押した人だけ鳴る（うるさくない）
  var ST = { on:false, vol:0.30 };
  try{ Object.assign(ST, JSON.parse(localStorage.getItem('mcq_audio')||'{}')); }catch(e){}
  function save(){ try{ localStorage.setItem('mcq_audio', JSON.stringify(ST)); }catch(e){} }
  // 移行：以前オンだった人も一度だけ静かな既定（オフ）にリセット
  if(!ST.__a7){ ST = { on:false, vol:0.30, __a7:true }; save(); }

  function actualVol(){ return Math.min(1, ST.vol) * VOL_CAP; }  // 例: vol0.35 → 0.14

  /* ---- パス解決（quests/ や cutscenes/ 配下からも動く） ---- */
  var BASE = (function(){
    var s = document.querySelector('script[src*="bgm.js"]');
    return s ? s.getAttribute('src').replace(/bgm\.js.*$/, '') : 'assets/';
  })();

  /* ---- BGM ---- */
  //   play(key)          … 共通 assets/bgm/{key}.mp3
  //   play(key,'bgm/')   … ステージ内 bgm/{key}.mp3（ページからの相対パス）
  var audio = null, curKey = '';
  function play(key, dir){
    if(!key) return;
    curKey = String(key);
    if(!audio){
      audio = new Audio();
      audio.loop = true;
      audio.addEventListener('error', function(){ /* ファイル未配置なら黙ってスキップ */ });
    }
    audio.src = (dir || (BASE + 'bgm/')) + curKey + '.mp3';
    audio.volume = actualVol();
    if(ST.on){
      var p = audio.play();
      if(p && p.catch) p.catch(function(){
        var once = function(){ if(ST.on && audio){ audio.play().catch(function(){}); }
          document.removeEventListener('pointerdown', once); };
        document.addEventListener('pointerdown', once);
      });
    }
    sync();
  }
  function stop(){ if(audio){ audio.pause(); } }

  /* ---- 動画再生中の一時消音（ダッキング）----
     動画の音声とBGM／喋り音が重なってうるさいのを防ぐ。
     duck()で止め、unduck()で（🔇でなければ）元に戻す。 */
  var ducked = false;
  function duck(){ ducked = true; if(audio){ audio.pause(); } }
  function unduck(){ ducked = false; if(audio && ST.on){ audio.play().catch(function(){}); } }

  /* ---- ドラクエ風ブリップ（毎回同じ固定音・控えめ） ---- */
  var ctx = null, lastBlip = 0;
  function seGain(base){ return base * (Math.min(1, ST.vol) / 0.35); }  // スライダーに追従
  function blip(){
    if(!ST.on || ducked) return;               // 🔇 or 動画再生中は鳴らさない
    var now = Date.now();
    if(now - lastBlip < 38) return;
    lastBlip = now;
    try{
      if(!ctx) ctx = new (window.AudioContext||window.webkitAudioContext)();
      if(ctx.state === 'suspended') ctx.resume();
      var t = ctx.currentTime;
      var o = ctx.createOscillator(), g = ctx.createGain(), lp = ctx.createBiquadFilter();
      o.type = 'square'; o.frequency.value = 440;
      lp.type = 'lowpass'; lp.frequency.value = 2600;
      g.gain.setValueAtTime(seGain(0.022), t);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.05);
      o.connect(lp); lp.connect(g); g.connect(ctx.destination);
      o.start(t); o.stop(t + 0.055);
    }catch(e){}
  }
  function se(kind){
    if(!ST.on) return;                         // 🔇なら鳴らさない
    try{
      if(!ctx) ctx = new (window.AudioContext||window.webkitAudioContext)();
      if(ctx.state === 'suspended') ctx.resume();
      var seq = kind==='ok' ? [[660,.07],[880,.1]] :
                kind==='ng' ? [[220,.15]] :
                kind==='fanfare' ? [[523,.1],[659,.1],[784,.1],[1047,.25]] :
                [[740,.06]];
      var t = ctx.currentTime;
      seq.forEach(function(nd){
        var o=ctx.createOscillator(), g=ctx.createGain();
        o.type='square'; o.frequency.value=nd[0];
        g.gain.setValueAtTime(seGain(0.02), t);
        g.gain.exponentialRampToValueAtTime(0.0001, t+nd[1]);
        o.connect(g); g.connect(ctx.destination);
        o.start(t); o.stop(t+nd[1]);
        t += nd[1]*0.9;
      });
    }catch(e){}
  }

  /* ---- コントロールUI（右下・ワンボタン・ミュート＋音量） ---- */
  function buildUI(){
    if(document.getElementById('mcqAudioCtl')) return;
    var d = document.createElement('div');
    d.id = 'mcqAudioCtl';
    d.style.cssText = 'position:fixed;right:10px;bottom:10px;z-index:9998;display:flex;gap:8px;align-items:center;'
      +'background:rgba(20,20,30,.8);border:1px solid rgba(255,255,255,.25);border-radius:999px;'
      +'padding:5px 12px;backdrop-filter:blur(4px);font-family:inherit;';
    d.innerHTML =
      '<button id="mcqMute" title="音 オン/オフ（全部）" style="background:none;border:none;font-size:17px;cursor:pointer;line-height:1"></button>'
      +'<input id="mcqVol" type="range" min="0" max="100" title="音量" style="width:66px;accent-color:#f5c542;cursor:pointer">';
    document.body.appendChild(d);
    document.getElementById('mcqMute').onclick = function(){
      ST.on = !ST.on; save();
      if(audio){ (ST.on && !ducked) ? audio.play().catch(function(){}) : audio.pause(); }
      sync();
    };
    document.getElementById('mcqVol').oninput = function(){
      ST.vol = (+this.value)/100; save();
      if(audio) audio.volume = actualVol();
    };
    sync();
  }
  function sync(){
    var b=document.getElementById('mcqMute'), v=document.getElementById('mcqVol');
    if(b) b.textContent = ST.on ? '🔊' : '🔇';
    if(v) v.value = Math.round(ST.vol*100);
  }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded', buildUI);
  else buildUI();

  window.MCQBgm = { play:play, stop:stop, blip:blip, se:se, duck:duck, unduck:unduck, state:ST };

  /* ============================================================
     📊 MCQTrack — 離脱率計測（全ページ共通）
     - どのページも MCQTrack('イベント名','詳細') を呼ぶだけ
     - ローカル: localStorage "mcq_funnel" にイベント別カウントを常時集計
       （GAS未接続でも開発者モードのファネル表示で離脱箇所が見える）
     - サーバー: questApiUrl 設定時は GAS へ no-cors 送信（サイトイベントに蓄積）
     ============================================================ */
  var ROOT = BASE.replace(/assets\/$/,'');           // サイトルート相対
  function sid(){
    try{
      var s = localStorage.getItem('mcq_sid');
      if(!s){ s = 's' + Date.now().toString(36) + Math.random().toString(36).slice(2,8);
        localStorage.setItem('mcq_sid', s); }
      return s;
    }catch(e){ return 'anon'; }
  }
  window.MCQTrack = function(ev, detail){
    ev = String(ev||''); detail = String(detail==null?'':detail);
    if(!ev) return;
    // ① ローカル集計（常時）
    try{
      var f = JSON.parse(localStorage.getItem('mcq_funnel')||'{}');
      var k = ev + (detail ? ':'+detail : '');
      f[k] = (f[k]||0) + 1;
      localStorage.setItem('mcq_funnel', JSON.stringify(f));
    }catch(e){}
    // ② サーバー送信（questApiUrl 設定時のみ）
    try{
      var api = (window.MCQ_CONFIG||{}).questApiUrl || localStorage.getItem('mcq_api') || '';
      if(api){
        var body = 'action=track&sid='+encodeURIComponent(sid())
          +'&ev='+encodeURIComponent(ev)+'&detail='+encodeURIComponent(detail)
          +'&page='+encodeURIComponent(location.pathname.split('/').slice(-2).join('/'))
          +'&ua='+encodeURIComponent((navigator.userAgent||'').slice(0,80));
        fetch(api, {method:'POST', mode:'no-cors',
          headers:{'Content-Type':'application/x-www-form-urlencoded;charset=UTF-8'}, body:body});
      }
    }catch(e){}
  };

  /* ============================================================
     🛠 開発者モード（URL不要・永続）
     - タイトル画面の下部ロゴを素早く5回タップで ON/OFF
     - ON中は全ページ左下に DEV バー（ジャンプ・リセット・ファネル表示）
     ============================================================ */
  function devOn(){ try{ return localStorage.getItem('mcq_dev')==='1'; }catch(e){ return false; } }
  window.MCQDevToggle = function(){
    var on = !devOn();
    try{ localStorage.setItem('mcq_dev', on?'1':'0'); }catch(e){}
    location.reload();
  };
  function buildDev(){
    if(!devOn() || document.getElementById('mcqDevBar')) return;
    var d = document.createElement('div');
    d.id = 'mcqDevBar';
    d.style.cssText = 'position:fixed;left:10px;bottom:10px;z-index:9999;background:rgba(15,25,15,.93);'
      +'color:#9fe8a5;border:1px solid #4b9e57;border-radius:12px;padding:7px 10px;'
      +'font:11px Consolas,monospace;display:flex;flex-direction:column;gap:5px;max-width:260px;';
    function btn(t){ return '<button style="background:#22304a;color:#cfe8ff;border:1px solid #556;border-radius:6px;padding:2px 8px;font:11px Consolas,monospace;cursor:pointer" data-dev="'+t+'">'+t+'</button>'; }
    d.innerHTML = '<b>🛠 DEV MODE</b>'
      +'<div style="display:flex;gap:4px;flex-wrap:wrap">'
      + btn('トップ')+btn('β盤')+btn('β2盤')+btn('γ盤')+btn('λ盤')+btn('α盤')+btn('β導入')+btn('β2導入')+btn('γ導入')+btn('λ導入')+btn('α導入')+btn('教室')+btn('カード')+'</div>'
      +'<div style="display:flex;gap:4px;flex-wrap:wrap">'
      + btn('ファネル')+btn('進捗リセット')+btn('DEV解除')+'</div>'
      +'<div id="mcqDevOut" style="max-height:150px;overflow:auto;white-space:pre-wrap"></div>';
    document.body.appendChild(d);
    d.addEventListener('click', function(e){
      var t = e.target.getAttribute && e.target.getAttribute('data-dev');
      if(!t) return;
      var R = ROOT;
      if(t==='トップ') location.href = R+'index.html?start=1';
      else if(t==='β盤') location.href = R+'stages/google64/index.html?skipintro=1';
      else if(t==='β2盤') location.href = R+'stages/google64v2/index.html?skipintro=1';
      else if(t==='β2導入') location.href = R+'stages/google64v2/intro.html';
      else if(t==='γ盤') location.href = R+'stages/claude64/index.html?skipintro=1';
      else if(t==='β導入') location.href = R+'stages/google64/intro.html';
      else if(t==='γ導入') location.href = R+'stages/claude64/intro.html';
      else if(t==='λ盤') location.href = R+'stages/mimasaka/index.html?skipintro=1';
      else if(t==='λ導入') location.href = R+'stages/mimasaka/intro.html';
      else if(t==='α盤') location.href = R+'stages/chatgpt64/index.html?skipintro=1';
      else if(t==='α導入') location.href = R+'stages/chatgpt64/intro.html';
      else if(t==='教室') location.href = R+'nyumon.html';
      else if(t==='カード') location.href = R+'card.html';
      else if(t==='ファネル'){
        var f = {}; try{ f = JSON.parse(localStorage.getItem('mcq_funnel')||'{}'); }catch(e2){}
        var keys = Object.keys(f).sort();
        document.getElementById('mcqDevOut').textContent =
          keys.length ? keys.map(function(k){ return f[k]+'× '+k; }).join('\n') : '（まだイベントなし）';
      }
      else if(t==='進捗リセット'){
        try{ Object.keys(localStorage).forEach(function(k){
          if(/^mcq_(tutorial|nyumon|intro|funnel|me_cache|member$|card_beta|avatar_beta)/.test(k)) localStorage.removeItem(k); });
        }catch(e3){}
        document.getElementById('mcqDevOut').textContent = '進捗・ファネルをリセットしました';
      }
      else if(t==='DEV解除'){ MCQDevToggle(); }
    });
  }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded', buildDev);
  else buildDev();
})();
