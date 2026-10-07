<template>
  <div>
    <h1 class="kk-h1 mt-2">プライバシーポリシー</h1>
    <LegalDraftNotice />

    <!--
      ★このページのURL（/privacy）は変えないこと。
        Google の OAuth 同意画面がこのURLを参照するため、変えると同意画面側の設定も壊れる。
      本文は後から差し込むが、章立ては「何を預かり、どこへ渡すか」が分かる構成にしてある。
    -->
    <section v-for="s in sections" :key="s.title" class="mt-8">
      <h2 class="kk-h2">{{ s.title }}</h2>
      <p class="kk-lead mt-2">{{ s.body }}</p>
      <ul v-if="s.items" class="mt-2 pl-5 kk-lead">
        <li v-for="item in s.items" :key="item">{{ item }}</li>
      </ul>
    </section>

    <p class="kk-note mt-10">制定日: （後日記載）</p>
  </div>
</template>

<script setup lang="ts">
import { SERVICE } from '~/config/service'

useHead({ title: `プライバシーポリシー — ${SERVICE.name}` })

const sections: { title: string; body: string; items?: string[] }[] = [
  { title: '取得する情報', body: '（後日記載）' },
  { title: '利用目的', body: '（後日記載）' },
  {
    title: '外部サービスへの送信',
    body: '（後日記載）本サービスは、次の事業者のサービスを利用しています。',
    items: [
      'Google（ログイン・本人確認）',
      'OpenAI（音声の文字起こし）',
      'Anthropic（議事録の作成）',
      'Stripe（お支払いの処理）',
      'Cloudflare（サービスの配信とデータの保管）',
    ],
  },
  { title: '録音データ・議事録の保存', body: '（後日記載）' },
  { title: '保存期間と削除', body: '（後日記載）' },
  { title: '第三者提供', body: '（後日記載）' },
  { title: 'お問い合わせ窓口', body: '（後日記載）' },
]
</script>
