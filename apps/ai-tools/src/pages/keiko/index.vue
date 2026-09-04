<template>
  <div class="max-w-[980px] mx-auto px-4 sm:px-6 pt-6 pb-24">
    <div class="flex items-center justify-between gap-2 mb-4">
      <div class="flex items-center gap-2.5">
        <KeikoArt name="kid" :size="54" class="keiko-bob" />
        <div>
          <h1 class="keiko-display text-[22px] sm:text-[26px] leading-none">けいこ記録</h1>
          <p class="text-[12px] text-[var(--keiko-ink-soft)] mt-1">できた分を記録して、ポイントをためよう</p>
        </div>
      </div>
      <div class="flex items-center gap-1.5">
        <button class="keiko-btn-ghost !h-9 !px-2.5" title="設定" @click="openSettings">⚙</button>
        <button v-if="isLoggedIn" class="text-[13px] text-[var(--keiko-ink-soft)] px-2.5 py-1.5 rounded-full hover:bg-black/[0.04]" @click="showPasswordModal = true">パスワード変更</button>
        <button v-if="isLoggedIn" class="text-[13px] text-[var(--keiko-ink-soft)] px-2.5 py-1.5 rounded-full hover:bg-black/[0.04]" @click="doLogout">ログアウト</button>
      </div>
    </div>

    <!-- 週／月／年 の切り替え -->
    <div class="keiko-tabs mb-3">
      <button v-for="m in MODES" :key="m.key" class="keiko-tab" :class="{ 'keiko-tab--on': mode === m.key }" @click="mode = m.key">
        {{ m.label }}
      </button>
    </div>

    <!-- 期間ナビ -->
    <div class="flex items-center justify-between gap-2 mb-5">
      <button class="keiko-btn-ghost !h-9 !px-3" :disabled="!canGoPrev" @click="shiftRange(-1)">‹ {{ prevLabel }}</button>
      <div class="flex flex-col items-center">
        <span class="text-[14px] font-bold">{{ rangeLabel }}</span>
        <button v-if="!isCurrentRange" class="text-[11px] text-[var(--keiko-gold)] font-semibold mt-0.5" @click="goCurrent">{{ backLabel }}</button>
        <span v-else-if="!canGoPrev" class="text-[11px] text-[var(--keiko-ink-soft)] mt-0.5">ここから記録がはじまります</span>
      </div>
      <button class="keiko-btn-ghost !h-9 !px-3" @click="shiftRange(1)">{{ nextLabel }} ›</button>
    </div>

    <!-- ローディング -->
    <div v-if="loading">
      <div class="flex justify-center pb-3">
        <KeikoArt name="swing" :size="64" class="keiko-swing" />
      </div>
      <div class="space-y-3">
        <div v-for="i in 3" :key="i" class="h-28 rounded-2xl bg-white/70 animate-pulse" />
      </div>
    </div>

    <template v-else>
      <div v-if="loadError" class="text-center py-16">
        <KeikoArt name="men" :size="72" class="mx-auto opacity-60" />
        <p class="text-[14px] text-[var(--keiko-ink-soft)] mt-3">記録を読み込めませんでした</p>
        <p class="text-[11.5px] text-[var(--keiko-ink-soft)] mt-1">記録はサーバーに保存されています。通信を確かめて、もう一度お試しください</p>
        <button class="keiko-btn !h-9 !px-4 mt-3" @click="load">読み込み直す</button>
      </div>

      <div v-else-if="members.length === 0" class="text-center py-16">
        <KeikoArt name="kid" :size="96" class="mx-auto keiko-bob" />
        <p class="text-[14px] text-[var(--keiko-ink-soft)] mt-3">設定（⚙）からメンバーを追加してください</p>
      </div>

      <!-- ── 週表示：メンバーごとに項目×曜日のポイント表 ── -->
      <template v-else-if="mode === 'week'">
        <div v-for="(member, mi) in members" :key="member.id" class="mb-5 rounded-2xl border border-[var(--keiko-line)] bg-[var(--keiko-card)] overflow-hidden">
          <div class="flex items-center justify-between gap-2 px-4 pt-3 pb-2">
            <h2 class="keiko-display text-[16px] flex items-center gap-1.5">
              <KeikoArt :name="memberArt(mi)" :size="30" />
              <span class="inline-block w-1.5 h-4 rounded-full" :style="{ background: memberColor(mi) }" />
              {{ member.name }}
            </h2>
            <span class="keiko-total" :style="{ color: memberColor(mi) }">
              週合計 <strong class="text-[17px]">{{ memberRangePoints(member.id) }}</strong> pt
            </span>
          </div>

          <div v-if="itemsOf(member.id).length === 0" class="px-4 pb-4 text-[13px] text-[var(--keiko-ink-soft)]">
            設定（⚙）から {{ member.name }} の練習項目を追加してください
          </div>

          <div v-else class="overflow-x-auto px-1 pb-1">
            <table class="w-full border-collapse">
              <thead>
                <tr>
                  <th class="keiko-th text-left pl-3 min-w-[124px]">やること</th>
                  <th
                    v-for="day in weekDays"
                    :key="day.date"
                    class="keiko-th text-center w-[11%]"
                    :class="{
                      'keiko-th--today': day.date === todayStr,
                      'keiko-th--sun': day.weekdayIndex === 6,
                      'keiko-th--sat': day.weekdayIndex === 5,
                      'keiko-th--off': day.beforeStart,
                    }"
                  >
                    <div class="leading-tight">{{ day.month }}/{{ day.day }}</div>
                    <div class="text-[10px] font-normal leading-tight">({{ day.weekdayLabel }})</div>
                  </th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="item in itemsOf(member.id)" :key="item.id" class="border-t border-[var(--keiko-line)]">
                  <td class="pl-3 py-2">
                    <div class="flex items-center gap-1.5">
                      <KeikoArt :name="item.kind === 'direct' ? 'flag' : 'shinai'" :size="24" />
                      <div>
                        <div class="text-[13px] font-medium leading-tight">{{ item.name }}</div>
                        <div class="text-[10.5px] text-[var(--keiko-ink-soft)] leading-tight mt-0.5">
                          <template v-if="item.kind === 'direct'">できた日にポイントを入力</template>
                          <template v-else>{{ item.repCount }}本 × {{ item.pointPerRep }}pt = <strong>{{ itemPoints(item) }}pt</strong></template>
                        </div>
                      </div>
                    </div>
                  </td>
                  <!-- 記録のはじまりより前の日は、めくれる週の中に入っていても記録できない -->
                  <td
                    v-for="cell in rowCells(member.id, item)"
                    :key="cell.date"
                    class="text-center py-1.5"
                    :class="{ 'keiko-td--today': cell.isToday, 'keiko-td--off': cell.beforeStart }"
                  >
                    <button
                      v-if="!cell.beforeStart"
                      class="keiko-cell"
                      :aria-label="`${member.name} ${item.name} ${cell.label} の記録`"
                      @click="openPicker(member, item, cell.date)"
                    >
                      <span :key="cell.view.kind" :class="cell.view.cls">{{ cell.view.text }}</span>
                    </button>
                  </td>
                </tr>
                <tr class="border-t border-[var(--keiko-line)] bg-black/[0.015]">
                  <td class="pl-3 py-1.5 text-[11.5px] font-bold text-[var(--keiko-ink-soft)]">
                    <span class="inline-flex items-center gap-1">
                      <KeikoArt name="ashiato" :size="18" />
                      ポイント
                    </span>
                  </td>
                  <td
                    v-for="day in weekDays"
                    :key="day.date"
                    class="text-center py-1.5 text-[12px] font-bold"
                    :class="{ 'keiko-td--today': day.date === todayStr, 'keiko-td--off': day.beforeStart }"
                    :style="{ color: memberDayPoints(member.id, day.date) ? memberColor(mi) : 'var(--keiko-line)' }"
                  >
                    {{ memberDayPoints(member.id, day.date) || '·' }}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </template>

      <!-- ── 月表示：大きいカレンダーにメンバーごとのポイントだけを出す ── -->
      <template v-else-if="mode === 'month'">
        <div class="flex flex-wrap gap-2 mb-3">
          <span
            v-for="(member, mi) in members"
            :key="member.id"
            class="keiko-chip"
            :style="{ color: memberColor(mi), borderColor: memberColor(mi) + '55' }"
          >
            <span class="w-2 h-2 rounded-full" :style="{ background: memberColor(mi) }" />
            {{ member.name }} <strong>{{ memberRangePoints(member.id) }}</strong>pt
          </span>
        </div>

        <div class="rounded-2xl border border-[var(--keiko-line)] bg-[var(--keiko-card)] overflow-hidden">
          <div class="grid grid-cols-7">
            <div
              v-for="(label, i) in WD"
              :key="label"
              class="keiko-th text-center py-2 border-b border-[var(--keiko-line)]"
              :class="{ 'keiko-th--sun': i === 6, 'keiko-th--sat': i === 5 }"
            >
              {{ label }}
            </div>
          </div>
          <div class="grid grid-cols-7">
            <!-- 日を押すと、その日の記録をまとめて入力できる（前後の月にはみ出す日と、記録のはじまりより前の日は押せない） -->
            <button
              v-for="cell in monthCells"
              :key="cell.date"
              class="keiko-daycell"
              :class="{ 'keiko-daycell--out': !cell.inMonth, 'keiko-daycell--today': cell.date === todayStr }"
              :disabled="!cell.canRecord"
              :aria-label="cell.canRecord ? `${cell.month}月${cell.day}日の記録` : undefined"
              @click="openDaySheet(cell.date)"
            >
              <div class="text-[11.5px] font-bold mb-1" :class="{ 'keiko-th--sun': cell.weekdayIndex === 6, 'keiko-th--sat': cell.weekdayIndex === 5 }">
                {{ cell.day }}
              </div>
              <div v-if="cell.inMonth" class="flex flex-col gap-[3px]">
                <div
                  v-for="member in cell.points"
                  :key="member.id"
                  class="keiko-daypoint"
                  :style="{ color: memberColor(member.index), background: memberColor(member.index) + '14' }"
                >
                  <span class="truncate">{{ member.name }}</span>
                  <strong>{{ member.points }}</strong>
                </div>
                <!-- まだ記録が無い日にも、押せば入れられることが分かるように -->
                <span v-if="cell.canRecord && cell.points.length === 0" class="keiko-dayadd">＋</span>
              </div>
            </button>
          </div>
        </div>
        <p class="flex items-center justify-center gap-1.5 text-[11.5px] text-[var(--keiko-ink-soft)] mt-2">
          <KeikoArt name="ashiato" :size="18" />
          日ごとの獲得ポイント。日を押すと、その日の記録を入力できます
        </p>
      </template>

      <!-- ── 年表示：メンバーごとの月別ポイント一覧（横＝月、縦＝メンバー） ── -->
      <template v-else>
        <div class="rounded-2xl border border-[var(--keiko-line)] bg-[var(--keiko-card)] overflow-x-auto">
          <table class="w-full border-collapse min-w-[480px]">
            <thead>
              <tr class="border-b border-[var(--keiko-line)]">
                <th class="keiko-th text-left pl-4 py-2.5 w-[88px]">メンバー</th>
                <th
                  v-for="row in yearRows"
                  :key="row.key"
                  class="keiko-th text-center py-2.5"
                  :class="{ 'keiko-row--now': row.key === currentMonthKey }"
                >
                  {{ row.month }}月
                </th>
                <th class="keiko-th text-center py-2.5 pr-4">
                  <span class="inline-flex items-center gap-1">
                    <KeikoArt name="flag" :size="18" />
                    年合計
                  </span>
                </th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(member, mi) in members" :key="member.id" class="border-b border-[var(--keiko-line)]">
                <td class="pl-4 py-2.5 text-[13px] font-bold whitespace-nowrap" :style="{ color: memberColor(mi) }">{{ member.name }}</td>
                <td
                  v-for="row in yearRows"
                  :key="row.key"
                  class="text-center py-2.5 relative"
                  :class="{ 'keiko-row--now': row.key === currentMonthKey }"
                >
                  <span
                    class="keiko-yearbar"
                    :style="{ width: barWidth(pointsFor(member.id, row.key)), background: memberColor(mi) + '1f' }"
                  />
                  <span class="relative text-[14px] font-bold" :style="{ color: pointsFor(member.id, row.key) ? memberColor(mi) : 'var(--keiko-line)' }">
                    {{ pointsFor(member.id, row.key) || '·' }}
                  </span>
                </td>
                <td class="text-center py-2.5 pr-4">
                  <span class="text-[15px] font-bold" :style="{ color: memberColor(mi) }">{{ memberRangePoints(member.id) }}</span>
                  <span class="text-[10.5px] text-[var(--keiko-ink-soft)] ml-0.5">pt</span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- 累積ポイントの推移 -->
        <div class="mt-4 rounded-2xl border border-[var(--keiko-line)] bg-[var(--keiko-card)] p-4">
          <h3 class="text-[13px] font-bold text-[var(--keiko-ink-soft)] mb-2 flex items-center gap-1.5">
            <KeikoArt name="ashiato" :size="18" />
            累積ポイントの推移
          </h3>
          <KeikoCumulativeChart :months="yearRows.map((r) => `${r.month}月`)" :series="cumulativeSeries" />
        </div>
      </template>
    </template>

    <!-- 月カレンダーで日をタップしたとき：その日ぶんの記録をまとめて入力する -->
    <div v-if="daySheet" class="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-end sm:items-center justify-center p-4 z-[205]" @click.self="daySheet = null">
      <div class="w-full max-w-[420px] max-h-[86vh] bg-[var(--keiko-card)] rounded-2xl flex flex-col overflow-hidden">
        <div class="shrink-0 flex items-center gap-2.5 px-5 pt-5 pb-3">
          <KeikoArt name="kid" :size="44" class="keiko-bob" />
          <div>
            <h2 class="keiko-display text-[17px] leading-tight">{{ daySheet.label }}</h2>
            <p class="text-[11.5px] text-[var(--keiko-ink-soft)] mt-0.5">やることを押して、できた分を記録しましょう</p>
          </div>
        </div>

        <div class="flex-1 overflow-y-auto px-5 pb-1">
          <section v-for="(member, mi) in members" :key="member.id" class="mb-3 rounded-xl border border-[var(--keiko-line)] overflow-hidden">
            <div class="flex items-center justify-between gap-2 px-3 py-2 bg-black/[0.02]">
              <span class="keiko-display text-[14px] flex items-center gap-1.5">
                <KeikoArt :name="memberArt(mi)" :size="26" />
                <span class="inline-block w-1.5 h-4 rounded-full" :style="{ background: memberColor(mi) }" />
                {{ member.name }}
              </span>
              <span class="keiko-total" :style="{ color: memberColor(mi) }">
                <strong class="text-[15px]">{{ memberDayPoints(member.id, daySheet.date) }}</strong> pt
              </span>
            </div>

            <p v-if="itemsOf(member.id).length === 0" class="px-3 py-2.5 text-[12px] text-[var(--keiko-ink-soft)]">
              設定（⚙）から {{ member.name }} の練習項目を追加してください
            </p>
            <button
              v-for="row in dayRows(member.id, daySheet.date)"
              :key="row.item.id"
              class="keiko-dayrow"
              :aria-label="`${member.name} ${row.item.name} の記録`"
              @click="openPicker(member, row.item, daySheet.date)"
            >
              <KeikoArt :name="row.item.kind === 'direct' ? 'flag' : 'shinai'" :size="24" />
              <span class="flex-1 text-left">
                <span class="block text-[13px] font-medium leading-tight">{{ row.item.name }}</span>
                <span class="block text-[10.5px] text-[var(--keiko-ink-soft)] leading-tight mt-0.5">
                  <template v-if="row.item.kind === 'direct'">できた日にポイントを入力</template>
                  <template v-else>{{ row.item.repCount }}本 × {{ row.item.pointPerRep }}pt = <strong>{{ itemPoints(row.item) }}pt</strong></template>
                </span>
              </span>
              <span class="shrink-0" :class="row.view.cls">{{ row.view.text }}</span>
            </button>
          </section>
        </div>

        <div class="shrink-0 px-5 py-3 border-t border-[var(--keiko-line)]">
          <button class="keiko-btn-ghost w-full !h-9" @click="daySheet = null">とじる</button>
        </div>
      </div>
    </div>

    <!-- 評価えらび（セルをタップしたとき） -->
    <div v-if="picker" class="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-end sm:items-center justify-center p-4 z-[210]" @click.self="picker = null">
      <div class="w-full max-w-[320px] bg-[var(--keiko-card)] rounded-2xl p-5">
        <div class="flex items-center gap-2.5 mb-3">
          <KeikoArt :name="picker.kind === 'direct' ? 'flag' : 'swing'" :size="46" />
          <div>
            <p class="text-[11.5px] text-[var(--keiko-ink-soft)]">{{ picker.memberName }}・{{ picker.dateLabel }}</p>
            <h2 class="keiko-display text-[16px] mt-0.5 leading-tight">{{ picker.itemName }}</h2>
          </div>
        </div>

        <!-- 本数×ポイントの項目：全部/半分/少しと、多くやった日の150〜300%から選ぶ -->
        <div v-if="picker.kind === 'reps'">
          <!-- 全部できた日がいちばん多いので、100% はまん中に大きく -->
          <button
            class="keiko-rate-hero"
            :class="{ 'keiko-rate-hero--on': picker.currentRate === RATE_FULL }"
            @click="applyRate(RATE_FULL)"
          >
            <span class="keiko-rate-hero-num">{{ RATE_FULL }}%</span>
            <span class="keiko-rate-hero-label">{{ RATE_LABELS[RATE_FULL] }}</span>
            <span class="keiko-rate-hero-pt">{{ ratePoints(RATE_FULL) }}pt</span>
          </button>
          <div class="grid grid-cols-3 gap-1.5 mt-2">
            <button
              v-for="r in RATE_OPTIONS"
              :key="r"
              class="keiko-rate-btn"
              :class="{ 'keiko-rate-btn--on': picker.currentRate === r }"
              @click="applyRate(r)"
            >
              <span class="keiko-rate-btn-num">{{ r }}%</span>
              <span class="keiko-rate-btn-pt">
                <template v-if="RATE_LABELS[r]">{{ RATE_LABELS[r] }}・</template>{{ ratePoints(r) }}pt
              </span>
            </button>
          </div>
        </div>

        <!-- 直接ポイントの項目：獲得ポイントを入力する -->
        <div v-else>
          <label class="text-[12px] font-bold text-[var(--keiko-ink-soft)]">獲得ポイント</label>
          <div class="flex items-center gap-1.5 mt-1">
            <input
              v-model.number="directInput"
              type="number"
              min="0"
              inputmode="numeric"
              class="keiko-num !w-full !h-11 !text-[17px]"
              @keydown.enter="runOnEnter($event, saveDirect)"
            />
            <span class="text-[13px] font-bold shrink-0">pt</span>
          </div>
          <div class="flex flex-wrap gap-1.5 mt-2">
            <button v-for="p in DIRECT_PRESETS" :key="p" class="keiko-preset" @click="directInput = p">{{ p }}</button>
          </div>
          <button class="keiko-btn w-full mt-3" @click="saveDirect">記録する</button>
        </div>

        <div class="flex items-center gap-1.5 mt-3">
          <button class="keiko-btn-ghost flex-1 !h-9" :disabled="!picker.hasRecord" @click="clearRecord">記録を消す</button>
          <button class="keiko-btn-ghost flex-1 !h-9" @click="picker = null">やめる</button>
        </div>
      </div>
    </div>

    <!-- 設定モーダル。ここでの編集は下書きで、「保存する」を押したときにまとめてDBへ書き込む -->
    <div v-if="settingsOpen" class="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-end sm:items-center justify-center p-4 z-[200]" @click.self="closeSettings">
      <div class="w-full max-w-[520px] max-h-[86vh] bg-[var(--keiko-card)] rounded-2xl flex flex-col overflow-hidden">
        <div class="shrink-0 px-5 pt-5 pb-3">
          <h2 class="keiko-display text-[17px] mb-1 flex items-center gap-2">
            <KeikoArt name="do" :size="32" />
            設定
          </h2>
          <p class="text-[11.5px] text-[var(--keiko-ink-soft)] leading-snug">
            やることと本数、1本あたりのポイントをメンバーごとに決められます。変更は下の「保存する」でまとめて保存します
          </p>
          <p class="text-[11px] text-[var(--keiko-ink-soft)] leading-snug mt-1">
            やることの名前は、一度入れたものを <strong>Tab キー</strong>で呼び出せます（何度も押すと次の候補へ）。本数は選ぶことも直接入力することもできます
          </p>
        </div>

        <!-- 入力候補。やることの名前はこの端末に覚えたもの＋今ここに並んでいるもの -->
        <datalist id="keiko-item-names">
          <option v-for="n in nameSuggestions" :key="n" :value="n" />
        </datalist>
        <datalist id="keiko-rep-options">
          <option v-for="n in REP_OPTIONS" :key="n" :value="n" />
        </datalist>

        <div class="flex-1 overflow-y-auto px-5">
          <p v-if="pendingRemovals.length" class="mb-3 rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-[11.5px] text-red-600 leading-snug">
            保存すると次を削除します（これまでの記録も一緒に消えます）:<br />
            <strong>{{ pendingRemovals.map((x) => x.name).join('・') }}</strong>
          </p>

          <section v-for="(m, mi) in draft" :key="m.id" class="mb-4 rounded-xl border border-[var(--keiko-line)] p-3">
            <div class="flex items-center gap-1.5 mb-2.5">
              <KeikoArt :name="memberArt(mi)" :size="28" />
              <span class="inline-block w-1.5 h-5 rounded-full shrink-0" :style="{ background: memberColor(mi) }" />
              <input v-model="m.name" placeholder="なまえ" class="keiko-input !py-1.5 text-[13px] font-bold" @keydown.enter="blurOnEnter" />
              <button class="text-[13px] text-[var(--keiko-ink-soft)] hover:text-red-500 px-1.5 shrink-0" title="メンバーを削除" @click="removeDraftMember(m)">✕</button>
            </div>

            <div class="flex flex-col gap-2">
              <div v-for="it in m.items" :key="it.id" class="rounded-lg bg-black/[0.02] p-2">
                <div class="flex items-center gap-1.5">
                  <label class="flex items-center shrink-0" title="表示/非表示">
                    <input v-model="it.active" type="checkbox" />
                  </label>
                  <input
                    v-model="it.name"
                    placeholder="やること"
                    list="keiko-item-names"
                    class="keiko-input !py-1.5 text-[13px]"
                    :class="{ 'opacity-40': !it.active }"
                    @keydown.enter="blurOnEnter"
                    @keydown.tab="completeOnTab($event, it.name, (v) => (it.name = v))"
                  />
                  <button class="text-[13px] text-[var(--keiko-ink-soft)] hover:text-red-500 px-1.5 shrink-0" title="削除" @click="removeDraftItem(m, it)">✕</button>
                </div>
                <div class="mt-1.5 pl-[22px] flex items-center gap-1.5">
                  <KeikoArt :name="it.kind === 'direct' ? 'flag' : 'shinai'" :size="24" />
                  <select v-model="it.kind" class="keiko-kind-select">
                    <option value="reps">本数×ポイントで数える</option>
                    <option value="direct">達成時にポイントを入れる</option>
                  </select>
                </div>
                <div v-if="it.kind === 'reps'" class="flex items-center gap-1 mt-1.5 pl-[22px] text-[12px] text-[var(--keiko-ink-soft)]">
                  <input v-model.number="it.repCount" type="number" min="1" inputmode="numeric" list="keiko-rep-options" class="keiko-num !w-[68px]" />
                  <span>本</span>
                  <span class="px-0.5">×</span>
                  <input v-model.number="it.pointPerRep" type="number" min="1" class="keiko-num" />
                  <span>pt/本</span>
                  <span class="ml-auto text-[12px] font-bold" :style="{ color: memberColor(mi) }">= {{ itemPoints(it) }}pt</span>
                </div>
                <p v-else class="mt-1.5 pl-[22px] text-[11px] text-[var(--keiko-ink-soft)] leading-snug">
                  稽古・大会など。本数も達成割合も使わず、できた日にポイントを直接入力します
                </p>
              </div>
            </div>

            <p v-if="m.items.length === 0 && isNewRow(m.id)" class="mt-1 text-[11px] text-[var(--keiko-ink-soft)] leading-snug">
              保存すると、はじめのやること（素振り・稽古など）が入ります
            </p>

            <div v-if="itemDrafts[m.id]" class="mt-2 rounded-lg border border-dashed border-[var(--keiko-line)] p-2">
              <input
                v-model="itemDrafts[m.id].name"
                placeholder="＋ やること（例: はや素振り）"
                list="keiko-item-names"
                class="keiko-input !py-1.5 text-[13px]"
                @keydown.enter="runOnEnter($event, () => addDraftItem(m))"
                @keydown.tab="completeOnTab($event, itemDrafts[m.id].name, (v) => setItemDraftName(m.id, v))"
              />
              <div class="mt-1.5">
                <select v-model="itemDrafts[m.id].kind" class="keiko-kind-select">
                  <option value="reps">本数×ポイントで数える</option>
                  <option value="direct">達成時にポイントを入れる</option>
                </select>
              </div>
              <div class="flex items-center gap-1 mt-1.5 text-[12px] text-[var(--keiko-ink-soft)]">
                <template v-if="itemDrafts[m.id].kind === 'reps'">
                  <input v-model.number="itemDrafts[m.id].repCount" type="number" min="1" inputmode="numeric" list="keiko-rep-options" class="keiko-num !w-[68px]" />
                  <span>本</span>
                  <span class="px-0.5">×</span>
                  <input v-model.number="itemDrafts[m.id].pointPerRep" type="number" min="1" class="keiko-num" />
                  <span>pt/本</span>
                </template>
                <span v-else class="text-[11px]">できた日にポイントを直接入力</span>
                <button class="keiko-btn-ghost !h-8 !px-3 !text-[12px] ml-auto shrink-0" @click="addDraftItem(m)">追加</button>
              </div>
            </div>
          </section>

          <div class="flex items-center gap-1.5 pb-4">
            <input v-model="newMemberName" placeholder="＋ メンバーを追加" class="keiko-input !py-1.5 text-[13px]" @keydown.enter="runOnEnter($event, addDraftMember)" />
            <button class="keiko-btn-ghost !h-8 !px-3 !text-[12px] shrink-0" @click="addDraftMember">追加</button>
          </div>
        </div>

        <div class="shrink-0 flex items-center gap-1.5 px-5 py-3 border-t border-[var(--keiko-line)]">
          <span class="text-[11.5px] leading-tight" :class="settingsDirty ? 'text-[var(--keiko-gold)] font-bold' : 'text-[var(--keiko-ink-soft)]'">
            {{ settingsDirty ? '未保存の変更があります' : 'すべて保存済みです' }}
          </span>
          <button class="keiko-btn-ghost !h-9 !px-3.5 ml-auto shrink-0" @click="closeSettings">とじる</button>
          <button class="keiko-btn !h-9 !px-4 shrink-0" :disabled="!settingsDirty || saving" @click="saveSettings">
            {{ saving ? '保存中…' : '保存する' }}
          </button>
        </div>
      </div>
    </div>

    <!-- 保存できたことを短く知らせる -->
    <div v-if="toastText" class="keiko-toast">{{ toastText }}</div>

    <AuthModal v-if="showAuthModal" accent="sky" />
    <PasswordModal v-model:show="showPasswordModal" accent="sky" />
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted, watch } from 'vue'
import { useAuth } from '~/composables/useAuth'
import AuthModal from '~/components/AuthModal.vue'
import KeikoArt from '~/components/keiko/KeikoArt.vue'
import KeikoCumulativeChart from '~/components/keiko/KeikoCumulativeChart.client.vue'
import { KEIKO_START_DATE, KEIKO_START_MONTH_KEY } from '~/types/keiko'
import type { KeikoItem, KeikoItemKind, KeikoMember, KeikoPoints, KeikoPointBucket, KeikoRecord, KeikoState } from '~/types/keiko'

