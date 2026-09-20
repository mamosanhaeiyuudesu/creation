<script setup lang="ts">
import { computed } from 'vue'
import type { KoubaCategory } from '~/types/kouba'
import { formatKoubaHours } from '~/types/kouba'
import KoubaIcon from '~/components/kouba/KoubaIcon.vue'

// WBS表示（ボードの代わりに出すもうひとつの見方）。カテゴリ → ジョブ → タスクを縦に並べ、
// かけた時間を横棒で示す。日付は持っていないので Gantt のような時間軸ではなく、
// **全行で共通の目盛り（0〜いちばん長いジョブの合計）に対する長さ**で比べる。
// ジョブの合計は配下のどのタスクより必ず長いので、ジョブの最大値で全バーが収まる。
// カテゴリは棒を持たず見出しに合計だけ出す（カテゴリの合計はこの目盛りを超えるため）。
// 完了済みのタスク・稼働停止中のジョブも時間は合計に含まれているので消さず、灰色に落として後ろへ並べる。
// 表示専用＝行を押すとジョブ詳細モーダルを開く（編集はそちらで行う）。
// **タスクの行（名前＋バー）は既定で隠し、右上の「タスクも表示」のチェックで出す**（`showTasks`）。
// このチェックの状態は親（ページ）が持つ＝板の再読込（load）で loading を挟むとこのコンポーネントごと作り直されるので、
// ここに持つと、モーダルでタスクを足しただけでチェックが外れてしまう。
const props = defineProps<{ categories: KoubaCategory[]; showTasks: boolean }>()
const emit = defineEmits<{ openJob: [jobId: string]; 'update:showTasks': [value: boolean] }>()

interface WbsRow {
  key: string
  kind: 'job' | 'task'
  jobId: string
  title: string
  icon?: string
  hours: number
  /** 灰色に落とす行（完了済みのタスク・稼働停止中のジョブとその配下）。 */
  muted: boolean
  paused: boolean
  done: boolean
}

/** ジョブは同じカテゴリの中で「稼働中→停止中」、タスクは「未完了→完了済み」の順（ボードの畳み方と同じ並び）。 */
function rowsOf(cat: KoubaCategory): WbsRow[] {
  const rows: WbsRow[] = []
  const jobs = [...cat.jobs.filter((j) => !j.paused), ...cat.jobs.filter((j) => j.paused)]
  for (const job of jobs) {
    rows.push({
      key: `${cat.id}:${job.id}`,
      kind: 'job',
      jobId: job.id,
      title: job.title,
      icon: job.icon,
      hours: job.totalHours,
      muted: job.paused,
      paused: job.paused,
      done: false,
    })
    if (!props.showTasks) continue
    const tasks = [...job.tasks.filter((t) => !t.done), ...job.tasks.filter((t) => t.done)]
    for (const t of tasks) {
      rows.push({
        key: `${cat.id}:${job.id}:${t.id}`,
        kind: 'task',
        jobId: job.id,
        title: t.title,
        hours: t.hours,
        muted: t.done || job.paused,
        paused: false,
        done: t.done,
      })
    }
  }
  return rows
}
const groups = computed(() => props.categories.map((cat) => ({ cat, rows: rowsOf(cat) })))

const maxHours = computed(() => Math.max(0, ...props.categories.flatMap((c) => c.jobs.map((j) => j.totalHours))))

/** バーの右に値のラベルを置く余白。バーの最大長はこの分だけ手前で止める。 */
const VALUE_RESERVE_PX = 64
/** 0より大きい行は、目盛りに対して極端に短くても見えるよう4px（角丸ぶん）を下限にする。 */
function barWidth(hours: number): string {
  const ratio = maxHours.value > 0 ? hours / maxHours.value : 0
  return `max(4px, calc((100% - ${VALUE_RESERVE_PX}px) * ${ratio}))`
}
// 色は1色（琥珀＝この画面で時間の合計に使っている色）の濃淡だけ。ジョブ＝濃く太く、タスク＝薄く細く。
// 灰色の行は「済んだ・停止中」を色だけに頼らず、太さ・取り消し線・⏸✅の印でも示す。
function barClass(row: WbsRow): string {
  const thickness = row.kind === 'job' ? 'h-3' : 'h-2'
  if (row.muted) return `${thickness} bg-slate-400/60`
  return row.kind === 'job' ? `${thickness} bg-amber-400` : `${thickness} bg-amber-400/55`
}

