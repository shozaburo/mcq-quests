# Gemini編 第2弾の確認記録

確認日：2026年9月10日。対象は `data/quests/A.js`〜`H.js` の320問、実践課題、追加した助言です。操作・利用条件はGoogleの公式資料と照合しました。学び方や業務例は教材としての提案であり、Googleが効果を保証するものではありません。契約・言語・管理者設定・段階的な提供で画面が異なる機能は、利用前の確認を課題に含めています。

教材の呼称は既存の「NotebookLM」を継続しています。参照先のヘルプには「Gemini Notebook」と表示されるページもあります。既存の動画や画像内の説明は今回の更新対象には含めていません。

## 主な照合先と反映内容

| 対象 | 公式資料 | 確認・修正した点 |
|---|---|---|
| A1–A2 | [不正使用への対処](https://support.google.com/accounts/answer/6294825)、[2段階認証](https://support.google.com/accounts/answer/46526?hl=en)、[ゲスト利用](https://support.google.com/chrome/answer/6130773?co=GENIE.Platform%3DDesktop&hl=en) | パスワード以外の端末・設定確認、共用端末の扱い |
| A3–A5、A8、F8 | [共有と権限](https://support.google.com/drive/answer/2494822?hl=en)、[アクセスを制限するフォルダ](https://support.google.com/drive/answer/14254362?hl=en) | フォルダの制限、再共有とダウンロード制限の区別、期限設定の利用条件。リンクだけでは権限は付かない |
| A6、B3 | [ファイルのアップロード](https://support.google.com/gemini/answer/14903178?co=GENIE.Platform%3DDesktop&hl=en) | 一度に渡せる数には上限。OCR結果は原本と照合 |
| A7 | [共有ドライブ](https://support.google.com/a/users/answer/9310351?hl=en) | 組織所有と役割。利用・作成の許可を確認 |
| B1、B8 | [Gemsの作成](https://support.google.com/gemini/answer/15235603?hl=en-GB)、[Gemsの共有](https://support.google.com/gemini/answer/16504957?co=GENIE.Platform%3DDesktop&hl=en) | 役割・条件・見本を伝える、作成と保存の入口 |
| B2 | [Deep Research](https://support.google.com/gemini/answer/15719111?hl=en) | 調査計画と出典。調査数や所要時間を固定しない |
| B4 | [Canvas](https://support.google.com/gemini/answer/16047321?co=GENIE.Platform%3DDesktop&hl=en) | 編集と範囲を指定した書き直し |
| B5–B7、G1–G6、H1–H5 | [ソース](https://support.google.com/gemininotebook/answer/16215270?co=GENIE.Platform%3DDesktop&hl=en-CA)、[チャットと引用](https://support.google.com/gemininotebook/answer/16179559?hl=en) | 対応資料と上限。引用があっても原文を確認。台本・翻訳・比較は下書きとして点検 |
| C1 | [予約スケジュール](https://support.google.com/calendar/answer/10729749?hl=en)、[追加機能の条件](https://support.google.com/calendar/answer/16287038?hl=en) | アカウントと追加機能の条件 |
| C2–C4 | [CSV取り込み](https://support.google.com/calendar/answer/37118?hl=en-uk)、[集中時間](https://support.google.com/calendar/answer/11190973?hl=en)、[タスク](https://support.google.com/calendar/answer/9901136?hl=en-uk) | CSVは同期ではない。集中時間によるミュートの対象はChat |
| C5–C8 | [AIメモ](https://support.google.com/meet/answer/14754931?hl=en)、[チャット](https://support.google.com/meet/answer/9308979?hl=en)、[文字起こし](https://support.google.com/meet/answer/12849897?hl=en)、[ノイズ除去](https://support.google.com/meet/answer/9919960?hl=en-GB) | 機能を個別に有効化。保存先・共有範囲は設定で変わる。人声を必ず消す機能ではない |
| D1–D3 | [Gmailの下書き](https://support.google.com/mail/answer/13955415?hl=en)、[DocsのGemini](https://support.google.com/docs/answer/14206696?hl=en) | 利用条件、指示での調整、生成後の事実確認 |
| D4–D7 | [音声入力](https://support.google.com/docs/answer/4492226?hl=en)、[文書でのタスク割り当て](https://support.google.com/docs/answer/12048749?hl=en) | 日本語音声コマンドの断定を修正。人物チップとタスク・共有権限を区別 |
| D8 | [電子署名](https://support.google.com/docs/answer/12315692?hl=en)、[利用できるプラン](https://support.google.com/docs/answer/16704506?hl=en) | 全有料プランとは限らない。練習用文書で試す |
| E1–E4 | [プルダウン](https://support.google.com/docs/answer/186103?co=GENIE.Platform%3DDesktop&hl=en)、[XLOOKUP](https://support.google.com/docs/answer/12405947?hl=en-GB)、[QUERY](https://support.google.com/docs/answer/3093343?hl=en-419) | 入力統一、検索・集計式。QUERYの追記は参照範囲内が対象 |
| E5 | [IMPORTRANGE](https://support.google.com/docs/answer/3093340?hl=en) | 参照先の編集者は参照元の他範囲も取得可能。公開可能な別ファイルに分離 |
| E6–E7 | [ピボットテーブル](https://support.google.com/docs/answer/1272900?hl=en)、[SheetsのGemini](https://support.google.com/docs/answer/14356410?hl=en)、[AI関数](https://support.google.com/docs/answer/15877199?hl=en) | フィールド追加、AIの生成・更新操作。通常の再計算や式の実行と混同しない |
| E8 | [インストール型トリガー](https://developers.google.com/apps-script/guides/triggers/installable) | 回答先シートから設定し、フォーム画面からテスト送信 |
| F1–F2 | [NotebookLMのスライド更新](https://workspaceupdates.googleblog.com/2026/03/new-ways-to-customize-and-interact-with-your-content-in-NotebookLM.html)、[SlidesのGemini](https://support.google.com/docs/answer/14355071?hl=en) | PPTX出力、生成前の指示、編集できる範囲の実物確認 |
| F3–F5 | [探索の終了](https://support.google.com/docs/answer/7130307?co=GENIE.Platform%3DiOS&hl=en-419)、[SlidesのGemini](https://support.google.com/docs/answer/14355071?hl=en)、[画像生成](https://support.google.com/gemini/answer/14286560) | 終了した探索からテーマ・レイアウト・Geminiへ。生成画像の権利上の安全を断定しない |
| F6–F7 | [Google Vids](https://support.google.com/a/users/answer/14819770?hl=en)、[利用条件](https://support.google.com/docs/answer/15609411?hl=en)、[音声](https://support.google.com/docs/answer/15070345?hl=en) | 下書きと音声の利用条件、公開前の点検 |
| G7–G8、H4、H7–H8 | [レポートと共有](https://support.google.com/gemininotebook/answer/16206563?hl=en)、[音声概要](https://support.google.com/gemininotebook/answer/16212820?hl=en)、[クイズ](https://support.google.com/gemininotebook/answer/16958963?hl=en) | Studioのレポート、音声形式・言語、共有者の権限。音声概要は台本の逐語読み上げではない |
| H6 | [Driveのラベル](https://support.google.com/drive/answer/13495216?co=GENIE.Platform%3DDesktop&hl=en-GB) | ラベルは組織で設定・許可されたもの。架空の一括リネームや検索演算子を修正 |

## 更新と確認

問題の正本は `data/quests/*.js` です。修正後に次を実行すると、A〜Gの56本だけを書き出します。Hはサイト上の問題と助言を維持し、テキストを追加しません。

```sh
node stages/google64/tools/export-quiz.cjs
node stages/google64/tools/export-quiz.cjs --check
```

確認コマンドは64マスの問題・課題・助言の欠け、320問の選択肢と正解番号、56本の本文の一致を検査します。

`assets/advice.js` は共通エンジンv38の報告完了画面（`#action` 内の `#again`）に助言を追加します。共通エンジンの画面構造を更新する場合は、表示と再挑戦時の消去も確認してください。

`debug.html` はGoogle編のクリア記録・まとめカード・導入既読と、全編共通の音・案内役を操作します。変更直前の値を項目ごとに保存し、再読み込み後も「もどす」で復元できます。他編の進捗やログイン情報には触れません。サーバーへの報告は行いません。
