<template>
  <div>
    <div class="flex flex-wrap items-end gap-3 mb-3">
      <label class="block">
        <span class="fs-field-label">何年分の申告か</span>
        <div class="flex items-center gap-1.5">
          <input v-model.number="year.year" type="number" inputmode="numeric" class="fs-input fs-num !w-[110px]" min="1990" :max="thisYear" />
          <span class="text-[13px]">年分</span>
        </div>
      </label>
      <p v-if="year.source" class="text-[12px] text-[var(--fs-ink-soft)] pb-2.5">読み取り元: {{ year.source }}</p>
    </div>

    <ul v-if="year.warnings.length" class="fs-notice fs-notice--warn list-none mb-3 space-y-0.5">
      <li v-for="(w, i) in year.warnings" :key="i">{{ w }}</li>
    </ul>

    <!-- 決算書に印刷された合計との突き合わせ。ずれていたら読み落としがある -->
    <div class="grid sm:grid-cols-3 gap-2 mb-4">
      <div v-for="c in checks" :key="c.label" class="rounded-lg border px-3 py-2" :class="c.ok === false ? 'border-[#f5d6ad] bg-[var(--fs-warn-soft)]' : 'border-[var(--fs-line)] bg-[#f8fafd]'">
        <p class="text-[11.5px] text-[var(--fs-ink-faint)]">{{ c.label }}</p>
        <p class="fs-num font-bold text-[15px] text-[var(--fs-ink)]">{{ formatYen(c.value) }}</p>
        <p class="text-[11.5px]" :class="c.ok === false ? 'text-[var(--fs-warn)]' : c.ok ? 'text-[var(--fs-plus)]' : 'text-[var(--fs-ink-faint)]'">{{ c.note }}</p>
      </div>
    </div>

    <div class="grid sm:grid-cols-2 gap-x-6 gap-y-4">
      <section>
        <h4 class="fs-field-label !text-[12.5px] mb-2">収入</h4>
        <div class="space-y-2">
          <FsAmountRow v-for="d in revenueRows" :key="d.key" v-model="year.revenue[d.key]" :def="d" :uncertain="year.uncertain.includes(d.key)" />
        </div>
      </section>
      <section>
        <h4 class="fs-field-label !text-[12.5px] mb-2">経費</h4>
        <div class="space-y-2">
          <FsAmountRow v-for="d in expenseRows" :key="d.key" v-model="year.expenses[d.key]" :def="d" :uncertain="year.uncertain.includes(d.key)" />
        </div>
        <button
          v-if="hiddenCount > 0 || showAll"
          class="fs-btn-text !px-0 mt-1.5"
          @click="showAll = !showAll"
        >{{ showAll ? '0円の科目を隠す' : `0円の科目も表示（${hiddenCount}件）` }}</button>
      </section>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import FsAmountRow from '~/components/farm-simulation/FsAmountRow.vue'
import { EXPENSE_ITEMS, REVENUE_ITEMS } from '~/types/farm-simulation'
import type { TaxYear } from '~/types/farm-simulation'
import { formatYen, yearExpense, yearProfit, yearRevenue } from '~/utils/farm-simulation'

// 状態は親の SimState をそのまま直す（戻る／進むは親の履歴が状態の差分で拾う）。
// 戻ると年のオブジェクト自体が差し替わるので、props.year を変数に取り出して持たないこと。
const props = defineProps<{ year: TaxYear }>()

const thisYear = new Date().getFullYear()
const showAll = ref(false)

const revenueRows = REVENUE_ITEMS
// 全科目を並べると入力が重く見えるので、金額がある科目と自信の無い科目だけを最初に出す
const expenseRows = computed(() =>
  EXPENSE_ITEMS.filter((d) => showAll.value || (props.year.expenses[d.key] ?? 0) !== 0 || props.year.uncertain.includes(d.key))
)
const hiddenCount = computed(() => EXPENSE_ITEMS.length - expenseRows.value.length)

function compare(sum: number, printed: number | null, okNote: string) {
  if (printed === null) return { ok: null, note: '決算書の合計は読み取れず' }
  const gap = sum - printed
  if (Math.abs(gap) < 1) return { ok: true, note: okNote }
  return { ok: false, note: `決算書の合計 ${formatYen(printed)} と ${formatYen(Math.abs(gap))} ずれています` }
}

const checks = computed(() => {
  const rev = yearRevenue(props.year)
  const expNoFamily = yearExpense(props.year) - (props.year.expenses.familyWages ?? 0)
  const profit = yearProfit(props.year)
  return [
    { label: '収入の合計', value: rev, ...compare(rev, props.year.printed.revenueTotal, '✓ 決算書の小計と一致') },
    { label: '経費の合計（専従者給与を除く）', value: expNoFamily, ...compare(expNoFamily, props.year.printed.expenseTotal, '✓ 決算書の計と一致') },
    {
      label: '利益（控除前の所得）',
      value: profit,
      ...(props.year.printed.income === null
        ? { ok: null, note: '決算書の所得は読み取れず' }
        : Math.abs(profit - props.year.printed.income) < 1
          ? { ok: true, note: '✓ 決算書の所得と一致' }
          : // 棚卸しの増減・育成費用の振替は試算に使わないので、所得とずれるのは普通にありえる
            { ok: null, note: `決算書の所得は ${formatYen(props.year.printed.income)}（差は棚卸し等のぶん）` }),
    },
  ]
})
</script>
