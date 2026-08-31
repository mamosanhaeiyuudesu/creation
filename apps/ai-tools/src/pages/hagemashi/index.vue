<template>
  <div class="flex flex-col items-center px-4 pt-4 lg:pt-5 pb-12 lg:pb-5 min-h-screen" @click="showSettingsMenu = false">
    <div v-if="showSettingsMenu" class="fixed inset-0 z-40" @click="showSettingsMenu = false" />
    <!-- PC では画面幅を活かして広いカードにする（スマホは従来どおり600px上限の1カラム） -->
    <div class="relative z-50 w-full max-w-[600px] lg:max-w-[1100px] ml-2.5 lg:ml-0">
      <div class="absolute inset-x-0 top-0 h-[2px] rounded-t-2xl bg-gradient-to-r from-orange-500 to-pink-500 z-10" />
      <div class="w-full bg-white/[0.04] border border-white/[0.08] rounded-2xl pt-7 px-3.5 lg:px-6 pb-3 shadow-[0_20px_80px_rgba(0,0,0,0.35),0_0_40px_rgba(249,115,22,0.06)] backdrop-blur-[10px] grid gap-4 max-h-[90dvh] lg:max-h-[calc(100dvh-2.5rem)] overflow-y-auto [scrollbar-width:thin] [scrollbar-color:rgba(249,115,22,0.3)_transparent]">

      <!-- Header -->
      <header class="relative flex items-center justify-start">
        <div class="text-left">
          <h1 class="m-0 text-[clamp(12px,2vw,16px)] font-bold bg-gradient-to-br from-orange-500 to-pink-500 bg-clip-text text-transparent">記録</h1>
        </div>
        <div class="absolute right-0 top-1/2 -translate-y-1/2 z-50 flex items-center gap-1.5" @click.stop>
          <button
            class="w-9 h-9 rounded-lg border border-white/10 bg-white/[0.06] text-slate-400 text-lg cursor-pointer flex items-center justify-center transition-all hover:bg-white/[0.12] hover:text-[#e2e8f0]"
            title="ログ"
            @click="logOpen = true"
          >🗓️</button>
          <div class="relative">
          <button
            class="w-9 h-9 rounded-lg border border-white/10 bg-white/[0.06] text-slate-400 text-lg cursor-pointer flex items-center justify-center transition-all hover:bg-white/[0.12] hover:text-[#e2e8f0]"
            title="設定"
            @click="showSettingsMenu = !showSettingsMenu"
          >⚙</button>
          <div v-if="showSettingsMenu" class="absolute right-0 top-full mt-1 bg-[#1e293b] border border-white/10 rounded-xl shadow-xl z-[200] min-w-[140px] py-1 overflow-hidden">
            <button class="w-full text-left px-4 py-2 text-[13px] text-slate-300 hover:bg-white/[0.08] transition-colors cursor-pointer flex items-center gap-2" @click="openExportModal(); showSettingsMenu = false">
              <span>📤</span> エクスポート
            </button>
            <button class="w-full text-left px-4 py-2 text-[13px] text-slate-300 hover:bg-white/[0.08] transition-colors cursor-pointer flex items-center gap-2" @click="dictionaryOpen = true; showSettingsMenu = false">
              <span>📖</span> 辞書設定
            </button>
            <button class="w-full text-left px-4 py-2 text-[13px] text-slate-300 hover:bg-white/[0.08] transition-colors cursor-pointer flex items-center gap-2" @click="stoplistOpen = true; showSettingsMenu = false">
              <span>🚫</span> 除外する単語
            </button>
            <button class="w-full text-left px-4 py-2 text-[13px] text-slate-300 hover:bg-white/[0.08] transition-colors cursor-pointer flex items-center gap-2" @click="openVisionModal(); showSettingsMenu = false">
              <span>🎯</span> ビジョン設定
            </button>
            <button class="w-full text-left px-4 py-2 text-[13px] text-slate-300 hover:bg-white/[0.08] transition-colors cursor-pointer flex items-center gap-2" @click="modelModalOpen = true; showSettingsMenu = false">
              <span>🤖</span> モデル変更
            </button>
            <button class="w-full text-left px-4 py-2 text-[13px] text-slate-300 hover:bg-white/[0.08] transition-colors cursor-pointer flex items-center gap-2" @click="passwordModalOpen = true; showSettingsMenu = false">
              <span>🔒</span> パスワード変更
            </button>
            <button class="w-full text-left px-4 py-2 text-[13px] text-slate-300 hover:bg-white/[0.08] transition-colors cursor-pointer flex items-center gap-2" @click="logout(); showSettingsMenu = false">
              <span>🚪</span> ログアウト
            </button>
          </div>
          </div>
        </div>
      </header>

      <!-- Recorder -->
      <div class="flex flex-col items-center gap-3">
        <div class="flex gap-4 items-center">
          <button class="w-[62px] h-[62px] rounded-full border-2 border-orange-500 bg-orange-500/10 text-slate-50 text-xl flex flex-col items-center justify-center gap-1 cursor-pointer transition-all hover:bg-orange-500/20 hover:scale-105" @click="openRecording(); recordConfirmOpen = true">
            <span class="block leading-none">📝</span>
            <span class="text-[9px] font-medium">記録</span>
          </button>

          <!-- 相談 button -->
          <button
            class="w-[62px] h-[62px] rounded-full border-2 border-orange-500/50 bg-orange-500/[0.08] text-slate-50 cursor-pointer flex flex-col items-center justify-center gap-1 transition-all hover:bg-orange-500/[0.20] hover:border-orange-500/80 hover:scale-105"
            @click="activeTab = 'consult'"
          >
            <span class="text-xl leading-none">💬</span>
            <span class="text-[9px] font-medium">相談</span>
          </button>
        </div>
      </div>

      <!-- Error -->
      <div v-if="error" class="bg-red-500/10 border border-red-500/30 rounded-2xl p-4">
        <p class="m-0 mb-3 text-red-300 text-sm">{{ error }}</p>
        <button class="w-full py-3 px-6 border-none bg-gradient-to-br from-orange-500 to-pink-500 text-slate-50 rounded-lg text-sm font-medium cursor-pointer hover:opacity-90 transition-opacity" @click="error = ''">閉じる</button>
      </div>

      <!-- History tabs -->
      <div class="mt-1 min-w-0">
        <!-- 録音 サブタブ（記録・カレンダー・分析） -->
        <div v-if="isRecordingTab" class="flex items-center gap-1.5 mt-2 flex-wrap">
          <button
            v-for="t in primaryTabs"
            :key="t.key"
            class="px-2.5 py-1 rounded-full text-xs font-semibold border transition-all cursor-pointer"
            :class="activeTab === t.key ? 'border-orange-500/60 bg-orange-500/15 text-orange-300' : 'border-white/[0.08] bg-transparent text-slate-500 hover:text-slate-300'"
            @click="activeTab = t.key"
          ><span class="sm:hidden">{{ t.short }}</span><span class="hidden sm:inline">{{ t.label }}</span></button>
        </div>
        <div
          class="flex items-center gap-2 mb-1"
          :class="isRecordingTab ? 'min-h-8' : 'min-h-0'"
        >
          <!-- 記録タブ内の 記録 / はげまし 切り替え -->
          <template v-if="activeTab === 'transcription'">
            <div class="ml-auto flex items-center gap-1.5 text-xs">
              <button
                class="bg-transparent border-none p-0 cursor-pointer font-semibold transition-colors"
                :class="recordView === 'record' ? 'text-orange-300' : 'text-slate-600 hover:text-slate-400'"
                @click="recordView = 'record'"
              >記録</button>
              <span class="text-slate-700">/</span>
              <button
                class="bg-transparent border-none p-0 cursor-pointer font-semibold transition-colors"
                :class="recordView === 'encourage' ? 'text-orange-300' : 'text-slate-600 hover:text-slate-400'"
                @click="recordView = 'encourage'"
              >はげまし</button>
            </div>
          </template>
          <template v-if="activeTab === 'moments' || activeTab === 'calendar'">
            <div class="flex-1" />
            <span v-if="unprocessedSourceItems.length > 0 && !isGeneratingMoments" class="text-[11px] text-slate-600">未抽出 {{ unprocessedSourceItems.length }}件</span>
            <button
              class="px-3 py-1 rounded-lg text-xs font-medium border border-white/10 bg-white/[0.04] text-slate-400 cursor-pointer hover:bg-white/[0.10] hover:text-slate-200 transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1.5"
              :disabled="isGeneratingMoments || momentSourceItems.length === 0"
              @click="openMomentSelect"
            >
              <span v-if="isGeneratingMoments" class="w-3 h-3 rounded-full border border-orange-500/30 border-t-orange-500 animate-spin block" />
              {{ momentStatus || '更新' }}
            </button>
          </template>
        </div>
        <HistoryTable
          v-if="activeTab === 'transcription' && recordView === 'record'"
          :history="history"
          :copiedId="copiedHistoryId"
          :hideHeader="true"
          :mobileMinimal="true"
          @copy="copyHistory"
          @delete="deleteHistoryAndMoments"
          @updateTitle="updateHistoryTitle"
        />
        <HistoryTable
          v-else-if="activeTab === 'transcription' && recordView === 'encourage'"
          :history="encourageHistory"
          :copiedId="copiedEncourageId"
          :hideHeader="true"
          :markdown="true"
          :mobileMinimal="true"
          @copy="copyEncourageHistory"
          @delete="deleteEncourageHistory"
          @updateTitle="updateEncourageHistoryTitle"
        />
        <!-- カレンダータブ -->
        <div v-else-if="activeTab === 'calendar'" class="py-2 flex flex-col gap-3">
          <div v-if="momentBaseRows.length === 0" class="text-center text-slate-500 text-sm py-10">
            出来事を抽出すると、日ごとのカレンダーになります
          </div>
          <template v-else>
            <!-- 月の移動と件数 -->
            <div class="flex items-center gap-1.5">
              <button
                class="w-7 h-7 flex items-center justify-center rounded-lg border border-white/10 bg-transparent text-slate-400 text-sm cursor-pointer hover:bg-white/[0.08] hover:text-slate-100 transition-colors"
                @click="shiftCalendarMonth(-1)"
              >‹</button>
              <span class="text-sm text-slate-100 font-semibold tabular-nums min-w-[92px] text-center">{{ calendarMonthLabel }}</span>
              <button
                class="w-7 h-7 flex items-center justify-center rounded-lg border border-white/10 bg-transparent text-slate-400 text-sm cursor-pointer hover:bg-white/[0.08] hover:text-slate-100 transition-colors"
                @click="shiftCalendarMonth(1)"
              >›</button>
              <button
                v-if="!isCurrentPeriod"
                class="px-2 py-1 rounded-lg border border-white/10 bg-transparent text-slate-500 text-[11px] cursor-pointer hover:bg-white/[0.08] hover:text-slate-300 transition-colors"
                @click="backToNow"
              >{{ calendarView === 'year' ? '今年' : '今月' }}</button>
              <div class="ml-auto flex items-center gap-0.5 rounded-lg border border-white/10 p-0.5">
                <button
                  v-for="v in (['month', 'year'] as const)"
                  :key="v"
                  class="px-2 py-0.5 rounded-md text-[11px] font-semibold border-none cursor-pointer transition-colors"
                  :class="calendarView === v ? 'bg-orange-500/20 text-orange-300' : 'bg-transparent text-slate-500 hover:text-slate-300'"
                  @click="calendarView = v; selectedDay = null"
                >{{ v === 'month' ? '月' : '年' }}</button>
              </div>
            </div>
            <div class="flex items-center">
              <span class="ml-auto text-[11px] text-slate-500 tabular-nums">
                ポジ <span class="text-emerald-300 font-semibold">{{ monthSummary.pos }}</span>
                <span class="mx-1 text-slate-700">/</span>
                ネガ <span class="text-slate-400 font-semibold">{{ monthSummary.neg }}</span>
              </span>
            </div>

            <HagemashiMomentCalendar
              v-if="calendarView === 'month'"
              :moments="momentBaseRows"
              :meta="MOMENT_META"
              :month="calendarMonth"
              :selected="selectedDay"
              @select="selectedDay = $event; showNegativeDetail = false"
            />
            <HagemashiMomentYearHeatmap
              v-else
              :moments="momentBaseRows"
              :meta="MOMENT_META"
              :year="calendarYear"
              :selected="selectedDay"
              @select="drillIntoDay"
            />

            <!-- その期間のハイライト -->
            <div v-if="periodHighlights.length" class="flex flex-col gap-1.5 pt-1">
              <div class="text-[11px] text-slate-500 font-semibold">
                {{ calendarView === 'year' ? 'この年' : 'この月' }}のハイライト
              </div>
              <div
                v-for="m in periodHighlights"
                :key="m.id"
                class="flex items-start gap-2 px-2.5 py-2 rounded-xl bg-white/[0.03] border border-white/[0.06] cursor-pointer hover:border-orange-400/40 transition-colors"
                @click="drillIntoDay(dayKeyOf(m.ts))"
              >
                <span class="shrink-0 px-1.5 py-[1px] mt-[1px] rounded-md text-[10px] font-semibold border" :class="MOMENT_META[m.kind].chip">{{ m.kind }}</span>
                <span class="text-[11px] shrink-0 mt-[2px] tracking-tight" :class="MOMENT_META[m.kind].star">{{ '★'.repeat(m.impact) }}</span>
                <span class="text-sm text-slate-200 leading-relaxed flex-1">{{ m.text }}</span>
                <span class="text-[10px] text-slate-600 shrink-0 mt-[3px] tabular-nums">{{ momentDate(m) }}</span>
              </div>
            </div>

            <!-- 通算 -->
            <div v-if="lifetimeTotals.length" class="flex flex-wrap items-center gap-x-3 gap-y-1 pt-2 mt-1 border-t border-white/[0.06] text-[11px] text-slate-500">
              <span class="text-slate-600">通算</span>
              <span v-for="t in lifetimeTotals" :key="t.kind" class="flex items-baseline gap-1">
                <span :class="MOMENT_META[t.kind].star">{{ t.kind }}</span>
                <span class="text-slate-200 font-semibold tabular-nums text-sm">{{ t.count }}</span>
              </span>
            </div>
          </template>
        </div>

        <!-- 分析タブ（出来事の一覧・絞り込み・並び替え）。key は moments のまま（?tab=moments のリンクを生かすため） -->
        <div v-else-if="activeTab === 'moments'" class="py-2 flex flex-col gap-2.5">
          <!-- 絞り込み。①タグ →②その中でよく出てくる単語、の入れ子。
               番号ラベル・インデント・左の縦線で段の違いを示す（guesthouse/insights と同じ考え方）。
               ②の縦線とラベルは①で選んだタグの色を引き継ぎ、どの下にぶら下がっているかを色でも示す -->
          <div v-if="momentBaseRows.length > 0" class="rounded-xl border border-white/[0.07] bg-white/[0.02] px-3 py-2.5 flex flex-col gap-2.5">
            <div>
              <p class="text-[10px] font-bold text-slate-500 tracking-wide m-0 mb-1.5">① タグ</p>
              <div class="flex flex-wrap items-center gap-1.5">
                <button
                  class="px-2.5 py-1 rounded-full text-[11px] font-semibold border transition-all cursor-pointer"
                  :class="momentKindFilter === null ? 'border-orange-500/60 bg-orange-500/15 text-orange-300' : 'border-white/[0.08] bg-transparent text-slate-500 hover:text-slate-300'"
                  @click="momentKindFilter = null"
                >すべて {{ momentBaseRows.length }}</button>
                <button
                  v-for="k in MOMENT_KINDS"
                  :key="k"
                  class="px-2.5 py-1 rounded-full text-[11px] font-semibold border transition-all cursor-pointer"
                  :class="momentKindFilter === k ? MOMENT_META[k].chip : 'border-white/[0.08] bg-transparent text-slate-500 hover:text-slate-300'"
                  @click="momentKindFilter = momentKindFilter === k ? null : k"
                >{{ k }} {{ momentCounts[k] }}</button>
              </div>
              <div class="flex justify-end mt-1.5">
                <button
                  class="px-2.5 py-1 rounded-md border border-orange-500/30 bg-orange-500/10 text-orange-300 text-[11px] font-medium cursor-pointer transition-colors hover:bg-orange-500/20 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-orange-500/10"
                  :disabled="momentOverviewItems.length === 0"
                  @click="showMomentOverview = true"
                >概要</button>
              </div>
            </div>

            <div v-if="momentWordChips.length > 0" class="pl-3 border-l-2 transition-colors" :class="momentWordBranchClass">
              <p class="text-[10px] font-bold tracking-wide m-0 mb-1.5" :class="momentWordLabelClass">
                ② よく出てくる単語<span class="text-slate-600 font-normal ml-1">{{ momentKindFilter ? `（${momentKindFilter}の中）` : '' }}</span>
              </p>
              <div class="flex flex-wrap items-center gap-1">
                <button
                  class="px-2 py-[3px] rounded-md text-[10px] border transition-all cursor-pointer"
                  :class="momentWordFilter === null ? momentWordActiveClass : 'border-white/[0.06] bg-white/[0.02] text-slate-500 hover:text-slate-300 hover:border-white/[0.12]'"
                  @click="momentWordFilter = null"
                >すべて</button>
                <button
                  v-for="w in momentWordChips"
                  :key="w.word"
                  class="px-2 py-[3px] rounded-md text-[10px] border transition-all cursor-pointer"
                  :class="momentWordFilter === w.word ? momentWordActiveClass : 'border-white/[0.06] bg-white/[0.02] text-slate-500 hover:text-slate-300 hover:border-white/[0.12]'"
                  @click="momentWordFilter = momentWordFilter === w.word ? null : w.word"
                >{{ w.word }} <b class="ml-0.5 tabular-nums font-semibold">{{ w.count }}</b></button>
              </div>
            </div>
          </div>

          <!-- 並び替え。日付と星（大きさ）の2軸で、選択中の軸をもう一度押すと昇順/降順が入れ替わる。
               いま何順なのかが矢印だけだと伝わらないので、選択中のボタンにだけ向きの言葉を出す -->
          <div v-if="momentBaseRows.length > 0" class="flex items-center justify-end gap-1.5">
            <span class="text-[10px] text-slate-600">並び替え</span>
            <button
              v-for="s in MOMENT_SORTS"
              :key="s.key"
              class="px-2 py-[3px] rounded-md text-[10px] border transition-all cursor-pointer"
              :class="momentSortKey === s.key ? 'border-white/20 bg-white/[0.08] text-slate-200' : 'border-white/[0.06] bg-white/[0.02] text-slate-500 hover:text-slate-300 hover:border-white/[0.12]'"
              @click="toggleMomentSort(s.key)"
            >{{ s.label }}<span v-if="momentSortKey === s.key" class="ml-1 text-slate-400">{{ momentSortDesc ? `↓${s.desc}` : `↑${s.asc}` }}</span></button>
          </div>

          <div v-if="momentRows.length === 0" class="text-center text-slate-500 text-sm py-10">
            <template v-if="momentBaseRows.length === 0">更新ボタンを押すと、記録から出来事を抜き出します</template>
            <template v-else>この絞り込みに合う出来事はありません</template>
          </div>
          <div v-else class="flex flex-col gap-0">
            <HagemashiMomentRow
              v-for="row in momentRows"
              :key="row.id"
              :moment="row"
              :date="momentDate(row)"
              :kinds="MOMENT_KINDS"
              :meta="MOMENT_META"
              @save="applyMomentEdit(row.id, $event)"
              @delete="deletingMomentId = row.id"
            />
          </div>
        </div>

        <!-- 相談チャット（タブ切替で破棄すると履歴が消えるため、常時マウントして v-show で表示切替）
             v-show は .client.vue コンポーネント自体ではなく、この安定したラッパーdivに付ける
             （直接付けるとSSR時に何も描画されない要素にディレクティブを適用することになり、
             リロード時のhydrationで「Cannot read properties of null (reading 'style')」が発生するため） -->
        <div v-show="activeTab === 'consult'">
          <HagemashiConsultChat
            :active="activeTab === 'consult'"
            :vision="vision"
            :summary-items="recentSummaryItems"
            :achievements="consultAchievements"
            @usage="consultDates = $event"
            @messages="consultMessages = $event"
          />
        </div>
      </div>
      </div>
    </div>

    <!-- Auth Modal -->
    <AuthModal v-if="!$dev && checked && !isLoggedIn" accent="orange" />

    <!-- パスワード変更 -->
    <PasswordModal v-model:show="passwordModalOpen" accent="orange" />

    <!-- ログ（利用回数） -->
    <HagemashiLogModal
      v-if="logOpen"
      :record-dates="recordDates"
      :consult-dates="consultDates"
      @close="logOpen = false"
    />

    <!-- 記録方法選択 -->
    <div v-if="recordConfirmOpen" class="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-[100]" @click.self="recordConfirmOpen = false">
      <div class="w-full max-w-[300px] bg-[#1e293b] border border-white/10 rounded-2xl shadow-[0_24px_80px_rgba(0,0,0,0.5)] p-6 flex flex-col gap-5">
        <p class="m-0 text-slate-200 text-sm text-center">記録方法を選択してください</p>
        <div class="flex justify-center gap-6">
          <button class="w-[62px] h-[62px] rounded-full border-2 border-orange-500 bg-orange-500/10 text-slate-50 text-xl flex flex-col items-center justify-center gap-1 cursor-pointer transition-all hover:bg-orange-500/20 hover:scale-105" @click="confirmStartRecording">
            <span class="block leading-none">🎙️</span>
            <span class="text-[9px] font-medium">録音</span>
          </button>
          <button class="w-[62px] h-[62px] rounded-full border-2 border-orange-500/50 bg-orange-500/[0.08] text-slate-50 cursor-pointer flex flex-col items-center justify-center gap-1 transition-all hover:bg-orange-500/[0.20] hover:border-orange-500/80 hover:scale-105" @click="openTextInput">
            <span class="text-xl leading-none">⌨️</span>
            <span class="text-[9px] font-medium">テキスト</span>
          </button>
        </div>
        <div class="flex justify-center gap-2">
          <button class="px-5 py-2 rounded-lg border border-white/15 bg-transparent text-slate-400 text-sm cursor-pointer hover:bg-white/[0.06] hover:text-slate-50 transition-all" @click="recordConfirmOpen = false">キャンセル</button>
        </div>
      </div>
    </div>

    <!-- テキスト入力 -->
    <div v-if="textInputOpen" class="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-[100]" @click.self="closeTextInput">
      <div class="w-full max-w-[420px] bg-[#1e293b] border border-white/10 rounded-2xl shadow-[0_24px_80px_rgba(0,0,0,0.5)] p-6 flex flex-col gap-4">
        <p class="m-0 text-slate-200 text-sm">テキストを入力してください</p>
        <textarea
          v-model="textInputValue"
          class="w-full min-h-[140px] bg-white/[0.05] border border-orange-500/40 rounded-lg text-slate-200 text-sm px-3 py-2 outline-none focus:border-orange-500 transition-colors font-[inherit] resize-none leading-relaxed"
          placeholder="内容を入力..."
          :disabled="isSubmittingText"
        />
        <div class="flex justify-end gap-2">
          <button class="px-5 py-2 rounded-lg border border-white/15 bg-transparent text-slate-400 text-sm cursor-pointer hover:bg-white/[0.06] hover:text-slate-50 transition-all disabled:opacity-40 disabled:cursor-not-allowed" :disabled="isSubmittingText" @click="closeTextInput">キャンセル</button>
          <button
            class="px-5 py-2 rounded-lg border-none bg-gradient-to-br from-orange-500 to-pink-500 text-slate-50 text-sm font-medium cursor-pointer hover:opacity-90 transition-opacity disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1.5"
            :disabled="isSubmittingText || !textInputValue.trim()"
            @click="submitTextInput"
          >
            <span v-if="isSubmittingText" class="w-3 h-3 rounded-full border border-white/40 border-t-white animate-spin block" />
            {{ isSubmittingText ? '処理中...' : '完了' }}
          </button>
        </div>
      </div>
    </div>

    <!-- 録音中モーダル（他画面の操作をブロック） -->
    <div v-if="isRecording || isPaused || isProcessing" class="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-[100]">
      <div class="w-full max-w-[360px] bg-[#1e293b] border border-white/10 rounded-2xl shadow-[0_24px_80px_rgba(0,0,0,0.5)] p-7 flex flex-col items-center gap-5">
        <div class="text-xl text-red-500 font-mono font-semibold">{{ formatTime(duration) }}</div>
        <div class="flex gap-4 items-center">
          <template v-if="isRecording">
            <button class="w-[62px] h-[62px] rounded-full border-2 border-red-500 bg-red-500/10 text-slate-50 text-xl flex flex-col items-center justify-center gap-1 cursor-pointer transition-all hover:bg-red-500/20" @click="pauseRecording">
              <span class="block leading-none">⏸️</span>
              <span class="text-[9px] font-medium">一時停止</span>
            </button>
          </template>
          <template v-else-if="isPaused">
            <div class="flex rounded-full overflow-hidden border-2 border-orange-500 h-[62px]">
              <button class="flex flex-col items-center justify-center gap-1 w-[62px] bg-orange-500/10 border-none text-slate-50 cursor-pointer transition-colors hover:bg-orange-500/25 p-0" @click="resumeRecording">
                <span class="text-base leading-none">▶</span>
                <span class="text-[9px] font-medium">再開</span>
              </button>
              <div class="w-px bg-orange-500/40 self-stretch" />
              <button class="flex flex-col items-center justify-center gap-1 w-[62px] bg-red-500/10 border-none text-slate-50 cursor-pointer transition-colors hover:bg-red-500/25 p-0" @click="cancelRecording">
                <span class="text-base leading-none">✕</span>
                <span class="text-[9px] font-medium">中止</span>
              </button>
              <div class="w-px bg-orange-500/40 self-stretch" />
              <button class="flex flex-col items-center justify-center gap-1 w-[62px] bg-green-400/10 border-none text-slate-50 cursor-pointer transition-colors hover:bg-green-400/25 p-0" @click="transcribeRecording">
                <span class="text-base leading-none">✍️</span>
                <span class="text-[9px] font-medium">文字起こし</span>
              </button>
            </div>
          </template>
          <template v-else-if="isProcessing">
            <button class="w-[62px] h-[62px] rounded-full border-2 border-orange-500 bg-orange-500/10 text-slate-50 text-xl flex flex-col items-center justify-center gap-1 opacity-60 cursor-not-allowed" disabled>
              <span class="block leading-none">⏳</span>
              <span class="text-[9px] font-medium">解析中</span>
            </button>
          </template>
        </div>
      </div>
    </div>

    <!-- 辞書設定モーダル -->
    <div v-if="dictionaryOpen" class="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-[100]" @click.self="dictionaryOpen = false">
      <div class="w-full max-w-[480px] bg-[#1e293b] border border-white/10 rounded-2xl shadow-[0_24px_80px_rgba(0,0,0,0.5)] flex flex-col max-h-[90vh]">
        <div class="flex items-center justify-between px-6 pt-5 pb-4 border-b border-white/[0.08]">
          <div>
            <h2 class="m-0 text-lg text-slate-50 font-semibold">📖 辞書設定</h2>
            <p class="m-0 mt-0.5 text-xs text-slate-500">よみを単語に自動変換（文字起こし時に適用）</p>
          </div>
          <button class="bg-transparent border-none text-slate-500 text-lg cursor-pointer px-2 py-1 rounded-md hover:text-slate-50 transition-colors" @click="dictionaryOpen = false">✕</button>
        </div>
        <div class="px-4 py-3 overflow-y-auto flex flex-col gap-2 flex-1 [scrollbar-width:thin] [scrollbar-color:rgba(249,115,22,0.3)_transparent]">
          <div v-if="editingDictionary.length === 0" class="text-center text-slate-600 text-sm py-6">
            エントリがありません
          </div>
          <div v-for="(entry, i) in editingDictionary" :key="i" class="flex items-center gap-2">
            <input
              v-model="entry.yomi"
              class="flex-1 bg-white/[0.05] border border-white/[0.10] rounded-lg text-slate-200 text-sm px-3 py-2 outline-none focus:border-orange-500 transition-colors font-[inherit]"
              placeholder="よみ（例：あきら）"
            />
            <span class="text-slate-600 shrink-0">→</span>
            <input
              v-model="entry.word"
              class="flex-1 bg-white/[0.05] border border-white/[0.10] rounded-lg text-slate-200 text-sm px-3 py-2 outline-none focus:border-orange-500 transition-colors font-[inherit]"
              placeholder="単語（例：アキラ）"
            />
            <button class="shrink-0 w-7 h-7 flex items-center justify-center rounded-lg text-slate-600 hover:text-red-400 hover:bg-red-500/10 transition-colors cursor-pointer border-none bg-transparent" @click="editingDictionary.splice(i, 1)">✕</button>
          </div>
          <button
            class="mt-1 w-full py-2 rounded-lg border border-dashed border-white/15 text-slate-500 text-sm cursor-pointer hover:border-orange-500/40 hover:text-slate-300 transition-all bg-transparent"
            @click="editingDictionary.push({ yomi: '', word: '' })"
          >+ 追加</button>
        </div>
        <div class="flex justify-end gap-2 px-6 py-4 border-t border-white/[0.08]">
          <button class="px-5 py-2 rounded-lg border border-white/15 bg-transparent text-slate-400 text-sm cursor-pointer hover:bg-white/[0.06] hover:text-slate-50 transition-all" @click="dictionaryOpen = false">キャンセル</button>
          <button class="px-5 py-2 rounded-lg border-none bg-gradient-to-br from-orange-500 to-pink-500 text-slate-50 text-sm font-medium cursor-pointer hover:opacity-90 transition-opacity" @click="saveDictionary">保存</button>
        </div>
      </div>
    </div>

    <!-- ビジョン設定モーダル -->
    <div v-if="visionOpen" class="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-[100]" @click.self="closeVisionModal">
      <div class="w-full max-w-[480px] bg-[#1e293b] border border-white/10 rounded-2xl shadow-[0_24px_80px_rgba(0,0,0,0.5)] flex flex-col max-h-[90vh]">
        <div class="flex items-center justify-between px-6 pt-5 pb-4 border-b border-white/[0.08]">
          <div>
            <h2 class="m-0 text-lg text-slate-50 font-semibold">🎯 ビジョン設定</h2>
            <p class="m-0 mt-0.5 text-xs text-slate-500">自分がどうありたいかを言語化しておく</p>
          </div>
          <button class="bg-transparent border-none text-slate-500 text-lg cursor-pointer px-2 py-1 rounded-md hover:text-slate-50 transition-colors" @click="closeVisionModal">✕</button>
        </div>
        <div class="px-4 py-3 overflow-y-auto flex-1">
          <textarea
            v-model="editingVisionText"
            class="w-full min-h-[180px] bg-white/[0.05] border border-orange-500/40 rounded-lg text-slate-200 text-sm px-3 py-2 outline-none focus:border-orange-500 transition-colors font-[inherit] resize-none leading-relaxed"
            placeholder="どんな自分でありたいか、大事にしたい価値観などを自由に書いてください"
          />
        </div>
        <div class="flex justify-end gap-2 px-6 py-4 border-t border-white/[0.08]">
          <button class="px-5 py-2 rounded-lg border border-white/15 bg-transparent text-slate-400 text-sm cursor-pointer hover:bg-white/[0.06] hover:text-slate-50 transition-all" @click="closeVisionModal">キャンセル</button>
          <button
            class="px-5 py-2 rounded-lg border-none bg-gradient-to-br from-orange-500 to-pink-500 text-slate-50 text-sm font-medium cursor-pointer hover:opacity-90 transition-opacity disabled:opacity-40 disabled:cursor-not-allowed"
            :disabled="isVisionSaving"
            @click="saveVision"
          >保存</button>
        </div>
      </div>
    </div>

    <!-- モデル選択モーダル -->
    <TranscriptionModelModal
      v-if="modelModalOpen"
      v-model="transcriptionModel"
      accent="orange"
      @close="modelModalOpen = false"
    />

    <!-- はげまし確認ポップアップ（記録直後） -->
    <div v-if="encourageConfirmOpen" class="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-[100]" @click.self="declineEncourage">
      <div class="w-full max-w-[300px] bg-[#1e293b] border border-white/10 rounded-2xl shadow-[0_24px_80px_rgba(0,0,0,0.5)] p-6 flex flex-col gap-5">
        <p class="m-0 text-slate-200 text-sm text-center">記録しました。はげましますか？</p>
        <div class="flex justify-center gap-2">
          <button class="px-5 py-2 rounded-lg border border-white/15 bg-transparent text-slate-400 text-sm cursor-pointer hover:bg-white/[0.06] hover:text-slate-50 transition-all" @click="declineEncourage">いいえ</button>
          <button class="px-5 py-2 rounded-lg border-none bg-gradient-to-br from-orange-500 to-pink-500 text-slate-50 text-sm font-medium cursor-pointer hover:opacity-90 transition-opacity" @click="acceptEncourage">はい</button>
        </div>
      </div>
    </div>

    <!-- はげまし設定ポップアップ（対象は直近1件） -->
    <div v-if="selectOpen" class="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-[100]" @click.self="closeSelectModal">
      <div class="w-full max-w-[480px] bg-[#1e293b] border border-white/10 rounded-2xl shadow-[0_24px_80px_rgba(0,0,0,0.5)] flex flex-col max-h-[90vh]">
        <div class="flex items-center justify-between px-6 pt-5 pb-4 border-b border-white/[0.08]">
          <h2 class="m-0 text-lg text-slate-50 font-semibold">はげまし設定</h2>
          <button class="bg-transparent border-none text-slate-500 text-lg cursor-pointer px-2 py-1 rounded-md hover:text-slate-50 transition-colors" @click="closeSelectModal">✕</button>
        </div>
        <div class="px-6 pt-4 pb-4 flex flex-col gap-3">
          <!-- はげまし方スタイル選択 -->
          <div class="flex items-center gap-2.5">
            <span class="text-xs text-slate-500 shrink-0">スタイル</span>
            <div class="flex gap-1.5">
              <button
                class="px-3 py-1 rounded-lg text-xs font-medium border transition-all cursor-pointer"
                :class="encourageStyle === 'calm'
                  ? 'border-orange-500/60 bg-orange-500/15 text-orange-300'
                  : 'border-white/10 bg-transparent text-slate-500 hover:text-slate-300 hover:border-white/20'"
                @click="encourageStyle = 'calm'"
              >冷静</button>
              <button
                class="px-3 py-1 rounded-lg text-xs font-medium border transition-all cursor-pointer"
                :class="encourageStyle === 'loud'
                  ? 'border-orange-500/60 bg-orange-500/15 text-orange-300'
                  : 'border-white/10 bg-transparent text-slate-500 hover:text-slate-300 hover:border-white/20'"
                @click="encourageStyle = 'loud'"
              >大げさ</button>
            </div>
          </div>
          <!-- 文字数選択 -->
          <div class="flex items-center gap-2.5">
            <span class="text-xs text-slate-500 shrink-0">文字数</span>
            <div class="flex gap-1.5 items-center">
              <button
                v-for="n in [500, 1000, 2000]"
                :key="n"
                class="px-3 py-1 rounded-lg text-xs font-medium border transition-all cursor-pointer"
                :class="charLimit === n
                  ? 'border-orange-500/60 bg-orange-500/15 text-orange-300'
                  : 'border-white/10 bg-transparent text-slate-500 hover:text-slate-300 hover:border-white/20'"
                @click="charLimit = n"
              >{{ n }}</button>
              <input
                type="number"
                v-model.number="charLimit"
                min="100"
                max="10000"
                class="w-16 bg-white/[0.05] border border-white/10 rounded-lg text-slate-300 text-xs px-2 py-1 outline-none focus:border-orange-500 transition-colors font-[inherit] text-center [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
              />
            </div>
          </div>
          <!-- アクションボタン -->
          <div class="flex items-center justify-end gap-2">
            <button class="px-5 py-2 rounded-lg border border-white/15 bg-transparent text-slate-400 text-sm cursor-pointer hover:bg-white/[0.06] hover:text-slate-50 transition-all" @click="closeSelectModal">キャンセル</button>
            <button
              class="px-5 py-2 rounded-lg border-none bg-gradient-to-br from-orange-500 to-pink-500 text-slate-50 text-sm font-medium cursor-pointer hover:opacity-90 transition-opacity disabled:opacity-40 disabled:cursor-not-allowed"
              :disabled="history.length === 0"
              @click="confirmSelect"
            >💪 はげます</button>
          </div>
        </div>
      </div>
    </div>

    <!-- エクスポートモーダル -->
    <div v-if="exportOpen" class="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-[100]" @click.self="exportOpen = false">
      <div class="w-full max-w-[400px] bg-[#1e293b] border border-white/10 rounded-2xl shadow-[0_24px_80px_rgba(0,0,0,0.5)] flex flex-col max-h-[90vh]">
        <div class="flex items-center justify-between px-6 pt-5 pb-4 border-b border-white/[0.08]">
          <h2 class="m-0 text-lg text-slate-50 font-semibold">📤 エクスポート</h2>
          <button class="bg-transparent border-none text-slate-500 text-lg cursor-pointer px-2 py-1 rounded-md hover:text-slate-50 transition-colors" @click="exportOpen = false">✕</button>
        </div>
        <div class="px-4 py-3 overflow-y-auto flex flex-col gap-1 flex-1 [scrollbar-width:thin] [scrollbar-color:rgba(249,115,22,0.3)_transparent]">
          <p class="px-3 text-xs text-slate-500 mb-2">ダウンロードする日付を選択してください</p>
          <label
            v-for="date in exportDates"
            :key="date"
            class="flex items-center gap-3 px-3 py-2.5 rounded-lg cursor-pointer transition-colors"
            :class="exportSelectedDates.includes(date) ? 'bg-orange-500/15' : 'hover:bg-white/[0.05]'"
          >
            <input
              type="checkbox"
              class="w-4 h-4 shrink-0 accent-orange-500 cursor-pointer"
              :checked="exportSelectedDates.includes(date)"
              @change="toggleExportDate(date)"
            />
            <span class="text-sm text-slate-200">{{ date }}</span>
          </label>
        </div>
        <div class="flex justify-end gap-2 px-6 py-4 pb-5 border-t border-white/[0.08]">
          <button class="px-5 py-2 rounded-lg border border-white/15 bg-transparent text-slate-400 text-sm cursor-pointer hover:bg-white/[0.06] hover:text-slate-50 transition-all" @click="exportOpen = false">キャンセル</button>
          <button
            class="px-5 py-2 rounded-lg border-none bg-gradient-to-br from-orange-500 to-pink-500 text-slate-50 text-sm font-medium cursor-pointer hover:opacity-90 transition-opacity disabled:opacity-40 disabled:cursor-not-allowed"
            :disabled="exportSelectedDates.length === 0"
            @click="downloadExport"
          >ダウンロード</button>
        </div>
      </div>
    </div>

    <!-- 出来事の抽出 選択モーダル -->
    <div v-if="momentSelectOpen" class="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-[100]" @click.self="momentSelectOpen = false">
      <div class="w-full max-w-[480px] bg-[#1e293b] border border-white/10 rounded-2xl shadow-[0_24px_80px_rgba(0,0,0,0.5)] flex flex-col max-h-[90vh]">
        <div class="flex items-center justify-between px-6 pt-5 pb-4 border-b border-white/[0.08]">
          <div>
            <h2 class="m-0 text-lg text-slate-50 font-semibold">出来事を抽出</h2>
            <p class="m-0 mt-0.5 text-xs text-slate-500">未抽出の記録を選んであります。作り直すときは全て選択してください</p>
          </div>
          <button class="bg-transparent border-none text-slate-500 text-lg cursor-pointer px-2 py-1 rounded-md hover:text-slate-50 transition-colors" @click="momentSelectOpen = false">✕</button>
        </div>
        <div class="px-4 py-3 overflow-y-auto flex flex-col gap-1 flex-1 [scrollbar-width:thin] [scrollbar-color:rgba(249,115,22,0.3)_transparent]">
          <div v-if="momentSourceItems.length === 0" class="text-center text-slate-600 text-sm py-6">
            要約がありません
          </div>
          <template v-else>
            <label class="flex items-center gap-3 px-3 py-2 rounded-lg cursor-pointer border-b border-white/[0.06] mb-1 hover:bg-white/[0.05] transition-colors">
              <input
                type="checkbox"
                class="w-4 h-4 shrink-0 accent-orange-500 cursor-pointer"
                :checked="momentAllSelected"
                :indeterminate="momentSomeSelected"
                @change="toggleMomentAll"
              />
              <span class="text-xs text-slate-400 font-medium">全て選択</span>
            </label>
            <label
              v-for="item in momentSourceItems"
              :key="item.id"
              class="flex items-center gap-3 px-3 py-2.5 rounded-lg cursor-pointer transition-colors"
              :class="momentSelectedIds.includes(item.id) ? 'bg-orange-500/15' : 'hover:bg-white/[0.05]'"
            >
              <input
                type="checkbox"
                class="w-4 h-4 shrink-0 accent-orange-500 cursor-pointer"
                :checked="momentSelectedIds.includes(item.id)"
                @change="toggleMomentSelect(item.id)"
              />
              <span class="text-xs text-slate-400 whitespace-nowrap">{{ formatSelectDate(item.timestamp) }}</span>
              <span class="text-sm text-slate-200 truncate flex-1">{{ item.title || item.text.slice(0, 40) }}</span>
              <span v-if="!momentProcessedIds.includes(item.id)" class="text-[10px] text-orange-400/80 shrink-0">未</span>
            </label>
          </template>
        </div>
        <div class="flex justify-end gap-2 px-6 py-4 border-t border-white/[0.08]">
          <button class="px-5 py-2 rounded-lg border border-white/15 bg-transparent text-slate-400 text-sm cursor-pointer hover:bg-white/[0.06] hover:text-slate-50 transition-all" @click="momentSelectOpen = false">キャンセル</button>
          <button
            class="px-5 py-2 rounded-lg border-none bg-gradient-to-br from-orange-500 to-pink-500 text-slate-50 text-sm font-medium cursor-pointer hover:opacity-90 transition-opacity disabled:opacity-40 disabled:cursor-not-allowed"
            :disabled="momentSelectedIds.length === 0"
            @click="runMomentGenerate"
          >抽出（{{ momentSelectedIds.length }}件）</button>
        </div>
      </div>
    </div>

    <!-- 選んだ日の出来事（カレンダーの日をタップしたとき） -->
    <div v-if="selectedDay" class="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-[100]" @click.self="selectedDay = null">
      <div class="w-full max-w-[480px] bg-[#1e293b] border border-white/10 rounded-2xl shadow-[0_24px_80px_rgba(0,0,0,0.5)] flex flex-col max-h-[85vh]">
        <div class="flex items-center justify-between px-5 pt-4 pb-3 border-b border-white/[0.08]">
          <div class="flex items-baseline gap-2.5">
            <h2 class="m-0 text-base text-slate-50 font-semibold">{{ selectedDayLabel }}</h2>
            <span class="text-[11px] text-slate-500 tabular-nums">
              <span class="text-amber-300 font-semibold">{{ selectedDayMoments.pos.length }}</span>
              <span class="mx-0.5 text-slate-700">/</span>
              <span class="text-slate-400 font-semibold">{{ selectedDayMoments.neg.length }}</span>
            </span>
          </div>
          <button class="bg-transparent border-none text-slate-500 text-lg cursor-pointer px-2 py-1 rounded-md hover:text-slate-50 transition-colors" @click="selectedDay = null">✕</button>
        </div>

        <div class="px-4 py-2 overflow-y-auto flex-1 flex flex-col [scrollbar-width:thin] [scrollbar-color:rgba(249,115,22,0.3)_transparent]">
          <HagemashiMomentRow
            v-for="m in selectedDayMoments.pos"
            :key="m.id"
            :moment="m"
            :date="momentDate(m)"
            :kinds="MOMENT_KINDS"
            :meta="MOMENT_META"
            @save="applyMomentEdit(m.id, $event)"
            @delete="deletingMomentId = m.id"
          />
          <p v-if="selectedDayMoments.pos.length === 0" class="m-0 py-3 text-xs text-slate-600 text-center">
            この日のポジティブな出来事はありません
          </p>

          <!-- ネガは畳んでおく -->
          <template v-if="selectedDayMoments.neg.length > 0">
            <button
              class="flex items-center gap-1.5 bg-transparent border-none text-[11px] text-slate-500 cursor-pointer py-1.5 hover:text-slate-300 transition-colors self-start"
              @click="showNegativeDetail = !showNegativeDetail"
            >
              <span class="text-[9px] transition-transform duration-200" :style="showNegativeDetail ? 'transform: rotate(90deg)' : ''">▶</span>
              ネガ {{ selectedDayMoments.neg.length }}件
            </button>
            <template v-if="showNegativeDetail">
              <HagemashiMomentRow
                v-for="m in selectedDayMoments.neg"
                :key="m.id"
                :moment="m"
                :date="momentDate(m)"
                :kinds="MOMENT_KINDS"
                :meta="MOMENT_META"
                @save="applyMomentEdit(m.id, $event)"
                @delete="deletingMomentId = m.id"
              />
            </template>
          </template>
        </div>

        <div v-if="selectedDaySources.length" class="px-5 py-2.5 border-t border-white/[0.08] text-[10px] text-slate-600">
          元の記録: {{ selectedDaySources.join(' / ') }}
        </div>
      </div>
    </div>

    <!-- 出来事の削除確認 -->
    <div v-if="deletingMomentId" class="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-[100]" @click.self="deletingMomentId = null">
      <div class="w-full max-w-[300px] bg-[#1e293b] border border-white/10 rounded-2xl shadow-[0_24px_80px_rgba(0,0,0,0.5)] p-6 flex flex-col gap-5">
        <p class="m-0 text-slate-200 text-sm text-center">この出来事を削除しますか？</p>
        <div class="flex justify-center gap-2">
          <button class="px-5 py-2 rounded-lg border border-white/15 bg-transparent text-slate-400 text-sm cursor-pointer hover:bg-white/[0.06] hover:text-slate-50 transition-all" @click="deletingMomentId = null">キャンセル</button>
          <button class="px-5 py-2 rounded-lg border-none bg-red-500/80 text-slate-50 text-sm font-medium cursor-pointer hover:bg-red-500 transition-colors" @click="confirmDeleteMoment">削除</button>
        </div>
      </div>
    </div>

    <!-- 「概要」ボタン押下時のAI分析ポップアップ（①タグ・②単語で絞った出来事が対象） -->
    <HagemashiTopicAnalysisModal
      v-if="showMomentOverview"
      :key="momentOverviewTitle"
      :title="momentOverviewTitle"
      :meta="`${momentOverviewItems.length}件の出来事`"
      :keyword="momentOverviewTitle"
      scope="overview"
      :matched-items="momentOverviewItems"
      @close="showMomentOverview = false"
    />

    <!-- 除外単語モーダル -->
    <div v-if="stoplistOpen" class="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-[100]" @click.self="stoplistOpen = false">
      <div class="w-full max-w-[420px] bg-[#1e293b] border border-white/10 rounded-2xl shadow-[0_24px_80px_rgba(0,0,0,0.5)] flex flex-col max-h-[90vh]">
        <div class="flex items-center justify-between px-6 pt-5 pb-4 border-b border-white/[0.08]">
          <div>
            <h2 class="m-0 text-lg text-slate-50 font-semibold">除外する単語</h2>
            <p class="m-0 mt-0.5 text-xs text-slate-500">分析の「よく出てくる単語」から外す語を管理</p>
          </div>
          <button class="bg-transparent border-none text-slate-500 text-lg cursor-pointer px-2 py-1 rounded-md hover:text-slate-50 transition-colors" @click="stoplistOpen = false">✕</button>
        </div>
        <div class="px-4 py-4 overflow-y-auto flex flex-col gap-3 flex-1 [scrollbar-width:thin] [scrollbar-color:rgba(249,115,22,0.3)_transparent]">
          <div v-if="editingStoplist.length === 0" class="text-center text-slate-600 text-sm py-4">
            除外する単語はまだありません
          </div>
          <div class="flex flex-wrap gap-1.5">
            <div
              v-for="(word, i) in editingStoplist"
              :key="i"
              class="flex items-center gap-1 px-2.5 py-1 rounded-full bg-white/[0.06] border border-white/[0.10] text-sm text-slate-300"
            >
              <span>{{ word }}</span>
              <button class="w-4 h-4 flex items-center justify-center text-slate-500 hover:text-red-400 transition-colors cursor-pointer border-none bg-transparent text-[10px] leading-none" @click="editingStoplist.splice(i, 1)">✕</button>
            </div>
          </div>
          <!-- 手で打たせるより、実際によく出ている語から選べたほうが早い。
               押した語は上の一覧へ移り、この候補からは消える -->
          <div v-if="stopwordCandidates.length > 0" class="pt-2 border-t border-white/[0.06]">
            <p class="m-0 mb-1.5 text-[10px] font-bold text-slate-500 tracking-wide">よく出てくる単語から選ぶ</p>
            <div class="flex flex-wrap gap-1">
              <button
                v-for="w in stopwordCandidates"
                :key="w.word"
                class="px-2 py-[3px] rounded-md text-[11px] border border-white/[0.06] bg-white/[0.02] text-slate-400 cursor-pointer hover:text-slate-200 hover:border-white/[0.12] transition-all"
                @click="editingStoplist.push(w.word)"
              >{{ w.word }} <b class="ml-0.5 tabular-nums font-semibold text-slate-600">{{ w.count }}</b></button>
            </div>
          </div>
          <div class="flex items-center gap-2 pt-1 border-t border-white/[0.06]">
            <input
              v-model="newStopword"
              type="text"
              placeholder="単語を追加..."
              class="flex-1 bg-white/[0.05] border border-white/[0.10] rounded-lg text-slate-200 text-sm px-3 py-2 outline-none focus:border-orange-500 transition-colors font-[inherit]"
              @keydown.enter.prevent="(e) => { if (!e.isComposing) addStopwordInput() }"
            />
            <button
              class="px-3 py-2 rounded-lg border border-white/10 bg-white/[0.04] text-slate-300 text-sm cursor-pointer hover:bg-white/[0.10] transition-colors shrink-0"
              @click="addStopwordInput"
            >追加</button>
          </div>
        </div>
        <div class="flex justify-end gap-2 px-6 py-4 border-t border-white/[0.08]">
          <button class="px-5 py-2 rounded-lg border border-white/15 bg-transparent text-slate-400 text-sm cursor-pointer hover:bg-white/[0.06] hover:text-slate-50 transition-all" @click="stoplistOpen = false">キャンセル</button>
          <button class="px-5 py-2 rounded-lg border-none bg-gradient-to-br from-orange-500 to-pink-500 text-slate-50 text-sm font-medium cursor-pointer hover:opacity-90 transition-opacity" @click="saveStoplistModal">保存して再集計</button>
        </div>
      </div>
    </div>

    <!-- はげまし結果モーダル -->
    <div v-if="encourageOpen" class="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-[100]" @click.self="closeEncourage">
      <div class="w-full max-w-[600px] bg-[#1e293b] border border-white/10 rounded-2xl shadow-[0_24px_80px_rgba(0,0,0,0.5)] flex flex-col max-h-[90vh]">
        <div class="flex items-center justify-between px-6 pt-5 pb-4 border-b border-white/[0.08]">
          <h2 class="m-0 text-lg text-slate-50 font-semibold">💪 はげまし</h2>
          <button class="bg-transparent border-none text-slate-500 text-lg cursor-pointer px-2 py-1 rounded-md hover:text-slate-50 transition-colors" @click="closeEncourage">✕</button>
        </div>
        <div class="px-6 py-5 overflow-y-auto flex flex-col gap-3 flex-1">
          <div v-if="isEncouraging" class="flex items-center justify-center gap-2.5 py-8 text-slate-400 text-sm">
            <span class="w-5 h-5 rounded-full border-2 border-orange-500/30 border-t-orange-500 animate-spin block" />
            はげましを考えています...
          </div>
          <template v-else>
            <!-- 読み上げ（OpenAI TTS）。文章の上に置く -->
            <div class="flex items-center gap-2 flex-wrap">
              <button
                class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-white/15 bg-transparent text-slate-300 text-xs cursor-pointer hover:bg-white/[0.06] hover:text-slate-50 transition-all disabled:opacity-50 disabled:cursor-default"
                :disabled="isSpeechLoading || !encourageResult"
                @click="toggleSpeech"
              >
                <span v-if="isSpeechLoading" class="w-3 h-3 rounded-full border-2 border-orange-500/30 border-t-orange-500 animate-spin block" />
                <span v-else>{{ isSpeaking ? '⏸' : '🔊' }}</span>
                {{ isSpeechLoading ? '音声を準備中...' : isSpeaking ? '一時停止' : '読み上げ' }}
              </button>
              <button
                v-if="!isSpeechLoading && (isSpeaking || speechUrl)"
                class="px-3 py-1.5 rounded-lg border border-white/15 bg-transparent text-slate-400 text-xs cursor-pointer hover:bg-white/[0.06] hover:text-slate-50 transition-all"
                @click="stopSpeech"
              >⏹ 停止</button>
              <span v-if="speechError" class="text-xs text-red-400">{{ speechError }}</span>
            </div>
            <div class="text-[#e2e8f0] text-sm leading-relaxed [&_h1]:text-slate-50 [&_h2]:text-slate-50 [&_h3]:text-slate-50 [&_h2]:text-[15px] [&_h2]:my-4 [&_p]:m-0 [&_p]:mb-2.5 [&_ul]:m-0 [&_ul]:mb-2.5 [&_ul]:pl-5 [&_li]:mb-1 [&_strong]:text-slate-50 [&_strong]:font-semibold [&_hr]:border-none [&_hr]:border-t [&_hr]:border-white/[0.08] [&_hr]:my-3" v-html="parsedResult" />
          </template>
        </div>
        <div class="flex justify-end gap-2 px-6 py-4 pb-5 border-t border-white/[0.08]">
          <button class="px-5 py-2 rounded-lg border border-white/15 bg-transparent text-slate-400 text-sm cursor-pointer hover:bg-white/[0.06] hover:text-slate-50 transition-all" @click="copyResult">{{ resultCopied ? 'コピーしました' : 'コピー' }}</button>
          <button class="px-5 py-2 rounded-lg border-none bg-gradient-to-br from-orange-500 to-pink-500 text-slate-50 text-sm font-medium cursor-pointer hover:opacity-90 transition-opacity" @click="closeEncourage">閉じる</button>
        </div>
        <audio ref="speechAudioEl" class="hidden" preload="none" @ended="isSpeaking = false" @pause="isSpeaking = false" @play="isSpeaking = true" />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ alias: ['/hagemashi', '/hagemashi/'] })
