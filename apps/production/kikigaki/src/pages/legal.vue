<template>
  <div>
    <h1 class="kk-h1 mt-2">特定商取引法に基づく表記</h1>
    <LegalDraftNotice />

    <!-- 値は src/config/service.ts の legal に集約。空欄は「（後日記載）」に落ちる -->
    <dl class="mt-8">
      <template v-for="row in rows" :key="row.label">
        <dt class="kk-field-label mt-5">{{ row.label }}</dt>
        <dd class="m-0 kk-lead">{{ row.value }}</dd>
      </template>
    </dl>
  </div>
</template>

<script setup lang="ts">
import { SERVICE, LEGAL_UNFILLED } from '~/config/service'

useHead({ title: `特定商取引法に基づく表記 — ${SERVICE.name}` })

const fill = (v: string) => (v.trim() ? v : LEGAL_UNFILLED)
const legal = SERVICE.legal

const rows = [
  { label: '販売事業者', value: fill(legal.operator) },
  { label: '代表者', value: fill(legal.representative) },
  { label: '所在地', value: fill(legal.address) },
  { label: 'お問い合わせ', value: fill(legal.email) },
  { label: '電話番号', value: fill(legal.tel) },
  { label: '販売価格', value: fill(legal.price || SERVICE.priceLabel) },
  { label: '代金の支払時期・方法', value: fill(legal.payment) },
  { label: 'サービスの提供時期', value: fill(legal.delivery) },
  { label: '返品・キャンセルについて', value: fill(legal.refund) },
]
</script>
