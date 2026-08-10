// life（人生のインタビュー）のテーマ定義。ライフステージ別。
// サーバー・クライアント両方から参照する（Nuxtの `~/utils` は両方でauto-import）。

export interface LifeTheme {
  id: string
  sheetName: string
  label: string
  ageHint: string
  emoji: string
  description: string
  guidance: string
  opening: string
}

export const LIFE_THEMES: LifeTheme[] = [
  {
    id: 'infancy',
    sheetName: '幼少期',
    label: '幼少期',
    ageHint: '生まれてから小学校に上がる前',
    emoji: '🍼',
    description: '物心つく前後の記憶、家族の雰囲気、はじめての場所や人の記憶',
    guidance: '幼少期の記憶は断片的なことが多い。「覚えている」ことそのものを尊重し、匂いや音、誰が近くにいたかなど五感の記憶から手繰り寄せる問いを重ねる。',
    opening: 'いちばん古い記憶から聞かせてください。覚えている中で、一番小さい頃の思い出はどんな場面ですか？',
  },
  {
    id: 'childhood',
    sheetName: '学童期',
    label: '学童期',
    ageHint: '小学生の頃',
    emoji: '🎒',
    description: '学校生活、友人関係、家庭での役割、好きだったこと・苦手だったこと',
    guidance: '学校・家庭・友人関係のどれか一つの具体的なエピソードに絞って深掘りする。優等生的な回顧に流れそうなときは、当時感じていた気持ちに焦点を戻す。',
    opening: '小学生の頃、毎日どんなふうに過ごしていましたか？特に印象に残っている一日があれば教えてください。',
  },
  {
    id: 'adolescence',
    sheetName: '思春期',
    label: '思春期',
    ageHint: '中学・高校の頃',
    emoji: '🌱',
    description: '自我の芽生え、友人・恋愛、進路の悩み、家族との距離感の変化',
    guidance: '自分と周囲（親・友人・社会）との間に生まれた違和感や葛藤を丁寧に拾う。答えにくそうな話題は無理に踏み込まず、本人のペースに合わせる。',
    opening: '中学・高校の頃、一番心が動いた出来事は何でしたか？嬉しかったことでも、悩んだことでも構いません。',
  },
  {
    id: 'youth',
    sheetName: '青年期',
    label: '青年期',
    ageHint: '大学・就職・独立の頃',
    emoji: '🚪',
    description: '進路選択、初めての仕事、独り立ち、人生を左右した出会いや決断',
    guidance: '「なぜその選択をしたのか」という決断の背景にある気持ちを掘り下げる。結果論ではなく、その瞬間に何を考えていたかを聞く。',
    opening: '大人になっていく中で、大きな決断をした瞬間はありましたか？そのときのことを聞かせてください。',
  },
  {
    id: 'present',
    sheetName: '現在',
    label: '現在',
    ageHint: '今の暮らしとこれから',
    emoji: '🏠',
    description: '今大切にしていること、日々の暮らし、これから先に思い描いていること',
    guidance: '過去の話に引っ張られすぎず「今」の実感を聞く。未来については断定させず、今感じている気持ちや願いのレベルで留める。',
    opening: '今の暮らしの中で、大切にしていることは何ですか？普段の一日の様子も含めて教えてください。',
  },
]

export function findLifeTheme(id: string): LifeTheme | undefined {
  return LIFE_THEMES.find(t => t.id === id)
}
