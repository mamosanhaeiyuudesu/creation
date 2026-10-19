<template>
  <PpLegal title="プライバシーポリシー">
    <p class="pp-legal-intro">
      {{ site.makerFullName }}（屋号：{{ site.makerName }}。以下「当方」）は、「人生のインタビュー」でお預かりする個人情報を、以下のとおり取り扱います。
    </p>
    <ol class="pp-legal-ol">
      <li v-for="(s, i) in sections" :key="s.title" class="pp-legal-sec">
        <h2>{{ i + 1 }}. {{ s.title }}</h2>
        <p>{{ s.body }}</p>
      </li>
    </ol>
    <p class="pp-legal-sign">
      制定：{{ site.business.privacyEstablished }}<br />
      窓口：<a :href="`mailto:${site.business.email}`">{{ site.business.email }}</a>
    </p>
  </PpLegal>
</template>

<script setup lang="ts">
import { site } from '~/config/site'

definePageMeta({ layout: 'shimano-papa' })

const t = site.terms

const sections = [
  { title: '取得する情報', body: 'お問い合わせフォームの入力内容（お名前、メールアドレス、ご依頼内容）、インタビューの音声・文字起こし、お預かりする写真・資料、制作に必要なご連絡先。' },
  { title: '利用目的', body: 'ご相談への返信、インタビュー・原稿制作・製本・発送、お支払いの確認、サービス改善のための連絡。' },
  { title: '要配慮個人情報について', body: 'インタビューでは、ご病気、ご家族の事情など、取り扱いに特に注意が必要な情報をお話しいただく場合があります。これらは、ご本人の同意を得たうえでお預かりし、本の制作の目的にのみ使用します。' },
  { title: 'AIツールの利用について', body: '文字起こし・原稿作成の補助に、AIツールを利用する場合があります。その際は学習に使われない設定のうえ取り扱います。' },
  { title: '第三者への提供', body: '法令に基づく場合を除き、ご本人の同意なく第三者に提供しません。印刷・発送の委託先には、業務に必要な範囲（お名前・送付先）のみを提供します。' },
  { title: '保管と削除', body: `録音データは納品後${t.audioKeepMonths}か月、文字起こしと原稿データは納品後${t.textKeepYears}年を目安に削除します。ご希望があれば、期間内でも削除します。` },
  { title: '開示・訂正・削除のご請求', body: 'ご本人からのご請求に対応します。下記の窓口へご連絡ください（ご本人確認をお願いする場合があります）。' },
  { title: '体験談・事例の掲載', body: 'お客様の声や事例は、事前の書面（またはメール）による同意がある場合のみ掲載します。' },
  { title: 'お問い合わせフォーム', body: 'お問い合わせにはGoogleフォームを利用しており、入力内容はGoogleのサービス上で保管されます。' },
  { title: '改定', body: '本ポリシーは、必要に応じて改定します。' },
]
</script>