import { ref, computed, onMounted, onBeforeUnmount, watch } from 'vue'
import { marked } from 'marked'

useHead({
  title: import.meta.dev ? '記録 (dev)' : '記録',
  link: [
    { key: 'icon', rel: 'icon', type: 'image/svg+xml', href: `data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>💪</text></svg>` },
    { rel: 'manifest', href: '/manifest-hagemashi.json' },
    { rel: 'apple-touch-icon', href: '/apple-touch-icon-hagemashi.png' },
  ],
  meta: [
    { name: 'apple-mobile-web-app-capable', content: 'yes' },
    { name: 'apple-mobile-web-app-title', content: 'はげまし' },
    { name: 'apple-mobile-web-app-status-bar-style', content: 'black-translucent' },
    { name: 'theme-color', content: '#f97316' },
  ],
})
import { useHistory } from '~/composables/useHistory'
import { useAuth } from '~/composables/useAuth'
import { useAudioRecorder, fetchTitle } from '~/composables/useAudioRecorder'
import { useTranscriptionModel } from '~/composables/useTranscriptionModel'
import { tokenizeUnique } from '~/utils/hagemashi/tokenize'

const $dev = import.meta.dev

const ENCOURAGE_PROMPTS = {
  calm: `あなたは相手のことを深く理解したうえで励ます存在です。以下の観点を踏まえ、的を絞った一言で励ましてください。

- 具体的・事実ベース：話の内容から具体的な事実を拾い、抽象的な激励に終わらせない
- 論理的根拠あり：なぜそれが強みや前進なのか、筋道を立てて示す
- 意外性・新しい切り口：本人がまだ気づいていない視点や解釈を提示する
- 深い文脈理解：その人の状況・背景を理解していることが伝わる言葉を選ぶ
- 量を絞る：あれもこれも言わず、最も刺さる一点に集中する
- 自己一致感：薄々感じていたことを言語化し「そうそう、それだ」と思わせる
- 差分・成長の可視化：以前と比べてどう変わったか、何が積み上がっているかを示す`,
  loud: `あなたは相手のことを「恥ずかしくなるほど大げさに」褒めまくる存在です。話の内容を踏まえたうえで、全力で称え尽くしてください。

- 感嘆符を惜しまない：！！！を多用し、テンションをMaxにする
- 神話・伝説レベルの表現：「神か！！」「天才！！！」「こんな人間が存在していいのか！？」「伝説誕生！！」など大げさな言葉を使う
- 大袈裟な影響を語る：「世界が泣いています」「今すぐ表彰台へ」「人類の可能性を証明した」のような、明らかに大げさな称賛
- 具体的に引用して褒める：話の内容から具体的な事実を拾い、「あの○○が！！信じられない！！」と絶賛する
- 照れるほど褒める：読んだ本人が恥ずかしくなって「やめてよ〜！笑」と言いたくなるくらい大げさに
- 最後は必ず最大限の感謝や称賛で締める：「存在してくれてありがとう！！」「ブラボー！！！！」など`,
}

