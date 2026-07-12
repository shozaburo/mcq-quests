/* ============================================================
   MCQ オーディオ基盤（BGM＋会話ブリップ音）
   - BGM: assets/bgm/{key}.mp3 を再生（ファイルが無ければ静かに何もしない）
   - ブリップ: ドラクエ風の喋り音（WebAudio生成・音声ファイル不要）
   - 画面右下に常時コントロール（🎵オンオフ・音量・🔈SEオンオフ）
   - 設定は localStorage("mcq_audio") に保存され全ページ共通
   使い方:
     MCQBgm.play('A')      … エリアAのBGMを再生（assets/bgm/A.mp3）
     MCQBgm.blip()         … 喋り音を1回鳴らす（セリフ送り中に呼ぶ）
     MCQBgm.stop()         … BGM停止
   ============================================================ */
(function(){
  'use strict';
  if(window.MCQBgm) return;

  var ST = { bgmOn:true, seOn:true, vol:0.35 };
  try{ Object.assign(ST, JSON.parse(localStorage.getItem('mcq_audio')||'{}')); }catch(e){}
  function save(){ try{ localStorage.setItem('mcq_audio', JSON.stringify(ST)); }catch(e){} }

  /* ---- パス解決（quests/ や cutscenes/ 配下からも使えるように） ---- */
  function basePath(){
    var s = document.querySelector('script[src*="bgm.js"]');
    if(s){ return s.getAttribute('src').replace(/bgm\.js.*$/, ''); } // .../assets/
    return 'assets/';
  }
  var BASE = basePath();

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
    audio.volume = ST.vol;
    if(ST.bgmOn){
      var p = audio.play();
      if(p && p.catch) p.catch(function(){
        // 自動再生ブロック → 最初のタップで再生
        var once = function(){ if(ST.bgmOn && audio){ audio.play().catch(function(){}); }
          document.removeEventListener('pointerdown', once); };
        document.addEventListener('pointerdown', once);
      });
    }
    sync();
  }
  function stop(){ if(audio){ audio.pause(); } }

  /* ---- ドラクエ風ブリップ（矩形波の短いピッ） ---- */
  var ctx = null, lastBlip = 0;
  function blip(){
    if(!ST.seOn) return;
    var now = Date.now();
    if(now - lastBlip < 45) return;   // 鳴らしすぎ防止
    lastBlip = now;
    try{
      if(!ctx) ctx = new (window.AudioContext||window.webkitAudioContext)();
      if(ctx.state === 'suspended') ctx.resume();
      var o = ctx.createOscillator(), g = ctx.createGain();
      o.type = 'square';
      o.frequency.value = 880 + Math.random()*120;   // 少し揺らす
      g.gain.setValueAtTime(0.045 * (ST.vol/0.35), ctx.currentTime);
      g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.055);
      o.connect(g); g.connect(ctx.destination);
      o.start(); o.stop(ctx.currentTime + 0.06);
    }catch(e){}
  }
  /* 決定音・正解音など（種類指定） */
  function se(kind){
    if(!ST.seOn) return;
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
        g.gain.setValueAtTime(0.06*(ST.vol/0.35), t);
        g.gain.exponentialRampToValueAtTime(0.0001, t+nd[1]);
        o.connect(g); g.connect(ctx.destination);
        o.start(t); o.stop(t+nd[1]);
        t += nd[1]*0.9;
      });
    }catch(e){}
  }

  /* ---- コントロールUI（右下固定・全ページ共通） ---- */
  function buildUI(){
    if(document.getElementById('mcqAudioCtl')) return;
    var d = document.createElement('div');
    d.id = 'mcqAudioCtl';
    d.style.cssText = 'position:fixed;right:10px;bottom:10px;z-index:9998;display:flex;gap:6px;align-items:center;'
      +'background:rgba(20,20,30,.78);border:1px solid rgba(255,255,255,.25);border-radius:999px;'
      +'padding:5px 10px;backdrop-filter:blur(4px);font-family:inherit;';
    d.innerHTML =
      '<button id="mcqBgmBtn" title="BGM オン/オフ" style="background:none;border:none;font-size:16px;cursor:pointer;line-height:1"></button>'
      +'<input id="mcqVol" type="range" min="0" max="100" style="width:64px;accent-color:#f5c542;cursor:pointer">'
      +'<button id="mcqSeBtn" title="効果音 オン/オフ" style="background:none;border:none;font-size:15px;cursor:pointer;line-height:1"></button>';
    document.body.appendChild(d);
    document.getElementById('mcqBgmBtn').onclick = function(){
      ST.bgmOn = !ST.bgmOn; save();
      if(audio){ ST.bgmOn ? audio.play().catch(function(){}) : audio.pause(); }
      sync();
    };
    document.getElementById('mcqSeBtn').onclick = function(){ ST.seOn = !ST.seOn; save(); sync(); if(ST.seOn) blip(); };
    document.getElementById('mcqVol').oninput = function(){
      ST.vol = (+this.value)/100; save();
      if(audio) audio.volume = ST.vol;
    };
    sync();
  }
  function sync(){
    var b=document.getElementById('mcqBgmBtn'), s=document.getElementById('mcqSeBtn'), v=document.getElementById('mcqVol');
    if(b) b.textContent = ST.bgmOn ? '🎵' : '🔇';
    if(s) s.textContent = ST.seOn ? '🔈' : '🔕';
    if(v) v.value = Math.round(ST.vol*100);
  }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded', buildUI);
  else buildUI();

  window.MCQBgm = { play:play, stop:stop, blip:blip, se:se, state:ST };
})();