definePageMeta({ layout: 'keiko' })
useHead({ title: 'けいこ記録' })

const { isLoggedIn, checked, checkAuth, logout } = useAuth()
const showAuthModal = computed(() => checked.value && !isLoggedIn.value)
const showPasswordModal = ref(false)

type Mode = 'week' | 'month' | 'year'
const MODES: { key: Mode; label: string }[] = [
  { key: 'week', label: '週' },
  { key: 'month', label: '月' },
  { key: 'year', label: '年' },
]
const mode = ref<Mode>('week')

const members = ref<KeikoMember[]>([])
const items = ref<KeikoItem[]>([])
const records = ref<KeikoRecord[]>([])
const buckets = ref<KeikoPointBucket[]>([])
const loading = ref(true)
/** 読み込みに失敗したかどうか。空っぽの画面を「記録がまだ無い」と誤解させないために持つ。 */
const loadError = ref(false)

// メンバーの色（表・カレンダー・年表で共通に使う）
const MEMBER_COLORS = ['#1c2540', '#c9a227', '#3b82c4', '#e0524b', '#4f9d69', '#8a63b8']
function memberColor(index: number): string {
  return MEMBER_COLORS[index % MEMBER_COLORS.length]
}
/** メンバーごとのイラスト。並び順で順ぐりに変えて、誰の欄かひと目で分かるようにする。 */
const MEMBER_ARTS = ['kid', 'swing', 'cheer', 'men'] as const
function memberArt(index: number): (typeof MEMBER_ARTS)[number] {
  return MEMBER_ARTS[index % MEMBER_ARTS.length]!
}