const error = ref('')
const recordConfirmOpen = ref(false)
const textInputOpen = ref(false)
const { transcriptionModel } = useTranscriptionModel()
const modelModalOpen = ref(false)
const textInputValue = ref('')
const isSubmittingText = ref(false)
const showSettingsMenu = ref(false)
const selectOpen = ref(false)
const encourageOpen = ref(false)
const encourageConfirmOpen = ref(false)
const encourageTargetId = ref<string | null>(null)
const encourageResult = ref('')
const exportOpen = ref(false)
const exportSelectedDates = ref<string[]>([])
const resultCopied = ref(false)
const isEncouraging = ref(false)
type RecordingTab = 'transcription' | 'calendar' | 'moments'
type TabKey = 'consult' | RecordingTab
// ?tab= で指定を受け付けるタブ。ここに無いキーは無視され「記録」に落ちる。
// （consult はタブバーではなくボタンから開くので残す）
const TAB_KEYS: TabKey[] = ['transcription', 'calendar', 'moments', 'consult']

// 記録タブ内の表示切り替え（記録 / はげまし）
const recordView = ref<'record' | 'encourage'>('record')

// URL クエリ（?tab=）とタブ状態を双方向同期する
const route = useRoute()
const router = useRouter()
const routeTab = () => {
  const t = route.query.tab
  return typeof t === 'string' && (TAB_KEYS as string[]).includes(t) ? (t as TabKey) : null
}
const activeTab = ref<TabKey>(routeTab() ?? 'transcription')

