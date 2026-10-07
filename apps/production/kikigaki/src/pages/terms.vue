<template>
  <div>
    <h1 class="kk-h1 mt-2">利用規約</h1>
    <LegalDraftNotice />

    <!-- 見出しだけの雛形。本文は後から差し込む（章の順番は一般的な構成に合わせてある） -->
    <section v-for="s in sections" :key="s.title" class="mt-8">
      <h2 class="kk-h2">{{ s.title }}</h2>
      <p class="kk-lead mt-2">{{ s.body }}</p>
    </section>

    <p class="kk-note mt-10">制定日: （後日記載）</p>
  </div>
</template>

<script setup lang="ts">
import { SERVICE } from '~/config/service'

useHead({ title: `利用規約 — ${SERVICE.name}` })

const sections = [
  { title: '第1条（適用）', body: '（後日記載）' },
  { title: '第2条（利用登録）', body: '（後日記載）' },
  { title: '第3条（アカウントの管理）', body: '（後日記載）' },
  { title: '第4条（利用料金と支払方法）', body: '（後日記載）' },
  { title: '第5条（禁止事項）', body: '（後日記載）' },
  { title: '第6条（録音データ・議事録の取り扱い）', body: '（後日記載）' },
  { title: '第7条（サービスの停止・変更）', body: '（後日記載）' },
  { title: '第8条（免責事項）', body: '（後日記載）' },
  { title: '第9条（規約の変更）', body: '（後日記載）' },
  { title: '第10条（準拠法・裁判管轄）', body: '（後日記載）' },
]
</script>