// ── 日付（JST基準。週は月曜始まり）──
const WD = ['月', '火', '水', '木', '金', '土', '日']

function todayJst(): string {
  return new Date().toLocaleDateString('sv-SE', { timeZone: 'Asia/Tokyo' })
}
function startOfWeek(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00')
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7)) // 月曜まで戻す
  return d.toLocaleDateString('sv-SE')
}
function addDays(dateStr: string, n: number): string {
  const d = new Date(dateStr + 'T00:00:00')
  d.setDate(d.getDate() + n)
  return d.toLocaleDateString('sv-SE')
}
/** その月の日数。ym は YYYY-MM。 */
function daysInMonth(ym: string): number {
  const [y, m] = ym.split('-').map(Number)
  return new Date(y, m, 0).getDate()
}
function shiftMonthKey(ym: string, delta: number): string {
  const [y, m] = ym.split('-').map(Number)
  const d = new Date(y, m - 1 + delta, 1)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}
/** 8/22(土)。評価えらびの見出しに使う。 */
function shortDateLabel(date: string): string {
  const d = new Date(date + 'T00:00:00')
  return `${d.getMonth() + 1}/${d.getDate()}(${WD[(d.getDay() + 6) % 7]})`
}
/** 8月22日(土)。日の記録シートの見出しに使う。 */
function longDateLabel(date: string): string {
  const d = new Date(date + 'T00:00:00')
  return `${d.getMonth() + 1}月${d.getDate()}日(${WD[(d.getDay() + 6) % 7]})`
}