function formatHours(h: number): string {
  return (Math.round(h * 100) / 100).toString()
}
function rowTooltip(row: WbsRow): string {
  const state = row.paused ? '・稼働停止中' : row.done ? '・完了済み' : ''
  return `${row.title}（${formatKoubaHours(row.hours)}${state}）`
}
</script>

<template>
  <div class="flex flex-col gap-3">
    <div class="flex flex-wrap items-center justify-between gap-x-4 gap-y-1.5">
      <p class="m-0 text-[11px] text-slate-500 leading-snug">横棒＝かけた時間（ジョブは配下のタスクの合計）。行を押すとジョブを開きます。</p>
      <label class="flex items-center gap-1.5 text-[12px] font-semibold text-slate-300 cursor-pointer shrink-0">
        <input
          type="checkbox"
          class="accent-sky-500"
          :checked="showTasks"
          @change="emit('update:showTasks', ($event.target as HTMLInputElement).checked)"
        />
        タスクも表示
      </label>
    </div>

    <p v-if="!categories.length" class="m-0 text-center text-slate-500 text-xs py-8">カテゴリがありません（ボードで追加できます）</p>

    <section
      v-for="g in groups"
      :key="g.cat.id"
      class="rounded-2xl border border-white/10 bg-white/[0.03] overflow-hidden"
    >
      <header class="flex items-center gap-2 px-4 py-2.5 border-b border-white/[0.08]">
        <span class="w-6 h-6 rounded-lg bg-white/[0.06] border border-white/10 flex items-center justify-center text-sm shrink-0 overflow-hidden">
          <KoubaIcon :icon="g.cat.icon" />
        </span>
        <h3 class="flex-1 min-w-0 m-0 text-sm font-bold text-slate-100 truncate" :title="g.cat.name">{{ g.cat.name }}</h3>
        <span class="text-sm font-extrabold text-slate-100 tabular-nums shrink-0">
          {{ formatHours(g.cat.totalHours) }}<span class="text-[11px] font-semibold text-slate-500 ml-1">時間</span>
        </span>
      </header>

      <p v-if="!g.rows.length" class="m-0 text-center text-slate-500 text-xs py-5">ジョブがありません</p>
      <ul v-else class="m-0 p-0 list-none py-1">
        <li v-for="row in g.rows" :key="row.key">
          <!-- 狭い画面（lg未満）は見出しの下にバーを積む。広い画面は見出し列を固定幅にして、全行のバーの起点をそろえる -->
          <button
            type="button"
            class="w-full text-left px-4 py-1.5 flex flex-col gap-1 lg:flex-row lg:items-center lg:gap-3 hover:bg-white/[0.05] focus-visible:bg-white/[0.05] outline-none transition-colors cursor-pointer"
            :title="rowTooltip(row)"
            @click="emit('openJob', row.jobId)"
          >
            <span class="flex items-center gap-2 min-w-0 lg:w-[240px] lg:shrink-0" :class="row.kind === 'task' ? 'pl-7' : ''">
              <template v-if="row.kind === 'job'">
                <span class="w-5 h-5 text-xs shrink-0 block" :class="row.muted ? 'opacity-50' : ''">
                  <KoubaIcon :icon="row.icon ?? ''" />
                </span>
                <span class="min-w-0 truncate text-[12.5px] font-bold" :class="row.muted ? 'text-slate-400' : 'text-slate-100'">{{ row.title }}</span>
                <span v-if="row.paused" class="shrink-0 h-4 px-1.5 rounded-full bg-white/10 text-slate-400 text-[10px] font-bold flex items-center">⏸ 停止中</span>
              </template>
              <template v-else>
                <span v-if="row.done" class="shrink-0 text-[11px]" aria-label="完了済み">✅</span>
                <span
                  class="min-w-0 truncate text-[12px]"
                  :class="[row.muted ? 'text-slate-500' : 'text-slate-300', row.done ? 'line-through' : '']"
                >{{ row.title }}</span>
              </template>
            </span>

            <!-- バー。左の細い線が起点（0）。値は棒の先に添える＝棒は飾りで、読み取りは数字でもできる -->
            <span class="flex-1 min-w-0 h-5 flex items-center gap-2 border-l border-white/15">
              <span
                v-if="row.hours > 0"
                aria-hidden="true"
                class="block shrink-0 rounded-r-[4px]"
                :class="barClass(row)"
                :style="{ width: barWidth(row.hours) }"
              ></span>
              <span class="shrink-0 text-[11.5px] font-bold tabular-nums" :class="row.muted ? 'text-slate-500' : 'text-slate-200'">{{ formatHours(row.hours) }}h</span>
            </span>
          </button>
        </li>
      </ul>
    </section>
  </div>
</template>
