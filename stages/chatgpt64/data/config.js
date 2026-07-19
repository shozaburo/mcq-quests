/* ============================================================
   α ChatGPT64 全体設定「目指せ！チャッピーの親友」
   ここを直せば全64ページに反映される
   ============================================================ */
window.MCQ_CONFIG = {
  goalId: "α",
  goalName: "ChatGPT64",

  // マンダラボードの見た目（ご褒美イラスト＝タイルの下に隠れた絵）
  board: {
    imageUrl: "",        // αゴール画像（チャッピー集合絵ができたら設定）
    color:    "#10a37f", // ゴールテーマ色（OpenAIグリーン）
    threshold: 400       // 1マス開放の累積%閾値（progress.js側が優先）
  },

  // 本体GAS quest_api のWeb App URL（β/γと共通・goalId='α'で区別）
  questApiUrl: "https://script.google.com/macros/s/AKfycbzIpwPd49mlcRpuPa43fdg9P4n8mN2wEXFy2IcbrM87r5E90VjTHg1nhzVHn2b2Wxro/exec",

  // v10: 報告画面で証拠画像を直接添付できる（GAS側 action=uploadEvidence 対応が必要。
  //      α_GAS改修_画像添付_貼り付けコード.md 参照。未デプロイでもURL貼り付けに誘導されるだけで壊れない）
  evidenceUpload: true,

  logApiUrl: "",

  form: {
    actionUrl: "",
    entry: { memberId:"", memberName:"", goalId:"", questId:"", questName:"", pct:"", practice:"", evidence:"" }
  }
};