// 記録のはじまり。ここより前の週・月・年へは戻れない（空の期間をめくり続けないため）。
// 値はサーバーと共有（~/types/keiko）。サーバー側でも、この日より前の保存は弾いている
const START_MONTH_KEY = KEIKO_START_MONTH_KEY
const START_DATE = KEIKO_START_DATE
const START_WEEK_START = startOfWeek(START_DATE) // 8/1 を含む週の月曜（＝2026-07-27）まで見られる
const START_YEAR = Number(START_MONTH_KEY.slice(0, 4))

const todayStr = todayJst()
const thisWeekStart = startOfWeek(todayStr)
const currentMonthKey = todayStr.slice(0, 7)
const currentYear = Number(todayStr.slice(0, 4))

// 開始前に開かれたときも、はじまりの期間を出す
const weekStart = ref(thisWeekStart < START_WEEK_START ? START_WEEK_START : thisWeekStart)
const monthKey = ref(currentMonthKey < START_MONTH_KEY ? START_MONTH_KEY : currentMonthKey)
const year = ref(Math.max(currentYear, START_YEAR))

const weekDays = computed(() =>
  Array.from({ length: 7 }, (_, i) => {
    const date = addDays(weekStart.value, i)
    const d = new Date(date + 'T00:00:00')
    // はじまりの週は前月にまたがるので、開始日より前の曜日は記録できない日として印を付ける
    return { date, month: d.getMonth() + 1, day: d.getDate(), weekdayIndex: i, weekdayLabel: WD[i], beforeStart: date < START_DATE }
  })
)

/** 表示中の期間 [from, to]。集計はこの範囲で行う。 */
const range = computed<{ from: string; to: string }>(() => {
  if (mode.value === 'week') return { from: weekStart.value, to: addDays(weekStart.value, 6) }
  if (mode.value === 'month') return { from: `${monthKey.value}-01`, to: `${monthKey.value}-${String(daysInMonth(monthKey.value)).padStart(2, '0')}` }
  return { from: `${year.value}-01-01`, to: `${year.value}-12-31` }
})

