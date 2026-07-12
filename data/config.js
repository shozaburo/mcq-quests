/* ============================================================
   MCQ β Google64 全体設定
   ここを直せば全64ページに反映される（Claudeが更新→push）
   ============================================================ */
window.MCQ_CONFIG = {
  goalId: "β",
  goalName: "Google64",

  // マンダラボードの見た目（ご褒美イラスト＝タイルの下に隠れた絵）
  board: {
    imageUrl: "https://re-gi.jp/icon/g-sage_josei.png", // βご褒美イラスト（ゴール定義シート準拠）
    color:    "#FFD700", // ゴールテーマ色
    threshold: 400       // 1マス開放の累積%閾値（progress.js側の値が優先）
  },

  // ★★ v3: 本体GAS quest_api のWeb App URL（MCQ110_quest_api.gs をデプロイして貼る）
  //   これが埋まると：トークンログイン／EXP・ご褒美・称号連動／ボスHP（チーム進捗）／
  //   サンクスUP!／アバター進化 がすべて本体スプレッドシートと繋がる。
  questApiUrl: "",

  // （旧）クエスト活動ログ専用スプレッドシートのGAS Web App URL（questApiUrl未設定時の予備）
  logApiUrl: "",

  // （予備）既存の活動報告Googleフォームに送りたい場合のみ設定。通常は未使用。
  form: {
    actionUrl: "",
    entry: { memberId:"", memberName:"", goalId:"", questId:"", questName:"", pct:"", practice:"", evidence:"" }
  }
};
