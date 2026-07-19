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
  var AB    = CFG.stageAssetBase || '';   // 背景/BGMを他ステージと共用する時のベース（β2→google64）

  /* ── v9: 並行ルート（⚡Spark / 🆓無料）──
     QUEST.routes = { spark:{t,d,m125,evidence}, free:{t,d,m125,evidence} } がある
     マスだけ有効。選択は localStorage（マスごと）＋グローバル既定（mcq_spark_on）。 */
  var ROUTES = (QUEST && QUEST.routes) || null;
  function sparkUser(){ try{ return localStorage.getItem('mcq_spark_on') === '1'; }catch(e){ return false; } }
  function routeKey(){ return 'mcq_route_' + (CFG.goalId||'x') + '_' + QID; }
  function currentRoute(){
    if(!ROUTES) return '';
    try{
      var r = localStorage.getItem(routeKey());
      if(r === 'spark' || r === 'free') return r;
    }catch(e){}
    return sparkUser() ? 'spark' : 'free';
  }
  function setRoute(r){
    try{
      localStorage.setItem(routeKey(), r);
      if(r === 'spark') localStorage.setItem('mcq_spark_on', '1');   // 一度⚡を選んだ人は以降⚡が既定
    }catch(e){}
  }

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
    var url = AB + "bg/" + AREA + ".png";   // ページ（stages/xxx/）からの相対＝ステージ専用背景
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

  /* ── オーディオ基盤（bgm.js?v=7）を動的ロード → エリアBGM再生 ── */
  (function loadAudio(){
    if(window.MCQBgm){ MCQBgm.play(AREA, AB + 'bgm/'); return; }
    var t = document.createElement('script');
    t.src = ASSET_BASE + 'bgm.js?v=8';
    t.onload = function(){ if(window.MCQBgm) MCQBgm.play(AREA, AB + 'bgm/'); };
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
    + '<footer><a href="town.html?a=' + AREA + '">🏘 街にもどる</a>　<a href="map.html">🗾 エリアマップ</a></footer>'
    + '</div>';

  if(!CH || !QUEST){
    $('qBadge').textContent = QID || '??';
    $('qName').textContent  = 'クエスト準備中';
    $('dlgText').textContent = 'このクエストはただいま準備中です。しばらくお待ちください。';
    $('dlgCur').style.display = 'none';
    $('action').innerHTML = '<a class="btn btn-ghost" href="town.html?a=' + AREA + '">🏘 街にもどる</a>';
    return;
  }

  var L = CH.lines;
  function memberLabel(){ return MEMBER.name || '挑戦者'; }
  document.title = QID + ' ' + QUEST.name + ' | みんなのAI実践塾';
  document.documentElement.style.setProperty('--chara', CH.color || '#f57c00');

  $('qBadge').textContent = QID;
  $('qName').textContent  = QUEST.name;

  /* v9: 必要プランバッジ（β2〜のデータにplanがある時だけ表示） */
  var PLAN_BADGE = {
    free:  { t:'🆓 無料でOK',              bg:'#e8f5e9', bd:'#66bb6a', fg:'#2e7d32' },
    pro:   { t:'💎 Google AI Pro',         bg:'#e3f2fd', bd:'#42a5f5', fg:'#1565c0' },
    ultra: { t:'⚡ Ultra（Gemini Spark）',  bg:'#fff3e0', bd:'#ffa726', fg:'#e65100' },
    ws:    { t:'🏢 Workspace Business+',   bg:'#e0f2f1', bd:'#26a69a', fg:'#00695c' }
  };
  if(QUEST.plan && PLAN_BADGE[QUEST.plan]){
    var pb = PLAN_BADGE[QUEST.plan];
    var pbEl = document.createElement('span');
    pbEl.textContent = pb.t;
    pbEl.style.cssText = 'display:inline-block;margin-left:8px;font-size:.66rem;font-weight:900;'
      + 'background:' + pb.bg + ';border:1.5px solid ' + pb.bd + ';color:' + pb.fg + ';'
      + 'border-radius:999px;padding:2px 10px;vertical-align:middle;white-space:nowrap';
    var qn = $('qName'); if(qn) qn.appendChild(pbEl);
    if(ROUTES){
      var pbNote = document.createElement('span');
      pbNote.textContent = ((ROUTES.free && ROUTES.free.t) || '🆓 無料ルート') + 'あり';
      pbNote.style.cssText = pbEl.style.cssText.replace(pb.bg,'#e8f5e9').replace(pb.bd,'#66bb6a').replace(pb.fg,'#2e7d32');
      qn.appendChild(pbNote);
    }
  }
  $('charaName').innerHTML = esc(CH.name) + '<small>' + esc(CH.title) + '</small>';

  var img = $('charaImg');
  // クエスト画面はセリフ枠と並ぶので「顔アイコン（バストアップ）」で表示。
  //   全身立ち絵は縦に間延びしてバランスが悪いため、ここでは使わない。
  //   優先: CH.img（顔アイコン chara/{AREA}_icon.png）→ 無ければ絵文字。
  img.alt = CH.name;
  function toEmoji(){
    var d = document.createElement('div'); d.className = 'chara-emoji'; d.textContent = CH.emoji || '🧑‍🏫';
    if(img.parentNode) img.replaceWith(d);
  }
  if(CH.img){
    img.classList.remove('tachie');   // バスト表示（104x104角丸・object-fit:cover）
    img.onerror = toEmoji;
    img.src = CH.img;
  } else {
    toEmoji();
  }

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
    }, 10);
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
        timeSec: String(Math.round((Date.now() - QUEST_T0) / 1000)),
        route: ROUTES ? currentRoute() : ''
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

  /* ── 📷 証拠画像の添付アップロード（v10）──
     CFG.evidenceUpload が true のステージのみ有効。
     画像を端末側で縮小(JPEG/最大1600px)→ GAS quest_api の action=uploadEvidence へ
     text/plain JSONでPOST → マス別アーカイブDriveフォルダに保存され、URLが返る。
     GAS側の対応が必要（α_GAS改修_画像添付_貼り付けコード.md 参照）。未対応でも
     失敗時はURL貼り付けに誘導するだけで壊れない。 */
  function compressImage(file){
    return new Promise(function(resolve, reject){
      var fr = new FileReader();
      fr.onerror = function(){ reject(new Error('read error')); };
      fr.onload = function(){
        var img = new Image();
        img.onerror = function(){ reject(new Error('not an image')); };
        img.onload = function(){
          var MAX = 1600;
          var w = img.width, h = img.height;
          if(w > MAX || h > MAX){
            var r = Math.min(MAX / w, MAX / h);
            w = Math.round(w * r); h = Math.round(h * r);
          }
          var cv = document.createElement('canvas');
          cv.width = w; cv.height = h;
          cv.getContext('2d').drawImage(img, 0, 0, w, h);
          resolve(cv.toDataURL('image/jpeg', 0.85));
        };
        img.src = fr.result;
      };
      fr.readAsDataURL(file);
    });
  }
  function uploadEvidence(dataUrl, filename){
    return fetch(API, {
      method:'POST',
      headers:{'Content-Type':'text/plain;charset=UTF-8'},  // preflight回避（GASはこれで応答が読める）
      body: JSON.stringify({
        action:'uploadEvidence', token: MEMBER.token || '', goalId: CFG.goalId || '',
        qid: QID, memberName: MEMBER.name || '', filename: filename || 'evidence.jpg',
        dataUrl: dataUrl
      })
    }).then(function(r){ return r.json(); });
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

  /* ── v11: 絆ムービー／絆イラスト（α用・CFG.bondMovie）──
     γの「討伐」ではなく、AIとの関係性がテーマ。
     チャッピーは3年前に突如現れた心の友。頼れる相談相手。
     でも頼り「切って」いないか——主役はAIではなく、対話するあなた自身。
     全体（これまでの学び）と部分（今日のひとつ）と関係性（結ぶ線）を1枚に。
     書き込んだ実践内容（practice）をそのまま作品に織り込む。 */
  function bondPrompts(practice){
    var card = {};
    try{ card = JSON.parse(localStorage.getItem('mcq_card_beta') || '{}'); }catch(e){}
    var heroName = card.name || MEMBER.name || '挑戦者';
    var deed = (practice && practice.trim())
      ? practice.trim()
      : '今日のクエスト「' + (QUEST.name || QID) + '」で学んだこと';
    var refs = '（参照画像2枚を添付：①自分の挑戦者カード（アバター）画像 ②' + (CH.name || '先生') + 'の画像）';
    var movie = '【絆ムービー】（8秒）' + refs + '\n\n'
      + '夕方のAIセミナールーム。窓の外に街の灯りがともりはじめる。\n'
      + '挑戦者「' + heroName + '」（参照画像①準拠）が、' + (CH.title || '') + 'の' + (CH.name || '先生') + '（参照画像②準拠）と机をはさんで向かい合い、今日の実践を報告している——「' + deed + '」。\n'
      + '言葉が淡い金色の光の粒になって二人の間を行き交い、挑戦者のノートに小さな星として積もっていく（これまでの学び＝全体の中に、今日のひとつ＝部分が加わる）。\n'
      + (CH.name || '先生') + 'は答えを差し出すのではなく、嬉しそうに耳を立てて聞き、最後にそっと前足を挙げる。挑戦者は自分の足で立ち上がり、扉へ歩き出す。' + (CH.name || '先生') + 'は窓辺で見送り、しっぽを振る。\n'
      + 'テーマ：AIに頼り切るのではなく、対話を通じて自分で考え、自分で歩く「ほどよい距離の友情」。主役はAIではなく人間。\n'
      + '水彩絵本調のアニメーション、あたたかい光、やさしく静かな余韻。文字・ロゴ・実在ブランドは描かない。';
    var image = '【絆イラスト】（1枚）' + refs + '\n\n'
      + '夕暮れのAIセミナールームで、挑戦者「' + heroName + '」（参照画像①準拠）と' + (CH.name || '先生') + '（参照画像②準拠）が机をはさんで語り合っている一場面。\n'
      + '机には今日の実践「' + deed + '」を書いたノートが開かれ、ページから小さな金色の光が立ちのぼる。\n'
      + '二人のまわりには、これまでの学びが星座のように浮かび（全体）、今日の学びがその中でひときわ輝き（部分）、挑戦者と' + (CH.name || '先生') + 'を結ぶやわらかな光の線（関係性）が描かれる。\n'
      + '構図の主役は' + (CH.name || '先生') + 'ではなく挑戦者。' + (CH.name || '先生') + 'は半歩引いた聞き役として描く。\n'
      + '水彩絵本調、あたたかいパステルカラー、やさしい表情。文字・ロゴ・実在ブランドは描かない。';
    return { movie: movie, image: image };
  }

  /* ───────── シーン ───────── */

  /* v9: ルート選択チップ（⚡Spark / 🆓無料）。routes を持つマスだけ表示 */
  function routeHtml(){
    if(!ROUTES) return '';
    var cur = currentRoute();
    function chip(key, o){
      var on = (cur === key), spark = (key === 'spark');
      return '<div class="rchip" data-r="' + key + '" style="flex:1;min-width:140px;cursor:pointer;border-radius:12px;padding:9px 11px;'
        + 'border:2px solid ' + (on ? (spark ? '#ffa726' : '#66bb6a') : 'rgba(128,128,128,.35)') + ';'
        + 'background:' + (on ? (spark ? '#fff3e0' : '#e8f5e9') : 'rgba(128,128,128,.06)') + ';opacity:' + (on ? '1' : '.8') + '">'
        + '<b style="font-size:.85rem">' + esc(o.t || (spark ? '⚡ Sparkルート' : '🆓 無料ルート')) + (on ? ' ✔' : '') + '</b>'
        + '<div style="font-size:.72rem;color:var(--muted);margin-top:2px;line-height:1.5">' + esc(o.d || '') + '</div></div>';
    }
    return '<div style="margin-bottom:10px">'
      + '<div style="font-weight:900;font-size:.8rem;margin-bottom:5px">🛣 進め方を選ぼう（あとから変更OK・どちらでも100%になれる）</div>'
      + '<div id="routeBox" style="display:flex;gap:8px;flex-wrap:wrap">'
      + chip('free',  ROUTES.free  || {})
      + chip('spark', ROUTES.spark || {})
      + '</div></div>';
  }
  function wireRoute(rerender){
    var box = $('routeBox'); if(!box) return;
    box.querySelectorAll('.rchip').forEach(function(c){
      c.onclick = function(){ setRoute(c.getAttribute('data-r')); if(window.MCQBgm) MCQBgm.se('ok'); rerender(); };
    });
  }

  // 登場（＋2つの入口：順にやる or 実践から報告）
  function sceneIntro(){
    setStep(1);
    say(L.intro);
    var op = CH.openingVideo
      ? '<a class="btn btn-ghost" href="' + esc(CH.openingVideo) + '" target="_blank" rel="noopener">🎬 サイドストーリー（見なくてもOK）</a>' : '';
    render(routeHtml()
      + '<div id="senpai"></div>'
      + '<button class="btn btn-primary" id="go">📖 順番に学ぶ（動画から）</button>'
      + '<button class="btn btn-ghost" id="skip">⚡ もう実践した → 報告だけする</button>'
      + op);
    wireRoute(sceneIntro);
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
          + (c.route === 'spark' ? '<span title="Sparkルートで達成">⚡</span> ' : '')
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
  //   優先順位：①ステージ内 video/{QID}.mp4 をページ内再生
  //             ②本番サーバー(re-gi.jp)の同mp4（テスト環境用フォールバック）
  //             ③アーカイブ動画へ直リンク（動画に直で行ける）
  //             ④最後の手段：NotebookLMページ（ラベルで明示）
  //   ※「動画を押したらNotebookLMが開いて迷う」問題への対策。
  //     mp4が再生できる時は外部ボタンを一切出さない。
  var REMOTE_VIDEO_BASE = (function(){
    try{
      if(location.hostname === 're-gi.jp') return '';   // 本番上ではローカル=本番
      var m = location.pathname.match(/\/stages\/([^\/]+)\//);
      return m ? 'https://re-gi.jp/mcq-site/stages/' + m[1] + '/video/' : '';
    }catch(e){ return ''; }
  })();
  function sceneVideo(){
    setStep(1);
    say(L.video);
    // mp4が無い時の外部ボタン：アーカイブ動画（直で見られる）を最優先
    var extHtml = archiveUrl
      ? '<a class="btn btn-blue" href="' + esc(archiveUrl) + '" target="_blank" rel="noopener">▶ 解説動画（アーカイブ）を見る</a>'
      : (videoUrl
        ? '<a class="btn btn-blue" href="' + esc(videoUrl) + '" target="_blank" rel="noopener">🔗 解説ページを開く（NotebookLM）</a>'
        : '<button class="btn btn-blue" disabled>▶ 解説動画（準備中）</button>');
    // 📊 要点インフォグラフィック（Driveの画像を全体表示・タップで拡大）
    var infoId = URLS.info || '';
    var infoHtml = infoId
      ? '<a href="https://drive.google.com/file/d/' + esc(infoId) + '/view" target="_blank" rel="noopener" '
        +   'style="display:block;text-decoration:none;margin-bottom:12px" title="タップで拡大">'
        + '<img src="https://drive.google.com/thumbnail?id=' + esc(infoId) + '&sz=w1600" alt="要点インフォグラフィック" '
        +   'style="width:100%;border-radius:12px;display:block;border:1px solid rgba(255,255,255,.18)" '
        +   'onerror="this.parentNode.style.display=\'none\'">'
        + '<div style="text-align:center;font-size:.75rem;color:#9aa;margin-top:4px">📊 このクエストの要点（タップで拡大）</div></a>'
      : '';
    render(
      infoHtml
      + '<video id="qVideo" controls playsinline preload="metadata" '
      +   'style="display:none;width:100%;max-height:320px;border-radius:12px;background:#000;margin-bottom:4px"></video>'
      + '<div id="extWrap">' + extHtml + '</div>'
      + '<button class="btn btn-primary" id="watched">見た！ <span class="pct pct-25">25%</span> → 次へ</button>');
    $('watched').onclick = function(){ bump(25); sceneArchive(); };

    // mp4があれば埋め込み再生に切り替え（外部ボタンは隠して迷いをなくす）
    var v = $('qVideo');
    var triedRemote = false;
    v.addEventListener('loadedmetadata', function(){
      v.style.display = 'block';
      var w = $('extWrap'); if(w) w.style.display = 'none';
      if(window.MCQTrack) MCQTrack('video_inline', (CFG.goalId||'?') + ':' + QID);
    });
    v.addEventListener('error', function(){
      if(!triedRemote && (REMOTE_VIDEO_BASE || URLS.mp4)){
        triedRemote = true;
        // urls.js の mp4 が他ステージ相対（../google64/…）なら本番サーバーの同パスへ
        v.src = URLS.mp4
          ? 'https://re-gi.jp/mcq-site/stages/' + String(URLS.mp4).replace(/^(\.\.\/)+/, '')
          : REMOTE_VIDEO_BASE + QID + '.mp4';
        return;
      }
      // mp4がどこにも無い → Google Driveの動画をページ内に埋め込む
      //（NotebookLMからDL済みの動画。リンク共有=全員閲覧可を確認済み）
      var driveId = URLS.drive || '';
      if(driveId){
        var ifr = document.createElement('iframe');
        ifr.src = 'https://drive.google.com/file/d/' + driveId + '/preview';
        ifr.setAttribute('allow', 'autoplay; fullscreen');
        ifr.setAttribute('allowfullscreen', '');
        ifr.style.cssText = 'width:100%;height:320px;border:none;border-radius:12px;background:#000;margin-bottom:4px;display:block';
        v.replaceWith(ifr);
        var w2 = $('extWrap'); if(w2) w2.style.display = 'none';
        if(window.MCQTrack) MCQTrack('video_drive', (CFG.goalId||'?') + ':' + QID);
        return;
      }
      v.remove();   // Drive動画も無ければ外部ボタン（アーカイブ）のまま
    });
    // 動画再生中はBGM・喋り音を止める（音が重なってうるさいのを防ぐ）
    v.addEventListener('play', function(){
      if(window.MCQBgm) MCQBgm.duck();
      if(typing){ clearInterval(typing); typing = null; }   // 喋りアニメも止める
      if(window.MCQTrack) MCQTrack('video_play', (CFG.goalId||'?') + ':' + QID);
    });
    v.addEventListener('pause', function(){ if(window.MCQBgm) MCQBgm.unduck(); });   // 元に戻す
    v.addEventListener('ended', function(){ if(window.MCQBgm){ MCQBgm.unduck(); MCQBgm.se('ok'); } bump(25); });
    v.src = URLS.mp4 || ('video/' + QID + '.mp4');
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
    // v9: ルート別ミッション（routes[route].m125/evidence があれば上書き）
    var MIS = (window.MCQ_MISSIONS || {})[QID];
    var RT = ROUTES ? (ROUTES[currentRoute()] || {}) : null;
    if(RT && (RT.m125 || RT.evidence)) MIS = Object.assign({}, MIS || {}, RT);
    var routeTag = ROUTES ? (currentRoute() === 'spark' ? '（⚡Spark）' : '（🆓無料）') : '';
    levels.push({
      pct:125, cls:'pct-125',
      t:'実践ミッションをやった' + routeTag + (MIS && MIS.social ? ' 🍙' : ''),
      d: MIS ? MIS.m125 : '学んだことを自分の資料・業務で実際に使った',
      needEv:true, social: !!(MIS && MIS.social)
    });
    levels.push({pct:150, cls:'pct-150', t:'仲間と勉強会をした', d:'このテーマで仲間に教えた・一緒に学んだ', needEv:true});
    levels.push({pct:200, cls:'pct-200', t:'飛躍的な成果が出た', d:'売上UP・大幅時短・新商品などの大きな成果', needEv:true});

    var html = routeHtml() + memberFieldsHtml();
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
    var UP = !!(CFG.evidenceUpload && API);   // v10: 画像添付が使えるステージか
    html += '<div class="field-label">実践したこと・感想（チャットにも共有されます）</div>'
          + '<textarea id="rP" rows="2" placeholder="例：自社の資料で実際に試して、こう活かせた"></textarea>'
          + '<div class="field-label">証拠（スクショ' + (UP ? 'の画像添付 or ' : '・') + 'URL）<span id="evReq" style="color:#c62828"></span></div>';
    if(MIS && MIS.evidence){
      html += '<div style="font-size:.8rem;color:var(--muted);margin-top:2px">📎 証拠の例：' + esc(MIS.evidence) + '</div>';
    }
    if(UP){
      html += '<label class="btn btn-ghost" style="display:block;text-align:center;cursor:pointer;margin:6px 0 2px">'
            + '📷 画像を添付する（スマホのスクショOK）'
            + '<input type="file" id="rImg" accept="image/*" style="display:none"></label>'
            + '<div id="rImgInfo" style="font-size:.8rem;color:var(--muted);text-align:center"></div>'
            + '<div style="font-size:.74rem;color:var(--muted);text-align:center;margin-bottom:4px">またはURLを貼る👇（どちらか一方でOK）</div>';
    }
    html += '<input type="url" id="rE" placeholder="https://...' + (UP ? '（画像を添付した場合は空欄でOK）' : '（実践報告は必須）') + '">'
          + '<button class="btn btn-green" id="submit">⚔️ この内容で報告する（こうげき！）</button>';
    render(html);

    // v10: 画像選択→端末側で縮小して保持（送信時にアップロード）
    var pendingImg = null;
    if(UP){
      $('rImg').onchange = function(){
        var f = this.files && this.files[0];
        if(!f) return;
        $('rImgInfo').textContent = '🖼 画像を縮小中…';
        compressImage(f).then(function(dataUrl){
          pendingImg = { dataUrl: dataUrl, name: (f.name || 'evidence.jpg').replace(/\.[^.]+$/, '') + '.jpg' };
          var kb = Math.round(dataUrl.length * 0.75 / 1024);
          $('rImgInfo').textContent = '✅ 添付準備OK：' + f.name + '（約' + kb + 'KB・報告と一緒に送信されます）';
        }).catch(function(){
          pendingImg = null;
          $('rImgInfo').textContent = '⚠ この画像は読み込めませんでした。別の画像かURL貼り付けをお試しください。';
        });
      };
    }

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
    wireRoute(function(){ sceneReport(fromSkip); });   // v9: 報告画面でもルート切替可

    $('submit').onclick = function(){
      if(!captureMember()) return;
      var sel = root.querySelector('.opt.sel');
      var need = sel && sel.getAttribute('data-need') === '1';
      var lv = root.querySelector('input[name="lv"]:checked');
      var pct = lv ? lv.value : String(achieved || 25);
      var practice = $('rP').value.trim();
      var evidence = $('rE').value.trim();
      // 不正抑止：実践125%以上は証拠（画像添付 or URL）必須
      if(need && !/^https?:\/\/.+/.test(evidence) && !pendingImg){
        $('rE').style.borderColor = '#ef5350';
        $('rE').placeholder = UP ? '画像を添付するか、証拠URLを貼ってください' : '実践報告には証拠URLが必要です（https://…）';
        $('rE').focus();
        return;
      }
      var score = (quizPct > 0) ? (answered + '/' + QUEST.quiz.length) : '';
      var btn = $('submit'); btn.disabled = true;
      // v10: 添付画像があれば先にアップロードして証拠URLに変換
      var pre = Promise.resolve(evidence);
      if(pendingImg){
        btn.textContent = '📷 画像をアップロード中…';
        pre = uploadEvidence(pendingImg.dataUrl, pendingImg.name).then(function(j){
          if(j && j.ok && j.url) return evidence ? evidence + ' ' + j.url : j.url;
          throw new Error((j && j.error) || 'upload failed');
        });
      }
      pre.then(function(ev){
        btn.textContent = '⚔️ 送信中…';
        if(window.MCQTrack) MCQTrack('report_sent', (CFG.goalId||'?') + ':' + QID + ':' + pct);
        return postReport(pct, practice, ev, kindOf(pct), score).then(function(res){
          sceneDone(pct, practice, res);
        });
      }).catch(function(){
        btn.disabled = false; btn.textContent = '⚔️ この内容で報告する（こうげき！）';
        $('rImgInfo').textContent = '⚠ 画像のアップロードに失敗しました。通信環境をご確認のうえ再送するか、スクショをドライブ等に上げてURLを貼ってください。';
        if(window.MCQTrack) MCQTrack('evidence_upload_fail', (CFG.goalId||'?') + ':' + QID);
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

    // v9: ⚡Sparkルートで達成した記録（街ページの⚡表示・照合用）
    var doneRoute = ROUTES ? currentRoute() : '';
    if(doneRoute === 'spark'){
      try{
        var sk = 'mcq_spark_done_' + (CFG.goalId||'x');
        var arr = JSON.parse(localStorage.getItem(sk) || '[]');
        if(arr.indexOf(QID) < 0){ arr.push(QID); localStorage.setItem(sk, JSON.stringify(arr)); }
      }catch(e){}
    }

    var html = '<div style="text-align:center;font-size:3rem">🎊</div>'
      + '<div style="text-align:center;font-weight:900;font-size:1.3rem;margin:4px 0">' + pct + '% で報告完了！</div>'
      + (doneRoute
        ? '<div style="text-align:center;margin:2px 0"><span style="display:inline-block;border-radius:999px;padding:3px 14px;font-weight:900;font-size:.8rem;'
          + (doneRoute === 'spark'
            ? 'background:#fff3e0;border:1.5px solid #ffa726;color:#e65100">⚡ Sparkルートで達成！'
            : 'background:#e8f5e9;border:1.5px solid #66bb6a;color:#2e7d32">🆓 無料ルートで達成！')
          + '</span></div>'
        : '')
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

    // ムービー生成（実践100%以上で解放）
    if(Number(pct) >= 100 && CFG.bondMovie){
      // v11: α用「絆ムービー／絆イラスト」——テーマはAIとの関係性（哲学おまけ）
      var bpr = bondPrompts(practice);
      html += '<div style="background:#0f1740;color:#eef4ff;border-radius:12px;padding:11px 13px;margin-top:12px">'
        + '<div style="font-weight:900;margin-bottom:6px">🐕 きょうの「' + esc(CH.name || '先生') + 'と私」を作品にしよう（あなたが主役！）</div>'
        + '<div style="font-size:.8rem;opacity:.85;margin-bottom:8px;line-height:1.7">'
        +   'チャッピーは3年前に突如現れた、たよれる心の友。……でも、頼り<b>切って</b>いないかな？<br>'
        +   'この作品のテーマは<b>「AIとの関係性」</b>——全体（これまでの学び）・部分（今日のひとつ）・関係性（結ぶ線）。'
        +   '主役はAIではなく、対話するあなた自身です。書き込んだ実践の内容が、そのまま作品に織り込まれます。</div>'
        + '<div style="font-size:.78rem;opacity:.8;margin-bottom:6px">🎬 動画AI用（Veo・Sora等）／🖼 画像AI用、好きな方をコピーして、下のボタンで<b>①自分のアバター画像</b>と<b>②' + esc(CH.name || '先生') + 'の画像</b>を添付するだけ。</div>'
        + '<div style="font-weight:800;font-size:.78rem;margin-top:6px">🎬 絆ムービーの呪文（8秒動画）</div>'
        + '<pre id="bpMovie" style="white-space:pre-wrap;font-size:.78rem;line-height:1.6;background:#080d24;border-radius:8px;padding:10px;max-height:140px;overflow:auto">' + esc(bpr.movie) + '</pre>'
        + '<div style="font-weight:800;font-size:.78rem;margin-top:8px">🖼 絆イラストの呪文（1枚画像）</div>'
        + '<pre id="bpImage" style="white-space:pre-wrap;font-size:.78rem;line-height:1.6;background:#080d24;border-radius:8px;padding:10px;max-height:140px;overflow:auto">' + esc(bpr.image) + '</pre>'
        + '<div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:8px">'
        + '<button class="btn btn-primary" id="cpMovie" style="font-size:.82rem">📋 ムービー呪文をコピー</button>'
        + '<button class="btn btn-primary" id="cpImage" style="font-size:.82rem">📋 イラスト呪文をコピー</button>'
        + '</div>'
        + '<div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:8px">'
        + '<a class="btn btn-ghost" id="dlBoss" href="' + esc(CH.tachie || CH.img || '') + '" download="' + esc(CH.name || 'sensei') + '.png" style="font-size:.82rem">🐕 ' + esc(CH.name || '先生') + 'の画像をDL</a>'
        + '<button class="btn btn-ghost" id="dlAvatar" style="font-size:.82rem">🃏 自分のアバター画像をDL</button>'
        + '<a class="btn btn-blue" href="https://gemini.google.com/" target="_blank" rel="noopener" style="font-size:.82rem">🪄 Geminiで生成</a>'
        + '</div></div>';
    } else if(Number(pct) >= 100){
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
      + '<a class="btn btn-primary" href="town.html?a=' + AREA + '" style="margin-top:14px">🏘 街にもどる（次のクエストへ）</a>'
      + '<a class="btn btn-ghost" href="index.html">🧩 全体マップ（マンダラ盤面）</a>'
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
    // v11: 絆ムービー／イラストのコピー＆アバターDL
    function wireCopy(btnId, preId, label){
      var b = $(btnId); if(!b) return;
      b.onclick = function(){
        var t = $(preId).textContent;
        (navigator.clipboard ? navigator.clipboard.writeText(t) : Promise.reject()).then(function(){
          b.textContent = '✅ コピーしました！';
        }).catch(function(){ b.textContent = '⚠ 手動で選択してコピーしてください'; });
      };
    }
    wireCopy('cpMovie', 'bpMovie');
    wireCopy('cpImage', 'bpImage');
    if($('dlAvatar')) $('dlAvatar').onclick = function(){
      var b64 = '';
      try{ b64 = localStorage.getItem('mcq_avatar_beta') || ''; }catch(e){}
      if(!b64){
        $('dlAvatar').textContent = '🃏 まず挑戦者カードを作ってね（トップ→挑戦者カード）';
        return;
      }
      var a = document.createElement('a');
      a.href = b64.indexOf('data:') === 0 ? b64 : 'data:image/png;base64,' + b64;
      a.download = 'avatar.png';
      document.body.appendChild(a); a.click(); a.remove();
      $('dlAvatar').textContent = '✅ 保存しました！';
    };
    $('again').onclick = function(){ answered = 0; quizPct = 0; achieved = 0; sceneIntro(); };
  }

  sceneIntro();
  if(window.MCQTrack) MCQTrack('quest_view', (CFG.goalId||'?') + ':' + QID);
})();
