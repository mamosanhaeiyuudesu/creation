<template>
  <p class="kk-lead py-10 text-center">読み込んでいます…</p>
</template>

<script setup lang="ts">
// 設定は左メニューの「設定」から開く（components/SettingsPanel.vue。お知らせが出るときは自動で開く）。
// Stripe の戻り先など、古い /settings の URL から来た人をトップへ送る。
const route = useRoute()
const router = useRouter()
const paid = useState<boolean>('kk-settings-paid', () => false)

onMounted(async () => {
  paid.value = !!route.query.paid
  await router.replace('/')
})
</script>