const rangeLabel = computed(() => {
  if (mode.value === 'week') {
    const [first, last] = [weekDays.value[0], weekDays.value[6]]
    return `${first.month}/${first.day}(${first.weekdayLabel}) 〜 ${last.month}/${last.day}(${last.weekdayLabel})`
  }
  if (mode.value === 'month') {
    const [y, m] = monthKey.value.split('-')
    return `${y}年${Number(m)}月`
  }
  return `${year.value}年`
})
const prevLabel = computed(() => (mode.value === 'week' ? '前の週' : mode.value === 'month' ? '前の月' : '前の年'))
const nextLabel = computed(() => (mode.value === 'week' ? '次の週' : mode.value === 'month' ? '次の月' : '次の年'))
const backLabel = computed(() => (mode.value === 'week' ? '今週に戻る' : mode.value === 'month' ? '今月に戻る' : '今年に戻る'))
const isCurrentRange = computed(() => {
  if (mode.value === 'week') return weekStart.value === thisWeekStart
  if (mode.value === 'month') return monthKey.value === currentMonthKey
  return year.value === currentYear
})
/** はじまりの期間まで戻っているか（＝これ以上「前へ」できない）。 */
const canGoPrev = computed(() => {
  if (mode.value === 'week') return weekStart.value > START_WEEK_START
  if (mode.value === 'month') return monthKey.value > START_MONTH_KEY
  return year.value > START_YEAR
})

function shiftRange(delta: number) {
  if (delta < 0 && !canGoPrev.value) return
  if (mode.value === 'week') {
    const next = addDays(weekStart.value, delta * 7)
    weekStart.value = next < START_WEEK_START ? START_WEEK_START : next
  } else if (mode.value === 'month') {
    const next = shiftMonthKey(monthKey.value, delta)
    monthKey.value = next < START_MONTH_KEY ? START_MONTH_KEY : next
  } else {
    year.value = Math.max(year.value + delta, START_YEAR)
  }
}
function goCurrent() {
  if (mode.value === 'week') weekStart.value = thisWeekStart
  else if (mode.value === 'month') monthKey.value = currentMonthKey
  else year.value = currentYear
}

/** 月カレンダーのマス（前後の月にはみ出す分も月曜始まりで埋める）。 */
const monthGrid = computed(() => {
  const from = `${monthKey.value}-01`
  const to = `${monthKey.value}-${String(daysInMonth(monthKey.value)).padStart(2, '0')}`
  const cells: { date: string; day: number; inMonth: boolean; weekdayIndex: number }[] = []
  const gridEnd = addDays(startOfWeek(to), 6)
  for (let d = startOfWeek(from); d <= gridEnd; d = addDays(d, 1)) {
    cells.push({ date: d, day: Number(d.slice(8, 10)), inMonth: d.slice(0, 7) === monthKey.value, weekdayIndex: cells.length % 7 })
  }
  return cells
})

/**
 * 月カレンダーに出すマス。押せるかどうか（前後の月・はじまりより前は押せない）と、
 * その日のポイントをここで組み立てる。ポイントは records から数えるので、
 * 記録を入れた瞬間にカレンダーの数字も変わる。
 */
const monthCells = computed(() =>
  monthGrid.value.map((cell) => ({
    ...cell,
    month: Number(cell.date.slice(5, 7)),
    canRecord: cell.inMonth && cell.date >= START_DATE,
    points: cell.inMonth ? membersWithPointsOn(cell.date) : [],
  }))
)

// はじまりの年は、はじまりの月から並べる（記録のしようがない月を空欄で並べない）
const yearRows = computed(() =>
  Array.from({ length: 12 }, (_, i) => ({ month: i + 1, key: `${year.value}-${String(i + 1).padStart(2, '0')}` })).filter(
    (row) => row.key >= START_MONTH_KEY
  )
)

// ── データ読み込み ──
// メンバーと練習項目は設定画面でも使うので、モードに関わらず state から取る。
// 記録そのものは週・月で読む（どちらも日ごとの入力ができ、入れた瞬間に画面へ反映したいため）。
// 年は月別の集計だけで足りるので、1年分の記録は読まない。
async function loadState() {
  try {
    const data = await $fetch<KeikoState>('/api/keiko/state', {
      query: mode.value === 'year' ? { ...range.value, records: 0 } : range.value,
    })
    members.value = data.members
    items.value = data.items
    records.value = data.records
  } catch {
    // 読めなかったときは空にするが、「まだ何も無い」と区別できるよう loadError を立てる
    members.value = []
    items.value = []
    records.value = []
    loadError.value = true
  }
}

/** 年表示の月別ポイント。1年分の記録を持たずに済むよう、サーバー側で集計してもらう。 */
async function loadPoints() {
  try {
    const data = await $fetch<KeikoPoints>('/api/keiko/points', { query: { ...range.value, unit: 'month' } })
    members.value = data.members
    buckets.value = data.buckets
  } catch {
    buckets.value = []
    loadError.value = true
  }
}

async function load() {
  loading.value = true
  loadError.value = false
  try {
    if (mode.value === 'year') await Promise.all([loadState(), loadPoints()])
    else await loadState()
  } finally {
    loading.value = false
  }
}

watch([mode, weekStart, monthKey, year], () => {
  // 期間や表示を変えたら、開いたままの日シートは前の期間のものなので閉じる
  daySheet.value = null
  load()
})

// ── ポイント計算 ──
const itemMap = computed(() => new Map(items.value.map((it) => [it.id, it])))
function itemPoints(it: { repCount: number; pointPerRep: number }): number {
  return (Number(it.repCount) || 0) * (Number(it.pointPerRep) || 0)
}
/** そのメンバーの表示中の項目（非表示は除く）。 */
function itemsOf(memberId: string): KeikoItem[] {
  return items.value.filter((it) => it.memberId === memberId && it.active)
}
/** そのメンバーの全項目（設定画面用。非表示も含む）。 */
function allItemsOf(memberId: string): KeikoItem[] {
  return items.value.filter((it) => it.memberId === memberId)
}

/** 記録1件の獲得ポイント。サーバー側の集計SQL（POINT_EXPR）と計算・丸め方を揃えている。 */
function earnedPoints(it: KeikoItem, r: KeikoRecord): number {
  if (it.kind === 'direct') return r.points ?? 0
  return Math.round((itemPoints(it) * r.rate) / 100)
}

/** 週表示のその日のポイント（読み込み済みの記録から計算）。 */
function memberDayPoints(memberId: string, date: string): number {
  let sum = 0
  for (const r of records.value) {
    if (r.memberId !== memberId || r.date !== date) continue
    const it = itemMap.value.get(r.itemId)
    if (it) sum += earnedPoints(it, r)
  }
  return sum
}

const bucketMap = computed(() => {
  const map = new Map<string, number>()
  for (const b of buckets.value) map.set(`${b.memberId}|${b.key}`, b.points)
  return map
})
function pointsFor(memberId: string, key: string): number {
  return bucketMap.value.get(`${memberId}|${key}`) ?? 0
}

/** 表示中の期間のメンバー合計ポイント。週・月は読み込んだ記録から、年は月別の集計から数える。 */
function memberRangePoints(memberId: string): number {
  if (mode.value === 'year') return buckets.value.reduce((sum, b) => (b.memberId === memberId ? sum + b.points : sum), 0)
  return records.value.reduce((sum, r) => {
    if (r.memberId !== memberId) return sum
    const it = itemMap.value.get(r.itemId)
    return it ? sum + earnedPoints(it, r) : sum
  }, 0)
}

/** 月カレンダーのその日に出すメンバー（ポイントが入った人だけ）。 */
function membersWithPointsOn(date: string) {
  return members.value
    .map((m, index) => ({ id: m.id, name: m.name, index, points: memberDayPoints(m.id, date) }))
    .filter((m) => m.points > 0)
}

const yearMax = computed(() => Math.max(1, ...buckets.value.map((b) => b.points)))
function barWidth(points: number): string {
  return `${Math.round((points / yearMax.value) * 100)}%`
}

/** 累積推移グラフ用：メンバーごとの月別ポイント（累積計算はグラフ側で行う）。 */
const cumulativeSeries = computed(() =>
  members.value.map((m, mi) => ({
    name: m.name,
    color: memberColor(mi),
    data: yearRows.value.map((row) => pointsFor(m.id, row.key)),
  }))
)

