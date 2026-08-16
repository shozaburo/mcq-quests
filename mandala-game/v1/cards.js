/* =====================================================================
 * マンダラチャート®人生とビジネスを豊かにするゲーム — カードデッキ
 * =====================================================================
 * このファイルだけを差し替えれば、研修先ごとの版が作れます。
 * （例：cards.js をコピーして「三和電子版」の文言に書き換え、
 *      MANDALA_DECKS に押し込めば、開始画面で選べるようになります）
 *
 * カードの書き方：
 *   field   : どの分野のマスに止まったとき出るか
 *             work=仕事 money=お金 health=健康 family=家庭
 *             learn=学び play=遊び relation=人間関係 social=社会
 *   title   : カードの見出し（出来事）
 *   text    : 状況の説明。1〜2文で。
 *   a / b   : 二つの選択肢。label=ボタンの文言、effects=増減。
 *             どの選択肢にも、必ず「増える分野」と「減る分野」を
 *             両方入れること。得だけの選択肢は作らない（設計の核）。
 *   insight : 気づきの一言。選択のあとに表示され、終了時に
 *             「自分のマンダラチャートを書く材料」として一覧になる。
 * ===================================================================== */

window.MANDALA_DECKS = [
{
  id: "standard",
  name: "標準版",
  cards: [

  /* ---------------- 仕事 ---------------- */
  { field:"work", title:"大きな案件を任された",
    text:"社運がかかった仕事。やり方はあなたに任されている。",
    a:{ label:"全部自分でやり切る", effects:{work:+2, health:-1} },
    b:{ label:"半分を若手に任せる", effects:{work:+1, relation:+1, money:-1} },
    insight:"仕事の成果は、必ずどこかの時間か誰かの力を使って生まれている。" },

  { field:"work", title:"転職の誘い",
    text:"待遇のいい誘いが来た。ただし今の職場で積み上げた信頼は持っていけない。",
    a:{ label:"新天地に挑戦する", effects:{work:+2, money:+1, relation:-2} },
    b:{ label:"今の場所で腕を磨く", effects:{work:+1, relation:+1, learn:-1} },
    insight:"職を変えると、目に見えない財産（人間関係）の残高が動く。" },

  { field:"work", title:"繁忙期が来た",
    text:"残業続きの一か月。体は正直に悲鳴を上げ始めている。",
    a:{ label:"気合で乗り切る", effects:{work:+2, health:-2} },
    b:{ label:"業務量を上司に相談する", effects:{health:+1, work:-1} },
    insight:"「頑張る」と「削る」は同じ行動の裏表。何を削っているか見える人が強い。" },

  { field:"work", title:"AIを仕事に入れるか",
    text:"新しい道具は速いが、覚えるまでの時間がかかる。",
    a:{ label:"時間を投資して覚える", effects:{learn:+2, work:+1, play:-1} },
    b:{ label:"今のやり方を磨く", effects:{work:+1, learn:-1} },
    insight:"道具を変えないという判断も投資。ただし利息は「学び」から引かれる。" },

  { field:"work", title:"部下の失敗で信用問題",
    text:"取引先が怒っている。部下は青ざめている。",
    a:{ label:"自分が頭を下げてかばう", effects:{relation:+2, work:-1} },
    b:{ label:"仕組みを直して再発を防ぐ", effects:{work:+2, relation:-1} },
    insight:"人を守るか、仕組みを守るか。長い目で見ればどちらも正解で、どちらも代償がある。" },

  /* ---------------- お金 ---------------- */
  { field:"money", title:"昇給した",
    text:"月々の手取りが増えた。この増えた分、どう使う？",
    a:{ label:"将来のために投資に回す", effects:{money:+2, play:-1} },
    b:{ label:"家族旅行に使う", effects:{family:+2, play:+1, money:-1} },
    insight:"お金は貯めても使っても減らない使い方がある。それは「思い出」と「増えて返るもの」。" },

  { field:"money", title:"保険と固定費の見直し",
    text:"付き合いで入った保険が何本もある。",
    a:{ label:"整理して固定費を下げる", effects:{money:+2, learn:+1, relation:-1} },
    b:{ label:"付き合いを守って続ける", effects:{relation:+1, money:-1} },
    insight:"固定費の裏には人間関係が張り付いていることがある。切るなら顔を見て切る。" },

  { field:"money", title:"副業の話が来た",
    text:"月数万円になる話。ただし夜と週末の時間が消える。",
    a:{ label:"始める", effects:{money:+2, work:+1, health:-1, family:-1} },
    b:{ label:"断って本業に集中", effects:{family:+1, money:-1} },
    insight:"収入の口を増やすと、時間の口座から自動引き落としが始まる。" },

  { field:"money", title:"後輩に「貸してほしい」",
    text:"事情は本当らしい。金額は痛いが出せなくはない。",
    a:{ label:"貸す", effects:{relation:+1, money:-2} },
    b:{ label:"貸さずに仕事を紹介する", effects:{learn:+1, relation:-1} },
    insight:"お金の貸し借りは、金額ではなく関係の器が試される。" },

  { field:"money", title:"大きな買い物",
    text:"車（または設備）の買い替え時期。あれば仕事も遊びも広がる。",
    a:{ label:"思い切って買う", effects:{play:+1, work:+1, money:-2} },
    b:{ label:"見送って貯める", effects:{money:+2, play:-1} },
    insight:"買い物の上手い下手は、値段ではなく「何年分の楽しみと働きを買ったか」で決まる。" },

  /* ---------------- 健康 ---------------- */
  { field:"health", title:"健診で要注意の判定",
    text:"数値が去年より悪い。医者は「生活を変えるなら今」と言う。",
    a:{ label:"運動を始め、夜の付き合いを減らす", effects:{health:+2, relation:-1} },
    b:{ label:"様子を見て仕事を優先", effects:{work:+1, health:-2} },
    insight:"健康は失って初めて口座残高が見える、暗証番号のない銀行。" },

  { field:"health", title:"朝活の誘い",
    text:"仲間が朝6時の勉強会に誘ってきた。夜型の生活を変えることになる。",
    a:{ label:"早起きに切り替える", effects:{health:+1, learn:+1, play:-1} },
    b:{ label:"睡眠を優先して断る", effects:{health:+1, learn:-1} },
    insight:"朝の1時間は夜の2時間。ただし無理な早起きは借金と同じ。" },

  { field:"health", title:"腰にきた",
    text:"座りっぱなしのつけが来た。動くたびに痛む。",
    a:{ label:"時間とお金をかけて治す", effects:{health:+2, money:-1} },
    b:{ label:"だましだまし働く", effects:{work:+1, health:-2} },
    insight:"体の痛みは請求書。払いを延ばすほど利息がつく。" },

  { field:"health", title:"マラソン大会に誘われた",
    text:"仲間と一緒に走らないかと言われた。道具をそろえる出費はある。",
    a:{ label:"申し込んで練習を始める", effects:{health:+2, relation:+1, money:-1} },
    b:{ label:"応援に回る", effects:{relation:+1, health:-1} },
    insight:"体を動かす約束は、一人だと破れるが仲間となら破れない。" },

  { field:"health", title:"食生活の分かれ道",
    text:"外食続き。財布にも体にも効いてきた。",
    a:{ label:"自炊に切り替える", effects:{health:+2, play:-1} },
    b:{ label:"外食のまま人脈づくりに使う", effects:{relation:+1, health:-1, money:-1} },
    insight:"食事は一日3回の投資。どの口座に振り込むかは自分で選べる。" },

  /* ---------------- 家庭 ---------------- */
  { field:"family", title:"親が倒れた",
    text:"入院は長引きそうだ。仕事との両立をどうする。",
    a:{ label:"仕事を減らして自分で支える", effects:{family:+2, work:-2, money:-1} },
    b:{ label:"プロに任せてお金で支える", effects:{family:+1, money:-2} },
    insight:"介護は「時間で払うか、お金で払うか」ではなく、気持ちをどう届けるかの問題。" },

  { field:"family", title:"子どもの行事と大事な商談が重なった",
    text:"どちらも動かせない。どちらかを選ぶしかない。",
    a:{ label:"行事に行く", effects:{family:+2, work:-1} },
    b:{ label:"商談に行く", effects:{work:+2, money:+1, family:-2} },
    insight:"子どもの行事には「今年しかない」がある。商談には「次がある」ことが多い。" },

  { field:"family", title:"「最近ちゃんと話してない」",
    text:"配偶者からぽつりと言われた。図星だった。",
    a:{ label:"週1回の夕食を約束する", effects:{family:+2, work:-1} },
    b:{ label:"「今は仕事が山場」と頭を下げる", effects:{work:+1, family:-2} },
    insight:"家庭は空気と同じで、あるうちは見えない。言葉にされた時はもう薄い。" },

  { field:"family", title:"家族旅行の計画",
    text:"全員の予定が合うのは今年はこの連休だけ。",
    a:{ label:"思い切って行く", effects:{family:+2, play:+1, money:-2} },
    b:{ label:"今年は見送る", effects:{money:+1, family:-1} },
    insight:"家族全員の予定が合う回数は、思っているよりずっと少ない。" },

  { field:"family", title:"実家の行事",
    text:"法事と親戚の集まり。正直、腰は重い。",
    a:{ label:"きちんと顔を出す", effects:{family:+1, social:+1, play:-1} },
    b:{ label:"今回は欠席する", effects:{work:+1, family:-1} },
    insight:"面倒な行事は、家族という組織の「定例会議」。欠席が続くと議題から外される。" },

  /* ---------------- 学び ---------------- */
  { field:"learn", title:"夜間講座の募集",
    text:"前から気になっていた分野の講座。週2回、3か月。",
    a:{ label:"申し込む", effects:{learn:+2, money:-1, play:-1} },
    b:{ label:"独学で本を読む", effects:{learn:+1, health:-1} },
    insight:"学びにお金を払うのは、時間を買っているのと同じ。" },

  { field:"learn", title:"読書の習慣",
    text:"積んだままの本が10冊。時間はどこかから捻出するしかない。",
    a:{ label:"朝15分の読書を始める", effects:{learn:+2, play:-1} },
    b:{ label:"動画の流し見で済ます", effects:{play:+1, learn:-1} },
    insight:"読書は著者の何十年を数時間で受け取る、一番割のいい取引。" },

  { field:"learn", title:"資格に挑戦するか",
    text:"仕事に直結する資格。ただし週末が半年つぶれる。",
    a:{ label:"受験する", effects:{learn:+2, work:+1, family:-1} },
    b:{ label:"実務の中で学ぶ", effects:{work:+1, learn:-1} },
    insight:"資格そのものより、「締切のある学び」が人を変える。" },

  { field:"learn", title:"若い人に教わる",
    text:"新しい道具は、部下の方がずっと詳しい。",
    a:{ label:"頭を下げて教わる（お礼の食事つき）", effects:{learn:+2, relation:+1, money:-1} },
    b:{ label:"自分の経験だけでやる", effects:{work:+1, learn:-1} },
    insight:"「教えてください」と言える人は、年を取らない。" },

  { field:"learn", title:"海外研修の募集",
    text:"2週間、家を空ける。得るものは大きいが負担も大きい。",
    a:{ label:"応募する", effects:{learn:+2, social:+1, family:-2, money:-1} },
    b:{ label:"国内の研修にする", effects:{learn:+1, money:-1} },
    insight:"遠くに行くほど、自分の当たり前が壊れる。壊れた分だけ学びが入る。" },

  /* ---------------- 遊び ---------------- */
  { field:"play", title:"昔の趣味の道具を見つけた",
    text:"押し入れの奥から出てきた。手に取ると、あの頃の感覚が戻ってくる。",
    a:{ label:"もう一度始める", effects:{play:+2, health:+1, money:-1} },
    b:{ label:"今は仕事を優先", effects:{work:+1, play:-2} },
    insight:"趣味は人生の換気口。ふさぐと部屋（心）の空気がよどむ。" },

  { field:"play", title:"有休が残っている",
    text:"消化しないと消える。でも仕事は山積み。",
    a:{ label:"連休にして旅に出る", effects:{play:+2, family:+1, work:-1} },
    b:{ label:"取らずに働く", effects:{work:+1, money:+1, play:-2, health:-1} },
    insight:"休まない人は頑張っているのではなく、休み方を忘れているだけのことがある。" },

  { field:"play", title:"趣味の発表会に誘われた",
    text:"仲間から「一緒に出よう」と誘われた。練習時間が要る。",
    a:{ label:"出る", effects:{play:+2, relation:+1, work:-1} },
    b:{ label:"今回は見送る", effects:{work:+1, play:-1} },
    insight:"人前に出る遊びは、遊びのふりをした最高の修行。" },

  { field:"play", title:"新しい遊びを始めるか",
    text:"家族や仲間が誘ってくる。道具をそろえると結構な出費だ。",
    a:{ label:"始める", effects:{play:+2, family:+1, money:-2} },
    b:{ label:"いつもの週末を過ごす", effects:{health:+1, play:-1} },
    insight:"新しい遊びは、新しい人間関係と新しい会話を連れてくる。" },

  { field:"play", title:"平日の夜の使い方",
    text:"帰宅後の2時間。積み残しの仕事も、やりたい趣味もある。",
    a:{ label:"趣味の時間を死守する", effects:{play:+2, work:-1} },
    b:{ label:"残った仕事を片付ける", effects:{work:+1, play:-1, family:-1} },
    insight:"夜の2時間の使い方が、10年後の顔つきを決める。" },

  /* ---------------- 人間関係 ---------------- */
  { field:"relation", title:"疎遠だった友人から連絡",
    text:"10年ぶりの連絡。「近くに来たから会えないか」と言う。",
    a:{ label:"仕事を調整して会いに行く", effects:{relation:+2, play:+1, work:-1} },
    b:{ label:"「また今度」と返す", effects:{work:+1, relation:-1} },
    insight:"「また今度」の多くは二度と来ない。友情の寿命は連絡の間隔で決まる。" },

  { field:"relation", title:"地域の役員を頼まれた",
    text:"順番だからと言われた。断れなくはないが、角は立つ。",
    a:{ label:"引き受ける", effects:{relation:+1, social:+2, play:-1, family:-1} },
    b:{ label:"事情を話して断る", effects:{play:+1, relation:-1} },
    insight:"面倒な役目は、地域という銀行への積立。すぐには増えないが、いざという時に下ろせる。" },

  { field:"relation", title:"職場の対立",
    text:"同僚二人の仲がこじれて、周りが気を使っている。",
    a:{ label:"間に入って仲裁する", effects:{relation:+2, health:-1} },
    b:{ label:"仕事に集中して関わらない", effects:{work:+1, relation:-1} },
    insight:"仲裁は疲れる。だが「あの人が間に入ってくれた」は一生忘れられない。" },

  { field:"relation", title:"異業種交流会",
    text:"平日の夜。参加費もかかるが、普段会えない人に会える。",
    a:{ label:"参加する", effects:{relation:+2, learn:+1, money:-1, family:-1} },
    b:{ label:"まっすぐ家に帰る", effects:{family:+1, relation:-1} },
    insight:"人脈は名刺の枚数ではなく、「あの人に相談しよう」と思い出される回数。" },

  { field:"relation", title:"恩人へのあいさつ",
    text:"世話になった人に、もう何年も会っていない。",
    a:{ label:"時間を作って会いに行く", effects:{relation:+2, social:+1, work:-1} },
    b:{ label:"年賀状だけにする", effects:{work:+1, relation:-1} },
    insight:"恩は返すものではなく、次の人に送るもの。ただし顔は見せに行くもの。" },

  /* ---------------- 社会 ---------------- */
  { field:"social", title:"地域の清掃ボランティア",
    text:"日曜の朝。正直、寝ていたい。",
    a:{ label:"参加する", effects:{social:+2, health:+1, play:-1} },
    b:{ label:"寄付で応援する", effects:{social:+1, money:-1} },
    insight:"地域への貢献は、住んでいる場所を「自分の街」に変える魔法。" },

  { field:"social", title:"業界団体の世話役",
    text:"「次はあなたに」と言われた。名誉ではあるが時間を食う。",
    a:{ label:"引き受ける", effects:{social:+2, relation:+1, work:-1, play:-1} },
    b:{ label:"丁重に断る", effects:{work:+1, social:-1} },
    insight:"業界の世話役は、業界の未来に対する納税のようなもの。" },

  { field:"social", title:"災害のニュース",
    text:"遠くの街が大きな災害に遭った。何かしたい気持ちがある。",
    a:{ label:"休みを使って現地で手伝う", effects:{social:+2, relation:+1, work:-1, money:-1} },
    b:{ label:"募金する", effects:{social:+1, money:-1} },
    insight:"できることをできる形で。行くのも送るのも、どちらも本物の支援。" },

  { field:"social", title:"母校から講演の依頼",
    text:"「仕事の話を子どもたちに」と頼まれた。準備は大変そうだ。",
    a:{ label:"引き受ける", effects:{social:+2, learn:+1, work:-1} },
    b:{ label:"忙しくて断る", effects:{work:+1, social:-1} },
    insight:"人に教える準備をすると、一番学ぶのは自分。" },

  { field:"social", title:"仕入れ先の切り替え",
    text:"環境に配慮した仕入れ先が見つかった。ただし少し高い。",
    a:{ label:"切り替える", effects:{social:+2, money:-2} },
    b:{ label:"従来のままにする", effects:{money:+1, social:-1} },
    insight:"買い物は投票。何にお金を払うかで、どんな社会に一票入れるかが決まる。" }

  ]
}
];