watch(activeTab, (v) => {
  if (route.query.tab !== v) router.replace({ query: { ...route.query, tab: v } })
})
watch(() => route.query.tab, () => {
  const t = routeTab()
  if (t && t !== activeTab.value) activeTab.value = t
})

// タブバーに並べるタブ（TAB_KEYS と歩調を合わせること）
const primaryTabs: { key: RecordingTab; label: string; short: string }[] = [
  { key: 'transcription', label: '記録', short: '記録' },
  { key: 'calendar', label: 'カレンダー', short: 'カレンダー' },
  { key: 'moments', label: '分析', short: '分析' },
]
const isRecordingTab = computed(() => primaryTabs.some(t => t.key === activeTab.value))
function openRecording() {
  if (!isRecordingTab.value) activeTab.value = 'transcription'
}
function confirmStartRecording() {
  recordConfirmOpen.value = false
  openRecording()
  startRecording()
}
function openTextInput() {
  recordConfirmOpen.value = false
  openRecording()
  textInputValue.value = ''
  textInputOpen.value = true
}
function closeTextInput() {
  if (isSubmittingText.value) return
  textInputOpen.value = false
}
async function submitTextInput() {
  const text = textInputValue.value.trim()
  if (!text || isSubmittingText.value) return
  isSubmittingText.value = true
  try {
    await handleTranscribed(text)
    textInputOpen.value = false
  } finally {
    isSubmittingText.value = false
  }
}
const charLimit = ref(1000)
const encourageStyle = ref<'calm' | 'loud'>('loud')

