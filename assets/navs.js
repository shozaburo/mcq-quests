/* ============================================================
   🧭 ナビゲーター定義（サイト共通）
   プレイヤーが最初に選ぶ案内役。選択は localStorage 'mcq_nav' に保存され
   全ページ（初心者教室・導入シーン等）で引き継がれる。
   立ち絵: assets/chara/{key}.png / {key}_point.png / {key}_joy.png
   ============================================================ */
window.MCQ_NAVS = {
  reika: {
    name: "大塚麗夏",
    tagline: "AI実践塾ガイド",
    color: "#e0568a",
    icon: "https://re-gi.jp/icon/reika_tujo.jpg",
    tachie: "reika.png", point: "reika_point.png", joy: "reika_joy.png",
    intro: "頼れるお姉さん系。テキパキ導いてくれる。"
  },
  satoru: {
    name: "池坊サトル",
    tagline: "AI実践塾コーチ",
    color: "#2f6fb2",
    icon: "chara/satoru.png",   // ※iconは相対のためHUD等では都度解決
    tachie: "satoru.png", point: "satoru_point.png", joy: "satoru_joy.png",
    intro: "爽やかで丁寧なお兄さん系。優しく背中を押してくれる。"
  }
};

/* 選択中のナビkey（未選択なら 'reika'） */
window.MCQ_navKey = function(){
  try{ return localStorage.getItem('mcq_nav') || 'reika'; }catch(e){ return 'reika'; }
};
window.MCQ_nav = function(){ return window.MCQ_NAVS[window.MCQ_navKey()] || window.MCQ_NAVS.reika; };
/* 立ち絵の絶対パス（呼び出し元からのプレフィックスを付けて使う） */