// ── その日の記録（reps は評価％、direct は入力したポイント）──
// 100%（全部できた）がいちばん押される選択肢なので、まん中に大きく出して残りを下に並べる。
// 100 を超える値は「決めた本数より多くやった日」で、満点を超えるポイントがそのまま入る。
const RATE_FULL = 100
const RATE_OPTIONS = [50, 20, 10, 150, 200, 300]
const RATE_LABELS: Record<number, string> = { 100: '全部‼️', 50: '半分' }
const DIRECT_PRESETS = [5, 10, 20, 30, 50, 100, 200, 300, 500, 1000]

const recordMap = computed(() => {
  const map = new Map<string, KeikoRecord>()
  for (const r of records.value) map.set(`${r.memberId}|${r.itemId}|${r.date}`, r)
  return map
})
function recordOf(memberId: string, itemId: string, date: string): KeikoRecord | undefined {
  return recordMap.value.get(`${memberId}|${itemId}|${date}`)
}

/** セル1つの見た目。記録があればその日の獲得ポイント、無ければ空の丸。 */
function cellView(item: KeikoItem, memberId: string, date: string): { kind: string; cls: string; text: string } {
  const r = recordOf(memberId, item.id, date)
  if (!r) return { kind: 'none', cls: 'keiko-cell-empty', text: '' }
  return { kind: 'point', cls: 'keiko-pop keiko-point', text: String(earnedPoints(item, r)) }
}

/** 週表示の1行分のセル（見た目を1回だけ組み立てる）。 */
function rowCells(memberId: string, item: KeikoItem) {
  return weekDays.value.map((day) => ({
    date: day.date,
    label: `${day.month}/${day.day}`,
    isToday: day.date === todayStr,
    beforeStart: day.beforeStart,
    view: cellView(item, memberId, day.date),
  }))
}

// ── 月カレンダーから1日ぶんの入力 ──
// 週の表と同じことを月表示でもできるように、日を押したらその日のメンバー×やることを並べて出す。
// ここから評価えらびを開くが、シートは開いたままにして、続けて何件も入れられるようにする。
const daySheet = ref<{ date: string; label: string } | null>(null)

function openDaySheet(date: string) {
  if (date < START_DATE) return
  daySheet.value = { date, label: longDateLabel(date) }
}

/** 日の記録シートの1行分（見た目を1回だけ組み立てる）。 */
function dayRows(memberId: string, date: string) {
  return itemsOf(memberId).map((item) => ({ item, view: cellView(item, memberId, date) }))
}

const picker = ref<{
  memberId: string
  memberName: string
  itemId: string
  itemName: string
  kind: KeikoItemKind
  fullPoints: number
  date: string
  dateLabel: string
  currentRate: number
  hasRecord: boolean
} | null>(null)
const directInput = ref<number | string>(10)

function openPicker(member: KeikoMember, item: KeikoItem, date: string) {
  // 記録のはじまりより前の日（はじまりの週にまたがる7月末）は、そもそもダイアログを開かない
  if (date < START_DATE) return
  const r = recordOf(member.id, item.id, date)
  directInput.value = r?.points ?? 10
  picker.value = {
    memberId: member.id,
    memberName: member.name,
    itemId: item.id,
    itemName: item.name,
    kind: item.kind,
    fullPoints: itemPoints(item),
    date,
    dateLabel: shortDateLabel(date),
    currentRate: r?.rate ?? 0,
    hasRecord: !!r,
  }
}

/** その評価％だと何ポイントになるか（ボタンに併記する）。 */
function ratePoints(rate: number): number {
  return Math.round(((picker.value?.fullPoints ?? 0) * rate) / 100)
}
/** 評価％を選んだとき（reps の項目）。rate=0 は記録を消す。 */
function applyRate(rate: number) {
  saveRecord({ rate, remove: rate === 0 }, rate === 0 ? null : { rate, points: null })
}
/** ポイントを直接入れたとき（direct の項目）。 */
function saveDirect() {
  const points = Math.max(0, Math.floor(Number(directInput.value) || 0))
  saveRecord({ points }, { rate: 100, points })
}
/** 記録を消す。 */
function clearRecord() {
  saveRecord({ remove: true }, null)
}

// ── 保存できたことの小さな知らせ ──
const toastText = ref('')
let toastTimer: ReturnType<typeof setTimeout> | null = null
function toast(text: string) {
  toastText.value = text
  if (toastTimer) clearTimeout(toastTimer)
  toastTimer = setTimeout(() => (toastText.value = ''), 1800)
}

/** サーバーが返したメッセージ（createError の message）を取り出す。 */
function errorMessage(e: unknown): string {
  const message = (e as { data?: { message?: string } })?.data?.message
  return typeof message === 'string' ? message : ''
}

/** 楽観更新してから保存。next が null なら記録を消す。 */
async function saveRecord(payload: Record<string, unknown>, next: { rate: number; points: number | null } | null) {
  const p = picker.value
  if (!p) return
  picker.value = null

  const { memberId, itemId, date } = p
  const find = () => records.value.findIndex((r) => r.memberId === memberId && r.itemId === itemId && r.date === date)
  const idx = find()
  const before = idx === -1 ? null : { ...records.value[idx] }

  if (!next) {
    if (idx !== -1) records.value.splice(idx, 1)
  } else if (idx !== -1) {
    records.value[idx] = { memberId, itemId, date, ...next }
  } else {
    records.value.push({ memberId, itemId, date, ...next })
  }

  try {
    await $fetch('/api/keiko/records/set', { method: 'POST', body: { memberId, itemId, date, ...payload } })
    toast(next ? '記録を保存しました' : '記録を消しました')
  } catch (e: any) {
    // 失敗時はロールバック。サーバーが理由を返していれば（はじまりより前の日など）それを出す
    const cur = find()
    if (cur !== -1) records.value.splice(cur, 1)
    if (before) records.value.push(before)
    alert(e?.data?.message || '保存に失敗しました')
  }
}

// ── 設定 ──
/** 本数の候補（datalist に出す目安）。ここに無い数も直接入力できる。 */
const REP_OPTIONS = [5, 10, 20, 30, 40, 50, 100, 150, 200, 300]


// 設定は「下書きを編集 →「保存する」でまとめてDBへ書き込む」方式。
// 画面の members/items は保存が成功するまで触らないので、とじる（キャンセル）は下書きを捨てるだけで済む。
interface DraftItem {
  id: string // 既存はDBのID、追加したばかりの行は 'new:1' のような仮ID
  name: string
  kind: KeikoItemKind
  repCount: number
  pointPerRep: number
  active: boolean
}
interface DraftMember {
  id: string
  name: string
  items: DraftItem[]
}

const settingsOpen = ref(false)
const saving = ref(false)
const newMemberName = ref('')
const draft = ref<DraftMember[]>([])
/** 保存したら消すもの（画面から消えても、保存するまではDBに残っている）。 */
const removedMembers = ref<{ id: string; name: string }[]>([])
const removedItems = ref<{ id: string; name: string }[]>([])
/** メンバーごとの「＋やること」入力欄。下書き本体とは別に持つ（打ちかけを未保存扱いにしないため）。 */
const itemDrafts = reactive<Record<string, { name: string; kind: KeikoItemKind; repCount: number; pointPerRep: number }>>({})
/** 開いたとき（＝保存済み）の下書きの中身。今の中身と比べて未保存かどうかを判定する。 */
const savedSnapshot = ref('')

let tempSeq = 0
function nextTempId(): string {
  return `new:${++tempSeq}`
}
function isNewRow(id: string): boolean {
  return id.startsWith('new:')
}

const pendingRemovals = computed(() => [...removedMembers.value, ...removedItems.value])
const settingsDirty = computed(() => JSON.stringify(draft.value) !== savedSnapshot.value || pendingRemovals.value.length > 0)

function syncItemDrafts() {
  for (const m of draft.value) if (!itemDrafts[m.id]) itemDrafts[m.id] = { name: '', kind: 'reps', repCount: 10, pointPerRep: 1 }
}
function setItemDraftName(memberId: string, value: string) {
  const d = itemDrafts[memberId]
  if (d) d.name = value
}

// ── やることの名前の入力候補 ──
// 護と匡で同じ「はや素振り」を入れる、といった打ち直しを減らすための入力補助。
// 記録そのものではなく端末ごとの入力履歴なので、D1ではなく localStorage に置く。
const NAME_HISTORY_KEY = 'keiko-item-names'
const NAME_HISTORY_MAX = 60
const nameHistory = ref<string[]>([])

