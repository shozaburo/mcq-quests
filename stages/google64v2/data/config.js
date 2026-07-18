/* ============================================================
   MCQ β2 Google64・エージェント編（第二章）全体設定
   ここを直せば全64ページに反映される（Claudeが更新→push）
   ============================================================ */
window.MCQ_CONFIG = {
  goalId: "β2",
  goalName: "Google64・エージェント編",

  // マンダラボードの見た目
  board: {
    imageUrl: "https://re-gi.jp/icon/g-sage_josei.png", // ご褒美イラスト（β準拠・差し替え可）
    color:    "#7C4DFF", // 第二章テーマ色（エージェント紫）
    threshold: 400       // 1マス開放の累積%閾値
  },

  // 本体GAS quest_api（βと共通・goalId=β2 で区別）
  questApiUrl: "https://script.google.com/macros/s/AKfycbzIpwPd49mlcRpuPa43fdg9P4n8mN2wEXFy2IcbrM87r5E90VjTHg1nhzVHn2b2Wxro/exec",
  logApiUrl: "",

  // 背景・BGMは第一章（google64）の街をそのまま再訪する（アセット共用）
  stageAssetBase: "../google64/",

  form: {
    actionUrl: "",
    entry: { memberId:"", memberName:"", goalId:"", questId:"", questName:"", pct:"", practice:"", evidence:"" }
  }
};
