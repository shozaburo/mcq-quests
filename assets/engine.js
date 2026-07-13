/* ============================================================
   MCQ β Google64 クエストゲームエンジン v3
   前提: window.PAGE({questId}) / MCQ_CONFIG / MCQ_CHARS / MCQ_QUESTS
        （任意）MCQ_URLS[qid]={related, archive, check} / MCQ_MISSIONS
   達成%: 動画25 / アーカイブ50 / クイズ(半分以上75・全問100) / 実践125-200
   v3: トークン認証（本体GAS連携）・討伐演出（EXP/ご褒美/称号）・
       討伐ムービー生成プロンプト（自分のアバター×ボス×実践内容）
   ============================================================ */
(function(){
  'use strict';
  function $(id){ return document.getElementById(id); }
  function esc(s){ return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;'); }

  var CFG   = window.MCQ_CONFIG || {};
  var PAGE  = window.PAGE || {};
  var QID   = String(PAGE.questId || '').toUpperCase();
  var AREA  = QID.charAt(0);
  var CH    = (window.MCQ_CHARS  || {})[AREA];
  var QUEST = (window.MCQ_QUESTS || {})[QID];
  var URLS  = (window.MCQ_URLS   || {})[QID] || {};
  var API   = CFG.questApiUrl || '';

  /* URL解決：クエスト定義優先→シート由来(urls.js)で補完 */
  var videoUrl   = (QUEST && QUEST.videoUrl)   || URLS.related || '';
  var archiveUrl = (QUEST && QUEST.archiveUrl) || URLS.archive || '';

  /* ── 討伐ムービー用：エリアの舞台と共通スタイル ── */
  var AREA_SCENE = {
    A:'北の雪原。フキの葉と雪の結晶が舞う静寂の野', B:'猛吹雪の秋田の山小屋。囲炉裏の火と和太鼓',
    C:'仙台の杜。木漏れ日と浮遊する枝豆の莢',       D:'高崎のだるま工房。無数のだるまと炎の家紋',
    E:'月夜の鎌倉、古刹の屋根。光る帳簿と数字の羽根', F:'夜の銀座、ネオンの海。光の魚群と音符',
    G:'甲斐の霊峰、山頂の陣。風林火山の軍旗',       H:'福井の恐竜渓谷。地層に光る化石と星空'
  };
  var STYLE_SUFFIX = 'アニメ調セルルック、シネマティック照明、被写界深度、金色×夜紺の配色、日本のファンタジーRPG風、文字や透かしは入れない';

  /* ── メンバー（v3: トークン優先／旧ID・名前も互換） ── */
  function getMember(){
    var m = { id:'', name:'', token:'', avatarUrl:'' };
    try{
      var p = new URLSearchParams(location.search);
      if(p.get('token'))  m.token = p.get('token').trim();
      if(p.get('member')) m.id    = p.get('member').trim();
      if(p.get('name'))   m.name  = p.get('name').trim();
      m.token = m.token || localStorage.getItem('mcq_member_token') || '';
      if(m.token) localStorage.setItem('mcq_member_token', m.token);
      var saved = JSON.parse(localStorage.getItem('mcq_member') || '{}');
      m.id   = m.id   || saved.id   || '';
      m.name = m.name || saved.name || '';
      m.avatarUrl = saved.avatarUrl || '';
      if(m.id || m.name) localStorage.setItem('mcq_member', JSON.stringify({id:m.id,name:m.name,avatarUrl:m.avatarUrl}));
    }catch(e){}
    return m;
  }
  var MEMBER = getMember();

  /* ── アセットのベースパス（quests/ から見た assets/） ── */
  var ASSET_BASE = (function(){
    var self = document.querySelector('script[src*="engine.js"]');
    return self ? self.getAttribute('src').replace(/engine\.js.*$/, '') : 'assets/';
  })();

  /* ── エリア背景画像を敷く（このステージ内 bg/{AREA}.png を優先） ── */
  (function setStageBg(){
    var url = "bg/" + AREA + ".png";   // ページ（stages/xxx/）からの相対＝ステージ専用背景
    var img = new Image();
    img.onload = function(){
      document.body.style.backgroundImage =
        "linear-gradient(180deg, rgba(20,14,6,.30) 0%, rgba(20,14,6,.55) 26%, rgba(244,246,251,.0) 40%, var(--bg) 46%), "
        + "url('" + url + "')";
      document.body.style.backgroundSize = "cover, cover";
      document.body.style.backgroundPosition = "center top, center top";
      document.body.style.backgroundRepeat = "no-repeat, no-repeat";
      document.body.style.backgroundAttachment = "scroll, fixed";
    };
    img.src = url;  // 無ければ既存グラデのまま
  })();

  /* ── 🏅 スコアHUD（上部固定：アバター/EXP/スコア/順位） ── */
  var QUEST_T0 = Date.now();      // タイム計測開始（ページを開いた瞬間）
  var QUIZ_MISS = 0;              // クイズのミス回数（1ミス=+10分ペナルティ）
  function localScore(){ try{ return Number(localStorage.getItem('mcq_score_'+(CFG.goalId||'x')))||0; }catch(e){ return 0; } }
  function addLocalScore(pt){ try{ localStorage.setItem('mcq_score_'+(CFG.goalId||'x'), String(localScore()+pt)); }catch(e){} }
  function buildHud(){
    if(document.getElementById('mcqScoreHud')) return;
    var me = null; try{ me = JSON.parse(localStorage.getItem('mcq_me_cache')||'null'); }catch(e){}
    var av = (me && me.member && me.member.avatarUrl) || '';
    try{ if(!av) av = localStorage.getItem('mcq_avatar_beta') || ''; }catch(e){}
    var exp = (me && me.member && me.member.exp) || 0;
    var d = document.createElement('div');
    d.id = 'mcqScoreHud';
    d.style.cssText = 'position:fixed;top:8px;right:10px;z-index:9997;display:flex;gap:8px;align-items:center;'
      +'background:rgba(20,14,6,.85);border:1px solid rgba(245,197,66,.5);border-radius:999px;'
      +'padding:4px 12px 4px 5px;color:#ffe9c0;font-size:.74rem;font-weight:800;backdrop-filter:blur(3px);';
    d.innerHTML =
      (av ? '<img src="'+esc(av)+'" style="width:28px;height:28px;border-radius:50%;object-fit:cover;border:2px solid #f5c542" alt="">'
          : '<span style="font-size:1.1rem;margin-left:4px">🧑</span>')
      + '<span>⭐<span id="hudExp">'+exp+'</span></span>'
      + '<span>🏆<span id="hudScore">'+localScore()+'</span>pt</span>'
      + '<span id="hudRank" style="color:#ffd54f"></span>';
    document.body.appendChild(d);
    // 本番ランキングから自分の順位・スコアを取得（token時のみ）
    if(API && MEMBER.token){
      try{
        fetch(API + '?action=ranking&goalId=' + encodeURIComponent(CFG.goalId||'β') + '&token=' + encodeURIComponent(MEMBER.token))
          .then(function(r){ return r.json(); })
          .then(function(j){
            if(j && j.ok && j.me){
              var sEl = document.getElementById('hudScore'), rEl = document.getElementById('hudRank');
              if(sEl && j.me.score) sEl.textContent = j.me.score;
              if(rEl && j.me.rank) rEl.textContent = '#' + j.me.rank + '位';
              try{ localStorage.setItem('mcq_score_'+(CFG.goalId||'x'), String(j.me.score||0)); }catch(e){}
            }
          }).catch(function(){});
      }catch(e){}
    }
  }
  buildHud();

  /* ── いつでもトップへ戻れる固定ボタン ── */
  (function homeBtn(){
    if(document.getElementById('mcqHome')) return;
    var a = document.createElement('a');
    a.id = 'mcqHome'; a.href = '../../index.html?start=1'; a.title = 'トップへ';
    a.textContent = '🏠 トップ';
    a.style.cssText = 'position:fixed;left:10px;top:10px;z-index:9998;background:rgba(255,255,255,.92);'
      + 'color:#9c6f08;font-weight:800;font-size:.8rem;text-decoration:none;border-radius:999px;'
      + 'padding:6px 14px;box-shadow:0 2px 8px rgba(0,0,0,.25);border:1px solid rgba(184,134,11,.4);';
    document.body.appendChild(a);
  })();

  /* ── オーディオ基盤（bgm.js）を動的ロード → エリアBGM再生 ── */
  (function loadAudio(){
    if(window.MCQBgm){ MCQBgm.play(AREA, 'bgm/'); return; }
    var t = document.createElement('script');
    t.src = ASSET_BASE + 'bgm.js?v=3';
    t.onload = function(){ if(window.MCQBgm) MCQBgm.play(AREA, 'bgm/'); };
    document.head.appendChild(t);
  })();

  /* トークンがあれば本体GASから本人情報を取得（非同期・失敗しても続行） */
  function syncMe(){
    if(!API || !MEMBER.token) return;
    try{
      fetch(API + '?action=me&token=' + encodeURIComponent(MEMBER.token))
        .then(function(r){ return r.json(); })
        .then(function(j){
          if(!j || !j.ok || !j.member) return;
          MEMBER.id = j.member.memberId || MEMBER.id;
          MEMBER.name = j.member.nick || MEMBER.name;
          MEMBER.avatarUrl = j.member.avatarUrl || '';
          try{
            localStorage.setItem('mcq_member', JSON.stringify({id:MEMBER.id,name:MEMBER.name,avatarUrl:MEMBER.avatarUrl}));
            localStorage.setItem('mcq_me_cache', JSON.stringify(j));
          }catch(e){}
        }).catch(function(){});
    }catch(e){}
  }
  syncMe();

  /* ── DOM骨組み ── */
  var root = $('app');
  root.innerHTML =
    '<div class="app">'
    + '<div class="head"><span class="badge" id="qBadge"></span><h1 id="qName"></h1></div>'
    + '<div class="stepper">'
    +   '<div class="dot" data-step="1" title="動画25%"></div>'
    +   '<div class="dot" data-step="2" title="アーカイブ50%"></div>'
    +   '<div class="dot" data-step="3" title="クイズ75/100%"></div>'
    +   '<div class="dot" data-step="4" title="実践報告"></div>'
    + '</div>'
    + '<div class="stage">'
    +   '<img class="chara" id="charaImg" alt="">'
    +   '<div class="dlg" id="dlg"><div class="nameplate" id="charaName"></div><span id="dlgText"></span><span class="cursor" id="dlgCur">▼</span></div>'
    + '</div>'
    + '<div class="card"><div id="action"></div></div>'
    + '<footer><a href="index.html">🗺️ マンダラボードへ戻る</a></footer>'
    + '</div>';

  if(!CH || !QUEST){
    $('qBadge').textContent = QID || '??';
    $('qName').textContent  = 'クエスト準備中';
    $('dlgText').textContent = 'このクエストはただいま準備中です。しばらくお待ちください。';
    $('dlgCur').style.display = 'none';
    $('action').innerHTML = '<a class="btn btn-ghost" href="index.html">🗺️ マンダラボードへ戻る</a>';
    return;
  }

  var L = CH.lines;
  function memberLabel(){ return MEMBER.name || '挑戦者'; }
  document.title = QID + ' ' + QUEST.name + ' | みんなのAI実践塾';
  document.documentElement.style.setProperty('--chara', CH.color || '#f57c00');

  $('qBadge').textContent = QID;
  $('qName').textContent  = QUEST.name;
  $('charaName').innerHTML = esc(CH.name) + '<small>' + esc(CH.title) + '</small>';

  var img = $('charaImg');
  // 等身大立ち絵（chara/{AREA}.png）があれば優先、無ければ丸アイコン→絵文字
  img.alt = CH.name;
  var tachie = 'chara/' + AREA + '.png';
  var probe = new Image();
  probe.onload = function(){ img.src = tachie; img.classList.add('tachie'); };
  probe.onerror = function(){
    img.src = CH.img;
    img.onerror = function(){
      var d = document.createElement('div'); d.className = 'chara-emoji'; d.textContent = CH.emoji || '👾';
      img.replaceWith(d);
    };
  };
  probe.src = tachie;

  /* ── セリフ ── */
  var typing = null;
  function say(text, cb){
    text = String(text || '').replace(/\{memberName\}/g, memberLabel());
    var el = $('dlgText'), cur = $('dlgCur');
    el.textContent = ''; cur.style.display = 'none';
    if(typing) clearInterval(typing);
    var i = 0;
    typing = setInterval(function(){
      i++; el.textContent = text.slice(0, i);
      if(window.MCQBgm && i % 2 === 0) MCQBgm.blip();   // ドラクエ風の喋り音
      if(i >= text.length){ clearInterval(typing); typing = null; cur.style.display = 'inline-block'; if(cb) cb(); }
    }, 22);
    $('dlg').onclick = function(){
      if(typing){ clearInterval(typing); typing = null; el.textContent = text; cur.style.display = 'inline-block'; if(cb) cb(); }
    };
  }
  function setStep(n){
    root.querySelectorAll('.stepper .dot').forEach(function(d){
      var s = Number(d.getAttribute('data-step'));
      d.classList.toggle('on', s === n); d.classList.toggle('done', s < n);
    });
  }
  function render(html){ $('action').innerHTML = '<div class="fade">' + html + '</div>'; window.scrollTo(0, 0); }

  /* 到達済みの最大% */
  var achieved = 0;
  function bump(p){ if(p > achieved) achieved = p; }

  /* ── 報告送信（v3: quest_api優先／旧logApiUrl互換） ── */
  var STEP_OF_AREA = ('ABCDEFGH'.indexOf(AREA) + 1) || '';
  function kindOf(pct){ pct=Number(pct);
    return pct>=125 ? 'practice' : pct>=75 ? 'quiz' : pct>=50 ? 'archive' : 'video'; }

  // 戻り値: Promise<serverResult|null>（quest_api時のみ結果が返る）
  function postReport(pct, practice, evidence, kind, score){
    // ① 本体GAS quest_api（トークン必須・討伐結果が返る）
    if(API && MEMBER.token){
      var body = new URLSearchParams({
        action:'report', token: MEMBER.token, goalId: CFG.goalId || 'β',
        qid: QID, pct: String(pct), step: kind || kindOf(pct),
        note: (practice || '') + (score ? '（クイズ' + score + '）' : ''),
        evidenceUrl: evidence || '',
        miss: String(QUIZ_MISS),
        timeSec: String(Math.round((Date.now() - QUEST_T0) / 1000))
      });
      return fetch(API, {
        method:'POST',
        headers:{'Content-Type':'application/x-www-form-urlencoded;charset=UTF-8'},
        body: body.toString()
      }).then(function(r){ return r.json(); }).catch(function(){
        // CORSで読めなくても送信自体は成功していることが多い
        try{
          fetch(API, { method:'POST', mode:'no-cors',
            headers:{'Content-Type':'application/x-www-form-urlencoded;charset=UTF-8'},
            body: body.toString() });
        }catch(e){}
        return null;
      });
    }
    // ② 旧：専用ログGAS（fire-and-forget）
    if(CFG.logApiUrl){
      var data = {
        memberId: MEMBER.id, memberName: MEMBER.name, goalId: CFG.goalId || '',
        area: AREA, step: String(STEP_OF_AREA), questId: QID, questName: QUEST.name,
        kind: kind || '', pct: String(pct), score: score || '',
        practice: practice || '', evidence: evidence || '',
        ua: (navigator && navigator.userAgent) ? navigator.userAgent.slice(0,120) : ''
      };
      var params = Object.keys(data).map(function(k){
        return encodeURIComponent(k) + '=' + encodeURIComponent(data[k]);
      }).join('&');
      try{
        fetch(CFG.logApiUrl, {
          method:'POST', mode:'no-cors',
          headers:{'Content-Type':'application/x-www-form-urlencoded;charset=UTF-8'},
          body: params
        });
      }catch(e){}
    }
    return Promise.resolve(null);
  }

  /* ── メンバー入力欄（トークンも旧IDも無い時のみ） ── */
  function memberFieldsHtml(){
    if(MEMBER.token || (MEMBER.id && MEMBER.name)) return '';
    return '<div class="member-box">'
      + '<div style="font-weight:800;font-size:.9rem">🙋 はじめに名乗ってください（初回のみ）</div>'
      + '<div style="font-size:.78rem;color:var(--muted)">マイページのリンクから入ると自動でログインされます</div>'
      + '<div class="field-label">メンバーID</div>'
      + '<input type="text" id="mId" value="' + esc(MEMBER.id) + '" placeholder="例：M0123">'
      + '<div class="field-label">ニックネーム</div>'
      + '<input type="text" id="mName" value="' + esc(MEMBER.name) + '" placeholder="例：たろう">'
      + '</div>';
  }
  function captureMember(){
    if(MEMBER.token) return true;
    var idEl = $('mId'), nameEl = $('mName');
    if(idEl)   MEMBER.id   = idEl.value.trim();
    if(nameEl) MEMBER.name = nameEl.value.trim();
    if(!MEMBER.id || !MEMBER.name){
      if(idEl && !MEMBER.id){ idEl.style.borderColor = '#ef5350'; idEl.focus(); }
      else if(nameEl){ nameEl.style.borderColor = '#ef5350'; nameEl.focus(); }
      return false;
    }
    try{ localStorage.setItem('mcq_member', JSON.stringify(MEMBER)); }catch(e){}
    return true;
  }

  /* ── 討伐ムービー生成プロンプト（自分のアバター×ボス×実践内容） ── */
  function battlePrompt(pct, practice, rewardName){
    var card = {};
    try{ card = JSON.parse(localStorage.getItem('mcq_card_beta') || '{}'); }catch(e){}
    var heroName  = card.name || MEMBER.name || '挑戦者';
    var heroTitle = card.title ? '『' + card.title + '』' : '';
    var skill     = card.skillName || '学びの一撃';
    var scene     = AREA_SCENE[AREA] || '幻想的な戦いの舞台';
    var deed      = practice ? '挑戦者が実際に成し遂げたこと：「' + practice + '」。この偉業のイメージが光のエフェクトとなって技に宿る。' : '';
    var gift      = rewardName ? '最後に' + CH.name + 'が「' + rewardName + '」を手渡し、二人が笑い合う。' : '最後に二人が拳を合わせ、笑い合う。';
    return '【討伐ムービー】（8秒・参照画像2枚を添付：①自分のアバター画像 ②' + CH.name + 'の画像）\n\n'
      + scene + '。挑戦者' + heroTitle + '「' + heroName + '」（参照画像①準拠）が必殺技『' + skill + '』を放つ。'
      + CH.name + '（参照画像②準拠）は正面から受け止め、ニヤリと笑って敗北を認める。'
      + deed
      + '砕けた封印のタイルが金色の光の粒になって夜空に舞い上がる。'
      + gift
      + '\n\n' + STYLE_SUFFIX;
  }
  function bossImgUrl(){ return CH.img || ''; }

  /* ───────── シーン ───────── */

  // 登場（＋2つの入口：順にやる or 実践から報告）
  function sceneIntro(){
    setStep(1);
    say(L.intro);
    var op = CH.openingVideo
      ? '<a class="btn btn-ghost" href="' + esc(CH.openingVideo) + '" target="_blank" rel="noopener">🎬 サイドストーリー（見なくてもOK）</a>' : '';
    render('<div id="senpai"></div>'
      + '<button class="btn btn-primary" id="go">📖 順番に学ぶ（動画から）</button>'
      + '<button class="btn btn-ghost" id="skip">⚡ もう実践した → 報告だけする</button>'
      + op);
    $('go').onclick = sceneVideo;
    $('skip').onclick = function(){ sceneReport(true); };
    loadSenpai();
  }

  /* 🎖 先輩コメント（このマスを100%以上で報告した人の実践） */
  var senpaiCache = null;
  function loadSenpai(){
    var box = $('senpai');
    if(!box || !API) return;
    function draw(list){
      if(!list || !list.length) return;
      var h = '<div style="background:#fdf9ef;border:1.5px solid #e8d9b0;border-radius:12px;padding:10px 13px;margin-bottom:12px">'
        + '<div style="font-weight:900;font-size:.82rem;color:#9c6f08;margin-bottom:6px">🎖 このクエストの先輩たち</div>';
      list.forEach(function(c){
        h += '<div style="font-size:.82rem;margin-top:4px;line-height:1.6">'
          + '<span class="pct pct-' + (c.pct>=200?'200':c.pct>=150?'150':c.pct>=125?'125':'100') + '">' + c.pct + '%</span> '
          + '<b>' + esc(c.nick) + '</b>' + (c.date ? '<small style="color:var(--muted)">（' + esc(c.date) + '）</small>' : '')
          + '<br><span style="color:#5a5245">「' + esc(c.note) + '」</span></div>';
      });
      h += '</div>';
      var el = $('senpai'); if(el) el.innerHTML = h;
    }
    if(senpaiCache){ draw(senpaiCache); return; }
    try{
      fetch(API + '?action=comments&goalId=' + encodeURIComponent(CFG.goalId||'β') + '&qid=' + QID)
        .then(function(r){ return r.json(); })
        .then(function(j){ if(j && j.ok){ senpaiCache = j.comments || []; draw(senpaiCache); } })
        .catch(function(){});
    }catch(e){}
  }

  // STEP1 動画 25%
  //   ステージ内 video/{QID}.mp4 があればページ内で直接再生（探す手間ゼロ）。
  //   無ければ従来どおり外部リンク（NotebookLM等）ボタン。
  function sceneVideo(){
    setStep(1);
    say(L.video);
    var vBtn = videoUrl
      ? '<a class="btn btn-blue" id="extVideo" href="' + esc(videoUrl) + '" target="_blank" rel="noopener">▶ 解説動画を見る</a>'
      : '<button class="btn btn-blue" id="extVideo" disabled>▶ 解説動画（準備中）</button>';
    render(
      '<video id="qVideo" controls playsinline preload="metadata" '
      +   'style="display:none;width:100%;max-height:320px;border-radius:12px;background:#000;margin-bottom:4px"></video>'
      + vBtn
      + '<button class="btn btn-primary" id="watched">見た！ <span class="pct pct-25">25%</span> → 次へ</button>');
    $('watched').onclick = function(){ bump(25); sceneArchive(); };

    // ローカル動画があれば埋め込み再生に切り替え
    var v = $('qVideo');
    v.addEventListener('loadedmetadata', function(){
      v.style.display = 'block';
      var ext = $('extVideo');
      if(ext){ ext.textContent = '🔗 元ページ（NotebookLM）も開く'; ext.classList.remove('btn-blue'); ext.classList.add('btn-ghost'); }
      if(window.MCQTrack) MCQTrack('video_inline', (CFG.goalId||'?') + ':' + QID);
    });
    v.addEventListener('error', function(){ v.remove(); });   // 無ければ従来表示のまま
    // 動画再生中はBGM・喋り音を止める（音が重なってうるさいのを防ぐ）
    v.addEventListener('play', function(){
      if(window.MCQBgm) MCQBgm.duck();
      if(typing){ clearInterval(typing); typing = null; }   // 喋りアニメも止める
      if(window.MCQTrack) MCQTrack('video_play', (CFG.goalId||'?') + ':' + QID);
    });
    v.addEventListener('pause', function(){ if(window.MCQBgm) MCQBgm.unduck(); });   // 元に戻す
    v.addEventListener('ended', function(){ if(window.MCQBgm){ MCQBgm.unduck(); MCQBgm.se('ok'); } bump(25); });
    v.src = 'video/' + QID + '.mp4';
  }

  // STEP2 アーカイブ 50%
  function sceneArchive(){
    setStep(2);
    say(L.archive || '次はアーカイブだ。過去の実演を見て、手を動かすイメージを固めよ。');
    var aBtn = archiveUrl
      ? '<a class="btn btn-blue" href="' + esc(archiveUrl) + '" target="_blank" rel="noopener">📁 アーカイブ（実演）を見る</a>'
      : '<button class="btn btn-blue" disabled>📁 アーカイブ（準備中）</button>';
    render(aBtn
      + '<button class="btn btn-primary" id="aWatched">見た！ <span class="pct pct-50">50%</span> → クイズへ</button>'
      + '<button class="btn btn-ghost" id="aSkip">クイズは飛ばして報告する</button>');
    $('aWatched').onclick = function(){ bump(50); answered = 0; sceneQuiz(0); };
    $('aSkip').onclick = function(){ bump(50); sceneReport(false); };
  }

  // STEP3 クイズ（1問ずつ）＝ボスへの「こうげき」
  var answered = 0, quizPct = 0;
  var KANJI = '一二三四五六七八九十';
  function sceneQuiz(qi){
    setStep(3);
    if(qi===0 && window.MCQTrack) MCQTrack('quiz_start', (CFG.goalId||'?') + ':' + QID);
    var item = QUEST.quiz[qi];
    say('第' + (KANJI.charAt(qi) || (qi+1)) + '問！ ' + item.q);
    var html = '<div class="qcount">問題 ' + (qi+1) + ' / ' + QUEST.quiz.length + '　⚔️ 正解＝こうげき！</div>';
    item.choices.forEach(function(c, ci){
      html += '<div class="choice" data-ci="' + ci + '">' + esc(c) + '<span class="mark"></span></div>';
    });
    html += '<button class="btn btn-primary" id="nextQ" disabled>選択肢を選ぼう</button>';
    render(html);

    var picked = null;
    root.querySelectorAll('#action .choice').forEach(function(ch){
      ch.onclick = function(){
        if(picked !== null) return;
        picked = Number(ch.getAttribute('data-ci'));
        var ans = Number(item.answer), ok = (picked === ans);
        root.querySelectorAll('#action .choice').forEach(function(c){
          var ci = Number(c.getAttribute('data-ci'));
          if(ci === ans){ c.classList.add('correct'); c.querySelector('.mark').textContent = '◯'; }
          else if(ci === picked){ c.classList.add('wrong'); c.querySelector('.mark').textContent = '✕'; }
        });
        if(ok){ answered++; say(L.correct[qi % L.correct.length] + ' ' + item.explain); if(window.MCQBgm) MCQBgm.se('ok'); }
        else  { QUIZ_MISS++; say(L.wrong + item.explain); if(window.MCQBgm) MCQBgm.se('ng'); }
        var nb = $('nextQ'); nb.removeAttribute('disabled');
        nb.textContent = (qi+1 < QUEST.quiz.length) ? '次の問いへ →' : '審判を受ける →';
        nb.onclick = function(){ (qi+1 < QUEST.quiz.length) ? sceneQuiz(qi+1) : sceneScore(); };
      };
    });
  }

  function sceneScore(){
    setStep(3);
    var total = QUEST.quiz.length, c = answered;
    // 合格ライン：半分以上=75%、全問=100%
    quizPct = (c === total) ? 100 : (c >= Math.ceil(total/2) ? 75 : 0);
    if(window.MCQTrack) MCQTrack('quiz_score', (CFG.goalId||'?') + ':' + QID + ':' + quizPct);
    if(quizPct === 100) say(L.score100);
    else if(quizPct === 75) say(L.score75);
    else say(L.scoreFail);
    if(quizPct > 0) bump(quizPct);
    var html = '<div class="score-wrap"><div class="score-big">' + c + ' / ' + total + '</div>';
    if(quizPct > 0) html += '<div class="score-pct">獲得：<span class="pct ' + (quizPct === 100 ? 'pct-100' : 'pct-75') + '">' + quizPct + '%</span></div>';
    html += '</div>';
    if(quizPct > 0){
      html += '<button class="btn btn-primary" id="toReport">🚀 報告へ進む →</button>'
            + '<button class="btn btn-ghost" id="retry">もう一度挑む（100%を狙う）</button>';
    } else {
      html += '<button class="btn btn-primary" id="retry">🔥 もう一度挑む</button>'
            + '<button class="btn btn-ghost" id="backVideo">動画を見直す</button>';
    }
    render(html);
    if($('toReport')) $('toReport').onclick = function(){ sceneReport(false); };
    if($('retry')) $('retry').onclick = function(){ answered = 0; sceneQuiz(0); };
    if($('backVideo')) $('backVideo').onclick = sceneVideo;
  }

  // STEP4 報告（実践優先・不正チェック）
  //   fromSkip=true のときは実践125%を既定選択
  function sceneReport(fromSkip){
    setStep(4);
    say(fromSkip ? (L.ladder) : (L.ladder));
    var levels = [];
    // これまでの学習到達（動画/アーカイブ/クイズ）
    if(!fromSkip){
      if(achieved >= 100)      levels.push({pct:100, cls:'pct-100', t:'クイズに全問正解した', d:'完璧な理解！'});
      else if(achieved >= 75)  levels.push({pct:75,  cls:'pct-75',  t:'クイズに合格した', d:'半分以上正解！'});
      else if(achieved >= 50)  levels.push({pct:50,  cls:'pct-50',  t:'動画とアーカイブを見た', d:'学びの土台ができた'});
      else                     levels.push({pct:25,  cls:'pct-25',  t:'動画を見た', d:'第一歩！'});
    }
    // 実践ラダー（常に選べる。125%以上は証拠必須）
    var MIS = (window.MCQ_MISSIONS || {})[QID];
    levels.push({
      pct:125, cls:'pct-125',
      t:'実践ミッションをやった' + (MIS && MIS.social ? ' 🍙' : ''),
      d: MIS ? MIS.m125 : '学んだことを自分の資料・業務で実際に使った',
      needEv:true, social: !!(MIS && MIS.social)
    });
    levels.push({pct:150, cls:'pct-150', t:'仲間と勉強会をした', d:'このテーマで仲間に教えた・一緒に学んだ', needEv:true});
    levels.push({pct:200, cls:'pct-200', t:'飛躍的な成果が出た', d:'売上UP・大幅時短・新商品などの大きな成果', needEv:true});

    var html = memberFieldsHtml();
    if(fromSkip){
      html += '<div style="font-size:.85rem;color:var(--muted);margin-bottom:6px">'
            + 'クイズを飛ばして実践から報告します。証拠の添付をお願いします（みんなの記録として残ります）。</div>';
    }
    levels.forEach(function(o, i){
      html += '<label class="opt' + (i===0?' sel':'') + '" data-need="' + (o.needEv?'1':'0') + '">'
            + '<input type="radio" name="lv" value="' + o.pct + '"' + (i===0?' checked':'') + '>'
            + '<div><b>' + esc(o.t) + ' <span class="pct ' + o.cls + '">' + o.pct + '%</span></b>'
            + '<small>' + esc(o.d) + (o.needEv?' <b style="color:#c62828">※証拠必須</b>':'') + '</small></div></label>';
    });
    if(MIS && MIS.social){
      html += '<div style="font-size:.82rem;background:#fff8e1;border:1px dashed #f0c36d;border-radius:10px;padding:8px 12px;margin:2px 0 6px">'
            + '🍙 <b>サンクスUP!の試練</b>：このミッションは仲間を巻き込むと完了。助けてくれた仲間には、ボードの「🍙サンクスUP!」で感謝を送ろう（相手に+3Pt・あなたに+8EXP）。</div>';
    }
    html += '<div class="field-label">実践したこと・感想（チャットにも共有されます）</div>'
          + '<textarea id="rP" rows="2" placeholder="例：自社の資料で実際に試して、こう活かせた"></textarea>'
          + '<div class="field-label">証拠URL（スクショ・ドライブ等）<span id="evReq" style="color:#c62828"></span></div>';
    if(MIS && MIS.evidence){
      html += '<div style="font-size:.8rem;color:var(--muted);margin-top:2px">📎 証拠の例：' + esc(MIS.evidence) + '</div>';
    }
    html += '<input type="url" id="rE" placeholder="https://...（実践報告は必須）">'
          + '<button class="btn btn-green" id="submit">⚔️ この内容で報告する（こうげき！）</button>';
    render(html);

    function refreshEvReq(){
      var sel = root.querySelector('.opt.sel');
      var need = sel && sel.getAttribute('data-need') === '1';
      $('evReq').textContent = need ? '（必須）' : '（任意）';
    }
    root.querySelectorAll('#action .opt').forEach(function(op){
      op.onclick = function(){
        root.querySelectorAll('#action .opt').forEach(function(o){ o.classList.remove('sel'); });
        op.classList.add('sel'); op.querySelector('input').checked = true;
        refreshEvReq();
      };
    });
    refreshEvReq();

    $('submit').onclick = function(){
      if(!captureMember()) return;
      var sel = root.querySelector('.opt.sel');
      var need = sel && sel.getAttribute('data-need') === '1';
      var lv = root.querySelector('input[name="lv"]:checked');
      var pct = lv ? lv.value : String(achieved || 25);
      var practice = $('rP').value.trim();
      var evidence = $('rE').value.trim();
      // 不正抑止：実践125%以上は証拠URL必須
      if(need && !/^https?:\/\/.+/.test(evidence)){
        $('rE').style.borderColor = '#ef5350';
        $('rE').placeholder = '実践報告には証拠URLが必要です（https://…）';
        $('rE').focus();
        return;
      }
      var score = (quizPct > 0) ? (answered + '/' + QUEST.quiz.length) : '';
      var btn = $('submit'); btn.disabled = true; btn.textContent = '⚔️ 送信中…';
      if(window.MCQTrack) MCQTrack('report_sent', (CFG.goalId||'?') + ':' + QID + ':' + pct);
      postReport(pct, practice, evidence, kindOf(pct), score).then(function(res){
        sceneDone(pct, practice, res);
      });
    };
  }

  // v3: 討伐演出（EXP・ご褒美・称号・討伐ムービープロンプト・記録タイム）
  function sceneDone(pct, practice, res){
    setStep(4);
    say(L.done.replace('{pct}', pct));

    // 🏅 スコア＆記録タイム計算
    var quizDone = (quizPct > 0);
    var noMiss = quizDone && QUIZ_MISS === 0;
    var pt = (function(n){ n=Number(n)||0;
      if(n>=200)return 300; if(n>=150)return 250; if(n>=125)return 225;
      if(n>=100)return 100; if(n>=75)return 75; return 0; })(pct) + (noMiss ? 50 : 0);
    addLocalScore(pt);
    var hudS = document.getElementById('hudScore'); if(hudS) hudS.textContent = localScore();
    var elapsed = Math.round((Date.now() - QUEST_T0) / 1000);
    var rec = elapsed + QUIZ_MISS * 600;
    function fmt(s){ return Math.floor(s/60) + ':' + ('0' + (s%60)).slice(-2); }

    var html = '<div style="text-align:center;font-size:3rem">🎊</div>'
      + '<div style="text-align:center;font-weight:900;font-size:1.3rem;margin:4px 0">' + pct + '% で報告完了！</div>'
      + '<div style="text-align:center;margin:6px 0">'
      +   '<span style="display:inline-block;background:#fff8e1;border:1.5px solid #f0c36d;border-radius:999px;padding:4px 16px;font-weight:900;color:#9c6f08">🏆 +' + pt + 'pt</span>'
      +   (noMiss ? ' <span style="display:inline-block;background:#e8f5e9;border:1.5px solid #66bb6a;border-radius:999px;padding:4px 16px;font-weight:900;color:#2e7d32">⭐ ノーミス討伐！ +50pt込</span>' : '')
      + '</div>'
      + (quizDone
        ? '<div style="text-align:center;font-size:.85rem;color:var(--muted)">⏱ 記録タイム <b>' + fmt(rec) + '</b>'
          + (QUIZ_MISS > 0 ? '（実測 ' + fmt(elapsed) + ' ＋ ミス' + QUIZ_MISS + '回 ×10分）' : '（ノーミス・実測どおり！）')
          + '</div>'
        : '');

    // 本体GAS連携時の戦果表示
    if(res && res.ok){
      if(res.promoted && res.expGained){
        html += '<div style="text-align:center;font-weight:900;color:#2e7d32;font-size:1.1rem;margin:4px 0">'
              + '⚔️ 討伐成功！ +' + res.expGained + ' EXP 獲得！</div>';
      }
      if(res.rewards && res.rewards.length){
        res.rewards.forEach(function(rw){
          html += '<div style="display:flex;gap:10px;align-items:center;background:#fff8e1;border:1.5px solid #f0c36d;border-radius:12px;padding:10px 12px;margin:6px 0">'
            + (rw.imageUrl ? '<img src="' + esc(rw.imageUrl) + '" style="width:56px;height:56px;object-fit:cover;border-radius:8px" alt="">' : '<span style="font-size:2rem">🎁</span>')
            + '<div><b>お土産を解放！『' + esc(rw.rewardName) + '』</b>'
            + (rw.prefecture ? '<br><small>' + esc(rw.prefecture) + 'の銘品</small>' : '')
            + '</div></div>';
        });
      }
      if(res.title){
        html += '<div style="text-align:center;font-weight:900;color:#b8860b;margin:6px 0">'
              + '👑 称号獲得！『' + esc(res.title) + '』</div>';
      }
    } else {
      html += '<div style="text-align:center;color:var(--muted);font-size:.9rem">'
        + esc(MEMBER.name ? MEMBER.name + ' さんの活動として記録されました' : 'あなたの活動が記録に加わりました') + '</div>';
    }

    // 討伐ムービー生成（実践100%以上で解放）
    if(Number(pct) >= 100){
      var rewardName = (res && res.rewards && res.rewards[0]) ? res.rewards[0].rewardName : '';
      var bp = battlePrompt(pct, practice, rewardName);
      html += '<div style="background:#0f1740;color:#eef4ff;border-radius:12px;padding:11px 13px;margin-top:12px">'
        + '<div style="font-weight:900;margin-bottom:6px">🎬 討伐ムービーを作ろう（あなたが主役！）</div>'
        + '<div style="font-size:.8rem;opacity:.85;margin-bottom:8px">呪文をコピーして動画AIに貼り、<b>①自分のアバター画像</b>（🃏挑戦者カードで作ったもの）と<b>②ボスの画像</b>を添付するだけ。</div>'
        + '<pre id="bpText" style="white-space:pre-wrap;font-size:.78rem;line-height:1.6;background:#080d24;border-radius:8px;padding:10px;max-height:180px;overflow:auto">' + esc(bp) + '</pre>'
        + '<div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:8px">'
        + '<button class="btn btn-primary" id="cpBp" style="font-size:.85rem">📋 呪文をコピー</button>'
        + '<a class="btn btn-blue" href="https://gemini.google.com/" target="_blank" rel="noopener" style="font-size:.85rem">🪄 Geminiで生成</a>'
        + '<a class="btn btn-ghost" href="' + esc(bossImgUrl()) + '" target="_blank" rel="noopener" style="font-size:.85rem">🖼 ボス画像を開く</a>'
        + '</div></div>';
    }

    // 🖼 アバターを本体に登録（ランキング・Chatにも反映）
    var hasLocalAvatar = false;
    try{ hasLocalAvatar = !!localStorage.getItem('mcq_avatar_beta'); }catch(e){}
    if(hasLocalAvatar && API && MEMBER.token){
      html += '<button class="btn btn-ghost" id="setAvatar" style="margin-top:10px">🖼 このアバターをランキング・Chatにも登録する</button>';
    }

    var ed = CH.endingVideo
      ? '<a class="btn btn-blue" href="' + esc(CH.endingVideo) + '" target="_blank" rel="noopener" style="margin-top:10px">🎬 サイドストーリー（討伐後）</a>' : '';
    html += ed
      + '<a class="btn btn-primary" href="index.html" style="margin-top:14px">🗺️ マンダラボードへ戻る</a>'
      + '<button class="btn btn-ghost" id="again">このクエストを最初から</button>';
    render(html);

    var setAv = $('setAvatar');
    if(setAv) setAv.onclick = function(){
      setAv.disabled = true; setAv.textContent = '🖼 登録中…';
      var b64 = '';
      try{ b64 = localStorage.getItem('mcq_avatar_beta') || ''; }catch(e){}
      var body = new URLSearchParams({ action:'saveAvatar', token: MEMBER.token, imageBase64: b64 });
      fetch(API, { method:'POST', headers:{'Content-Type':'application/x-www-form-urlencoded;charset=UTF-8'}, body: body.toString() })
        .then(function(r){ return r.json(); })
        .then(function(j){
          setAv.textContent = (j && j.ok) ? '✅ 登録しました！ランキングにも反映されます' : '⚠ ' + ((j && j.error) || '登録失敗');
        }).catch(function(){ setAv.textContent = '⚠ 通信エラー'; });
    };
    if($('cpBp')) $('cpBp').onclick = function(){
      var t = $('bpText').textContent;
      (navigator.clipboard ? navigator.clipboard.writeText(t) : Promise.reject()).then(function(){
        $('cpBp').textContent = '✅ コピーしました！';
      }).catch(function(){ $('cpBp').textContent = '⚠ 手動で選択してコピーしてください'; });
    };
    $('again').onclick = function(){ answered = 0; quizPct = 0; achieved = 0; sceneIntro(); };
  }

  sceneIntro();
  if(window.MCQTrack) MCQTrack('quest_view', (CFG.goalId||'?') + ':' + QID);
})();
