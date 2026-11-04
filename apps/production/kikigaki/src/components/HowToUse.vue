<template>
  <!-- 基本的な使い方。議事録が1件もない人のホームと、設定の「使い方」（/guide）で見せる。長いマニュアルにせず、1画面に収まる分量にする -->
  <div class="kk-howto">
    <h2 class="kk-howto-h is-first">使い方</h2>

    <ol class="kk-howto-steps">
      <li>
        <span class="kk-howto-num">1</span>
        <div>
          <p class="kk-howto-title">会議のテキストを用意する</p>
          <p class="kk-howto-text">
            Google Meet・Zoom の文字起こしや、スマホの録音アプリで文字にしたものを使います。ファイルでも、コピーしたテキストでもかまいません。
          </p>
        </div>
      </li>
      <li>
        <span class="kk-howto-num">2</span>
        <div>
          <p class="kk-howto-title">テキストから議事録を作る</p>
          <p class="kk-howto-text">
            <span class="kk-howto-pc">左下の「新しく作る」</span><span class="kk-howto-sp">ホームの「テキストから議事録を作る」</span>を押し、ファイルを選ぶかテキストを貼り付けて、種類を選びます。AIが議事録にまとめます。
          </p>
        </div>
      </li>
      <li>
        <span class="kk-howto-num">3</span>
        <div>
          <p class="kk-howto-title">確かめて直し、PDFで配る</p>
          <p class="kk-howto-text">
            直したところは自動で保存されます。できたらPDFで保存するか、Googleドライブに保存します。
          </p>
        </div>
      </li>
    </ol>

    <h3 class="kk-howto-h">2つの種類</h3>
    <!-- 2つの違いを見比べられるよう、表にする（行＝見るところ、列＝種類） -->
    <table class="kk-howto-kinds">
      <thead>
        <tr>
          <th scope="col"><span class="sr-only">見るところ</span></th>
          <th scope="col"><MinutesModeBadge mode="meeting" /></th>
          <th scope="col"><MinutesModeBadge mode="talk" /></th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <th scope="row">向いているもの</th>
          <td>会議・打ち合わせ・相談など、何人かで話し合ったもの</td>
          <td>講演・インタビュー・面談など、一人が多く話したもの</td>
        </tr>
        <tr>
          <th scope="row">中心にまとめること</th>
          <td>決まったこと・やること</td>
          <td>話し手が伝えたかったこと</td>
        </tr>
        <tr>
          <th scope="row">載る項目</th>
          <td>概要・決まったこと・やること・話し合ったこと</td>
          <td>概要・話の内容・やること</td>
        </tr>
        <tr>
          <th scope="row">PDF</th>
          <td>A4横 1枚</td>
          <td>A4縦</td>
        </tr>
      </tbody>
    </table>

    <h3 class="kk-howto-h">直すときのコツ</h3>
    <ul class="kk-howto-tips">
      <li>「AIで修正」には「阪中さんを坂中さんに直して」のように、一言で頼めます。</li>
      <li>「AIが判断しきれなかったところ」を先に見ると、早く直せます。</li>
    </ul>
  </div>
</template>

<style scoped>
/* カードにして、見出しは同じ大きさにそろえ、蛍光ペンを引いたような下線を付ける */
.kk-howto {
  width: 100%;
  max-width: 640px;
  margin: 0 auto;
  padding: 1.6rem 1.8rem 1.5rem;
  background: var(--kk-panel);
  border: 1px solid var(--kk-line);
  border-radius: 16px;
  box-shadow: 0 6px 24px rgba(20, 60, 120, 0.06);
}
@media (max-width: 639px) {
  .kk-howto {
    padding: 1.2rem 1.1rem 1.1rem;
  }
}
.kk-howto-h {
  width: fit-content;
  margin: 1.8rem 0 0.8rem;
  padding: 0 0.2em;
  font-size: 15.5px;
  font-weight: 700;
  letter-spacing: 0.04em;
  color: var(--kk-ink);
  background: linear-gradient(transparent 62%, #ffdcae 62%);
}
.kk-howto-h.is-first {
  margin-top: 0;
}
.kk-howto-steps {
  margin: 0;
  padding: 0;
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}
.kk-howto-steps li {
  display: flex;
  gap: 0.7rem;
}
.kk-howto-num {
  width: 24px;
  height: 24px;
  flex: none;
  border-radius: 999px;
  background: var(--kk-accent);
  color: #fff;
  font-size: 13px;
  font-weight: 700;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}
.kk-howto-title {
  margin: 0.1rem 0 0.15rem;
  font-size: 14px;
  font-weight: 700;
}
.kk-howto-text,
.kk-howto-tips {
  font-size: 13px;
  line-height: 1.75;
  color: var(--kk-ink-soft);
}
.kk-howto-text {
  margin: 0;
}
/* 作るボタンの場所は、PCは左のメニューの下、スマホ（左のメニューが無い）はホーム */
.kk-howto-pc {
  display: none;
}
@media (min-width: 1024px) {
  .kk-howto-pc {
    display: inline;
  }
  .kk-howto-sp {
    display: none;
  }
}
.kk-howto-kinds {
  width: 100%;
  border-collapse: collapse;
  table-layout: fixed;
  font-size: 12.5px;
  line-height: 1.6;
}
.kk-howto-kinds th,
.kk-howto-kinds td {
  padding: 0.45rem 0.55rem;
  border-bottom: 1px solid var(--kk-line);
  text-align: left;
  vertical-align: top;
}
.kk-howto-kinds thead th {
  padding-top: 0;
  border-bottom-width: 2px;
}
.kk-howto-kinds thead th:first-child {
  width: 10em;
}
.kk-howto-kinds tbody th {
  font-weight: 700;
  color: var(--kk-ink);
  white-space: nowrap;
}
.kk-howto-kinds td {
  color: var(--kk-ink-soft);
}
.kk-howto-kinds tbody tr:last-child th,
.kk-howto-kinds tbody tr:last-child td {
  border-bottom: 0;
}
@media (max-width: 639px) {
  .kk-howto-kinds thead th:first-child {
    width: 5.2em;
  }
  .kk-howto-kinds tbody th {
    white-space: normal;
  }
  .kk-howto-kinds th,
  .kk-howto-kinds td {
    padding: 0.4rem 0.35rem;
  }
}
.kk-howto-tips {
  margin: 0;
  padding-left: 1.2rem;
  list-style: disc;
}
</style>
