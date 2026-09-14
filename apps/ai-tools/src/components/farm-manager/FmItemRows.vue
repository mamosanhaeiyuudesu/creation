<template>
  <div class="space-y-2.5">
    <div
      v-for="(item, i) in items"
      :key="i"
      class="rounded-xl border p-3"
      :class="needsAttention(item) ? 'border-[var(--fm-warn)] bg-[#fffbef]' : 'border-[var(--fm-line)] bg-[var(--fm-card)]'"
    >
      <!-- 品目と金額 -->
      <div class="flex gap-2">
        <input v-model="item.itemName" class="fm-input flex-1" placeholder="品目名" />
        <div class="relative w-[130px] shrink-0">
          <input
            v-model.number="item.amount"
            type="number"
            inputmode="numeric"
            class="fm-input fm-num text-right pr-6"
            placeholder="0"
          />
          <span class="absolute right-2.5 top-1/2 -translate-y-1/2 text-[13px] text-[var(--fm-ink-soft)]">円</span>
        </div>
      </div>

      <!-- 科目と区分 -->
      <div class="flex flex-wrap gap-2 mt-2 items-center">
        <select
          class="fm-input !w-auto flex-1 min-w-[180px] text-[14px]"
          :value="item.accountCode"
          @change="onAccountChange(item, ($event.target as HTMLSelectElement).value)"
        >
          <optgroup v-for="group in grouped" :key="group.category" :label="group.label">
            <option v-for="a in group.accounts" :key="a.code" :value="a.code">{{ a.name }}</option>
          </optgroup>
        </select>

        <!-- 変動費/固定費の手動切り替え。判定が割れる科目はここで人が決める（仕様§3-2） -->
        <div v-if="isExpense(item)" class="flex gap-1">
          <button
            type="button"
            class="fm-chip !text-[12px]"
            :class="{ 'fm-chip--on': item.costType === 'VARIABLE' }"
            @click="setCostType(item, 'VARIABLE')"
          >畑の中</button>
          <button
            type="button"
            class="fm-chip !text-[12px]"
            :class="item.costType === 'FIXED' ? 'fm-chip--out-on' : ''"
            @click="setCostType(item, 'FIXED')"
          >畑の外</button>
        </div>

        <!-- 人件費は従事者ごとに持てる -->
        <select
          v-if="item.accountCode === 'VAR001' && workers.length"
          v-model="item.workerId"
          class="fm-input !w-auto text-[14px]"
        >
          <option :value="null">従事者なし</option>
          <option v-for="w in workers" :key="w.id" :value="w.id">{{ w.name }}</option>
        </select>

        <button type="button" class="text-[12px] text-[var(--fm-ink-soft)] px-2 py-1 hover:text-[var(--fm-minus)] ml-auto" @click="$emit('remove', i)">
          削除
        </button>
      </div>

      <!-- AIの判断と、仮置きへの逃げ道 -->
      <div v-if="needsAttention(item)" class="mt-2.5 pt-2.5 border-t border-[#f0e2c4] flex flex-wrap items-center gap-2">
        <span class="fm-tag fm-tag--warn">{{ item.isProvisional ? '仮置き中' : '要確認' }}</span>
        <span class="text-[12px] text-[var(--fm-ink-soft)] flex-1 min-w-[140px]">
          <template v-if="item.isProvisional">このまま保存できます。上の科目を選べば確定します</template>
          <template v-else>
            {{ item.reason || 'AIが分類に自信を持てませんでした' }}
            <span v-if="item.confidenceScore" class="fm-num">（確信度 {{ Math.round(item.confidenceScore * 100) }}%）</span>
          </template>
        </span>
        <!-- 仮置き中の明細に「この分類でよい」は出さない。押しても見た目が変わらず、何が起きたか分からないため。
             仮置きから抜けるには上の科目を選ぶ、という道だけにする -->
        <template v-if="!item.isProvisional">
          <button type="button" class="fm-btn !h-8 !text-[13px] !px-3" @click="confirm(item)">この分類でよい</button>
          <button type="button" class="fm-btn-ghost !h-8 !text-[12px] !px-3" @click="setProvisional(item)">あとで決める</button>
        </template>
      </div>
      <div v-else-if="item.confirmedByUser && item.reason" class="mt-2 text-[11.5px] text-[var(--fm-ink-soft)]">
        {{ item.reason }}
      </div>
    </div>

    <button type="button" class="fm-btn-ghost w-full !h-10" @click="$emit('add')">＋ 明細を追加</button>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { CATEGORY_LABEL, CATEGORY_TO_COST_TYPE, PROVISIONAL_FIXED, PROVISIONAL_VARIABLE } from '~/types/farm-manager'
import type { AccountCategory, AccountMaster, CostType, EditableItem, Worker } from '~/types/farm-manager'

// 明細の確認・修正欄。new（新規登録）と [id]（あとから修正）で共有する。
// ⚠ 設計上の約束: 分類を確定しないと保存できない作りにしてはいけない（仕様§3-3）。
//   迷ったら「あとで決める」で仮置きに逃がし、先に進ませる。
const props = defineProps<{
  items: EditableItem[]
  accounts: AccountMaster[]
  workers: Worker[]
}>()

defineEmits<{ add: []; remove: [index: number] }>()

const ORDER: AccountCategory[] = ['B_VARIABLE', 'D_FIXED', 'F_NON_OPERATING', 'A_REVENUE', 'H_FINANCE']

const grouped = computed(() =>
  ORDER.map((category) => ({
    category,
    label: CATEGORY_LABEL[category],
    accounts: props.accounts.filter((a) => a.category === category),
  })).filter((g) => g.accounts.length)
)

const byCode = computed(() => new Map(props.accounts.map((a) => [a.code, a])))

function isExpense(item: EditableItem): boolean {
  return item.costType === 'VARIABLE' || item.costType === 'FIXED'
}

function needsAttention(item: EditableItem): boolean {
  return (item.needsConfirmation && !item.confirmedByUser) || item.isProvisional
}

function onAccountChange(item: EditableItem, code: string) {
  const account = byCode.value.get(code)
  if (!account) return
  item.accountCode = code
  item.costType = CATEGORY_TO_COST_TYPE[account.category]
  item.isProvisional = account.isProvisionalBucket
  if (account.isProvisionalBucket) {
    item.confirmedByUser = false
    item.needsConfirmation = true
    item.reason = '分類は後で決める（仮置き）'
  } else {
    item.confirmedByUser = true
    item.needsConfirmation = false
    item.confidenceScore = 1
    item.reason = '人が選んだ分類'
  }
}

function setCostType(item: EditableItem, costType: CostType) {
  item.costType = costType
  item.confirmedByUser = true
  item.needsConfirmation = false
}

/** AIの分類をそのまま採用する。仮置き中の明細には出さないボタンなので、ここは常に確定扱いでよい。 */
function confirm(item: EditableItem) {
  item.confirmedByUser = true
  item.needsConfirmation = false
  item.confidenceScore = 1
}

function setProvisional(item: EditableItem) {
  item.accountCode = item.costType === 'FIXED' ? PROVISIONAL_FIXED : PROVISIONAL_VARIABLE
  item.isProvisional = true
  item.confirmedByUser = false
  item.needsConfirmation = true
  item.reason = '分類は後で決める（仮置き）'
}
</script>

<style scoped>
/* 「畑の外」を選んだときはグレー系で光らせる（緑＝畑の中 と取り違えないため） */
.fm-chip--out-on {
  background: var(--fm-out);
  border-color: var(--fm-out);
  color: #fff;
}
</style>