// --- ログ（記録・相談の利用回数） ---
const logOpen = ref(false)
const consultDates = ref<string[]>([])
const recordDates = computed(() => history.value.map(h => h.timestamp))

// 相談チャットの発言（ConsultChat から常時ミラーされる。中間データへの取り込みに使う）
interface ConsultMessage { role: 'user' | 'assistant'; content: string; timestamp?: string }
const consultMessages = ref<ConsultMessage[]>([])

const LS_DICTIONARY = 'hagemashi-dictionary'
// 旧「達成リスト」。出来事への移行元として読むだけで、もう書き込まない
const LS_ACHIEVEMENTS = 'hagemashi-achievements'
const LS_MOMENTS = 'hagemashi-moments'

interface DictionaryEntry { yomi: string; word: string }
const dictionary = ref<DictionaryEntry[]>([])
const dictionaryOpen = ref(false)
const editingDictionary = ref<DictionaryEntry[]>([])

watch(dictionaryOpen, (open) => {
  if (open) editingDictionary.value = dictionary.value.map(e => ({ ...e }))
})

async function saveDictionary() {
  const entries = editingDictionary.value.filter(e => e.yomi && e.word)
  dictionary.value = entries
  if ($dev) {
    localStorage.setItem(LS_DICTIONARY, JSON.stringify(entries))
  } else {
    await $fetch('/api/hagemashi/dictionary', { method: 'POST', body: { entries } }).catch(console.error)
  }
  dictionaryOpen.value = false
}

const LS_VISION = 'hagemashi-vision'
const vision = ref('')
const visionOpen = ref(false)
const editingVisionText = ref('')
const isVisionSaving = ref(false)
const visionAutoPrompted = ref(false)

function openVisionModal() {
  editingVisionText.value = vision.value
  visionOpen.value = true
}

function closeVisionModal() {
  visionOpen.value = false
}

async function saveVision() {
  if (isVisionSaving.value) return
  isVisionSaving.value = true
  try {
    const text = editingVisionText.value.trim()
    if ($dev) {
      localStorage.setItem(LS_VISION, JSON.stringify(text))
    } else {
      await $fetch('/api/hagemashi/vision', { method: 'POST', body: { vision: text } })
    }
    vision.value = text
    visionOpen.value = false
  } catch (e) {
    console.error(e)
  } finally {
    isVisionSaving.value = false
  }
}

// ビジョン未設定の場合、初回表示時に入力ポップアップを出す
function maybeAutoPromptVision() {
  if (visionAutoPrompted.value || vision.value) return
  visionAutoPrompted.value = true
  openVisionModal()
}

function getWhisperPrompt(): string {
  return dictionary.value.map(e => e.word).filter(Boolean).join(', ')
}

function applyDictionary(text: string): string {
  let result = text
  for (const { yomi, word } of dictionary.value) {
    if (yomi && word) result = result.replaceAll(yomi, word)
  }
  return result
}

// 旧「達成リスト」。いまは読み込み専用で、出来事（Moment）への移行元としてのみ使う
interface Achievement { id: string; sourceId: string; date: string; text: string; level: number }
const achievements = ref<Achievement[]>([])

