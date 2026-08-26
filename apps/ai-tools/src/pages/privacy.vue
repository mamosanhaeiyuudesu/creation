<template>
  <div class="min-h-full px-4 sm:px-8 py-10 sm:py-14">
    <div class="max-w-[760px] mx-auto">
      <header class="mb-10">
        <h1 class="m-0 text-[clamp(24px,5vw,34px)] font-bold bg-gradient-to-br from-sky-400 to-indigo-500 bg-clip-text text-transparent">
          プライバシーポリシー
        </h1>
        <p class="mt-2 mb-0 text-slate-500 text-sm">最終更新日: 2026年8月26日</p>
      </header>

      <div class="space-y-10 text-slate-300 text-[14.5px] leading-[1.9]">
        <section>
          <p>
            このサイト（以下「本サービス」）は、個人が趣味および身のまわりの仕事のために作っているツール群です。
            商用サービスではなく、招待した人だけが使える非公開の道具として運用しています。
            本ポリシーは、本サービスが扱う情報の内容と取り扱いについて説明するものです。
          </p>
        </section>

        <section>
          <h2 class="kk-h2">1. 保存する情報</h2>

          <h3 class="kk-h3">アカウント情報</h3>
          <p>
            ユーザー名と、パスワードから計算したハッシュ値（PBKDF2）を保存します。
            <strong class="text-slate-100">パスワードそのものは保存していません。</strong>
            ログイン状態の保持のため、ブラウザにセッション用のCookieを設定します。
            アカウントは招待制で、本サービス上から新規登録することはできません。
          </p>

          <h3 class="kk-h3">各ツールに入力・アップロードした内容</h3>
          <p>
            録音した音声、アップロードした音声ファイル、文字起こしの結果、作成された議事録、
            記録したテキスト、写真などを、ツールごとにデータベース（Cloudflare D1）へ保存します。
            ほとんどのツールでは、これらはログインしたアカウントに紐づけて保存され、他の利用者からは参照できません。
          </p>
          <p class="mt-3">
            ただし<strong class="text-slate-100">会議の議事録をつくるツール（キキガキ）は例外で、
            保存した議事録と文字起こしを、ログインできる利用者全員で共有します。</strong>
            同じ会議に出ていた人どうしで内容を確認・修正しあうためのもので、
            あなたがアップロードした記録は他の利用者にも表示されます（削除はアップロードした本人のみ行えます）。
            共有したくない内容は、このツールにアップロードしないでください。
          </p>

          <h3 class="kk-h3">お使いの端末の中だけに保存するもの</h3>
          <p>
            一部の情報はサーバーへ送らず、ブラウザの localStorage にのみ保存します。
            これらは運営者からは参照できません。
          </p>
          <ul class="kk-ul">
            <li><strong class="text-slate-100">kiroku（感情メモ）に書いた内容</strong>。このツールはサーバー・データベース・認証を一切使いません。</li>
            <li>トップページの「よく使う」を出すための、ツールを開いた回数。</li>
            <li>文字起こしモデルの選択などの表示設定。</li>
          </ul>
        </section>

        <section>
          <h2 class="kk-h2">2. 外部サービスへの送信</h2>
          <p>
            本サービスは、機能の実現のために以下の外部サービスへ情報を送信します。
            送信した情報の取り扱いは、各サービスの規約およびプライバシーポリシーに従います。
          </p>
          <div class="overflow-x-auto mt-4">
            <table class="w-full text-[13.5px] border-collapse">
              <thead>
                <tr class="border-b border-white/[0.12] text-slate-400 text-left">
                  <th class="py-2 pr-4 font-semibold whitespace-nowrap">送信先</th>
                  <th class="py-2 font-semibold">送るもの・目的</th>
                </tr>
              </thead>
              <tbody class="align-top">
                <tr class="border-b border-white/[0.06]">
                  <td class="py-2.5 pr-4 text-slate-100 whitespace-nowrap">OpenAI</td>
                  <td class="py-2.5">音声（文字起こしのため）、テキスト（要約・校正・各種生成のため）、文章（読み上げ音声の作成のため）</td>
                </tr>
                <tr class="border-b border-white/[0.06]">
                  <td class="py-2.5 pr-4 text-slate-100 whitespace-nowrap">Anthropic (Claude)</td>
                  <td class="py-2.5">テキスト（議事録の構造化、要約、チャット応答などのため）</td>
                </tr>
                <tr class="border-b border-white/[0.06]">
                  <td class="py-2.5 pr-4 text-slate-100 whitespace-nowrap">Google Gemini</td>
                  <td class="py-2.5">音声（文字起こしのため。利用者が設定でGeminiを選んだ場合のみ）</td>
                </tr>
                <tr class="border-b border-white/[0.06]">
                  <td class="py-2.5 pr-4 text-slate-100 whitespace-nowrap">Google</td>
                  <td class="py-2.5">連携した場合のみ。詳細は「3. Googleアカウントとの連携」に記載</td>
                </tr>
                <tr class="border-b border-white/[0.06]">
                  <td class="py-2.5 pr-4 text-slate-100 whitespace-nowrap">Trello</td>
                  <td class="py-2.5">タスク管理ツールで、利用者本人が登録したTrelloのカード情報の読み書き</td>
                </tr>
                <tr class="border-b border-white/[0.06]">
                  <td class="py-2.5 pr-4 text-slate-100 whitespace-nowrap">MLB Stats API</td>
                  <td class="py-2.5">野球選手の成績の取得（個人情報は送信しません）</td>
                </tr>
                <tr class="border-b border-white/[0.06]">
                  <td class="py-2.5 pr-4 text-slate-100 whitespace-nowrap">Cloudflare</td>
                  <td class="py-2.5">本サービスの実行環境およびデータベース。保存する情報はすべてここに置かれます</td>
                </tr>
                <tr>
                  <td class="py-2.5 pr-4 text-slate-100 whitespace-nowrap">Google Analytics</td>
                  <td class="py-2.5">アクセス状況の把握（閲覧ページ、おおまかな地域、ブラウザの種類など）</td>
                </tr>
              </tbody>
            </table>
          </div>
          <p class="mt-4">
            なお、本サービスは利用者の情報を広告に利用したり、第三者へ販売・提供したりすることはありません。
          </p>
        </section>

        <section>
          <h2 class="kk-h2">3. Googleアカウントとの連携</h2>
          <p>
            一部のツールは、利用者が明示的に連携を許可した場合に限り、Googleアカウントの情報へアクセスします。
            連携するかどうかは利用者が選べ、連携しなくてもそれ以外の機能は利用できます。
          </p>

          <h3 class="kk-h3">要求する権限と、その用途</h3>
          <ul class="kk-ul">
            <li>
              <strong class="text-slate-100">Googleドキュメント</strong> —
              承認された議事録を、新しいドキュメントとして作成するために使います。
            </li>
            <li>
              <strong class="text-slate-100">Googleスプレッドシート</strong> —
              議事録の一覧シートを作成し、承認された議事録の概要を1行追記するために使います。
            </li>
            <li>
              <strong class="text-slate-100">Google ToDo リスト</strong> —
              承認されたタスクを登録するために使います。
            </li>
            <li>
              <strong class="text-slate-100">Googleカレンダー</strong> —
              承認された予定を登録するために使います。
            </li>
            <li>
              <strong class="text-slate-100">Googleドライブ（アプリが作成したファイルのみ）</strong> —
              インタビュー記録用のスプレッドシートを本人のドライブに作成し、読み書きするために使います。
            </li>
            <li>
              <strong class="text-slate-100">Google Health（読み取りのみ）</strong> —
              歩数・睡眠・心拍などの健康データを読み取り、ダッシュボードとして表示するために使います。
            </li>
          </ul>

          <div class="mt-5 rounded-xl border border-sky-400/25 bg-sky-400/[0.06] px-5 py-4">
            <p class="m-0 text-slate-100 font-semibold text-[14px]">人が承認するまで、Googleには何も書き込みません</p>
            <p class="m-0 mt-2 text-[13.5px]">
              議事録・タスク・予定は、いったん本サービス内の確認画面に表示されます。
              利用者が内容を確認し、必要なら修正したうえで「承認」の操作を行ったときにのみ、Googleへ書き込みます。
              自動的に書き込まれることはありません。
            </p>
          </div>

          <h3 class="kk-h3">アクセストークンの取り扱い</h3>
          <p>
            連携時にGoogleから受け取るリフレッシュトークンは、暗号化したうえでデータベースに保存します。
            アクセストークンは保存せず、必要になるつど取得して使い捨てにします。
            トークンは上記の用途にのみ使用し、他の目的には使いません。
          </p>

          <h3 class="kk-h3">連携の解除</h3>
          <p>
            各ツールの画面にある「解除」から、いつでも連携を解除できます。解除すると、保存していたトークンを削除します。
            また
            <a href="https://myaccount.google.com/permissions" target="_blank" rel="noopener" class="text-sky-400 hover:text-sky-300 underline underline-offset-2">Googleアカウントの設定画面</a>
            からも、本サービスへのアクセス権を取り消せます。
            なお、すでに作成されたドキュメント・スプレッドシート・タスク・予定は、利用者本人のものとしてGoogle側に残ります。
          </p>

          <h3 class="kk-h3">Google API Services User Data Policy への準拠</h3>
          <p>
            本サービスによるGoogle APIから取得した情報の利用および他アプリへの移行は、
            <a href="https://developers.google.com/terms/api-services-user-data-policy" target="_blank" rel="noopener" class="text-sky-400 hover:text-sky-300 underline underline-offset-2">Google API Services User Data Policy</a>
            （Limited Use の要件を含む）に準拠します。
          </p>
        </section>

        <section>
          <h2 class="kk-h2">4. 暗号化と、運営者が見られる範囲</h2>
          <p>
            会議の文字起こしや議事録など、内容が機微になりうる情報と、外部サービスのアクセストークンは、
            データベースに保存する前にAES-GCMで暗号化しています。
          </p>
          <div class="mt-4 rounded-xl border border-amber-400/25 bg-amber-400/[0.06] px-5 py-4">
            <p class="m-0 text-slate-100 font-semibold text-[14px]">ただし、運営者は技術的には復号できます</p>
            <p class="m-0 mt-2 text-[13.5px]">
              暗号鍵は運営者が管理しているため、上記の暗号化は「データベースを直接覗かれたときに読めない」ための措置であり、
              運営者に対して内容を秘匿するものではありません。運営者が日常的に内容を閲覧することはありませんが、
              <strong class="text-slate-100">見ようと思えば見られる状態である</strong>ことを明示しておきます。
              誰にも読まれたくない内容は、端末内にのみ保存する kiroku をお使いください。
            </p>
          </div>
        </section>

        <section>
          <h2 class="kk-h2">5. 保存期間と削除</h2>
          <p>
            保存した情報は、利用者が削除するか、運営者が本サービスを終了するまで保管されます。
            多くのツールには画面上に削除の操作があり、そこから消したものはデータベースからも削除されます。
            アカウントごとすべての情報を削除したい場合は、下記の連絡先までご連絡ください。
          </p>
          <p>
            なお、外部サービス（OpenAI、Anthropic、Googleなど）へ送信済みの情報の取り扱いは、
            各社のポリシーによります。本サービス側で削除しても、各社側の記録が同時に消えるわけではありません。
          </p>
        </section>

        <section>
          <h2 class="kk-h2">6. Cookie</h2>
          <p>
            ログイン状態を保つためのCookieと、Google Analyticsが設定するCookieを使用します。
            ブラウザの設定でCookieを無効にすると、ログインが必要な機能は利用できなくなります。
          </p>
        </section>

        <section>
          <h2 class="kk-h2">7. お子さまの利用について</h2>
          <p>
            本サービスは招待制であり、13歳未満の方の利用を想定していません。
          </p>
        </section>

        <section>
          <h2 class="kk-h2">8. 本ポリシーの変更</h2>
          <p>
            機能の追加や変更にあわせて本ポリシーを改定することがあります。
            重要な変更を行った場合は、このページの最終更新日を更新します。
          </p>
        </section>

        <section>
          <h2 class="kk-h2">9. お問い合わせ</h2>
          <p>
            本ポリシーおよび情報の取り扱いに関するお問い合わせ、情報の削除のご依頼は、
            以下までご連絡ください。
          </p>
          <p class="mt-2 text-slate-100">
            <!-- ★公開前に、Googleの「ブランディング」に登録するのと同じ連絡先メールアドレスへ書き換えること -->
            連絡先: <span class="text-amber-300">（ここに連絡先メールアドレスを記入してください）</span>
          </p>
        </section>
      </div>

      <footer class="mt-14 pt-6 border-t border-white/[0.08]">
        <NuxtLink to="/" class="text-sm text-slate-500 hover:text-slate-300 transition-colors">← ツール一覧へ</NuxtLink>
      </footer>
    </div>
  </div>
</template>

<script setup lang="ts">
// Googleのアプリ審査・OAuth同意画面から参照される公開ページ。
// ログイン不要でなければならない（審査担当者が開けなくなるため、認証を足さないこと）。
useHead({ title: 'プライバシーポリシー — AI Tools' })
</script>

<style scoped>
.kk-h2 {
  font-size: 17px;
  font-weight: 700;
  color: rgb(248 250 252);
  margin: 0 0 0.75rem;
  padding-bottom: 0.5rem;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
}
.kk-h3 {
  font-size: 14.5px;
  font-weight: 700;
  color: rgb(203 213 225);
  margin: 1.5rem 0 0.4rem;
}
.kk-h3:first-of-type {
  margin-top: 1rem;
}
.kk-ul {
  list-style: disc;
  padding-left: 1.4rem;
  margin: 0.5rem 0 0;
}
.kk-ul > li {
  margin-bottom: 0.5rem;
}
</style>