function loadNameHistory() {
  try {
    const raw = localStorage.getItem(NAME_HISTORY_KEY)
    const list: unknown = raw ? JSON.parse(raw) : []
    nameHistory.value = Array.isArray(list) ? list.filter((n): n is string => typeof n === 'string') : []
  } catch {
    nameHistory.value = []
  }
}
/** 使った名前を新しい順に覚え直す。 */
function rememberNames(names: string[]) {
  const used = names.map((n) => n.trim()).filter(Boolean)
  if (used.length === 0) return
  nameHistory.value = [...new Set([...used, ...nameHistory.value])].slice(0, NAME_HISTORY_MAX)
  try {
    localStorage.setItem(NAME_HISTORY_KEY, JSON.stringify(nameHistory.value))
  } catch {
    // 覚えられなくても入力候補が出ないだけなので、そのまま続ける
  }
}

/** 入力候補。今この画面に並んでいる名前も混ぜるので、別のメンバーに入れた名前をすぐ呼び出せる。 */
const nameSuggestions = computed(() => {
  const inDraft = draft.value.flatMap((m) => m.items.map((it) => it.name.trim())).filter(Boolean)
  return [...new Set([...inDraft, ...nameHistory.value])]
})

/**
 * Tab で入力候補を当てはめる（シェルの補完と同じ感覚）。
 * 続けて押すと同じ書き出しの次の候補へ回る。候補が無いときは何もしない＝Tab 本来の移動のまま。
 */
const tabState = { prefix: '', last: '' }
function completeOnTab(e: KeyboardEvent, current: string, apply: (value: string) => void) {
  if (isImeKey(e)) return
  // 直前に Tab で入れた候補のままなら、そのときの書き出しで次の候補を探す
  const prefix = current === tabState.last && tabState.prefix ? tabState.prefix : current.trim()
  if (!prefix) return
  const hits = nameSuggestions.value.filter((n) => n.startsWith(prefix))
  const next = hits[(hits.indexOf(current) + 1) % hits.length]
  if (!next) return
  e.preventDefault()
  tabState.prefix = prefix
  tabState.last = next
  apply(next)
}

function openSettings() {
  draft.value = members.value.map((m) => ({
    id: m.id,
    name: m.name,
    items: allItemsOf(m.id).map((it) => ({
      id: it.id,
      name: it.name,
      kind: it.kind,
      repCount: it.repCount,
      pointPerRep: it.pointPerRep,
      active: it.active,
    })),
  }))
  removedMembers.value = []
  removedItems.value = []
  savedSnapshot.value = JSON.stringify(draft.value)
  syncItemDrafts()
  settingsOpen.value = true
}

function closeSettings() {
  if (settingsDirty.value && !confirm('保存していない変更があります。破棄してとじますか？')) return
  settingsOpen.value = false
}

function addDraftMember() {
  const name = newMemberName.value.trim()
  if (!name) return
  draft.value.push({ id: nextTempId(), name, items: [] })
  newMemberName.value = ''
  syncItemDrafts()
}
function removeDraftMember(m: DraftMember) {
  if (!isNewRow(m.id)) removedMembers.value.push({ id: m.id, name: m.name.trim() || 'メンバー' })
  draft.value = draft.value.filter((x) => x.id !== m.id)
  delete itemDrafts[m.id]
}

function addDraftItem(m: DraftMember) {
  const d = itemDrafts[m.id]
  if (!d) return
  const name = d.name.trim()
  if (!name) return
  m.items.push({ id: nextTempId(), name, kind: d.kind, repCount: normalize(d.repCount, 1), pointPerRep: normalize(d.pointPerRep, 1), active: true })
  itemDrafts[m.id] = { name: '', kind: d.kind, repCount: d.repCount, pointPerRep: d.pointPerRep }
}
function removeDraftItem(m: DraftMember, it: DraftItem) {
  if (!isNewRow(it.id)) removedItems.value.push({ id: it.id, name: `${m.name}の${it.name.trim() || 'やること'}` })
  m.items = m.items.filter((x) => x.id !== it.id)
}

/** 下書きの内容をまとめてDBへ保存する。 */
async function saveSettings() {
  for (const m of draft.value) {
    if (!m.name.trim()) {
      alert('なまえが空のメンバーがあります')
      return
    }
    for (const it of m.items) {
      if (!it.name.trim()) {
        alert(`「${m.name}」に、やることが空の項目があります`)
        return
      }
    }
  }
  if (pendingRemovals.value.length) {
    const names = pendingRemovals.value.map((x) => x.name).join('・')
    if (!confirm(`${names} を削除します。これまでの記録も消えます。よろしいですか？`)) return
  }

  saving.value = true
  try {
    await $fetch('/api/keiko/settings', {
      method: 'POST',
      body: {
        members: draft.value.map((m) => ({ id: m.id, name: m.name.trim() })),
        items: draft.value.flatMap((m) =>
          m.items.map((it) => ({
            id: it.id,
            memberId: m.id,
            name: it.name.trim(),
            kind: it.kind,
            repCount: normalize(it.repCount, 1),
            pointPerRep: normalize(it.pointPerRep, 1),
            active: it.active,
          }))
        ),
        removedMemberIds: removedMembers.value.map((x) => x.id),
        removedItemIds: removedItems.value.map((x) => x.id),
      },
    })
    // 次に別のメンバーへ同じやることを入れるときのために、使った名前をこの端末に覚えておく
    rememberNames(draft.value.flatMap((m) => m.items.map((it) => it.name)))
    settingsOpen.value = false
    // 本数・ポイント・項目の増減で集計が変わるので、記録も含めて読み直す
    await load()
    toast('設定を保存しました')
  } catch (e) {
    alert(errorMessage(e) || '保存に失敗しました')
  } finally {
    saving.value = false
  }
}

// ── IME 対策 ──
// 日本語入力の「変換確定」も keydown を発火させる（isComposing / keyCode 229）。
// そのまま blur() や 追加・Tab補完 を走らせると、確定した文字がもう一度挿入されて二重入力になる。
function isImeKey(e: KeyboardEvent): boolean {
  return e.isComposing || e.keyCode === 229
}
function blurOnEnter(e: KeyboardEvent) {
  if (isImeKey(e)) return
  ;(e.target as HTMLInputElement).blur()
}
function runOnEnter(e: KeyboardEvent, fn: () => void) {
  if (isImeKey(e)) return
  fn()
}

/** 1以上の整数へ丸める（空欄・0・マイナス対策）。 */
function normalize(v: unknown, fallback: number): number {
  const n = Math.floor(Number(v))
  return Number.isFinite(n) && n >= 1 ? Math.min(n, 9999) : fallback
}

async function doLogout() {
  await logout()
  window.location.reload()
}

// 記録はサーバー（D1）にユーザー単位で保存しているので、同じアカウントならどの端末からでも同じものが見える。
// ただし読み込みはログインが済んでからでないと 401 になり、空の画面のまま止まってしまう。
// （別の端末で初めて開くと、まず未ログインで開いてからログインする＝この順番になる）
let started = false
async function startIfLoggedIn() {
  if (started || !isLoggedIn.value) return
  started = true
  await load()
}

onMounted(async () => {
  loadNameHistory()
  await checkAuth()
  if (!isLoggedIn.value) loading.value = false
  await startIfLoggedIn()
})
// ログインが済んだら読み込む（ログイン後に画面は作り直されないので、ここで読み直す必要がある）
watch(isLoggedIn, () => startIfLoggedIn())
</script>

<style scoped>
.keiko-tabs {
  display: inline-flex;
  padding: 3px;
  border-radius: 999px;
  background: rgba(28, 37, 64, 0.06);
}
.keiko-tab {
  min-width: 58px;
  height: 30px;
  padding: 0 0.9rem;
  border-radius: 999px;
  font-size: 13px;
  font-weight: 700;
  color: var(--keiko-ink-soft);
  transition: background 0.15s, color 0.15s;
}
.keiko-tab--on {
  background: var(--keiko-card);
  color: var(--keiko-navy);
  box-shadow: 0 1px 3px rgba(28, 37, 64, 0.12);
}

