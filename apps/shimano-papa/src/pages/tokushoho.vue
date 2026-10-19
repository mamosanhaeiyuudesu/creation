<template>
  <PpLegal title="特定商取引法に基づく表記">
    <div class="pp-legal-table-wrap">
      <table class="pp-legal-table pp-legal-table-kv">
        <tbody>
          <tr><th scope="row">販売事業者</th><td>{{ b.seller }}</td></tr>
          <tr><th scope="row">運営統括責任者</th><td>{{ b.manager }}</td></tr>
          <tr><th scope="row">所在地</th><td>{{ b.address }}</td></tr>
          <tr><th scope="row">電話番号</th><td>{{ b.tel }}</td></tr>
          <tr><th scope="row">メールアドレス</th><td><a :href="`mailto:${b.email}`">{{ b.email }}</a></td></tr>
          <tr>
            <th scope="row">お問い合わせ</th>
            <td><a :href="site.formUrl" target="_blank" rel="noopener">{{ site.formUrl }}</a><br />（返信は{{ site.replyWithin }}）</td>
          </tr>
          <tr>
            <th scope="row">販売価格</th>
            <td>
              <template v-for="p in site.plans" :key="p.short">{{ p.title.split('・')[0] }}・{{ p.short }}：{{ p.price }}円（税込）<br /></template>
              お試しインタビュー：{{ site.trial.price }}円（税込）<br />
              追加オプション：<NuxtLink to="/#price">料金表</NuxtLink>に記載
            </td>
          </tr>
          <tr><th scope="row">商品代金以外の必要料金</th><td>製本代・国内送料は料金に含みます。オンラインインタビューの通信費、銀行振込手数料はお客様のご負担です。追加オプションは別途料金がかかります。</td></tr>
          <tr>
            <th scope="row">支払方法・時期</th>
            <td>
              銀行振込<br />
              お試し：実施の3日前まで<br />
              本契約：契約時に50%、原稿の最終承認後・印刷発注前に残り50%
            </td>
          </tr>
          <tr>
            <th scope="row">サービス提供時期</th>
            <td>お申込み後、日程調整のうえ開始します。完成までの目安は{{ site.plans.map((p) => `${p.short}で${p.period}`).join('、') }}です。</td>
          </tr>
          <tr><th scope="row">商品の引渡時期</th><td>原稿の最終承認後、{{ site.terms.deliveryAfterApproval }}で製本し、発送します。</td></tr>
          <tr><th scope="row">キャンセル・返金</th><td><NuxtLink to="/terms">「ご契約・キャンセルについて」</NuxtLink>のとおりです。</td></tr>
          <tr><th scope="row">返品特約</th><td>製本物はオーダーメイドのため、お客様都合による返品・交換はお受けできません。印刷不良・破損・誤字（当方の誤り）は無償で対応します。</td></tr>
          <tr><th scope="row">特別な条件</th><td>原稿の修正は{{ site.terms.revisions }}回まで。写真は各プランの枚数上限内。内容の最終確認と承認は、ご本人が行います。</td></tr>
          <tr><th scope="row">動作環境</th><td>Google Meetなどのオンライン会議が利用できる環境</td></tr>
        </tbody>
      </table>
    </div>
  </PpLegal>
</template>

<script setup lang="ts">
import { site } from '~/config/site'

definePageMeta({ layout: 'shimano-papa' })

const b = site.business
</script>
