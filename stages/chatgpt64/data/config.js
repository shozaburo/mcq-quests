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

  // v16: 証拠画像は「実践報告フォーム（Googleフォーム）」で受ける方式に変更。
  //   自作GASアップロードは廃止（evidenceUpload は使わない）。
  //   reportFormUrl を設定すると、実践報告（125%以上）でこのフォームへ誘導する
  //   （画像アップは Google フォーム標準機能→Drive保存、判定はGemini→Google Chat通知）。
  //   ↓ フォーム作成後にベースURL（/viewform）を貼る。空のままなら従来のURL入力欄になる。
  reportFormUrl: "",

  // v11: 報告完了後のおまけを「討伐ムービー」ではなく「絆ムービー／絆イラスト」に
  //      （テーマ＝AIとの関係性。実践の書き込み内容が呪文に織り込まれる）
  bondMovie: true,

  // v15: やさしい世界観（チャッピーの親友）。「こうげき／討伐／審判」などの戦闘表現を
  //      「なかよし度アップ／達成／けっかを見る」等のやさしい言葉に置き換える
  soft: true,

  logApiUrl: "",

  form: {
    actionUrl: "",
    entry: { memberId:"", memberName:"", goalId:"", questId:"", questName:"", pct:"", practice:"", evidence:"" }
  }
};