// --- 出来事（Moment）の型と state ---
// 記録の中間データから「その日にあったこと」を1件ずつ抜き出し、タグと大きさ（impact）を付けて貯める。
// 旧・達成リストの一般化で、達成以外のタグもネガも同じ形で扱う。
// state をここに置いているのは、下の isLoggedIn の immediate watch から参照されるため。
type MomentKind = '達成' | '感謝' | '喜び' | 'しんどさ' | '不安'
const MOMENT_KINDS: MomentKind[] = ['達成', '感謝', '喜び', 'しんどさ', '不安']
// polarity は kind から一意に決まるので保存はせず、ここから引く
// branch は単語チップ（第2階層）へ伸ばす枝線の色。タグごとの色を引き継いで入れ子を示す
const MOMENT_META: Record<MomentKind, { polarity: 'pos' | 'neg'; chip: string; star: string; dot: string; branch: string }> = {
  '達成': { polarity: 'pos', chip: 'border-amber-400/30 bg-amber-400/15 text-amber-300', star: 'text-amber-400', dot: 'bg-amber-400', branch: 'border-amber-400/40' },
  '感謝': { polarity: 'pos', chip: 'border-pink-400/30 bg-pink-400/15 text-pink-300', star: 'text-pink-400', dot: 'bg-pink-400', branch: 'border-pink-400/40' },
  '喜び': { polarity: 'pos', chip: 'border-emerald-400/30 bg-emerald-400/15 text-emerald-300', star: 'text-emerald-400', dot: 'bg-emerald-400', branch: 'border-emerald-400/40' },
  'しんどさ': { polarity: 'neg', chip: 'border-slate-400/25 bg-slate-400/10 text-slate-300', star: 'text-slate-400', dot: 'bg-slate-500', branch: 'border-slate-400/35' },
  '不安': { polarity: 'neg', chip: 'border-slate-400/25 bg-slate-400/10 text-slate-300', star: 'text-slate-400', dot: 'bg-slate-500', branch: 'border-slate-400/35' },
}
interface Moment {
  id: string
  sourceId: string
  sourceType: 'record'
  ts: string
  kind: MomentKind
  text: string
  impact: number
  who?: string
  // 手で直した項目。再生成時にAI出力で上書きしないための印
  edited?: { text?: boolean; impact?: boolean; kind?: boolean }
  createdAt: string
  updatedAt: string
}
const moments = ref<Moment[]>([])
// 一度でも抽出を実行した記録のid（出来事が0件だった記録も含む）。差分実行の基準
const momentProcessedIds = ref<string[]>([])
const momentsMigrated = ref(false)
// 出来事の読み込みが済んだか。旧・達成リストの移行を history 到着まで待たせるために使う
const momentsLoaded = ref(false)
const LS_STOPLIST = 'hagemashi-stoplist'
const DEFAULT_STOPLIST = ['今日', '自分', '本当', '非常', '最近', '昨日', '意味', '結構', '頑張', '一緒', '面白', '大事', '普通', '必要', '部分', '話聞', '最後']
const stoplist = ref<string[]>([...DEFAULT_STOPLIST])
const stoplistSet = computed(() => new Set(stoplist.value))
const stoplistOpen = ref(false)
const editingStoplist = ref<string[]>([])
const newStopword = ref('')

watch(stoplistOpen, (open) => {
  if (open) { editingStoplist.value = [...stoplist.value]; newStopword.value = '' }
})

function saveStoplist() {
  if ($dev) {
    localStorage.setItem(LS_STOPLIST, JSON.stringify(stoplist.value))
  } else {
    $fetch('/api/hagemashi/stoplist', { method: 'POST', body: { words: stoplist.value } }).catch(console.error)
  }
}

function saveStoplistModal() {
  stoplist.value = editingStoplist.value.filter(w => w.trim())
  // いま絞り込みに使っている単語を除外すると、チップは消えるのに絞り込みだけが
  // 残って「なぜこの数なのか」が分からなくなるので外す
  if (momentWordFilter.value && stoplistSet.value.has(momentWordFilter.value)) momentWordFilter.value = null
  saveStoplist()
  stoplistOpen.value = false
}

function addStopwordInput() {
  const w = newStopword.value.trim()
  if (w && !editingStoplist.value.includes(w)) {
    editingStoplist.value.push(w)
    newStopword.value = ''
  }
}

const { isLoggedIn, checked, checkAuth, logout } = useAuth()
const passwordModalOpen = ref(false)

if (!$dev) {
  onMounted(checkAuth)
}

const { history, copiedHistoryId, addHistory, updateHistoryNotes, updateHistoryTitle, deleteHistory, copyHistory, loadHistory } = useHistory('hagemashi-history', 'hagemashi')
const {
  history: encourageHistory,
  copiedHistoryId: copiedEncourageId,
  addHistory: addEncourageHistory,
  updateHistoryTitle: updateEncourageHistoryTitle,
  deleteHistory: deleteEncourageHistory,
  copyHistory: copyEncourageHistory,
} = useHistory('hagemashi-encourage-history', 'hagemashi-encourage')

onMounted(() => {
  if ($dev) {
    const storedStoplist = localStorage.getItem(LS_STOPLIST)
    if (storedStoplist) {
      try { stoplist.value = JSON.parse(storedStoplist) } catch {}
    }
  }
  if ($dev) {
    const storedDict = localStorage.getItem(LS_DICTIONARY)
    if (storedDict) {
      try { dictionary.value = JSON.parse(storedDict) } catch {}
    }
  }
  if ($dev) {
    const cachedAch = localStorage.getItem(LS_ACHIEVEMENTS)
    if (cachedAch) {
      try {
        const raw = JSON.parse(cachedAch)
        achievements.value = Array.isArray(raw) ? raw : []
      } catch {}
    }
  }
  if ($dev) {
    const cachedMoments = localStorage.getItem(LS_MOMENTS)
    if (cachedMoments) {
      try {
        const raw = JSON.parse(cachedMoments)
        moments.value = Array.isArray(raw.items) ? raw.items : []
        momentProcessedIds.value = Array.isArray(raw.processedIds) ? raw.processedIds : []
        momentsMigrated.value = !!raw.migratedAchievements
      } catch {}
    }
    momentsLoaded.value = true
  }
  if ($dev) {
    const storedVision = localStorage.getItem(LS_VISION)
    if (storedVision) {
      try { vision.value = JSON.parse(storedVision) } catch {}
    }
    maybeAutoPromptVision()
  }
})

if (!$dev) {
  watch(
    isLoggedIn,
    async (loggedIn) => {
      if (!loggedIn) { dictionary.value = []; achievements.value = []; moments.value = []; momentProcessedIds.value = []; momentsMigrated.value = false; stoplist.value = [...DEFAULT_STOPLIST]; vision.value = ''; return }
      const [dict, sl, ach, mom, vis] = await Promise.allSettled([
        $fetch<DictionaryEntry[]>('/api/hagemashi/dictionary'),
        $fetch<string[]>('/api/hagemashi/stoplist'),
        $fetch<Achievement[]>('/api/hagemashi/achievements'),
        $fetch<{ items: Moment[]; processedIds: string[]; migratedAchievements: boolean }>('/api/hagemashi/moments'),
        $fetch<string>('/api/hagemashi/vision'),
      ])
      dictionary.value = dict.status === 'fulfilled' ? dict.value : []
      stoplist.value = (sl.status === 'fulfilled' && sl.value.length > 0) ? sl.value : [...DEFAULT_STOPLIST]
      achievements.value = ach.status === 'fulfilled' && Array.isArray(ach.value) ? ach.value : []
      moments.value = mom.status === 'fulfilled' ? (mom.value?.items ?? []) : []
      momentProcessedIds.value = mom.status === 'fulfilled' ? (mom.value?.processedIds ?? []) : []
      momentsMigrated.value = mom.status === 'fulfilled' ? !!mom.value?.migratedAchievements : false
      momentsLoaded.value = mom.status === 'fulfilled'
      vision.value = vis.status === 'fulfilled' ? (vis.value || '') : ''
      maybeAutoPromptVision()
    },
    { immediate: true }
  )
}

const parsedResult = computed(() => marked.parse(encourageResult.value || '') as string)

// --- はげまし文の読み上げ（OpenAI TTS） ---
// iOS Safari は fetch を挟むと play() がジェスチャー外とみなされてブロックされるため、
// クリック直後にこの無音を鳴らして <audio> を解錠しておき、音声が届いたら src を差し替える。
const SILENT_WAV = 'data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQAAAAA='

const speechAudioEl = ref<HTMLAudioElement | null>(null)
const speechUrl = ref('')        // 生成済み音声の Blob URL
const speechTextCache = ref('')  // その音声を作ったときの本文（同じ文章なら作り直さない）
const isSpeechLoading = ref(false)
const isSpeaking = ref(false)
const speechError = ref('')

const releaseSpeech = () => {
  const el = speechAudioEl.value
  if (el) {
    el.pause()
    el.removeAttribute('src')
    el.load()
  }
  if (speechUrl.value) URL.revokeObjectURL(speechUrl.value)
  speechUrl.value = ''
  speechTextCache.value = ''
  isSpeaking.value = false
  isSpeechLoading.value = false
  speechError.value = ''
}

const stopSpeech = () => {
  const el = speechAudioEl.value
  if (!el) return
  el.pause()
  el.currentTime = 0
  isSpeaking.value = false
}

const toggleSpeech = async () => {
  const el = speechAudioEl.value
  const text = encourageResult.value
  if (!el || !text || isSpeechLoading.value) return
  speechError.value = ''

  if (isSpeaking.value) {
    el.pause()
    return
  }

  // 生成済み（同じ本文）ならそのまま再生
  if (speechUrl.value && speechTextCache.value === text) {
    await el.play().catch(() => { speechError.value = '再生できませんでした' })
    return
  }

  // ジェスチャーが生きているうちに解錠しておく
  el.src = SILENT_WAV
  el.play().catch(() => {})

  isSpeechLoading.value = true
  try {
    const blob = await $fetch<Blob>('/api/hagemashi/speech', {
      method: 'POST',
      body: { text },
      responseType: 'blob',
    })
    if (speechUrl.value) URL.revokeObjectURL(speechUrl.value)
    speechUrl.value = URL.createObjectURL(blob)
    speechTextCache.value = text
    el.src = speechUrl.value
    await el.play()
  } catch (err) {
    console.error(err)
    speechError.value = await speechErrorMessage(err)
  } finally {
    isSpeechLoading.value = false
  }
}

// responseType: 'blob' で投げているためエラー本文も Blob で返る。中身の statusMessage を取り出す
const speechErrorMessage = async (err: unknown): Promise<string> => {
  const data = (err as { data?: unknown })?.data
  if (data instanceof Blob) {
    try {
      const json = JSON.parse(await data.text())
      if (json?.statusMessage || json?.message) return json.statusMessage || json.message
    } catch { /* JSON でなければ既定メッセージ */ }
  }
  return '読み上げに失敗しました'
}

const closeEncourage = () => {
  releaseSpeech()
  encourageOpen.value = false
}

onBeforeUnmount(() => {
  if (speechUrl.value) URL.revokeObjectURL(speechUrl.value)
})

// --- エクスポート ---
const formatExportDate = (iso: string): string => {
  const d = toJSTDate(iso)
  return `${d.getUTCFullYear()}/${d.getUTCMonth() + 1}/${d.getUTCDate()}`
}

const exportDates = computed(() => {
  const seen = new Set<string>()
  const dates: string[] = []
  for (const item of history.value) {
    const d = formatExportDate(item.timestamp)
    if (!seen.has(d)) { seen.add(d); dates.push(d) }
  }
  return dates
})

function openExportModal() {
  const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000
  const recentDates = new Set<string>()
  for (const item of history.value) {
    if (new Date(item.timestamp).getTime() >= oneDayAgo) {
      recentDates.add(formatExportDate(item.timestamp))
    }
  }
  if (recentDates.size === 0 && history.value.length > 0) {
    recentDates.add(formatExportDate(history.value[0].timestamp))
  }
  exportSelectedDates.value = [...recentDates]
  exportOpen.value = true
}

function toggleExportDate(date: string) {
  const idx = exportSelectedDates.value.indexOf(date)
  if (idx === -1) exportSelectedDates.value.push(date)
  else exportSelectedDates.value.splice(idx, 1)
}

