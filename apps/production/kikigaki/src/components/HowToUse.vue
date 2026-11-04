<template>
  <!-- 基本的な使い方。議事録が1件もない人のホームと、設定の「使い方」（/guide）で見せる。長いマニュアルにせず、1画面に収まる分量にする -->
  <div class="kk-howto">
    <h2 class="kk-howto-h is-first">使い方</h2>

    <ol class="kk-howto-steps">
      <li>
        <span class="kk-howto-num">1</span>
        <div>
          <p class="kk-howto-title">会議の文章を用意する</p>
          <p class="kk-howto-text">
            Google Meet・Zoom の文字起こしや、スマホの録音アプリで文字にしたものを使います。テキストファイルでも、コピーした文章でもかまいません。
          </p>
        </div>
      </li>
      <li>
        <span class="kk-howto-num">2</span>
        <div>
          <p class="kk-howto-title">文章から議事録を作る</p>
          <p class="kk-howto-text">
            <span class="kk-howto-pc">左下の「新しく作る」</span><span class="kk-howto-sp">ホームの「文章から議事録を作る」</span>を押し、ファイルを選ぶか文章を貼り付けて、種類を選びます。AIが議事録にまとめます。
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
    <dl class="kk-howto-kinds">
      <div>
        <dt><MinutesModeBadge mode="meeting" /></dt>
        <dd>会議・打ち合わせなど、何人かで話し合ったもの。決まったこと・やることを、A4横1枚にまとめます。</dd>
      </div>
      <div>
        <dt><MinutesModeBadge mode="talk" /></dt>
        <dd>講演・面談など、一人が多く話したもの。話の要点ごとに、A4縦で数ページにまとめます。</dd>
      </div>
    </dl>

    <h3 class="kk-howto-h">直すときのコツ</h3>
    <ul class="kk-howto-tips">
      <li>「AIで修正」には「阪中さんを坂中さんに直して」のように、一言で頼めます。</li>
      <li>「AIが判断しきれなかったところ」を先に見ると、早く直せます。</li>
    </ul>

    <p class="kk-howto-foot">困ったことや、こうしてほしいことがあれば「ご意見」から送ってください。</p>
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
.kk-howto-kinds dd,
.kk-howto-tips,
.kk-howto-foot {
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
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}
.kk-howto-kinds div {
  display: flex;
  align-items: baseline;
  gap: 0.6rem;
}
.kk-howto-kinds dt {
  flex: none;
}
.kk-howto-kinds dd {
  margin: 0;
}
.kk-howto-tips {
  margin: 0;
  padding-left: 1.2rem;
  list-style: disc;
}
.kk-howto-foot {
  margin: 1.6rem 0 0;
  padding-top: 0.9rem;
  border-top: 1px dashed var(--kk-line);
}
</style>
