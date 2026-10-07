<template>
  <!--
    法務ページがまだ雛形であることの表示。
    空欄のまま確定文面のように見せたくないので、SERVICE.legalDraft が true の間だけ出す。
    本文を入れ終えたら src/config/service.ts の legalDraft を false にする（この部品は消さない）。
  -->
  <p v-if="draft" class="kk-notice kk-notice--warn mt-5">
    この文面は雛形です。内容を確定したうえで公開します。
  </p>
</template>

<script setup lang="ts">
import { SERVICE } from '~/config/service'

const draft = SERVICE.legalDraft
</script>
