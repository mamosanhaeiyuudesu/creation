<template>
  <p class="kk-lead py-10 text-center">読み込んでいます…</p>
</template>

<script setup lang="ts">
// 設定は左メニューに常に出ている（components/SettingsPanel.vue）。
// Stripe の戻り先など、古い /settings の URL から来た人をトップへ送る。
const route = useRoute()
const router = useRouter()
const paid = useState<boolean>('kk-settings-paid', () => false)

onMounted(async () => {
  paid.value = !!route.query.paid
  await router.replace('/')
})
</script>