function downloadExport() {
  const grouped = new Map<string, string[]>()
  for (const item of history.value) {
    const dateKey = formatExportDate(item.timestamp)
    if (!exportSelectedDates.value.includes(dateKey)) continue
    if (!grouped.has(dateKey)) grouped.set(dateKey, [])
    grouped.get(dateKey)!.push(item.text)
  }
  const content = exportDates.value
    .filter(d => grouped.has(d))
    .map(d => `${d}\n${grouped.get(d)!.join('\n\n')}`)
    .join('\n\n')
  const blob = new Blob([content], { type: 'text/plain;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = 'output.txt'
  a.click()
  URL.revokeObjectURL(url)
  exportOpen.value = false
}

// --- 履歴選択モーダル ---
const closeSelectModal = () => {
  selectOpen.value = false
}

// 記録直後の「はげましますか？」確認。はいならはげまし設定ポップアップへ、いいえならそのまま閉じる
// （いずれの場合も表示中のタブは切り替えない）
const acceptEncourage = () => {
  encourageConfirmOpen.value = false
  selectOpen.value = true
}

const declineEncourage = () => {
  encourageConfirmOpen.value = false
  encourageTargetId.value = null
}

const confirmSelect = () => {
  selectOpen.value = false
  runEncourage()
}

const formatSelectDate = (iso: string): string => {
  const d = toJSTDate(iso)
  const mo = String(d.getUTCMonth() + 1).padStart(2, '0')
  const day = String(d.getUTCDate()).padStart(2, '0')
  const h = String(d.getUTCHours()).padStart(2, '0')
  const mi = String(d.getUTCMinutes()).padStart(2, '0')
  return `${mo}/${day} ${h}:${mi}`
}

const fetchEncourageTitle = async (text: string): Promise<string> => {
  try {
    const res = await $fetch<{ title: string }>('/api/hagemashi/title', { method: 'POST', body: { text } })
    return res.title
  } catch {
    return ''
  }
}

// --- はげまし実行 ---
const runEncourage = async () => {
  const target = history.value.find(item => item.id === encourageTargetId.value) ?? history.value[0]
  if (!target) return
  const texts = [getNotesText(target)]
  releaseSpeech()
  encourageResult.value = ''
  encourageOpen.value = true
  isEncouraging.value = true
  try {
    const res = await $fetch<{ result: string }>('/api/hagemashi/encourage', {
      method: 'POST',
      body: {
        texts,
        encouragePrompt: ENCOURAGE_PROMPTS[encourageStyle.value],
        charLimit: charLimit.value,
        vision: vision.value,
      },
    })
    encourageResult.value = res.result
    const title = await fetchEncourageTitle(res.result)
    addEncourageHistory(res.result, title)
  } catch (err) {
    encourageResult.value = err instanceof Error ? err.message : 'はげましの生成に失敗しました'
  } finally {
    isEncouraging.value = false
  }
}

const copyResult = async () => {
  await navigator.clipboard.writeText(encourageResult.value)
  resultCopied.value = true
  setTimeout(() => { resultCopied.value = false }, 2000)
}

// --- 中間データ ---
interface SummaryNoteItem { sentiment: 'ポジ' | 'ネガ'; text: string }
interface SummaryNoteNew { items: SummaryNoteItem[] }
interface SummaryNoteOld { sentiment: 'ポジ' | 'ネガ'; text: string }

const parseSummaryNote = (notes: string | undefined): SummaryNoteNew | SummaryNoteOld | null => {
  if (!notes) return null
  try {
    const parsed = JSON.parse(notes)
    if (Array.isArray(parsed.items)) return { items: parsed.items }
    if (parsed.text) return { sentiment: parsed.sentiment ?? 'ポジ', text: parsed.text }
  } catch {}
  return null
}

interface SummaryRow { id: string; ts: number; date: string; fullDate: string; sentiment: 'ポジ' | 'ネガ'; text: string; itemIndex: number | null }

const summaryRows = computed(() => {
  const rows: SummaryRow[] = []
  for (const item of history.value) {
    const parsed = parseSummaryNote(item.notes)
    if (!parsed) continue
    const d = toJSTDate(item.timestamp)
    const ts = d.getTime()
    const date = `${String(d.getUTCMonth() + 1).padStart(2, '0')}/${String(d.getUTCDate()).padStart(2, '0')}`
    const fullDate = `${d.getUTCFullYear()}/${d.getUTCMonth() + 1}/${d.getUTCDate()}`
    if ('items' in parsed) {
      for (let i = 0; i < parsed.items.length; i++) {
        const n = parsed.items[i]
        if (n.text) rows.push({ id: item.id, ts, date, fullDate, sentiment: n.sentiment, text: n.text, itemIndex: i })
      }
    } else {
      rows.push({ id: item.id, ts, date, fullDate, sentiment: parsed.sentiment, text: parsed.text, itemIndex: null })
    }
  }
  return rows
})

// 相談のユーザー発言も中間データに取り込む（AI分析の入力にのみ使う。
// 中間データタブの一覧・編集・削除の対象は history 由来の summaryRows のままにする＝
// consult は元データ側（相談タブ）を編集・削除すれば自動的にここからも消える）
const combinedSummaryRows = computed(() => {
  const consultRows: SummaryRow[] = consultMessages.value
    .filter(m => m.role === 'user' && m.timestamp && m.content.trim())
    .map((m, i) => {
      const d = toJSTDate(m.timestamp!)
      return {
        id: `consult-${i}`,
        ts: d.getTime(),
        date: `${String(d.getUTCMonth() + 1).padStart(2, '0')}/${String(d.getUTCDate()).padStart(2, '0')}`,
        fullDate: `${d.getUTCFullYear()}/${d.getUTCMonth() + 1}/${d.getUTCDate()}`,
        sentiment: 'ポジ' as const,
        text: m.content.trim(),
        itemIndex: null,
      }
    })

  // ts 降順（新しい順）に統一する。summaryRows 単体では history の並び順に依存していたが、
  // consult を混ぜるとその前提が崩れるため、ここで明示的にソートする
  return [...summaryRows.value, ...consultRows].sort((a, b) => b.ts - a.ts)
})

// 相談チャットに渡す直近30件（combinedSummaryRows は新しい順）
const recentSummaryItems = computed(() =>
  combinedSummaryRows.value.slice(0, 30).map(r => ({ sentiment: r.sentiment, text: r.text, date: r.date }))
)

const getNotesText = (item: { text: string; notes?: string }): string => {
  const parsed = parseSummaryNote(item.notes)
  if (!parsed) return item.text
  if ('items' in parsed) return parsed.items.map(n => n.text).join('\n')
  return parsed.text
}

const fetchSummary = async (text: string): Promise<string> => {
  try {
    const res = await $fetch<{ notes: string }>('/api/hagemashi/summary', { method: 'POST', body: { text } })
    return res.notes
  } catch {
    return ''
  }
}

// --- 出来事（Moment） ---
const isGeneratingMoments = ref(false)
const momentStatus = ref('')
const momentSelectOpen = ref(false)
const momentSelectedIds = ref<string[]>([])
const deletingMomentId = ref<string | null>(null)
const momentKindFilter = ref<MomentKind | null>(null)
// 第2階層の絞り込み。タグ（第1階層）の中でよく出てくる単語
const momentWordFilter = ref<string | null>(null)

// 一覧の並び替え。日付（ts）と星（impact）の2軸
type MomentSortKey = 'date' | 'impact'
const MOMENT_SORTS: { key: MomentSortKey; label: string; desc: string; asc: string }[] = [
  { key: 'date', label: '日付', desc: '新しい順', asc: '古い順' },
  { key: 'impact', label: '星', desc: '多い順', asc: '少ない順' },
]
const momentSortKey = ref<MomentSortKey>('date')
const momentSortDesc = ref(true)
// 軸を変えたときは必ず降順（新しい順・多い順）から始める。前の軸の向きを引き継ぐと
// 「星」を押した瞬間に星1の行が並ぶことになり、押し間違いに見える
const toggleMomentSort = (key: MomentSortKey) => {
  if (momentSortKey.value === key) momentSortDesc.value = !momentSortDesc.value
  else { momentSortKey.value = key; momentSortDesc.value = true }
}

// 中間データを持つ履歴のみ抽出の対象
const momentSourceItems = computed(() => history.value.filter(i => parseSummaryNote(i.notes)))
// まだ一度も抽出していない記録。「更新」はここだけを既定の対象にする（差分実行）
const unprocessedSourceItems = computed(() =>
  momentSourceItems.value.filter(i => !momentProcessedIds.value.includes(i.id)),
)

const momentDate = (m: Moment): string => {
  const d = toJSTDate(m.ts)
  return `${String(d.getUTCMonth() + 1).padStart(2, '0')}/${String(d.getUTCDate()).padStart(2, '0')}`
}
// AI分析（topic-summary）に渡す用の年月日つきフォーマット。表示用の momentDate とは別に持つ
const momentFullDate = (m: Moment): string => {
  const d = toJSTDate(m.ts)
  return `${d.getUTCFullYear()}/${d.getUTCMonth() + 1}/${d.getUTCDate()}`
}

// 履歴順（新しい順）に並べた全出来事。元の記録が消えているものはここで落ちるので、
// 絞り込みチップの件数もこれを基準にする（moments をそのまま数えると表示と数が食い違う）
const momentBaseRows = computed(() => {
  const bySource = new Map<string, Moment[]>()
  for (const m of moments.value) {
    if (!bySource.has(m.sourceId)) bySource.set(m.sourceId, [])
    bySource.get(m.sourceId)!.push(m)
  }
  const rows: Moment[] = []
  for (const item of history.value) {
    const list = bySource.get(item.id)
    if (list) rows.push(...list)
  }
  return rows
})

const momentCounts = computed(() => {
  const counts = Object.fromEntries(MOMENT_KINDS.map(k => [k, 0])) as Record<MomentKind, number>
  for (const m of momentBaseRows.value) if (counts[m.kind] !== undefined) counts[m.kind]++
  return counts
})

// 出来事1件に含まれる単語。分割結果は保存せず、表示のたびにここで作る。
// text の純粋な関数なので保存するとキャッシュの二重管理になり、tokenize.ts を直したときに
// 古い分割が残ってしまう。600件で3.4ms、しかも下の computed がキャッシュするので保存の利が無い
const momentWordsOf = (m: Moment): string[] => tokenizeUnique(m.text)

// 除外する単語モーダルの候補。②の単語チップと同じ数え方（1件の中に同じ語が
// 2回出ても1）で、まだ除外していない語だけを多い順に出す。
// 除外の判断材料は「いまどの語がよく出ているか」なので、母集団はタグで絞らない全件
const stopwordCandidates = computed(() => {
  const freq = new Map<string, number>()
  for (const m of momentBaseRows.value) {
    for (const w of momentWordsOf(m)) freq.set(w, (freq.get(w) ?? 0) + 1)
  }
  return [...freq.entries()]
    .filter(([word, count]) => count >= 2 && !editingStoplist.value.includes(word))
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, 24)
    .map(([word, count]) => ({ word, count }))
})

// タグで絞った範囲の出来事（単語チップの母集団）。単語で絞ってもチップの顔ぶれが
// 変わらないよう、単語の絞り込みはここには効かせない
const momentKindRows = computed(() =>
  momentKindFilter.value
    ? momentBaseRows.value.filter(m => m.kind === momentKindFilter.value)
    : momentBaseRows.value,
)

// 第2階層の単語チップ（上位10件）。件数は「その単語を含む出来事の数」＝押したときに
// 並ぶ行数になるよう、同じ出来事の中に同じ語が2回出ても1と数える。
// 1件しか無い単語はまとまりとして意味を持たないので落とす
const momentWordChips = computed(() => {
  const freq = new Map<string, number>()
  for (const m of momentKindRows.value) {
    for (const w of momentWordsOf(m)) {
      if (stoplistSet.value.has(w)) continue
      freq.set(w, (freq.get(w) ?? 0) + 1)
    }
  }
  return [...freq.entries()]
    .filter(([, count]) => count >= 2)
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, 10)
    .map(([word, count]) => ({ word, count }))
})

// 単語チップは親のタグの色を引き継ぐ（どのタグの下にいるかを色で示す）
const momentWordActiveClass = computed(() =>
  momentKindFilter.value
    ? MOMENT_META[momentKindFilter.value].chip
    : 'border-orange-500/60 bg-orange-500/15 text-orange-300',
)
const momentWordBranchClass = computed(() =>
  momentKindFilter.value ? MOMENT_META[momentKindFilter.value].branch : 'border-orange-500/35',
)
const momentWordLabelClass = computed(() =>
  momentKindFilter.value ? MOMENT_META[momentKindFilter.value].star : 'text-orange-400/80',
)

// タグを変えると単語の顔ぶれも変わる。前の単語で絞ったままだと0件になりやすいので外す
watch(momentKindFilter, () => { momentWordFilter.value = null })

// 「すべて」はネガも含めた全件（チップの件数と実際に並ぶ行数を必ず一致させる）。
// ネガは MomentRow 側で薄く描かれるので、混ざっても圧迫感は出ない
// 並び替えは絞り込みの後。sort は破壊的なので必ず複製してから並べる
// （momentKindRows はタグ未選択のとき momentBaseRows をそのまま返すので、
//   その場で並べるとカレンダー側が参照している並びまで書き換わってしまう）
const momentRows = computed(() => {
  const word = momentWordFilter.value
  const rows = word
    ? momentKindRows.value.filter(m => momentWordsOf(m).includes(word))
    : [...momentKindRows.value]
  const dir = momentSortDesc.value ? -1 : 1
  const timeOf = (m: Moment) => toJSTDate(m.ts).getTime()
  return rows.sort((a, b) => {
    if (momentSortKey.value === 'impact') {
      if (a.impact !== b.impact) return (a.impact - b.impact) * dir
      // 星が同じときは向きに関わらず新しい順。同点の中で古い記録が上に来ると探しにくい
      return timeOf(b) - timeOf(a)
    }
    // 同じ記録から抜いた出来事は ts が同値。sort は安定なので抽出順のまま残る
    return (timeOf(a) - timeOf(b)) * dir
  })
})

// 「概要」ボタン用。①タグ・②単語で絞った出来事を対象に、並び替えの影響を受けず
// 常に古い→新しい順でAIへ渡す（サーバー側が時系列3区分に分けて読むため）
const showMomentOverview = ref(false)
const momentOverviewTitle = computed(() => {
  const tag = momentKindFilter.value ?? 'すべて'
  return momentWordFilter.value ? `${tag} × ${momentWordFilter.value}` : tag
})
const momentOverviewItems = computed(() => {
  const word = momentWordFilter.value
  const rows = word
    ? momentKindRows.value.filter(m => momentWordsOf(m).includes(word))
    : momentKindRows.value
  return [...rows]
    .sort((a, b) => toJSTDate(a.ts).getTime() - toJSTDate(b.ts).getTime())
    .map(m => ({ date: momentFullDate(m), text: m.text }))
})

// 相談（ConsultChat）へ渡す達成の文脈。プロンプト側の形（text/level/date）に合わせて変換する
const consultAchievements = computed(() =>
  momentBaseRows.value
    .filter(m => m.kind === '達成')
    .map(m => ({ text: m.text, level: m.impact, date: momentDate(m) })),
)

const isEditedMoment = (m: Moment): boolean => !!(m.edited?.text || m.edited?.impact || m.edited?.kind)

function saveMoments() {
  const payload = {
    items: moments.value,
    processedIds: momentProcessedIds.value,
    migratedAchievements: momentsMigrated.value,
  }
  if ($dev) {
    localStorage.setItem(LS_MOMENTS, JSON.stringify(payload))
  } else {
    $fetch('/api/hagemashi/moments', { method: 'POST', body: payload }).catch(console.error)
  }
}

