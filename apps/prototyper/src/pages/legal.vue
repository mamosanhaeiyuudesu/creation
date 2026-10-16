<template>
  <div class="ac-page">
    <nav class="ac-nav">
      <div class="ac-nav-inner">
        <NuxtLink to="/"><img src="/images/prototyper-nav-logo.png" alt="prototyper" class="ac-nav-logo-img"></NuxtLink>
      </div>
    </nav>

    <section>
      <div class="ac-wrap">
        <h1 class="section-title">特定商取引法に基づく表記</h1>
        <div class="terms-payment">
          <div class="terms-payment-body">
            <div v-for="row in rows" :key="row.label" class="terms-payment-row">
              <span class="terms-payment-label">{{ row.label }}</span>
              <span class="terms-payment-value">{{ row.value }}</span>
            </div>
          </div>
        </div>
        <p style="margin-top: 28px;">
          <NuxtLink to="/" class="terms-payment-link">← トップに戻る</NuxtLink>
        </p>
      </div>
    </section>

    <footer class="ac-footer">
      <div class="ac-footer-inner">
        <span class="ac-footer-copy">&copy; 2026 prototyper</span>
      </div>
    </footer>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ layout: 'prototyper' })

/**
 * 個人の受託のため、代表者名・住所・電話番号は「請求があれば遅滞なく開示」の形で省略している
 * （請求が来たら必ずすぐ返すこと）。data-vis（apps/data-vis/src/config/site.ts）の表記と内容をそろえる
 */
const rows = [
  { label: '販売事業者', value: 'prototyper' },
  { label: '代表者・所在地・電話番号', value: 'ご請求があれば遅滞なく開示します。下記のメールアドレスまでご連絡ください。' },
  { label: 'メールアドレス', value: 'prototyper@insightlens.jp' },
  { label: '販売価格', value: 'ご相談は30分まで無料です。開発費用は、内容と規模に応じてお見積りします。お見積り時に税込の金額をご提示します。' },
  { label: '販売価格以外の必要料金', value: '代金の振込手数料はお客様のご負担となります。公開に必要なサーバー・ドメインなどの費用がかかる場合は、お見積りに含めて事前にご提示します。' },
  { label: '代金の支払時期', value: '開発費用の50%を着手金として着手前に、残金を納品時にお支払いいただきます。' },
  { label: '代金の支払方法', value: '銀行振込' },
  { label: 'サービスの提供時期', value: 'お見積り時に合意した納期に納品します。' },
  { label: 'キャンセル・返金', value: '着手前のキャンセルは費用はかかりません。着手後のキャンセルは、それまでに行った作業分を精算し、着手金との差額を返金またはご請求します。制作物の性質上、納品後の返品はお受けしていません。' },
]

useHead({
  title: '特定商取引法に基づく表記 | prototyper',
  htmlAttrs: { lang: 'ja' },
  meta: [{ name: 'robots', content: 'noindex' }],
})
</script>

<style>
@import '~/assets/css/prototyper.css';
</style>
