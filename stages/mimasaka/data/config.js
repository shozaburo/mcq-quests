/* ============================================================
   λ 美作クエスト（三和電子64）全体設定
   ここを直せば全ページに反映される
   ============================================================ */
window.MCQ_CONFIG = {
  goalId: "λ",
  goalName: "美作クエスト",

  // マンダラボードの見た目
  board: {
    imageUrl: "",          // ご褒美イラスト（未設定＝無地）
    color:    "#f5b731",   // テーマ色（デイジーの黄色）
    threshold: 400         // 1マス開放の累積%閾値
  },

  // 本体GAS quest_api のWeb App URL（β/γと共通・goalId=λで区別）
  questApiUrl: "https://script.google.com/macros/s/AKfycbzIpwPd49mlcRpuPa43fdg9P4n8mN2wEXFy2IcbrM87r5E90VjTHg1nhzVHn2b2Wxro/exec",

  logApiUrl: "",
  form: { actionUrl: "", entry: {} }
};