// 旧「達成リスト」を1度だけ出来事へ取り込む。
// 取り込んだ分は edited を立てない＝その記録に抽出をかけると、より細かいタグ付きの結果に置き換わる。
// 元記録を processedIds には入れないので、感謝・喜び・ネガは後から拾い直せる。
function migrateAchievementsToMoments() {
  if (momentsMigrated.value || achievements.value.length === 0) return
  const existing = new Set(moments.value.map(m => `${m.sourceId}:${m.text}`))
  const now = new Date().toISOString()
  const added: Moment[] = []
  for (const a of achievements.value) {
    if (existing.has(`${a.sourceId}:${a.text}`)) continue
    const item = history.value.find(h => h.id === a.sourceId)
    added.push({
      id: `${a.sourceId}-mig-${Math.random().toString(36).slice(2, 8)}`,
      sourceId: a.sourceId,
      sourceType: 'record',
      ts: item?.timestamp ?? now,
      kind: '達成',
      text: a.text,
      impact: Math.min(5, Math.max(1, a.level || 1)),
      createdAt: now,
      updatedAt: now,
    })
  }
  moments.value = [...moments.value, ...added]
  momentsMigrated.value = true
  saveMoments()
}

// 移行は history が揃ってから走らせる。履歴は useHistory 側の別 watch で非同期に読まれるため、
// 読み込み順に依存すると、元記録を引けずに移行分の日時が全部「今日」になってしまう。
// 履歴が空のまま（元記録が消えている）なら日付を復元できないので移行しない。
watch(
  [momentsLoaded, () => history.value.length],
  () => {
    if (!momentsLoaded.value || momentsMigrated.value) return
    if (achievements.value.length > 0 && history.value.length === 0) return
    migrateAchievementsToMoments()
  },
  { immediate: true },
)

// 履歴（文字起こし）削除時、紐づく出来事も一緒に削除する
function deleteHistoryAndMoments(id: string) {
  deleteHistory(id)
  const hadMoments = moments.value.some(m => m.sourceId === id)
  const wasProcessed = momentProcessedIds.value.includes(id)
  if (!hadMoments && !wasProcessed) return
  moments.value = moments.value.filter(m => m.sourceId !== id)
  momentProcessedIds.value = momentProcessedIds.value.filter(p => p !== id)
  saveMoments()
}

const momentAllSelected = computed(() => momentSourceItems.value.length > 0 && momentSelectedIds.value.length === momentSourceItems.value.length)
const momentSomeSelected = computed(() => momentSelectedIds.value.length > 0 && momentSelectedIds.value.length < momentSourceItems.value.length)

const toggleMomentAll = () => {
  if (momentAllSelected.value) momentSelectedIds.value = []
  else momentSelectedIds.value = momentSourceItems.value.map(i => i.id)
}

const toggleMomentSelect = (id: string) => {
  const idx = momentSelectedIds.value.indexOf(id)
  if (idx === -1) momentSelectedIds.value.push(id)
  else momentSelectedIds.value.splice(idx, 1)
}

// 既定は未処理のみ（全件を毎回投げると重い）。未処理が無いときだけ全件を選んでおく
const openMomentSelect = () => {
  const unprocessed = unprocessedSourceItems.value.map(i => i.id)
  momentSelectedIds.value = unprocessed.length ? unprocessed : momentSourceItems.value.map(i => i.id)
  momentSelectOpen.value = true
}

// 抽出には [ポジ]/[ネガ] 付きの中間データを渡す。感情の向きがタグ判定の手がかりになる
const getMomentSourceText = (item: { text: string; notes?: string }): string => {
  const parsed = parseSummaryNote(item.notes)
  if (!parsed) return item.text
  if ('items' in parsed) return parsed.items.map(n => `[${n.sentiment}] ${n.text}`).join('\n')
  return `[${parsed.sentiment}] ${parsed.text}`
}

// 1つの記録から出来事を抽出して返す（保存・state更新はしない）
const fetchMomentsForSource = async (sourceId: string, timestamp: string, notesText: string): Promise<Moment[]> => {
  const res = await $fetch<{ moments: { kind: MomentKind; text: string; impact: number; who?: string }[] }>('/api/hagemashi/moments-generate', {
    method: 'POST',
    body: { text: notesText },
  })
  const now = new Date().toISOString()
  return (res.moments ?? []).map(m => ({
    id: `${sourceId}-${Math.random().toString(36).slice(2, 8)}`,
    sourceId,
    sourceType: 'record' as const,
    ts: timestamp,
    kind: m.kind,
    text: m.text,
    impact: m.impact,
    who: m.who,
    createdAt: now,
    updatedAt: now,
  }))
}

const runMomentGenerate = async () => {
  momentSelectOpen.value = false
  const targets = history.value.filter(i => momentSelectedIds.value.includes(i.id))
  if (!targets.length || isGeneratingMoments.value) return
  isGeneratingMoments.value = true
  let done = 0
  momentStatus.value = `0/${targets.length}件...`
  let next = [...moments.value]
  const processed = new Set(momentProcessedIds.value)
  for (const item of targets) {
    try {
      const items = await fetchMomentsForSource(item.id, item.timestamp, getMomentSourceText(item))
      // 成功時のみ差し替える。手で直した出来事は残し、AI出力で上書きしない
      const kept = next.filter(m => m.sourceId === item.id && isEditedMoment(m))
      next = next.filter(m => m.sourceId !== item.id)
      next.push(...kept, ...items)
      // 0件でも「実行済み」にする（そうしないと毎回この記録を投げ直してしまう）
      processed.add(item.id)
    } catch (e) {
      console.error(e)
    }
    done++
    momentStatus.value = `${done}/${targets.length}件...`
  }
  moments.value = next
  momentProcessedIds.value = [...processed]
  saveMoments()
  momentStatus.value = `完了 ${done}/${targets.length}件`
  setTimeout(() => { momentStatus.value = '' }, 4000)
  isGeneratingMoments.value = false
}

// 変えた項目にだけ印を付ける。再生成でそこが戻らないようにするため
const applyMomentEdit = (id: string, patch: { text: string; impact: number; kind: MomentKind }) => {
  const m = moments.value.find(x => x.id === id)
  if (!m) return
  const edited = { ...(m.edited ?? {}) }
  if (m.text !== patch.text) edited.text = true
  if (m.impact !== patch.impact) edited.impact = true
  if (m.kind !== patch.kind) edited.kind = true
  m.text = patch.text
  m.impact = patch.impact
  m.kind = patch.kind
  m.edited = edited
  m.updatedAt = new Date().toISOString()
  moments.value = [...moments.value]
  saveMoments()
}

// --- カレンダータブ ---
const WEEKDAY_LABELS = ['日', '月', '火', '水', '木', '金', '土']
const monthKeyOf = (iso: string): string => toJSTDate(iso).toISOString().slice(0, 7)
const dayKeyOf = (iso: string): string => toJSTDate(iso).toISOString().slice(0, 10)

const currentMonthKey = computed(() => monthKeyOf(new Date().toISOString()))
const calendarMonth = ref(monthKeyOf(new Date().toISOString()))
const selectedDay = ref<string | null>(null)
const showNegativeDetail = ref(false)
// 月＝日ごとの粒度で見る／年＝12ヶ月を並べて積み上がりを見る
const calendarView = ref<'month' | 'year'>('month')
const calendarYear = computed(() => calendarMonth.value.slice(0, 4))

// 年ビューでは12ヶ月ぶん動かす
const shiftCalendarMonth = (delta: number) => {
  const d = new Date(`${calendarMonth.value}-01T00:00:00Z`)
  d.setUTCMonth(d.getUTCMonth() + (calendarView.value === 'year' ? delta * 12 : delta))
  calendarMonth.value = d.toISOString().slice(0, 7)
  selectedDay.value = null
}

const backToNow = () => {
  calendarMonth.value = currentMonthKey.value
  selectedDay.value = null
}

const isCurrentPeriod = computed(() =>
  calendarView.value === 'year'
    ? calendarYear.value === currentMonthKey.value.slice(0, 4)
    : calendarMonth.value === currentMonthKey.value,
)

const calendarMonthLabel = computed(() => {
  const [y, m] = calendarMonth.value.split('-')
  return calendarView.value === 'year' ? `${y}年` : `${y}年${Number(m)}月`
})

// いま見ている期間（月 or 年）に入る出来事
const periodMoments = computed(() => {
  const prefix = calendarView.value === 'year' ? calendarYear.value : calendarMonth.value
  return momentBaseRows.value.filter(m => monthKeyOf(m.ts).startsWith(prefix))
})

const monthSummary = computed(() => {
  let pos = 0
  let neg = 0
  for (const m of periodMoments.value) {
    if (MOMENT_META[m.kind].polarity === 'neg') neg++
    else pos++
  }
  return { pos, neg }
})

// その期間のポジをインパクト順に3つ。開いた瞬間に良かったことが目に入るようにする
const periodHighlights = computed(() =>
  periodMoments.value
    .filter(m => MOMENT_META[m.kind].polarity === 'pos')
    .sort((a, b) => b.impact - a.impact || b.ts.localeCompare(a.ts))
    .slice(0, 3),
)

// 通算。件数は減らないので、開くたびに増えていくのが見える
const lifetimeTotals = computed(() =>
  MOMENT_KINDS
    .filter(k => MOMENT_META[k].polarity === 'pos')
    .map(k => ({ kind: k, count: momentCounts.value[k] }))
    .filter(t => t.count > 0),
)

// 年ビューのセルを押したら、その月の日別表示へ降りる
const drillIntoDay = (dayKey: string) => {
  calendarMonth.value = dayKey.slice(0, 7)
  calendarView.value = 'month'
  selectedDay.value = dayKey
  showNegativeDetail.value = false
}

// 今月に出来事が無いまま開くと空のカレンダーしか出ないので、
// 初回だけいちばん新しい出来事の月へ寄せる（momentBaseRows は新しい順）
const calendarPositioned = ref(false)
watch(momentBaseRows, (rows) => {
  if (calendarPositioned.value || rows.length === 0) return
  calendarPositioned.value = true
  if (!rows.some(m => monthKeyOf(m.ts) === calendarMonth.value)) {
    calendarMonth.value = monthKeyOf(rows[0].ts)
  }
})

const selectedDayMoments = computed(() => {
  const empty = { pos: [] as Moment[], neg: [] as Moment[] }
  if (!selectedDay.value) return empty
  const byImpact = (a: Moment, b: Moment) => b.impact - a.impact
  const day = momentBaseRows.value.filter(m => dayKeyOf(m.ts) === selectedDay.value)
  return {
    pos: day.filter(m => MOMENT_META[m.kind].polarity === 'pos').sort(byImpact),
    neg: day.filter(m => MOMENT_META[m.kind].polarity === 'neg').sort(byImpact),
  }
})

const selectedDayLabel = computed(() => {
  if (!selectedDay.value) return ''
  const d = new Date(`${selectedDay.value}T00:00:00Z`)
  return `${d.getUTCMonth() + 1}月${d.getUTCDate()}日（${WEEKDAY_LABELS[d.getUTCDay()]}）`
})

// その日の出来事が、どの記録から抜き出されたものか
const selectedDaySources = computed(() => {
  if (!selectedDay.value) return []
  const ids = new Set([...selectedDayMoments.value.pos, ...selectedDayMoments.value.neg].map(m => m.sourceId))
  return history.value.filter(h => ids.has(h.id)).map(h => h.title || h.text.slice(0, 30))
})

const confirmDeleteMoment = () => {
  if (!deletingMomentId.value) return
  moments.value = moments.value.filter(m => m.id !== deletingMomentId.value)
  saveMoments()
  deletingMomentId.value = null
}

// --- 文字起こし後処理 ---
const handleTranscribed = async (text: string) => {
  const replaced = applyDictionary(text)
  const [title, notes] = await Promise.all([fetchTitle(replaced), fetchSummary(replaced)])
  const newId = addHistory(replaced, title, notes || undefined)
  // 中間データがあれば出来事も自動抽出（バックグラウンドで実行し、UIはブロックしない）
  if (notes) {
    const item = history.value.find(h => h.id === newId)
    if (item) {
      fetchMomentsForSource(newId, item.timestamp, getMomentSourceText(item))
        .then((items) => {
          moments.value = [...moments.value.filter(m => m.sourceId !== newId), ...items]
          momentProcessedIds.value = [...new Set([...momentProcessedIds.value, newId])]
          saveMoments()
        })
        .catch(console.error)
    }
  }
  // 文字起こし完了後、まずはげますかどうかを確認する（「はい」で対象選択ポップアップへ）
  encourageTargetId.value = newId
  encourageConfirmOpen.value = true
}

// --- 録音 ---
const { isRecording, isPaused, isProcessing, duration, formatTime, startRecording, pauseRecording, resumeRecording, transcribeRecording, cancelRecording } = useAudioRecorder({
  onTranscribed: handleTranscribed,
  onError: (msg) => { error.value = msg },
  getPrompt: getWhisperPrompt,
  getModel: () => transcriptionModel.value,
})
</script>
