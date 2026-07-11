/* ============================================================
   MCQ β Google64 クエストゲームエンジン v2
   前提: window.PAGE({questId}) / MCQ_CONFIG / MCQ_CHARS / MCQ_QUESTS
        （任意）MCQ_URLS[qid]={related, archive, check}
   達成%: 動画25 / アーカイブ50 / クイズ(半分以上75・全問100) / 実践125-200
   ステップ1から順でなくてOK（実践優先）。実践125%以上は証拠URL必須（不正抑止）。
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

  /* URL解決：クエスト定義優先→シート由来(urls.js)で補完 */
  var videoUrl   = (QUEST && QUEST.videoUrl)   || URLS.related || '';
  var archiveUrl = (QUEST && QUEST.archiveUrl) || URLS.archive || '';

  /* ── メンバーID・名前 ── */
  function getMember(){
    var m = { id:'', name:'' };
    try{
      var p = new URLSearchParams(location.search);
      if(p.get('member')) m.id   = p.get('member').trim();
      if(p.get('name'))   m.name = p.get('name').trim();
      var saved = JSON.parse(localStorage.getItem('mcq_member') || '{}');
      m.id   = m.id   || saved.id   || '';
      m.name = m.name || saved.name || '';
      if(m.id || m.name) localStorage.setItem('mcq_member', JSON.stringify(m));
    }catch(e){}
    return m;
  }
  var MEMBER = getMember();

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
    + '<footer><a href="../index.html">🗺️ マンダラボードへ戻る</a></footer>'
    + '</div>';

  if(!CH || !QUEST){
    $('qBadge').textContent = QID || '??';
    $('qName').textContent  = 'クエスト準備中';
    $('dlgText').textContent = 'このクエストはただいま準備中です。しばらくお待ちください。';
    $('dlgCur').style.display = 'none';
    $('action').innerHTML = '<a class="btn btn-ghost" href="../index.html">🗺️ マンダラボードへ戻る</a>';
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
  img.src = CH.img; img.alt = CH.name;
  img.onerror = function(){
    var d = document.createElement('div'); d.className = 'chara-emoji'; d.textContent = CH.emoji || '👾';
    img.replaceWith(d);
  };

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

  /* ── 報告送信 ── */
  var STEP_OF_AREA = ('ABCDEFGH'.indexOf(AREA) + 1) || '';
  function postReport(pct, practice, evidence, kind, score){
    var data = {
      memberId: MEMBER.id, memberName: MEMBER.name, goalId: CFG.goalId || '',
      area: AREA, step: String(STEP_OF_AREA), questId: QID, questName: QUEST.name,
      kind: kind || '', pct: String(pct), score: score || '',
      practice: practice || '', evidence: evidence || '',
      ua: (navigator && navigator.userAgent) ? navigator.userAgent.slice(0,120) : ''
    };
    // ① 新シート：GAS Web API（推奨）
    if(CFG.logApiUrl){
      var params = Object.keys(data).map(function(k){
        return encodeURIComponent(k) + '=' + encodeURIComponent(data[k]);
      }).join('&');
      try{
        fetch(CFG.logApiUrl, {
          method:'POST', mode:'no-cors',
          headers:{'Content-Type':'application/x-www-form-urlencoded;charset=UTF-8'},
          body: params
        });
        return true;
      }catch(e){}
    }
    // ② 予備：既存Googleフォーム（logApiUrl未設定かつform設定時のみ）
    var F = CFG.form || {};
    if(F.actionUrl && F.entry && F.entry.pct){
      var f = $('gform'); f.action = F.actionUrl; f.innerHTML = '';
      var E = F.entry;
      function add(id, val){ if(!id) return; var i = document.createElement('input');
        i.type = 'hidden'; i.name = 'entry.' + id; i.value = val; f.appendChild(i); }
      add(E.memberId, MEMBER.id); add(E.memberName, MEMBER.name);
      add(E.goalId, CFG.goalId || ''); add(E.questId, QID); add(E.questName, QUEST.name);
      add(E.pct, String(pct)); add(E.practice, practice || ''); add(E.evidence, evidence || '');
      f.submit(); return true;
    }
    return false;
  }
  function kindOf(pct){ pct=Number(pct);
    return pct>=125 ? 'practice' : pct>=75 ? 'quiz' : pct>=50 ? 'archive' : 'video'; }

  /* ── メンバー入力欄（未登録時のみ） ── */
  function memberFieldsHtml(){
    if(MEMBER.id && MEMBER.name) return '';
    return '<div class="member-box">'
      + '<div style="font-weight:800;font-size:.9rem">🙋 はじめに名乗ってください（初回のみ）</div>'
      + '<div class="field-label">メンバーID</div>'
      + '<input type="text" id="mId" value="' + esc(MEMBER.id) + '" placeholder="例：M0123">'
      + '<div class="field-label">ニックネーム</div>'
      + '<input type="text" id="mName" value="' + esc(MEMBER.name) + '" placeholder="例：たろう">'
      + '</div>';
  }
  function captureMember(){
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

  /* ───────── シーン ───────── */

  // 登場（＋2つの入口：順にやる or 実践から報告）
  function sceneIntro(){
    setStep(1);
    say(L.intro);
    var op = CH.openingVideo
      ? '<a class="btn btn-ghost" href="' + esc(CH.openingVideo) + '" target="_blank" rel="noopener">🎬 オープニングムービー</a>' : '';
    render('<button class="btn btn-primary" id="go">📖 順番に学ぶ（動画から）</button>'
      + '<button class="btn btn-ghost" id="skip">⚡ もう実践した → 報告だけする</button>'
      + op);
    $('go').onclick = sceneVideo;
    $('skip').onclick = function(){ sceneReport(true); };
  }

  // STEP1 動画 25%
  function sceneVideo(){
    setStep(1);
    say(L.video);
    var vBtn = videoUrl
      ? '<a class="btn btn-blue" href="' + esc(videoUrl) + '" target="_blank" rel="noopener">▶ 解説動画を見る</a>'
      : '<button class="btn btn-blue" disabled>▶ 解説動画（準備中）</button>';
    render(vBtn + '<button class="btn btn-primary" id="watched">見た！ <span class="pct pct-25">25%</span> → 次へ</button>');
    $('watched').onclick = function(){ bump(25); sceneArchive(); };
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

  // STEP3 クイズ（1問ずつ）
  var answered = 0, quizPct = 0;
  var KANJI = '一二三四五六七八九十';
  function sceneQuiz(qi){
    setStep(3);
    var item = QUEST.quiz[qi];
    say('第' + (KANJI.charAt(qi) || (qi+1)) + '問！ ' + item.q);
    var html = '<div class="qcount">問題 ' + (qi+1) + ' / ' + QUEST.quiz.length + '</div>';
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
        if(ok){ answered++; say(L.correct[qi % L.correct.length] + ' ' + item.explain); }
        else  { say(L.wrong + item.explain); }
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
    //   このマス固有の実践ミッションが定義されていればそれを表示（data/missions/*.js）
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
            + '🍙 <b>二人旅の試練</b>：このミッションは仲間を巻き込むと完了。困っている仲間がいたら、おにぎり（応援）を届けよう。</div>';
    }
    html += '<div class="field-label">実践したこと・感想（チャットにも共有されます）</div>'
          + '<textarea id="rP" rows="2" placeholder="例：自社の資料で実際に試して、こう活かせた"></textarea>'
          + '<div class="field-label">証拠URL（スクショ・ドライブ等）<span id="evReq" style="color:#c62828"></span></div>';
    if(MIS && MIS.evidence){
      html += '<div style="font-size:.8rem;color:var(--muted);margin-top:2px">📎 証拠の例：' + esc(MIS.evidence) + '</div>';
    }
    html += '<input type="url" id="rE" placeholder="https://...（実践報告は必須）">'
          + '<button class="btn btn-green" id="submit">⚔️ この内容で報告する</button>';
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
      if(!(MEMBER.id && MEMBER.name) && !captureMember()) return;
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
      postReport(pct, practice, evidence, kindOf(pct), score);
      sceneDone(pct);
    };
  }

  function sceneDone(pct){
    setStep(4);
    say(L.done.replace('{pct}', pct));
    var ed = CH.endingVideo
      ? '<a class="btn btn-blue" href="' + esc(CH.endingVideo) + '" target="_blank" rel="noopener">🎬 クリアムービーを見る</a>' : '';
    render('<div style="text-align:center;font-size:3rem">🎊</div>'
      + '<div style="text-align:center;font-weight:900;font-size:1.3rem;margin:4px 0">' + pct + '% で報告完了！</div>'
      + '<div style="text-align:center;color:var(--muted);font-size:.9rem">'
      + esc(MEMBER.name ? MEMBER.name + ' さんの活動として記録されました' : 'あなたの活動が記録に加わりました') + '</div>'
      + ed
      + '<a class="btn btn-primary" href="../index.html" style="margin-top:14px">🗺️ マンダラボードへ戻る</a>'
      + '<button class="btn btn-ghost" id="again">このクエストを最初から</button>');
    $('again').onclick = function(){ answered = 0; quizPct = 0; achieved = 0; sceneIntro(); };
  }

  sceneIntro();
})();
