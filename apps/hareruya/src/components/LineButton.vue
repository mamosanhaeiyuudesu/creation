<template>
  <component
    :is="hasLine ? 'a' : 'span'"
    v-bind="linkAttrs"
    :class="{ 'is-pending': !hasLine }"
  >
    <svg
      width="19"
      height="19"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="2"
      stroke-linecap="round"
      stroke-linejoin="round"
      aria-hidden="true"
    >
      <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
    </svg>
    {{ hasLine ? label : pendingLabel }}
  </component>
</template>

<script setup lang="ts">
import { site } from '~/config/site'

withDefaults(
  defineProps<{
    label?: string
    pendingLabel?: string
  }>(),
  {
    label: 'LINEで予約する',
    pendingLabel: 'LINEアカウント準備中',
  },
)

const hasLine = computed(() => site.lineUrl.length > 0)

const linkAttrs = computed(() =>
  hasLine.value
    ? { href: site.lineUrl, target: '_blank', rel: 'noopener noreferrer' }
    : { 'aria-disabled': 'true' },
)
</script>
