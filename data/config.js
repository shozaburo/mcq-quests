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

  // ★報告の蓄積先：クエスト活動ログ専用スプレッドシートのGAS Web App URL
  //   gas_quest_log をデプロイして得た「ウェブアプリ URL（.../exec）」をここに貼る。
  //   ここが埋まっていれば新シートへ1行=1件で記録される（GAS編集は初回のみ）。
  logApiUrl: "",

  // （予備）既存の活動報告Googleフォームに送りたい場合のみ設定。通常は未使用。
  form: {
    actionUrl: "",
    entry: { memberId:"", memberName:"", goalId:"", questId:"", questName:"", pct:"", practice:"", evidence:"" }
  }
};
