<template>
  <component
    :is="tag"
    v-bind="linkAttrs"
    :class="{ 'is-pending': isPending }"
  >
    <!-- LINEのシンボル（吹き出し＋LINEの文字）。ベタ塗りでブランドが一目で分かるようにする -->
    <svg width="19" height="19" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path
        d="M12 3.2c-5.1 0-9.2 3.3-9.2 7.4 0 3.7 3.2 6.8 7.6 7.4.3 0 .7.2.8.4.1.2.1.5 0 .8l-.1.8c-.1.2-.2 1 .8.5 1-.4 5.4-3.2 7.4-5.5 1.3-1.4 1.9-2.9 1.9-4.4 0-4.1-4.1-7.4-9.2-7.4zM8.4 13.1H6.6c-.3 0-.5-.2-.5-.5V9c0-.3.2-.5.5-.5s.5.2.5.5v3.1h1.3c.3 0 .5.2.5.5s-.2.5-.5.5zm2-.5c0 .3-.2.5-.5.5s-.5-.2-.5-.5V9c0-.3.2-.5.5-.5s.5.2.5.5v3.6zm4.4 0c0 .2-.1.4-.3.5h-.2c-.2 0-.3-.1-.4-.2l-1.9-2.5v2.2c0 .3-.2.5-.5.5s-.5-.2-.5-.5V9c0-.2.1-.4.3-.5h.2c.2 0 .3.1.4.2l1.9 2.6V9c0-.3.2-.5.5-.5s.5.2.5.5v3.6zm3-2.3c.3 0 .5.2.5.5s-.2.5-.5.5h-1.3v.8h1.3c.3 0 .5.2.5.5s-.2.5-.5.5h-1.8c-.3 0-.5-.2-.5-.5V9c0-.3.2-.5.5-.5h1.8c.3 0 .5.2.5.5s-.2.5-.5.5h-1.3v.8h1.3z"
      />
    </svg>
    <span v-if="brand" class="hr-btn-text">
      <span class="hr-btn-brand">LINE</span>
      <span class="hr-btn-label">{{ isPending ? pendingLabel : label }}</span>
    </span>
    <template v-else>{{ isPending ? pendingLabel : label }}</template>
  </component>
</template>

<script setup lang="ts">
import { site } from '~/config/site'

const props = withDefaults(
  defineProps<{
    label?: string
    /** LINEのURLが未設定のときに表示する文言 */
    pendingLabel?: string
    /** LINEのURLが未設定のとき、代わりにリンクさせるページ内アンカー */
    fallbackHref?: string
    /** ラベルの上に「LINE」というサービス名を小さく添える */
    brand?: boolean
  }>(),
  {
    label: 'LINEで予約する',
    pendingLabel: 'ご予約・お問い合わせは公式LINEから',
    fallbackHref: '',
    brand: false,
  },
)

const hasLine = computed(() => site.lineUrl.length > 0)
/** リンク先がまったくない状態（文言だけ表示する） */
const isPending = computed(() => !hasLine.value && !props.fallbackHref)

const tag = computed(() => (isPending.value ? 'span' : 'a'))

const linkAttrs = computed(() => {
  if (hasLine.value) return { href: site.lineUrl, target: '_blank', rel: 'noopener noreferrer' }
  if (props.fallbackHref) return { href: props.fallbackHref }
  return { 'aria-disabled': 'true' }
})
</script>
