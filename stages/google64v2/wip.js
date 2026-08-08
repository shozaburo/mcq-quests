/* ============================================================
   google64v2「準備中」の帯（2026-08-08）
   ------------------------------------------------------------
   このステージは Spark(Ultra) 対応版のベースだが、動画・スライド・
   まとめカードが未整備。トップからの導線は google64 に戻したので
   通常はここに来ないが、ブックマークや古いリンクから直接来た人が
   空っぽの盤を見て「壊れている」と思わないよう案内を出す。

   2026年9月の改訂で素材が入ったら、このファイルと各ページの
   <script src="wip.js"> の1行を消すだけで元に戻る。
   ============================================================ */
(function () {
  'use strict';
  var d = document.createElement('div');
  d.setAttribute('role', 'status');
  d.style.cssText =
    'position:relative;z-index:9999;background:#5b3d00;color:#ffe9b3;' +
    'border-bottom:1px solid #8a6100;padding:10px 14px;font-size:.82rem;' +
    'line-height:1.6;text-align:center;font-family:inherit';
  d.innerHTML =
    '🚧 <b>こちらは準備中のステージです。</b>' +
    '<span style="display:block;opacity:.9;margin-top:2px">' +
    '動画・スライド・まとめカードがまだ入っていません。' +
    'Gemini編は <a href="../google64/map.html" style="color:#ffd700;text-decoration:underline">こちらの盤</a> をお使いください。</span>';
  function put() { document.body.insertBefore(d, document.body.firstChild); }
  if (document.body) put();
  else document.addEventListener('DOMContentLoaded', put);
})();
