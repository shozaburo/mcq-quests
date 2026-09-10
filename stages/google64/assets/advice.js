/* 共通 engine.js v38 の報告完了画面へ、Google編の助言を添える。
   共通エンジンの adviceBlock は bondMovie（ChatGPT編）専用のため、
   Google編は #action 内の完了ボタン #again を目印に表示する。
   エンジンの画面構造を更新するときは、この目印も確認すること。 */
(function(){
  'use strict';
  var action = document.getElementById('action');
  var id = (window.PAGE || {}).questId;
  var advice = (window.MCQ_ADVICE || {})[id];
  var character = (window.MCQ_CHARS || {})[String(id).charAt(0)] || {};
  if(!action || !advice || !advice.text) return;

  function showAdvice(){
    var again = action.querySelector('#again');
    if(!again || action.querySelector('#google-advice')) return;
    var box = document.createElement('div');
    box.id = 'google-advice';
    box.style.cssText = 'background:#f0faf5;border:1.5px solid #b9e6cf;border-radius:14px;padding:12px 14px;margin-top:12px';
    var row = document.createElement('div');
    row.style.cssText = 'display:flex;gap:10px;align-items:flex-start';
    if(character.img){
      var icon = document.createElement('img');
      icon.src = character.img;
      icon.alt = '';
      icon.style.cssText = 'width:46px;height:46px;border-radius:50%;object-fit:cover;flex:none';
      icon.style.border = '2px solid ' + (character.color || '#4db6ac');
      row.appendChild(icon);
    }
    var body = document.createElement('div');
    var heading = document.createElement('div');
    heading.style.cssText = 'font-weight:900;font-size:.82rem;margin-bottom:2px';
    heading.style.color = character.color || '#4db6ac';
    heading.textContent = '💡 ' + (character.name || '守り手') + 'のワンポイント';
    var text = document.createElement('div');
    text.style.cssText = 'font-size:.92rem;line-height:1.75';
    text.textContent = advice.text;
    body.appendChild(heading);
    body.appendChild(text);
    row.appendChild(body);
    box.appendChild(row);
    if(advice.video){
      var video = document.createElement('video');
      video.src = advice.video;
      video.controls = true;
      video.playsInline = true;
      video.preload = 'metadata';
      video.style.cssText = 'width:100%;border-radius:10px;margin-top:10px;background:#000';
      box.appendChild(video);
    }
    var back = again.parentNode.querySelector('a[href="town.html?a='+id.charAt(0)+'"]');
    again.parentNode.insertBefore(box, back || again);
  }
  new MutationObserver(showAdvice).observe(action, {childList:true, subtree:true});
  showAdvice();
})();
