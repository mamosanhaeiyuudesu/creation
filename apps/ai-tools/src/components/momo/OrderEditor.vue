<template>
  <div class="space-y-4">
    <!-- 曖昧点の警告 -->
    <div v-if="ambiguities.length" class="rounded-xl border border-[var(--momo-warn)] bg-[#fffbe8] p-3">
      <p class="text-[12px] font-bold text-[#8a6d00] mb-1.5 flex items-center gap-1">
        <span>⚠️</span>要確認（AIが自信を持てなかった点）
      </p>
      <ul class="list-disc pl-5 space-y-0.5 text-[12.5px] text-[#7a6100]">
        <li v-for="(a, i) in ambiguities" :key="i">{{ a }}</li>
      </ul>
    </div>

    <!-- 顧客名 -->
    <div>
      <label class="momo-label">顧客名</label>
      <input v-model="form.customerName" type="text" class="momo-input" placeholder="〇〇食堂" />
    </div>

    <!-- 納品日・時間帯 -->
    <div class="grid grid-cols-2 gap-3">
      <div>
        <label class="momo-label">
          納品日
          <span v-if="conf('delivery_date')" class="momo-conf" :data-level="conf('delivery_date')">{{ confLabel('delivery_date') }}</span>
        </label>
        <input
          v-model="form.deliveryDate"
          type="date"
          class="momo-input"
          :class="{ 'momo-input--warn': isLow('delivery_date') }"
        />
      </div>
      <div>
        <label class="momo-label">配達時間帯</label>
        <select v-model="form.timeSlot" class="momo-input">
          <option value="">指定なし</option>
          <option v-for="t in TIME_SLOTS" :key="t" :value="t">{{ t }}</option>
        </select>
      </div>
    </div>

    <!-- 明細 -->
    <div>
      <div class="flex items-center justify-between mb-1.5">
        <label class="momo-label !mb-0">明細（サイズ混載は行を分ける）</label>
        <button type="button" class="text-[12.5px] font-bold text-[var(--momo-peach-deep)]" @click="addItem">＋ 明細を追加</button>
      </div>

      <div v-for="(it, idx) in form.items" :key="idx" class="rounded-xl border border-[var(--momo-line)] bg-[var(--momo-card)] p-3 mb-2">
        <div class="flex items-center justify-between mb-2">
          <span class="text-[11px] font-bold text-[var(--momo-ink-soft)]">明細 {{ idx + 1 }}</span>
          <button v-if="form.items.length > 1" type="button" class="text-[11px] text-[var(--momo-ink-soft)] hover:text-[var(--momo-peach-deep)]" @click="removeItem(idx)">削除</button>
        </div>

        <div class="grid grid-cols-2 gap-2.5">
          <div class="col-span-2">
            <label class="momo-label-sm">品種</label>
            <input v-model="it.variety" type="text" class="momo-input" placeholder="白鳳 / あかつき" />
          </div>
          <div>
            <label class="momo-label-sm">
              サイズ
              <span v-if="conf('size')" class="momo-conf" :data-level="conf('size')">{{ confLabel('size') }}</span>
            </label>
            <select v-model="it.size" class="momo-input" :class="{ 'momo-input--warn': isLow('size') }">
              <option value="">未指定</option>
              <option v-for="s in SIZES" :key="s" :value="s">{{ s }}</option>
            </select>
          </div>
          <div class="grid grid-cols-2 gap-2">
            <div>
              <label class="momo-label-sm">個数</label>
              <input v-model.number="it.quantity" type="number" min="1" class="momo-input" />
            </div>
            <div>
              <label class="momo-label-sm">単位</label>
              <input v-model="it.unit" type="text" class="momo-input" placeholder="箱" />
            </div>
          </div>
          <div>
            <label class="momo-label-sm">
              硬さ
              <span v-if="conf('ripeness')" class="momo-conf" :data-level="conf('ripeness')">{{ confLabel('ripeness') }}</span>
            </label>
            <input v-model="it.ripeness" type="text" class="momo-input" :class="{ 'momo-input--warn': isLow('ripeness') }" placeholder="固め / 柔らかめ" />
          </div>
          <div>
            <label class="momo-label-sm">備考</label>
            <input v-model="it.notes" type="text" class="momo-input" placeholder="業務用・小玉可 など" />
          </div>
        </div>
      </div>
    </div>

    <!-- 流入元・ステータス -->
    <div class="grid grid-cols-2 gap-3">
      <div v-if="showSource">
        <label class="momo-label">流入元</label>
        <select v-model="form.source" class="momo-input">
          <option v-for="s in SOURCES" :key="s.value" :value="s.value">{{ s.label }}</option>
        </select>
      </div>
      <div>
        <label class="momo-label">ステータス</label>
        <select v-model="form.status" class="momo-input">
          <option v-for="s in STATUSES" :key="s.value" :value="s.value">{{ s.label }}</option>
        </select>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { PropType } from 'vue'
import type { EditorForm, Confidence, Source, OrderStatus } from '~/types/momo'

const props = defineProps({
  form: { type: Object as PropType<EditorForm>, required: true },
  confidence: { type: Object as PropType<Record<string, Confidence>>, default: () => ({}) },
  ambiguities: { type: Array as PropType<string[]>, default: () => [] },
  showSource: { type: Boolean, default: true },
})

const TIME_SLOTS = ['午前', '午後', '夕方', '夜']
const SIZES = ['2L', '3L', '4L', '5L']
const SOURCES: { value: Source; label: string }[] = [
  { value: 'LINE', label: 'LINE' },
  { value: 'Facebook', label: 'Facebook' },
  { value: 'Instagram', label: 'Instagram' },
  { value: 'other', label: 'その他' },
]
const STATUSES: { value: OrderStatus; label: string }[] = [
  { value: 'draft', label: '下書き' },
  { value: 'confirmed', label: '確定' },
  { value: 'shipped', label: '出荷済' },
]

function conf(field: string): Confidence | '' {
  const v = props.confidence?.[field]
  return v === 'high' || v === 'medium' || v === 'low' ? v : ''
}
function isLow(field: string): boolean {
  return conf(field) === 'low'
}
function confLabel(field: string): string {
  const c = conf(field)
  return c === 'high' ? '確度高' : c === 'medium' ? '要確認' : c === 'low' ? '要確認' : ''
}

function addItem() {
  props.form.items.push({ variety: '', size: '', quantity: 1, unit: '箱', ripeness: '', notes: '' })
}
function removeItem(idx: number) {
  props.form.items.splice(idx, 1)
}
</script>

<style scoped>
.momo-label {
  display: block;
  font-size: 12px;
  font-weight: 700;
  color: var(--momo-ink-soft);
  margin-bottom: 0.3rem;
}
.momo-label-sm {
  display: block;
  font-size: 11px;
  font-weight: 700;
  color: var(--momo-ink-soft);
  margin-bottom: 0.25rem;
}
.momo-conf {
  display: inline-block;
  margin-left: 0.4rem;
  font-size: 10px;
  font-weight: 700;
  padding: 0.05rem 0.4rem;
  border-radius: 999px;
  vertical-align: middle;
}
.momo-conf[data-level='high'] { background: #e6f4ea; color: #2e7d4f; }
.momo-conf[data-level='medium'] { background: #fff3cd; color: #8a6d00; }
.momo-conf[data-level='low'] { background: #fde7e9; color: #b4223a; }
</style>