.keiko-th {
  font-size: 11px;
  font-weight: 700;
  color: var(--keiko-ink-soft);
  padding: 0.4rem 0.25rem;
}
.keiko-th--today {
  color: var(--keiko-navy);
}
.keiko-th--sun {
  color: #e0524b;
}
.keiko-th--sat {
  color: #3b82c4;
}
/* 記録のはじまりより前の日（はじまりの週だけ、前月にまたがる分に付く） */
.keiko-th--off {
  color: var(--keiko-line);
}
.keiko-td--today {
  background: rgba(201, 162, 39, 0.08);
}
.keiko-td--off {
  background: rgba(28, 37, 64, 0.03);
  color: var(--keiko-line);
}
.keiko-total {
  font-size: 12px;
  font-weight: 700;
  white-space: nowrap;
}
.keiko-cell {
  width: 34px;
  height: 34px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 10px;
  cursor: pointer;
  transition: background 0.12s;
}
.keiko-cell:hover {
  background: rgba(28, 37, 64, 0.05);
}
.keiko-cell-empty {
  width: 18px;
  height: 18px;
  border-radius: 50%;
  border: 1.5px dashed var(--keiko-line);
}
/* 記録があるセル。その日の獲得ポイントを出す */
.keiko-point {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 30px;
  height: 24px;
  padding: 0 5px;
  border-radius: 999px;
  background: rgba(201, 162, 39, 0.22);
  border: 1.5px solid rgba(201, 162, 39, 0.45);
  color: #8a6d12;
  font-family: 'Mochiy Pop One', 'Zen Maru Gothic', sans-serif;
  font-size: 11.5px;
  line-height: 1;
}

/* イラストのちいさな動き。子どもが開いたときに画面が生きて見えるように */
@keyframes keiko-bob {
  0%,
  100% {
    transform: translateY(0) rotate(-2deg);
  }
  50% {
    transform: translateY(-3px) rotate(2deg);
  }
}
.keiko-bob {
  animation: keiko-bob 2.8s ease-in-out infinite;
}
@keyframes keiko-swing {
  0%,
  100% {
    transform: rotate(-9deg);
  }
  50% {
    transform: rotate(9deg);
  }
}
.keiko-swing {
  transform-origin: 50% 85%;
  animation: keiko-swing 1.1s ease-in-out infinite;
}
@media (prefers-reduced-motion: reduce) {
  .keiko-bob,
  .keiko-swing {
    animation: none;
  }
}

/* 評価えらび：100% を大きく、残り（半分・20%・10%）を下に横並び */
.keiko-rate-hero {
  width: 100%;
  padding: 16px 12px 13px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 3px;
  border-radius: 16px;
  border: 2px solid var(--keiko-line);
  background: var(--keiko-card);
  color: var(--keiko-ink);
  transition: border-color 0.12s, background 0.12s, transform 0.12s;
}
.keiko-rate-hero:hover {
  border-color: var(--keiko-gold-soft);
}
.keiko-rate-hero:active {
  transform: scale(0.98);
}
.keiko-rate-hero--on {
  border-color: var(--keiko-gold);
  background: rgba(201, 162, 39, 0.16);
}
.keiko-rate-hero-num {
  font-size: 38px;
  font-weight: 800;
  line-height: 1;
  letter-spacing: -0.02em;
}
.keiko-rate-hero-label {
  font-size: 14px;
  font-weight: 700;
  line-height: 1.2;
}
.keiko-rate-hero-pt {
  font-size: 11.5px;
  font-weight: 700;
  color: var(--keiko-ink-soft);
  line-height: 1;
}
.keiko-rate-btn {
  height: 54px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 3px;
  border-radius: 12px;
  border: 1px solid var(--keiko-line);
  background: var(--keiko-card);
  color: var(--keiko-ink);
  transition: border-color 0.12s, background 0.12s;
}
.keiko-rate-btn:hover {
  border-color: var(--keiko-gold-soft);
}
.keiko-rate-btn--on {
  border-color: var(--keiko-gold);
  background: rgba(201, 162, 39, 0.14);
}
.keiko-rate-btn-num {
  font-size: 17px;
  font-weight: 800;
  line-height: 1;
}
.keiko-rate-btn-pt {
  font-size: 10.5px;
  font-weight: 700;
  color: var(--keiko-ink-soft);
  line-height: 1;
}

/* 月表示のカレンダー。マスそのものが「その日の記録」を開くボタン */
.keiko-daycell {
  width: 100%;
  min-height: 84px;
  padding: 6px 5px;
  /* ボタンは中身を上下中央に寄せるので、日付が上に来るよう縦並びにする */
  display: flex;
  flex-direction: column;
  align-items: stretch;
  text-align: left;
  border-top: 1px solid var(--keiko-line);
  border-right: 1px solid var(--keiko-line);
  transition: background 0.12s;
}
.keiko-daycell:nth-child(7n) {
  border-right: none;
}
.keiko-daycell:not(:disabled) {
  cursor: pointer;
}
.keiko-daycell:not(:disabled):hover {
  background: rgba(201, 162, 39, 0.14);
}
.keiko-daycell--out {
  background: rgba(28, 37, 64, 0.025);
  color: var(--keiko-line);
}
.keiko-daycell--today {
  background: rgba(201, 162, 39, 0.1);
}
.keiko-daypoint {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 3px;
  padding: 1px 5px;
  border-radius: 6px;
  font-size: 10.5px;
  font-weight: 700;
  line-height: 1.5;
}
/* まだ記録が無い日の目印。押せば入れられることを控えめに伝える */
.keiko-dayadd {
  font-size: 13px;
  font-weight: 700;
  line-height: 1;
  color: var(--keiko-line);
}
.keiko-daycell:hover .keiko-dayadd {
  color: var(--keiko-gold);
}

/* 日の記録シートの1行（メンバーのやること1つ。押すと評価えらびが開く） */
.keiko-dayrow {
  width: 100%;
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 10px;
  border-top: 1px solid var(--keiko-line);
  background: var(--keiko-card);
  color: var(--keiko-ink);
  transition: background 0.12s;
}
.keiko-dayrow:hover {
  background: rgba(28, 37, 64, 0.04);
}
.keiko-dayrow:active {
  background: rgba(28, 37, 64, 0.07);
}

/* 年表示 */
.keiko-yearbar {
  position: absolute;
  left: 6%;
  top: 20%;
  height: 60%;
  border-radius: 6px;
  transition: width 0.2s;
}
.keiko-row--now {
  background: rgba(201, 162, 39, 0.07);
}
.keiko-num {
  width: 52px;
  padding: 0.25rem 0.4rem;
  border: 1px solid var(--keiko-line);
  border-radius: 8px;
  background: var(--keiko-card);
  font-size: 12.5px;
  font-weight: 700;
  color: var(--keiko-ink);
  text-align: center;
  /* 1ずつ増減する矢印は使わない（数を直接打つか、下の候補から選ぶ） */
  appearance: textfield;
  -moz-appearance: textfield;
}
.keiko-num::-webkit-outer-spin-button,
.keiko-num::-webkit-inner-spin-button {
  -webkit-appearance: none;
  margin: 0;
}
.keiko-num:focus {
  outline: none;
  border-color: var(--keiko-gold);
}
/* 項目の種類（本数×ポイント / 直接ポイント） */
.keiko-kind-select {
  width: 100%;
  padding: 0.3rem 0.5rem;
  border: 1px solid var(--keiko-line);
  border-radius: 8px;
  background: var(--keiko-card);
  font-size: 12px;
  font-weight: 700;
  color: var(--keiko-ink);
  cursor: pointer;
}
.keiko-kind-select:focus {
  outline: none;
  border-color: var(--keiko-gold);
}
/* 保存できたことの知らせ（サーバーに書き込めた合図） */
.keiko-toast {
  position: fixed;
  left: 50%;
  bottom: 24px;
  transform: translateX(-50%);
  z-index: 300;
  padding: 0.5rem 1rem;
  border-radius: 999px;
  background: rgba(28, 37, 64, 0.92);
  color: #fff;
  font-size: 12.5px;
  font-weight: 700;
  box-shadow: 0 6px 20px rgba(28, 37, 64, 0.25);
  animation: keiko-toast-in 0.16s ease-out;
}
@keyframes keiko-toast-in {
  from {
    opacity: 0;
    transform: translate(-50%, 6px);
  }
  to {
    opacity: 1;
    transform: translate(-50%, 0);
  }
}

/* 直接ポイント入力のよく使う値 */
.keiko-preset {
  min-width: 44px;
  height: 30px;
  padding: 0 0.6rem;
  border-radius: 999px;
  border: 1px solid var(--keiko-line);
  background: var(--keiko-card);
  font-size: 12.5px;
  font-weight: 700;
  color: var(--keiko-ink-soft);
}
.keiko-preset:hover {
  border-color: var(--keiko-gold-soft);
  color: var(--keiko-ink);
}
</style>
