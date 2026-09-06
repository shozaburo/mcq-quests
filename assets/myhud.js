/* ============================================================
   🧑 じぶんHUD（v35）
   ------------------------------------------------------------
   「自分がどんなアバターなのかを常に意識できるように」（塾長指示 2026-08-03）。
   クエスト画面（engine.js）にしか出ていなかった自分のアイコンを、
   エリアマップ・街ページにも常設する。

   置くだけで動く。依存は data/config.js（goalId・questApiUrl）だけ。
   アバターが未登録なら「アバターを作る」への導線になる（＝作る動機になる）。
   ============================================================ */
(function () {
  'use strict';
  if (window.__mcqMyHud) return;
  window.__mcqMyHud = true;

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) {
      return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c];
    });
  }
  function ls(k) { try { return localStorage.getItem(k) || ''; } catch (e) { return ''; } }
  function lsJson(k) { try { return JSON.parse(localStorage.getItem(k) || 'null'); } catch (e) { return null; } }

  var CFG = window.MCQ_CONFIG || {};
  var API = CFG.questApiUrl || '';
  var GID = CFG.goalId || 'β';

  function pick() {
    var me = lsJson('mcq_me_cache');
    var mem = lsJson('mcq_member');
    return {
      avatar: (me && me.member && me.member.avatarUrl) || ls('mcq_avatar_beta') || (mem && mem.avatarUrl) || '',
      name: (me && me.member && me.member.nick) || (mem && mem.name) || '',
      exp: (me && me.member && me.member.exp) || 0,
      token: ls('mcq_member_token')
    };
  }

  function styleOnce() {
    if (document.getElementById('mcqMyHudCss')) return;
    var s = document.createElement('style');
    s.id = 'mcqMyHudCss';
    s.textContent =
      '#mcqMyHud{position:fixed;top:8px;right:10px;z-index:9997;display:flex;gap:8px;align-items:center;'
      + 'background:rgba(20,14,6,.85);border:1px solid rgba(245,197,66,.5);border-radius:999px;'
      + 'padding:4px 13px 4px 5px;color:#ffe9c0;font-size:.74rem;font-weight:800;'
      + 'text-decoration:none;backdrop-filter:blur(3px);max-width:70vw}'
      + '#mcqMyHud img{width:30px;height:30px;border-radius:50%;object-fit:cover;border:2px solid #f5c542;flex:none}'
      + '#mcqMyHud .noav{display:grid;place-items:center;width:30px;height:30px;border-radius:50%;flex:none;'
      + 'background:rgba(245,197,66,.2);border:2px dashed #f5c542;font-size:.9rem}'
      + '#mcqMyHud .nm{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;max-width:9em}'
      + '#mcqMyHud .mk{color:#ffd54f}'
      + '@media(max-width:520px){#mcqMyHud .nm{max-width:5.5em}}'
      /* スマホでは画面のいちばん上に重なるので、本文をHUDのぶんだけ下げる */
      + '@media(max-width:560px){body{padding-top:46px}}';
    document.head.appendChild(s);
  }

  function paint(d) {
    styleOnce();
    var el = document.getElementById('mcqMyHud');
    if (!el) {
      el = document.createElement('a');
      el.id = 'mcqMyHud';
      document.body.appendChild(el);
    }
    // アバターが無い人は、作りに行ける導線にする
    el.href = d.avatar ? 'index.html?skipintro=1' : 'card.html';
    el.title = d.avatar ? 'あなたのアバター' : 'アバターを作る';
    el.innerHTML =
      (d.avatar
        ? '<img src="' + esc(d.avatar) + '" alt="" onerror="this.outerHTML=\'<span class=&quot;noav&quot;>🧑</span>\'">'
        : '<span class="noav">🧑</span>')
      + '<span class="nm">' + esc(d.name || 'あなた') + '</span>'
      + (d.avatar ? '<span class="mk">⭐' + (d.exp || 0) + '</span>'
                  : '<span class="mk">アバターを作る →</span>');
  }

  function boot() {
    var d = pick();
    paint(d);
    // トークンがあれば最新を取り直す（アバターを後から登録した場合に追随する）
    if (API && d.token && !d.avatar) {
      fetch(API + '?action=me&token=' + encodeURIComponent(d.token))
        .then(function (r) { return r.json(); })
        .then(function (j) {
          if (!j || !j.ok || !j.member) return;
          try { localStorage.setItem('mcq_me_cache', JSON.stringify(j)); } catch (e) {}
          paint(pick());
        })
        .catch(function () {});
    }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
