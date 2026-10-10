<template>
  <p class="kk-lead py-10 text-center">読み込んでいます…</p>
</template>

<script setup lang="ts">
// 設定はポップアップになった（components/SettingsSheet.vue）。
// Stripe の戻り先など、古い /settings の URL から来た人をトップへ送り、設定を開く。
const route = useRoute()
const router = useRouter()
const open = useState<boolean>('kk-settings-open', () => false)
const paid = useState<boolean>('kk-settings-paid', () => false)

onMounted(async () => {
  paid.value = !!route.query.paid
  open.value = true
  await router.replace('/')
})
</script>
