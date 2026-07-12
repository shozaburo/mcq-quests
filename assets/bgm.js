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

  var VOL_CAP = 0.30;  // 実際の最大音量（スライダー100%でもこの値まで＝うるさくなりすぎない）

  // on=マスターのオン/オフ（🔇で全部停止）。vol=スライダー(0〜1)。
  var ST = { on:true, vol:0.30 };
  try{ Object.assign(ST, JSON.parse(localStorage.getItem('mcq_audio')||'{}')); }catch(e){}
  function save(){ try{ localStorage.setItem('mcq_audio', JSON.stringify(ST)); }catch(e){} }
  // 移行：以前のうるさい設定（bgmOn/seOn/大きいvol）を一度だけ静かな既定にリセット
  if(!ST.__a6){ ST = { on:true, vol:0.30, __a6:true }; save(); }

  function actualVol(){ return Math.min(1, ST.vol) * VOL_CAP; }  // 例: vol0.35 → 0.14

  /* ---- パス解決（quests/ や cutscenes/ 配下からも動く） ---- */
  var BASE = (function(){
    var s = document.querySelector('script[src*="bgm.js"]');
    return s ? s.getAttribute('src').replace(/bgm\.js.*$/, '') : 'assets/';
  })();

  /* ---- BGM ---- */
  var audio = null, curKey = '';
  function play(key){
    if(!key) return;
    curKey = String(key);
    if(!audio){
      audio = new Audio();
      audio.loop = true;
      audio.addEventListener('error', function(){ /* ファイル未配置なら黙ってスキップ */ });
    }
    audio.src = BASE + 'bgm/' + curKey + '.mp3';
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

  /* ---- ドラクエ風ブリップ（毎回同じ固定音・控えめ） ---- */
  var ctx = null, lastBlip = 0;
  function seGain(base){ return base * (Math.min(1, ST.vol) / 0.35); }  // スライダーに追従
  function blip(){
    if(!ST.on) return;                         // 🔇なら鳴らさない
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
      g.gain.setValueAtTime(seGain(0.04), t);
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
        g.gain.setValueAtTime(seGain(0.035), t);
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
      if(audio){ ST.on ? audio.play().catch(function(){}) : audio.pause(); }
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

  window.MCQBgm = { play:play, stop:stop, blip:blip, se:se, state:ST };
})();
