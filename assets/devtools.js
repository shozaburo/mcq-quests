/* ============================================================
   🛠 デバッグモード（開発・動作確認用）
   ------------------------------------------------------------
   演出の確認に、毎回8マス報告するのは現実的でないので用意した隠し機能。

   出し方（どれでも可）
     1) URLに ?dev=1 を付ける      … 例 map.html?a=A&dev=1
     2) キーボードで mcqdev と打つ … スマホ以外
     3) 画面の左上すみを5回タップ  … スマホ用

   一度出すと、そのタブが閉じるまで（sessionStorage）残る。
   ?dev=0 で完全に消える。

   ⚠️ できること／できないこと
     ・できる … このブラウザの中の「クリア済み」「まとめカード獲得」「スコア」を書き換える
                → エリア完走のエンディング、盤面に絵がはまる、HUDの数字は再現できる
     ・できない … サーバーの記録（チーム累積％＝ボスHP、ランキング、他の人の顔）
                → これらは本物の報告でしか動かない。ここを偽装すると本番データが汚れるので、
                  あえて触らない設計にしている。
   ============================================================ */
(function () {
  'use strict';
  if (window.__mcqDev) return;

  var KEY = 'mcq_devmode';
  var CFG = window.MCQ_CONFIG || {};
  var GID = CFG.goalId || 'x';

  function on() { try { return sessionStorage.getItem(KEY) === '1'; } catch (e) { return false; } }
  function setOn(v) { try { v ? sessionStorage.setItem(KEY, '1') : sessionStorage.removeItem(KEY); } catch (e) {} }

  try {
    var p = new URLSearchParams(location.search).get('dev');
    if (p === '1') setOn(true);
    if (p === '0') { setOn(false); }
  } catch (e) {}

  /* ── 隠しトリガー ── */
  var typed = '';
  document.addEventListener('keydown', function (e) {
    if (!e.key || e.key.length !== 1) return;
    typed = (typed + e.key.toLowerCase()).slice(-6);
    if (typed === 'mcqdev') { setOn(true); mount(); }
  });
  var taps = 0, tapT = 0;
  document.addEventListener('click', function (e) {
    if (e.clientX > 60 || e.clientY > 60) { taps = 0; return; }
    var now = Date.now();
    if (now - tapT > 1200) taps = 0;
    tapT = now; taps++;
    if (taps >= 5) { taps = 0; setOn(true); mount(); }
  });

  /* ── localStorage 操作 ── */
  function jget(k, d) { try { return JSON.parse(localStorage.getItem(k) || 'null') || d; } catch (e) { return d; } }
  function jset(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} }
  function allQids(area) {
    var out = [], areas = area ? [area] : 'ABCDEFGH'.split('');
    areas.forEach(function (a) { for (var n = 1; n <= 8; n++) out.push(a + n); });
    return out;
  }
  function clearedKey() { return 'mcq_cleared_' + GID; }
  function lootKey() { return 'mcq_loot_' + GID; }

  function markCleared(area) {
    var a = jget(clearedKey(), []);
    allQids(area).forEach(function (q) { if (a.indexOf(q) < 0) a.push(q); });
    jset(clearedKey(), a);
  }
  function markLoot(area) {
    var a = jget(lootKey(), []);
    allQids(area).forEach(function (q) { if (a.indexOf(q) < 0) a.push(q); });
    jset(lootKey(), a);
  }
  function resetAll() {
    var del = [];
    try {
      for (var i = 0; i < localStorage.length; i++) {
        var k = localStorage.key(i);
        if (/^mcq_(cleared|loot|score|bond|spark_done|route|intro)_/.test(k)) del.push(k);
      }
      del.forEach(function (k) { localStorage.removeItem(k); });
    } catch (e) {}
    return del.length;
  }

  /* ── パネル ── */
  function mount() {
    if (!on() || document.getElementById('mcqDevPanel')) return;
    var area = '';
    try { area = (new URLSearchParams(location.search).get('a') || '').toUpperCase(); } catch (e) {}
    if (!/^[A-H]$/.test(area)) {
      try { area = ((location.search.match(/id=([A-H])[1-8]/i) || [])[1] || '').toUpperCase(); } catch (e) {}
    }

    var d = document.createElement('div');
    d.id = 'mcqDevPanel';
    d.style.cssText =
      'position:fixed;left:10px;bottom:10px;z-index:99999;width:230px;max-width:78vw;' +
      'background:rgba(12,10,20,.95);border:2px solid #7c4dff;border-radius:12px;' +
      'padding:10px 11px;color:#e8e2ff;font-size:.74rem;font-family:system-ui,sans-serif;' +
      'box-shadow:0 8px 24px rgba(0,0,0,.5)';
    var bs = 'display:block;width:100%;margin-top:5px;padding:6px 8px;border-radius:8px;' +
             'border:1px solid rgba(255,255,255,.25);background:rgba(124,77,255,.22);' +
             'color:#fff;font-size:.73rem;font-weight:800;cursor:pointer;font-family:inherit';
    d.innerHTML =
      '<div style="display:flex;align-items:center;gap:6px;font-weight:900;color:#b39dff">' +
        '🛠 デバッグ<span style="margin-left:auto;font-weight:400;opacity:.7">' + GID + '</span></div>' +
      '<div style="font-size:.66rem;opacity:.7;line-height:1.5;margin:4px 0 2px">' +
        'このブラウザの表示だけを変えます。サーバーの記録は動きません。</div>' +
      (area ? '<button id="dvArea" style="' + bs + '">エリア' + area + 'を完走ずみにする</button>' : '') +
      '<button id="dvAll"   style="' + bs + '">全64マスをクリアずみに</button>' +
      '<button id="dvLoot"  style="' + bs + '">まとめカードを全部獲得</button>' +
      '<button id="dvScore" style="' + bs + '">スコアを+1000pt</button>' +
      '<button id="dvReset" style="' + bs + 'background:rgba(255,80,80,.2)">ぜんぶリセット</button>' +
      '<button id="dvClose" style="' + bs + 'background:transparent;opacity:.6">とじる</button>' +
      '<div id="dvMsg" style="font-size:.66rem;color:#9be29b;margin-top:6px;min-height:1em"></div>';
    document.body.appendChild(d);

    function say(t) { var m = document.getElementById('dvMsg'); if (m) m.textContent = t; }
    var b;
    if ((b = document.getElementById('dvArea'))) b.onclick = function () {
      markCleared(area); markLoot(area);
      say('エリア' + area + 'を完走ずみにしました。再読み込みします…');
      setTimeout(function () { location.reload(); }, 700);
    };
    document.getElementById('dvAll').onclick = function () {
      markCleared(''); say('全64マスをクリアずみにしました。再読み込みします…');
      setTimeout(function () { location.reload(); }, 700);
    };
    document.getElementById('dvLoot').onclick = function () {
      markLoot(''); say('まとめカード64枚を獲得にしました。再読み込みします…');
      setTimeout(function () { location.reload(); }, 700);
    };
    document.getElementById('dvScore').onclick = function () {
      var k = 'mcq_score_' + GID, v = 0;
      try { v = Number(localStorage.getItem(k)) || 0; localStorage.setItem(k, String(v + 1000)); } catch (e) {}
      say('スコアを ' + (v + 1000) + 'pt にしました。再読み込みします…');
      setTimeout(function () { location.reload(); }, 700);
    };
    document.getElementById('dvReset').onclick = function () {
      if (!confirm('このブラウザの進捗表示（クリア済み・まとめカード・スコア・導入スキップ）を消します。\nサーバーの記録は消えません。よろしいですか？')) return;
      var n = resetAll();
      say(n + '件のキーを削除しました。再読み込みします…');
      setTimeout(function () { location.reload(); }, 700);
    };
    document.getElementById('dvClose').onclick = function () { setOn(false); d.remove(); };
  }

  window.__mcqDev = { mount: mount, markCleared: markCleared, markLoot: markLoot, reset: resetAll };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mount);
  else mount();
})();
