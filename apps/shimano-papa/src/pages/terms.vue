<template>
  <PpLegal title="ご契約・キャンセルについて">
    <section class="pp-legal-sec">
      <h2>お試しインタビュー</h2>
      <ul class="pp-legal-list">
        <li>実施日の3日前まで：無料で変更・キャンセルできます（全額返金）</li>
        <li>前日・当日：日程変更は1回まで無料です。キャンセルは50%を返金します</li>
      </ul>
    </section>

    <section class="pp-legal-sec">
      <h2>本契約</h2>
      <div class="pp-legal-table-wrap">
        <table class="pp-legal-table">
          <thead>
            <tr><th scope="col">キャンセルの時点</th><th scope="col">お支払い済み料金の扱い</th></tr>
          </thead>
          <tbody>
            <tr v-for="r in cancelRows" :key="r.when">
              <th scope="row">{{ r.when }}</th>
              <td>{{ r.refund }}</td>
            </tr>
          </tbody>
        </table>
      </div>
      <ul class="pp-legal-list">
        <li>返金は、手続き完了後{{ site.terms.refundBusinessDays }}営業日以内に、振込手数料を差し引いて行います。</li>
        <li>お試しインタビュー後{{ site.trial.deductDays }}日以内に本契約した場合は、お試し料金（{{ site.trial.price }}円）を差し引きます。</li>
        <li><strong>ご本人が話すことをやめたい、またはお気持ちが変わった場合</strong>は、ご本人の意思を最優先します。ご依頼者様が親御さんに贈る場合も、無理には進めません。上の表に従って精算します。</li>
        <li><strong>ご本人の体調不良などで、インタビューが続けられなくなった場合</strong>は、中断して再開する、実施済みの内容までで形にする、または精算する、のいずれかをご相談のうえで決めます。</li>
        <li>当方の都合や災害でサービスが提供できない場合は、未実施分を全額返金します。</li>
        <li>写真や文章の掲載について、他の方の肖像・著作物が含まれる場合は、ご依頼者様が掲載の了承を確認してください。</li>
      </ul>
    </section>
  </PpLegal>
</template>

<script setup lang="ts">
import { site } from '~/config/site'

definePageMeta({ layout: 'shimano-papa' })

const cancelRows = [
  { when: 'お試し後〜2回目のインタビューの前', refund: 'お試し料金を除き全額返金（※お試しを1回目に含みます）' },
  { when: 'インタビュー開始後〜原稿執筆の前', refund: '実施済みの回数分（プラン料金÷回数×実施回数）を差し引いて返金' },
  { when: '原稿執筆の開始後〜印刷発注の前', refund: '料金の70%を差し引いて返金' },
  { when: '印刷発注後', refund: '返金不可（製本・納品は行います）' },
]
</script>
