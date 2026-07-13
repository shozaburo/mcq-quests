/* ============================================================
   γ Claude64 全体設定（第2部・西日本編）
   ここを直せば全64ページに反映される
   ============================================================ */
window.MCQ_CONFIG = {
  goalId: "γ",
  goalName: "Claude64",

  // マンダラボードの見た目（ご褒美イラスト＝タイルの下に隠れた絵）
  board: {
    imageUrl: "https://re-gi.jp/icon/kuroudo-otoko.png", // γゴール画像（ゴール定義シート準拠）
    color:    "#7e57c2", // ゴールテーマ色（黒党＝紫紺）
    threshold: 400       // 1マス開放の累積%閾値（progress.js側が優先）
  },

  // ★★ v3: 本体GAS quest_api のWeb App URL（βと共通・2026/07/12 デプロイ済み）
  //   goalId='γ' で区別されて同じ本体スプレッドシートに繋がる。
  questApiUrl: "https://script.google.com/macros/s/AKfycbzIpwPd49mlcRpuPa43fdg9P4n8mN2wEXFy2IcbrM87r5E90VjTHg1nhzVHn2b2Wxro/exec",

  // 報告の蓄積先：βと共通のGAS Web App URL（goalId='γ'で区別されて同じ新シートに溜まる）
  //   βのデプロイURLをここにも貼る（同一エンドポイントでOK）
  logApiUrl: "",

  form: {
    actionUrl: "",
    entry: { memberId:"", memberName:"", goalId:"", questId:"", questName:"", pct:"", practice:"", evidence:"" }
  }
};
