<template>
  <div class="flex flex-col items-center px-4 pt-4 lg:pt-8 pb-12 min-h-screen" @click="showSettingsMenu = false">
    <div v-if="showSettingsMenu" class="fixed inset-0 z-40" @click="showSettingsMenu = false" />
    <div class="relative z-50 w-full max-w-[600px] ml-2.5">
      <div class="absolute inset-x-0 top-0 h-[2px] rounded-t-2xl bg-gradient-to-r from-orange-500 to-pink-500 z-10" />
      <div class="w-full bg-white/[0.04] border border-white/[0.08] rounded-2xl pt-7 px-3.5 pb-3 shadow-[0_20px_80px_rgba(0,0,0,0.35),0_0_40px_rgba(249,115,22,0.06)] backdrop-blur-[10px] grid gap-4 max-h-[90dvh] overflow-y-auto [scrollbar-width:thin] [scrollbar-color:rgba(249,115,22,0.3)_transparent]">

      <!-- Header -->
      <header class="relative flex items-center justify-start">
        <div class="text-left">
          <h1 class="m-0 text-[clamp(12px,2vw,16px)] font-bold bg-gradient-to-br from-orange-500 to-pink-500 bg-clip-text text-transparent">記録</h1>
        </div>
        <div class="absolute right-0 top-1/2 -translate-y-1/2 flex items-center gap-1.5" @click.stop>
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
            <button class="w-full text-left px-4 py-2 text-[13px] text-slate-300 hover:bg-white/[0.08] transition-colors cursor-pointer flex items-center gap-2" @click="openVisionModal(); showSettingsMenu = false">
              <span>🎯</span> ビジョン設定
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

          <!-- 気分 button -->
          <button
            class="w-[62px] h-[62px] rounded-full border-2 border-orange-500/50 bg-orange-500/[0.08] text-slate-50 cursor-pointer flex flex-col items-center justify-center gap-1 transition-all hover:bg-orange-500/[0.20] hover:border-orange-500/80 hover:scale-105"
            @click="openMoodInput"
          >
            <span class="text-xl leading-none">📈</span>
            <span class="text-[9px] font-medium">気分</span>
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
        <!-- 録音 サブタブ（主: 心・強み・アドバイス / 副: 記録・単語・中間データ・達成リスト・はげまし） -->
        <div v-if="isRecordingTab" class="flex items-center gap-1.5 mt-2 flex-wrap">
          <button
            v-for="t in primaryTabs"
            :key="t.key"
            class="px-2.5 py-1 rounded-full text-xs font-semibold border transition-all cursor-pointer"
            :class="activeTab === t.key ? 'border-orange-500/60 bg-orange-500/15 text-orange-300' : 'border-white/[0.08] bg-transparent text-slate-500 hover:text-slate-300'"
            @click="activeTab = t.key"
          ><span class="sm:hidden">{{ t.short }}</span><span class="hidden sm:inline">{{ t.label }}</span></button>
          <!-- 展開アイコン -->
          <button
            class="w-6 h-6 flex items-center justify-center rounded-full text-xs border transition-all cursor-pointer shrink-0"
            :class="secondaryVisible ? 'border-orange-500/40 text-orange-300 bg-orange-500/10' : 'border-white/[0.08] bg-transparent text-slate-500 hover:text-slate-300'"
            :title="secondaryVisible ? '閉じる' : 'その他のタブ'"
            @click="showMoreTabs = !showMoreTabs"
          ><span class="inline-block leading-none transition-transform duration-200" :style="secondaryVisible ? 'transform: rotate(180deg)' : ''">⌄</span></button>
          <!-- 副タブ（展開時のみ表示） -->
          <template v-if="secondaryVisible">
            <button
              v-for="t in secondaryTabs"
              :key="t.key"
              class="px-2.5 py-1 rounded-full text-xs font-semibold border transition-all cursor-pointer"
              :class="activeTab === t.key ? 'border-orange-500/60 bg-orange-500/15 text-orange-300' : 'border-white/[0.08] bg-transparent text-slate-500 hover:text-slate-300'"
              @click="activeTab = t.key"
            ><span class="sm:hidden">{{ t.short }}</span><span class="hidden sm:inline">{{ t.label }}</span></button>
          </template>
        </div>
        <div
          class="flex items-center gap-2 mb-1"
          :class="activeTab === 'summary' || activeTab === 'words' || isProfileTab || activeTab === 'encourage' || activeTab === 'achievement' || activeTab === 'achieved' || activeTab === 'kokoro'
            ? 'min-h-8'
            : activeTab === 'transcription' ? 'min-h-4' : 'min-h-0'"
        >
          <template v-if="activeTab === 'achievement'">
            <div class="flex-1" />
            <button
              class="px-3 py-1 rounded-lg text-xs font-medium border border-white/10 bg-white/[0.04] text-slate-400 cursor-pointer hover:bg-white/[0.10] hover:text-slate-200 transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1.5"
              :disabled="isGeneratingAchievements || achievementSourceItems.length === 0"
              @click="openAchievementSelect"
            >
              <span v-if="isGeneratingAchievements" class="w-3 h-3 rounded-full border border-orange-500/30 border-t-orange-500 animate-spin block" />
              {{ achievementStatus || '再生成' }}
            </button>
          </template>
          <template v-if="activeTab === 'encourage'">
            <div class="flex-1" />
            <button
              class="px-3 py-1 rounded-lg text-xs font-medium border border-white/10 bg-white/[0.04] text-slate-400 transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1.5"
              :class="history.length > 0 && !isEncouraging ? 'cursor-pointer hover:bg-white/[0.10] hover:text-slate-200' : ''"
              :disabled="history.length === 0 || isEncouraging"
              @click="openSelectModal"
            >
              <span v-if="isEncouraging" class="w-3 h-3 rounded-full border border-orange-500/30 border-t-orange-500 animate-spin block" />
              💪 はげます
            </button>
          </template>
          <template v-if="activeTab === 'summary'">
            <div class="flex-1" />
            <button
              class="px-3 py-1 rounded-lg text-xs font-medium border border-white/10 bg-white/[0.04] text-slate-400 cursor-pointer hover:bg-white/[0.10] hover:text-slate-200 transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1.5"
              :disabled="isMigrating || history.length === 0"
              @click="openMigrateSelect"
            >
              <span v-if="isMigrating" class="w-3 h-3 rounded-full border border-orange-500/30 border-t-orange-500 animate-spin block" />
              {{ migrateStatus || '再生成' }}
            </button>
          </template>
          <template v-if="activeTab === 'words'">
            <label class="ml-auto flex items-center gap-1.5 text-[11px] text-slate-500">
              <span>出現回数</span>
              <select
                v-model.number="minWordCount"
                class="px-2 py-1 rounded-lg text-xs font-medium border border-white/10 bg-white/[0.04] text-slate-300 cursor-pointer hover:bg-white/[0.10] transition-all outline-none"
              >
                <option v-for="n in 10" :key="n" :value="n" class="bg-slate-900 text-slate-200">{{ n }}以上</option>
              </select>
            </label>
            <button
              class="px-3 py-1 rounded-lg text-xs font-medium border border-white/10 bg-white/[0.04] text-slate-400 cursor-pointer hover:bg-white/[0.10] hover:text-slate-200 transition-all"
              @click="stoplistOpen = true"
            >除外単語</button>
          </template>
          <template v-if="activeTab === 'kokoro'">
            <div class="flex-1" />
            <span v-if="kokoroHistory.length > 0" class="text-[11px] text-slate-600">最終更新: {{ formatProfileDate(kokoroHistory[0].generatedAt) }}</span>
            <button
              class="px-3 py-1 rounded-lg text-xs font-medium border border-white/10 bg-white/[0.04] text-slate-400 cursor-pointer hover:bg-white/[0.10] hover:text-slate-200 transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1.5"
              :disabled="isKokoroLoading"
              @click="generateKokoro"
            >
              <span v-if="isKokoroLoading" class="w-3 h-3 rounded-full border border-orange-500/30 border-t-orange-500 animate-spin block" />
              {{ isKokoroLoading ? '生成中...' : '更新' }}
            </button>
          </template>
          <template v-if="isProfileTab">
            <div class="flex-1" />
            <span v-if="profileHistory.length > 0" class="text-[11px] text-slate-600">最終更新: {{ formatProfileDate(profileHistory[0].generatedAt) }}</span>
            <button
              class="px-3 py-1 rounded-lg text-xs font-medium border border-white/10 bg-white/[0.04] text-slate-400 cursor-pointer hover:bg-white/[0.10] hover:text-slate-200 transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1.5"
              :disabled="isProfileLoading"
              @click="generateProfile"
            >
              <span v-if="isProfileLoading" class="w-3 h-3 rounded-full border border-orange-500/30 border-t-orange-500 animate-spin block" />
              {{ isProfileLoading ? '生成中...' : '更新' }}
            </button>
          </template>
          <template v-if="activeTab === 'achieved'">
            <div class="flex-1" />
            <span v-if="achievedHistory.length > 0" class="text-[11px] text-slate-600">最終更新: {{ formatProfileDate(achievedHistory[0].generatedAt) }}</span>
            <button
              class="px-3 py-1 rounded-lg text-xs font-medium border border-white/10 bg-white/[0.04] text-slate-400 cursor-pointer hover:bg-white/[0.10] hover:text-slate-200 transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1.5"
              :disabled="isAchievedLoading"
              @click="generateAchieved"
            >
              <span v-if="isAchievedLoading" class="w-3 h-3 rounded-full border border-orange-500/30 border-t-orange-500 animate-spin block" />
              {{ isAchievedLoading ? '生成中...' : '更新' }}
            </button>
          </template>
        </div>
        <HistoryTable
          v-if="activeTab === 'transcription'"
          :history="history"
          :copiedId="copiedHistoryId"
          :hideHeader="true"
          :mobileMinimal="true"
          @copy="copyHistory"
          @delete="deleteHistoryAndAchievements"
          @updateTitle="updateHistoryTitle"
        />
        <HistoryTable
          v-else-if="activeTab === 'encourage'"
          :history="encourageHistory"
          :copiedId="copiedEncourageId"
          :hideHeader="true"
          :markdown="true"
          :mobileMinimal="true"
          @copy="copyEncourageHistory"
          @delete="deleteEncourageHistory"
          @updateTitle="updateEncourageHistoryTitle"
        />
        <!-- 中間データタブ -->
        <div v-else-if="activeTab === 'summary'" class="py-2">
          <div v-if="summaryRows.length === 0" class="text-center text-slate-500 text-sm py-10">
            録音を文字起こしすると中間データが生成されます
          </div>
          <div v-else class="flex flex-col gap-0">
            <div
              v-for="(row, rowIndex) in summaryRows"
              :key="`${row.id}-${rowIndex}`"
              class="flex flex-col gap-2 px-1 py-2 border-b border-white/[0.05] last:border-b-0"
            >
              <!-- 表示モード -->
              <template v-if="editingSummaryId !== `${row.id}-${rowIndex}`">
                <div class="flex items-start gap-2.5 group">
                  <span class="text-[11px] text-slate-500 shrink-0 w-[38px] pt-[2px] tabular-nums">{{ row.date }}</span>
                  <span
                    class="text-[10px] font-semibold shrink-0 px-1.5 py-0.5 rounded-md mt-[1px]"
                    :class="row.sentiment === 'ポジ' ? 'bg-emerald-500/15 text-emerald-400' : 'bg-orange-500/15 text-orange-400'"
                  >{{ row.sentiment }}</span>
                  <span class="text-sm text-slate-200 leading-relaxed flex-1">{{ row.text }}</span>
                  <div class="shrink-0 flex items-center gap-0.5 opacity-0 group-hover:opacity-100">
                    <button
                      class="w-6 h-6 flex items-center justify-center rounded-md text-slate-600 hover:text-slate-300 hover:bg-white/[0.08] transition-colors cursor-pointer border-none bg-transparent"
                      @click="startEditSummary({ id: `${row.id}-${rowIndex}`, sentiment: row.sentiment, text: row.text, itemIndex: row.itemIndex })"
                    >✏️</button>
                    <button
                      class="w-6 h-6 flex items-center justify-center rounded-md text-slate-600 hover:text-red-400 hover:bg-red-500/10 transition-colors cursor-pointer border-none bg-transparent"
                      @click="deletingSummaryTarget = { id: row.id, itemIndex: row.itemIndex }"
                    >✕</button>
                  </div>
                </div>
              </template>
              <!-- 編集モード -->
              <template v-else>
                <div class="flex items-center gap-2 px-0.5">
                  <span class="text-[11px] text-slate-500 shrink-0 w-[38px] tabular-nums">{{ row.date }}</span>
                  <button
                    class="text-[10px] font-semibold shrink-0 px-1.5 py-0.5 rounded-md transition-colors cursor-pointer border-none"
                    :class="editingSentiment === 'ポジ' ? 'bg-emerald-500/30 text-emerald-300' : 'bg-slate-700 text-slate-400 hover:bg-slate-600'"
                    @click="editingSentiment = 'ポジ'"
                  >ポジ</button>
                  <button
                    class="text-[10px] font-semibold shrink-0 px-1.5 py-0.5 rounded-md transition-colors cursor-pointer border-none"
                    :class="editingSentiment === 'ネガ' ? 'bg-orange-500/30 text-orange-300' : 'bg-slate-700 text-slate-400 hover:bg-slate-600'"
                    @click="editingSentiment = 'ネガ'"
                  >ネガ</button>
                </div>
                <textarea
                  v-model="editingText"
                  class="w-full bg-white/[0.05] border border-orange-500/40 rounded-lg text-slate-200 text-sm px-3 py-2 outline-none focus:border-orange-500 transition-colors font-[inherit] resize-none leading-relaxed"
                  rows="3"
                />
                <div class="flex justify-end gap-1.5">
                  <button class="px-3 py-1 rounded-lg border border-white/10 bg-transparent text-slate-400 text-xs cursor-pointer hover:bg-white/[0.08] transition-colors" @click="cancelSummary">キャンセル</button>
                  <button class="px-3 py-1 rounded-lg border-none bg-gradient-to-br from-orange-500 to-pink-500 text-slate-50 text-xs font-medium cursor-pointer hover:opacity-90 transition-opacity" @click="saveSummary(row.id)">保存</button>
                </div>
              </template>
            </div>
          </div>
        </div>

        <!-- 達成リストタブ -->
        <div v-else-if="activeTab === 'achievement'" class="py-2">
          <div v-if="achievementRows.length === 0" class="text-center text-slate-500 text-sm py-10">
            再生成ボタンを押すと中間データから達成リストを生成します
          </div>
          <div v-else class="flex flex-col gap-0">
            <div
              v-for="row in achievementRows"
              :key="row.id"
              class="flex flex-col gap-2 px-1 py-2 border-b border-white/[0.05] last:border-b-0"
            >
              <!-- 表示モード -->
              <template v-if="editingAchievementId !== row.id">
                <div class="flex items-start gap-2.5 group">
                  <span class="text-[11px] text-slate-500 shrink-0 w-[38px] pt-[2px] tabular-nums">{{ row.date }}</span>
                  <span class="text-[11px] shrink-0 text-amber-400 mt-[1px] tracking-tight" :title="`大きさ ${row.level}/5`">{{ '★'.repeat(row.level) }}<span class="text-slate-700">{{ '★'.repeat(5 - row.level) }}</span></span>
                  <span class="text-sm text-slate-200 leading-relaxed flex-1">{{ row.text }}</span>
                  <div class="shrink-0 flex items-center gap-0.5 opacity-0 group-hover:opacity-100">
                    <button
                      class="w-6 h-6 flex items-center justify-center rounded-md text-slate-600 hover:text-slate-300 hover:bg-white/[0.08] transition-colors cursor-pointer border-none bg-transparent"
                      @click="startEditAchievement(row)"
                    >✏️</button>
                    <button
                      class="w-6 h-6 flex items-center justify-center rounded-md text-slate-600 hover:text-red-400 hover:bg-red-500/10 transition-colors cursor-pointer border-none bg-transparent"
                      @click="deletingAchievementId = row.id"
                    >✕</button>
                  </div>
                </div>
              </template>
              <!-- 編集モード -->
              <template v-else>
                <div class="flex items-center gap-2 px-0.5">
                  <span class="text-[11px] text-slate-500 shrink-0 w-[38px] tabular-nums">{{ row.date }}</span>
                  <span class="text-[11px] text-slate-500 shrink-0">大きさ</span>
                  <div class="flex gap-1">
                    <button
                      v-for="n in 5"
                      :key="n"
                      class="w-6 h-6 rounded-md text-sm transition-colors cursor-pointer border-none"
                      :class="editingAchievementLevel >= n ? 'text-amber-400 bg-amber-400/10' : 'text-slate-600 bg-slate-700/40 hover:text-slate-400'"
                      @click="editingAchievementLevel = n"
                    >★</button>
                  </div>
                </div>
                <textarea
                  v-model="editingAchievementText"
                  class="w-full bg-white/[0.05] border border-orange-500/40 rounded-lg text-slate-200 text-sm px-3 py-2 outline-none focus:border-orange-500 transition-colors font-[inherit] resize-none leading-relaxed"
                  rows="3"
                />
                <div class="flex justify-end gap-1.5">
                  <button class="px-3 py-1 rounded-lg border border-white/10 bg-transparent text-slate-400 text-xs cursor-pointer hover:bg-white/[0.08] transition-colors" @click="cancelAchievement">キャンセル</button>
                  <button class="px-3 py-1 rounded-lg border-none bg-gradient-to-br from-orange-500 to-pink-500 text-slate-50 text-xs font-medium cursor-pointer hover:opacity-90 transition-opacity" @click="saveAchievement(row.id)">保存</button>
                </div>
              </template>
            </div>
          </div>
        </div>

        <!-- こころタブ -->
        <div v-else-if="activeTab === 'kokoro'" class="py-2">
          <div v-if="isKokoroLoading" class="flex items-center justify-center gap-2 py-10 text-slate-400 text-sm">
            <span class="w-4 h-4 rounded-full border-2 border-orange-500/30 border-t-orange-500 animate-spin block" />
            生成中...
          </div>
          <div v-else-if="kokoroHistory.length === 0" class="text-center text-slate-500 text-sm py-10">
            更新ボタンを押すと中間データから心の状態を可視化します
          </div>
          <div v-else class="flex flex-col gap-3">
            <HagemashiKokoroTreemap :entry="kokoroHistory[0]" :height="360" @leaf-click="activeKokoroPopup = $event" />
            <!-- メタ認知コメント -->
            <div v-if="kokoroHistory[0].summary" class="bg-white/[0.04] border border-white/[0.06] rounded-xl p-3.5">
              <div class="text-xs font-semibold text-orange-400 mb-1.5">🪞 メタ認知コメント</div>
              <p class="m-0 text-sm text-slate-300 leading-relaxed">{{ kokoroHistory[0].summary }}</p>
            </div>
            <!-- 過去のこころ履歴 -->
            <div v-if="kokoroHistory.length > 1" class="flex flex-col gap-1.5">
              <div class="text-[11px] text-slate-600 border-t border-white/[0.06] pt-3">過去のこころ</div>
              <div v-for="(k, ki) in kokoroHistory.slice(1)" :key="ki" class="bg-white/[0.02] border border-white/[0.05] rounded-xl overflow-hidden">
                <button
                  class="w-full flex items-center justify-between px-3 py-2.5 cursor-pointer bg-transparent border-none transition-colors hover:bg-white/[0.04]"
                  @click="toggleKokoroHistory(ki)"
                >
                  <div class="text-[11px] text-slate-500">{{ formatProfileDate(k.generatedAt) }}</div>
                  <div class="text-slate-600 text-[10px] transition-transform duration-200" :style="expandedKokoroIndices.has(ki) ? 'transform: rotate(180deg)' : ''">▼</div>
                </button>
                <div v-if="expandedKokoroIndices.has(ki)" class="px-3 pb-3 flex flex-col gap-2 border-t border-white/[0.05]">
                  <HagemashiKokoroTreemap :entry="k" :height="280" @leaf-click="activeKokoroPopup = $event" />
                  <p v-if="k.summary" class="m-0 text-xs text-slate-400 leading-relaxed">{{ k.summary }}</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- 長期傾向タブ（強み / アドバイス） -->
        <div v-else-if="isProfileTab" class="py-2">
          <div v-if="isProfileLoading" class="flex items-center justify-center gap-2 py-10 text-slate-400 text-sm">
            <span class="w-4 h-4 rounded-full border-2 border-orange-500/30 border-t-orange-500 animate-spin block" />
            分析中...
          </div>
          <div v-else-if="profileHistory.length === 0" class="text-center text-slate-500 text-sm py-10">
            更新ボタンを押すと記録から長期傾向を分析します
          </div>
          <div v-else-if="profileItemsOf(profileHistory[0]).length === 0" class="text-center text-slate-500 text-sm py-10">
            {{ profileTabLabel }}のデータがありません。更新ボタンで再分析してください
          </div>
          <div v-else class="flex flex-col gap-3">
            <HagemashiProfileTreemap :items="profileItemsOf(profileHistory[0])" :color="profileColor" :height="360" @leaf-click="activeProfilePopup = $event" />
            <!-- 過去の長期傾向履歴 -->
            <div v-if="profileHistory.length > 1" class="flex flex-col gap-1.5">
              <div class="text-[11px] text-slate-600 border-t border-white/[0.06] pt-3">過去の{{ profileTabLabel }}</div>
              <div v-for="(p, pi) in profileHistory.slice(1)" :key="pi" class="bg-white/[0.02] border border-white/[0.05] rounded-xl overflow-hidden">
                <button
                  class="w-full flex items-center justify-between px-3 py-2.5 cursor-pointer bg-transparent border-none transition-colors hover:bg-white/[0.04]"
                  @click="toggleProfileHistory(pi)"
                >
                  <div class="text-[11px] text-slate-500">{{ formatProfileDate(p.generatedAt) }}</div>
                  <div class="text-slate-600 text-[10px] transition-transform duration-200" :style="expandedProfileIndices.has(pi) ? 'transform: rotate(180deg)' : ''">▼</div>
                </button>
                <div v-if="expandedProfileIndices.has(pi)" class="px-3 pb-3 border-t border-white/[0.05]">
                  <HagemashiProfileTreemap
                    v-if="profileItemsOf(p).length"
                    :items="profileItemsOf(p)"
                    :color="profileColor"
                    :height="280"
                    @leaf-click="activeProfilePopup = $event"
                  />
                  <p v-else class="m-0 py-4 text-xs text-slate-500 text-center">{{ profileTabLabel }}のデータがありません</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- 達成タブ -->
        <div v-else-if="activeTab === 'achieved'" class="py-2">
          <div v-if="isAchievedLoading" class="flex items-center justify-center gap-2 py-10 text-slate-400 text-sm">
            <span class="w-4 h-4 rounded-full border-2 border-orange-500/30 border-t-orange-500 animate-spin block" />
            分析中...
          </div>
          <div v-else-if="achievedHistory.length === 0" class="text-center text-slate-500 text-sm py-10">
            更新ボタンを押すと中間データから達成を分析します
          </div>
          <div v-else-if="achievedHistory[0].items.length === 0" class="text-center text-slate-500 text-sm py-10">
            達成のデータがありません。更新ボタンで再分析してください
          </div>
          <div v-else class="flex flex-col gap-3">
            <HagemashiProfileTreemap :items="achievedHistory[0].items" color="#f472b6" :height="360" @leaf-click="activeProfilePopup = $event" />
            <!-- AI分析コメント -->
            <div v-if="achievedHistory[0].summary" class="bg-white/[0.04] border border-white/[0.06] rounded-xl p-3.5">
              <div class="text-xs font-semibold text-orange-400 mb-1.5">🏆 AI分析</div>
              <p class="m-0 text-sm text-slate-300 leading-relaxed">{{ achievedHistory[0].summary }}</p>
            </div>
            <!-- 過去の達成履歴 -->
            <div v-if="achievedHistory.length > 1" class="flex flex-col gap-1.5">
              <div class="text-[11px] text-slate-600 border-t border-white/[0.06] pt-3">過去の達成</div>
              <div v-for="(a, ai) in achievedHistory.slice(1)" :key="ai" class="bg-white/[0.02] border border-white/[0.05] rounded-xl overflow-hidden">
                <button
                  class="w-full flex items-center justify-between px-3 py-2.5 cursor-pointer bg-transparent border-none transition-colors hover:bg-white/[0.04]"
                  @click="toggleAchievedHistory(ai)"
                >
                  <div class="text-[11px] text-slate-500">{{ formatProfileDate(a.generatedAt) }}</div>
                  <div class="text-slate-600 text-[10px] transition-transform duration-200" :style="expandedAchievedIndices.has(ai) ? 'transform: rotate(180deg)' : ''">▼</div>
                </button>
                <div v-if="expandedAchievedIndices.has(ai)" class="px-3 pb-3 flex flex-col gap-2 border-t border-white/[0.05]">
                  <HagemashiProfileTreemap
                    v-if="a.items.length"
                    :items="a.items"
                    color="#f472b6"
                    :height="280"
                    @leaf-click="activeProfilePopup = $event"
                  />
                  <p v-else class="m-0 py-4 text-xs text-slate-500 text-center">達成のデータがありません</p>
                  <p v-if="a.summary" class="m-0 text-xs text-slate-400 leading-relaxed">{{ a.summary }}</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div v-else-if="activeTab === 'words'" class="py-2">
          <div v-if="filteredWordRanking.length === 0" class="text-center text-slate-500 text-sm py-10">
            再集計ボタンを押すとワードクラウドを生成します
          </div>
          <HagemashiWordCloudChart
            v-else
            :words="filteredWordRanking.slice(0, 120)"
            :height="380"
            @word-click="activeWordPopup = $event"
          />
        </div>

        <!-- 気分タブ -->
        <div v-else-if="activeTab === 'mood'" class="py-2 flex flex-col gap-4">
          <!-- 気分の推移グラフ -->
          <div>
            <div class="flex items-center justify-between gap-2 mb-1.5">
              <div class="text-[11px] text-slate-600">気分の推移（ドットをタップで詳細）</div>
              <button
                class="px-3 py-1 rounded-lg text-xs font-medium border border-white/10 bg-white/[0.04] text-slate-400 cursor-pointer hover:bg-white/[0.10] hover:text-slate-200 transition-all shrink-0"
                @click="openMoodInput"
              >＋ 記録</button>
            </div>
            <div v-if="moodEntries.length === 0" class="text-center text-slate-500 text-sm py-10">
              まだ気分の記録がありません
            </div>
            <HagemashiMoodChart
              v-else
              :entries="moodEntries"
              :height="300"
              @delete="deleteMood"
            />
          </div>
          <!-- 履歴一覧（編集可能） -->
          <div v-if="moodEntries.length > 0" class="flex flex-col gap-0">
            <div class="text-[11px] text-slate-600 border-t border-white/[0.06] pt-3 mb-1">履歴</div>
            <div
              v-for="row in moodHistoryRows"
              :key="row.id"
              class="flex flex-col gap-2 px-1 py-2 border-b border-white/[0.05] last:border-b-0"
            >
              <!-- 表示モード -->
              <template v-if="editingMoodId !== row.id">
                <div class="flex items-start gap-2.5 group">
                  <span class="text-[11px] text-slate-500 shrink-0 w-[74px] pt-[2px] tabular-nums">{{ row.date }}</span>
                  <span class="text-[11px] font-semibold shrink-0 px-1.5 py-0.5 rounded-md mt-[1px] text-slate-900" :style="{ background: moodColor(row.score) }">{{ row.score }}</span>
                  <span class="text-sm leading-relaxed flex-1" :class="row.note ? 'text-slate-200' : 'text-slate-600 italic'">{{ row.note || 'テキストなし' }}</span>
                  <div class="shrink-0 flex items-center gap-0.5 opacity-0 group-hover:opacity-100">
                    <button
                      class="w-6 h-6 flex items-center justify-center rounded-md text-slate-600 hover:text-slate-300 hover:bg-white/[0.08] transition-colors cursor-pointer border-none bg-transparent"
                      @click="startEditMood(row)"
                    >✏️</button>
                    <button
                      class="w-6 h-6 flex items-center justify-center rounded-md text-slate-600 hover:text-red-400 hover:bg-red-500/10 transition-colors cursor-pointer border-none bg-transparent"
                      @click="deleteMood(row.id)"
                    >✕</button>
                  </div>
                </div>
              </template>
              <!-- 編集モード -->
              <template v-else>
                <div class="flex items-center gap-2 px-0.5">
                  <span class="text-[11px] text-slate-500 shrink-0 w-[74px] tabular-nums">{{ row.date }}</span>
                  <div class="flex items-center gap-1 flex-1">
                    <button
                      v-for="n in 10"
                      :key="n"
                      class="flex-1 h-7 rounded-md text-xs font-semibold border transition-all cursor-pointer"
                      :class="editingMoodScore === n ? 'text-slate-900 border-transparent' : 'border-white/10 bg-white/[0.04] text-slate-400 hover:bg-white/[0.08] hover:text-slate-200'"
                      :style="editingMoodScore === n ? { background: moodColor(n) } : {}"
                      @click="editingMoodScore = n"
                    >{{ n }}</button>
                  </div>
                </div>
                <textarea
                  v-model="editingMoodNote"
                  class="w-full bg-white/[0.05] border border-orange-500/40 rounded-lg text-slate-200 text-sm px-3 py-2 outline-none focus:border-orange-500 transition-colors font-[inherit] resize-none leading-relaxed"
                  rows="2"
                  placeholder="いまの気持ちや状況（任意）"
                />
                <div class="flex justify-end gap-1.5">
                  <button class="px-3 py-1 rounded-lg border border-white/10 bg-transparent text-slate-400 text-xs cursor-pointer hover:bg-white/[0.08] transition-colors" @click="cancelMoodEdit">キャンセル</button>
                  <button class="px-3 py-1 rounded-lg border-none bg-gradient-to-br from-orange-500 to-pink-500 text-slate-50 text-xs font-medium cursor-pointer hover:opacity-90 transition-opacity" @click="saveMoodEdit(row.id)">保存</button>
                </div>
              </template>
            </div>
          </div>
        </div>

        <!-- 相談チャット（タブ切替で破棄すると履歴が消えるため、常時マウントして v-show で表示切替）
             v-show は .client.vue コンポーネント自体ではなく、この安定したラッパーdivに付ける
             （直接付けるとSSR時に何も描画されない要素にディレクティブを適用することになり、
             リロード時のhydrationで「Cannot read properties of null (reading 'style')」が発生するため） -->
        <div v-show="activeTab === 'consult'">
          <HagemashiConsultChat
            :active="activeTab === 'consult'"
            :profile="profileHistory[0] ?? null"
            :kokoro="kokoroHistory[0] ?? null"
            :vision="vision"
            :summary-items="recentSummaryItems"
            :achievements="achievements"
            @usage="consultDates = $event"
            @messages="consultMessages = $event"
          />
        </div>
      </div>
      </div>
    </div>

    <!-- Auth Modal -->
    <AuthModal v-if="!$dev && checked && !isLoggedIn" accent="orange" />

    <!-- ログ（利用回数） -->
    <HagemashiLogModal
      v-if="logOpen"
      :record-dates="recordDates"
      :consult-dates="consultDates"
      :mood-dates="moodDates"
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

    <!-- 気分入力モーダル -->
    <div v-if="moodInputOpen" class="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-[100]" @click.self="closeMoodInput">
      <div class="w-full max-w-[420px] bg-[#1e293b] border border-white/10 rounded-2xl shadow-[0_24px_80px_rgba(0,0,0,0.5)] p-6 flex flex-col gap-4">
        <p class="m-0 text-slate-200 text-sm font-semibold">いまの気分（10段階）</p>
        <div class="flex items-center gap-1">
          <button
            v-for="n in 10"
            :key="n"
            class="flex-1 h-9 rounded-lg text-sm font-semibold border transition-all cursor-pointer"
            :class="moodScore === n ? 'text-slate-900 border-transparent' : 'border-white/10 bg-white/[0.04] text-slate-400 hover:bg-white/[0.08] hover:text-slate-200'"
            :style="moodScore === n ? { background: moodColor(n) } : {}"
            @click="moodScore = n"
          >{{ n }}</button>
        </div>
        <textarea
          v-model="moodNote"
          class="w-full min-h-[90px] bg-white/[0.05] border border-white/[0.10] rounded-lg text-slate-200 text-sm px-3 py-2 outline-none focus:border-orange-500 transition-colors font-[inherit] resize-none leading-relaxed"
          placeholder="いまの気持ちや状況（任意）"
          :disabled="isSavingMood"
        />
        <div class="flex justify-end gap-2">
          <button class="px-5 py-2 rounded-lg border border-white/15 bg-transparent text-slate-400 text-sm cursor-pointer hover:bg-white/[0.06] hover:text-slate-50 transition-all disabled:opacity-40 disabled:cursor-not-allowed" :disabled="isSavingMood" @click="closeMoodInput">キャンセル</button>
          <button
            class="px-5 py-2 rounded-lg border-none bg-gradient-to-br from-orange-500 to-pink-500 text-slate-50 text-sm font-medium cursor-pointer hover:opacity-90 transition-opacity disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1.5"
            :disabled="!moodScore || isSavingMood"
            @click="saveMood"
          >
            <span v-if="isSavingMood" class="w-3 h-3 rounded-full border border-white/40 border-t-white animate-spin block" />
            記録
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

    <!-- 履歴選択ポップアップ -->
    <div v-if="selectOpen" class="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-[100]" @click.self="closeSelectModal">
      <div class="w-full max-w-[480px] bg-[#1e293b] border border-white/10 rounded-2xl shadow-[0_24px_80px_rgba(0,0,0,0.5)] flex flex-col max-h-[90vh]">
        <div class="flex items-center justify-between px-6 pt-5 pb-4 border-b border-white/[0.08]">
          <h2 class="m-0 text-lg text-slate-50 font-semibold">はげます対象を選択</h2>
          <button class="bg-transparent border-none text-slate-500 text-lg cursor-pointer px-2 py-1 rounded-md hover:text-slate-50 transition-colors" @click="closeSelectModal">✕</button>
        </div>
        <div class="px-4 py-3 overflow-y-auto flex flex-col gap-1 flex-1 [scrollbar-width:thin] [scrollbar-color:rgba(249,115,22,0.3)_transparent]">
          <label class="flex items-center gap-3 px-3 py-2 rounded-lg cursor-pointer border-b border-white/[0.06] mb-1 hover:bg-white/[0.05] transition-colors">
            <input
              type="checkbox"
              class="w-4 h-4 shrink-0 accent-orange-500 cursor-pointer"
              :checked="allSelected"
              :indeterminate="someSelected"
              @change="toggleAll"
            />
            <span class="text-xs text-slate-400 font-medium">全て選択</span>
          </label>
          <label
            v-for="item in history"
            :key="item.id"
            class="flex items-center gap-3 px-3 py-2.5 rounded-lg cursor-pointer transition-colors"
            :class="selectedIds.includes(item.id) ? 'bg-orange-500/15' : 'hover:bg-white/[0.05]'"
          >
            <input
              type="checkbox"
              class="w-4 h-4 shrink-0 accent-orange-500 cursor-pointer"
              :checked="selectedIds.includes(item.id)"
              @change="toggleSelect(item.id)"
            />
            <span class="text-xs text-slate-400 whitespace-nowrap">{{ formatSelectDate(item.timestamp) }}</span>
            <span class="text-sm text-slate-200 truncate">{{ item.title || item.text.slice(0, 40) }}</span>
          </label>
        </div>
        <div class="px-6 pt-3 pb-4 border-t border-white/[0.08] flex flex-col gap-3">
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
              :disabled="selectedIds.length === 0"
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

    <!-- 中間データ再生成 選択モーダル -->
    <div v-if="migrateSelectOpen" class="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-[100]" @click.self="migrateSelectOpen = false">
      <div class="w-full max-w-[480px] bg-[#1e293b] border border-white/10 rounded-2xl shadow-[0_24px_80px_rgba(0,0,0,0.5)] flex flex-col max-h-[90vh]">
        <div class="flex items-center justify-between px-6 pt-5 pb-4 border-b border-white/[0.08]">
          <div>
            <h2 class="m-0 text-lg text-slate-50 font-semibold">中間データを再生成</h2>
            <p class="m-0 mt-0.5 text-xs text-slate-500">対象の文字起こしを選択してください</p>
          </div>
          <button class="bg-transparent border-none text-slate-500 text-lg cursor-pointer px-2 py-1 rounded-md hover:text-slate-50 transition-colors" @click="migrateSelectOpen = false">✕</button>
        </div>
        <div class="px-4 py-3 overflow-y-auto flex flex-col gap-1 flex-1 [scrollbar-width:thin] [scrollbar-color:rgba(249,115,22,0.3)_transparent]">
          <label class="flex items-center gap-3 px-3 py-2 rounded-lg cursor-pointer border-b border-white/[0.06] mb-1 hover:bg-white/[0.05] transition-colors">
            <input
              type="checkbox"
              class="w-4 h-4 shrink-0 accent-orange-500 cursor-pointer"
              :checked="migrateAllSelected"
              :indeterminate="migrateSomeSelected"
              @change="toggleMigrateAll"
            />
            <span class="text-xs text-slate-400 font-medium">全て選択</span>
          </label>
          <label
            v-for="item in history"
            :key="item.id"
            class="flex items-center gap-3 px-3 py-2.5 rounded-lg cursor-pointer transition-colors"
            :class="migrateSelectedIds.includes(item.id) ? 'bg-orange-500/15' : 'hover:bg-white/[0.05]'"
          >
            <input
              type="checkbox"
              class="w-4 h-4 shrink-0 accent-orange-500 cursor-pointer"
              :checked="migrateSelectedIds.includes(item.id)"
              @change="toggleMigrateSelect(item.id)"
            />
            <span class="text-xs text-slate-400 whitespace-nowrap">{{ formatSelectDate(item.timestamp) }}</span>
            <span class="text-sm text-slate-200 truncate">{{ item.title || item.text.slice(0, 40) }}</span>
          </label>
        </div>
        <div class="flex justify-end gap-2 px-6 py-4 border-t border-white/[0.08]">
          <button class="px-5 py-2 rounded-lg border border-white/15 bg-transparent text-slate-400 text-sm cursor-pointer hover:bg-white/[0.06] hover:text-slate-50 transition-all" @click="migrateSelectOpen = false">キャンセル</button>
          <button
            class="px-5 py-2 rounded-lg border-none bg-gradient-to-br from-orange-500 to-pink-500 text-slate-50 text-sm font-medium cursor-pointer hover:opacity-90 transition-opacity disabled:opacity-40 disabled:cursor-not-allowed"
            :disabled="migrateSelectedIds.length === 0"
            @click="runMigrateSelected"
          >再生成</button>
        </div>
      </div>
    </div>

    <!-- 達成リスト再生成 選択モーダル -->
    <div v-if="achievementSelectOpen" class="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-[100]" @click.self="achievementSelectOpen = false">
      <div class="w-full max-w-[480px] bg-[#1e293b] border border-white/10 rounded-2xl shadow-[0_24px_80px_rgba(0,0,0,0.5)] flex flex-col max-h-[90vh]">
        <div class="flex items-center justify-between px-6 pt-5 pb-4 border-b border-white/[0.08]">
          <div>
            <h2 class="m-0 text-lg text-slate-50 font-semibold">達成リストを再生成</h2>
            <p class="m-0 mt-0.5 text-xs text-slate-500">対象の中間データを選択してください</p>
          </div>
          <button class="bg-transparent border-none text-slate-500 text-lg cursor-pointer px-2 py-1 rounded-md hover:text-slate-50 transition-colors" @click="achievementSelectOpen = false">✕</button>
        </div>
        <div class="px-4 py-3 overflow-y-auto flex flex-col gap-1 flex-1 [scrollbar-width:thin] [scrollbar-color:rgba(249,115,22,0.3)_transparent]">
          <div v-if="achievementSourceItems.length === 0" class="text-center text-slate-600 text-sm py-6">
            中間データがありません
          </div>
          <template v-else>
            <label class="flex items-center gap-3 px-3 py-2 rounded-lg cursor-pointer border-b border-white/[0.06] mb-1 hover:bg-white/[0.05] transition-colors">
              <input
                type="checkbox"
                class="w-4 h-4 shrink-0 accent-orange-500 cursor-pointer"
                :checked="achievementAllSelected"
                :indeterminate="achievementSomeSelected"
                @change="toggleAchievementAll"
              />
              <span class="text-xs text-slate-400 font-medium">全て選択</span>
            </label>
            <label
              v-for="item in achievementSourceItems"
              :key="item.id"
              class="flex items-center gap-3 px-3 py-2.5 rounded-lg cursor-pointer transition-colors"
              :class="achievementSelectedIds.includes(item.id) ? 'bg-orange-500/15' : 'hover:bg-white/[0.05]'"
            >
              <input
                type="checkbox"
                class="w-4 h-4 shrink-0 accent-orange-500 cursor-pointer"
                :checked="achievementSelectedIds.includes(item.id)"
                @change="toggleAchievementSelect(item.id)"
              />
              <span class="text-xs text-slate-400 whitespace-nowrap">{{ formatSelectDate(item.timestamp) }}</span>
              <span class="text-sm text-slate-200 truncate">{{ item.title || item.text.slice(0, 40) }}</span>
            </label>
          </template>
        </div>
        <div class="flex justify-end gap-2 px-6 py-4 border-t border-white/[0.08]">
          <button class="px-5 py-2 rounded-lg border border-white/15 bg-transparent text-slate-400 text-sm cursor-pointer hover:bg-white/[0.06] hover:text-slate-50 transition-all" @click="achievementSelectOpen = false">キャンセル</button>
          <button
            class="px-5 py-2 rounded-lg border-none bg-gradient-to-br from-orange-500 to-pink-500 text-slate-50 text-sm font-medium cursor-pointer hover:opacity-90 transition-opacity disabled:opacity-40 disabled:cursor-not-allowed"
            :disabled="achievementSelectedIds.length === 0"
            @click="runAchievementGenerate"
          >再生成</button>
        </div>
      </div>
    </div>

    <!-- 達成リスト削除確認 -->
    <div v-if="deletingAchievementId" class="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-[100]" @click.self="deletingAchievementId = null">
      <div class="w-full max-w-[300px] bg-[#1e293b] border border-white/10 rounded-2xl shadow-[0_24px_80px_rgba(0,0,0,0.5)] p-6 flex flex-col gap-5">
        <p class="m-0 text-slate-200 text-sm text-center">この達成を削除しますか？</p>
        <div class="flex justify-center gap-2">
          <button class="px-5 py-2 rounded-lg border border-white/15 bg-transparent text-slate-400 text-sm cursor-pointer hover:bg-white/[0.06] hover:text-slate-50 transition-all" @click="deletingAchievementId = null">キャンセル</button>
          <button class="px-5 py-2 rounded-lg border-none bg-red-500/80 text-slate-50 text-sm font-medium cursor-pointer hover:bg-red-500 transition-colors" @click="confirmDeleteAchievement">削除</button>
        </div>
      </div>
    </div>

    <!-- 単語クリック時のAI分析ポップアップ -->
    <HagemashiTopicAnalysisModal
      v-if="activeWordPopup"
      :key="`word-${activeWordPopup.name}`"
      :title="activeWordPopup.name"
      :meta="`出現回数: ${activeWordPopup.count}回`"
      :keyword="activeWordPopup.name"
      scope="word"
      :matched-items="activeWordMatches"
      show-exclude
      @close="activeWordPopup = null"
      @exclude="confirmingStopword = activeWordPopup!.name; activeWordPopup = null"
    />

    <!-- 心の要素クリック時のAI分析ポップアップ -->
    <HagemashiTopicAnalysisModal
      v-if="activeKokoroPopup"
      :key="`kokoro-${activeKokoroPopup.name}`"
      :title="activeKokoroPopup.name"
      :note="activeKokoroPopup.note"
      :keyword="activeKokoroPopup.name"
      scope="kokoro"
      :matched-items="activeKokoroMatches"
      @close="activeKokoroPopup = null"
    />

    <!-- 強み・アドバイスの要素クリック時のAI分析ポップアップ -->
    <HagemashiTopicAnalysisModal
      v-if="activeProfilePopup"
      :key="`profile-${activeProfilePopup.name}`"
      :title="activeProfilePopup.name"
      :note="activeProfilePopup.note"
      :keyword="activeProfilePopup.name"
      :scope="activeTab"
      :matched-items="activeProfileMatches"
      @close="activeProfilePopup = null"
    />

    <!-- 除外単語追加確認 -->
    <div v-if="confirmingStopword" class="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-[100]" @click.self="confirmingStopword = null">
      <div class="w-full max-w-[300px] bg-[#1e293b] border border-white/10 rounded-2xl shadow-[0_24px_80px_rgba(0,0,0,0.5)] p-6 flex flex-col gap-5">
        <p class="m-0 text-slate-200 text-sm text-center">「{{ confirmingStopword }}」を除外単語に追加しますか？</p>
        <div class="flex justify-center gap-2">
          <button class="px-5 py-2 rounded-lg border border-white/15 bg-transparent text-slate-400 text-sm cursor-pointer hover:bg-white/[0.06] hover:text-slate-50 transition-all" @click="confirmingStopword = null">キャンセル</button>
          <button class="px-5 py-2 rounded-lg border-none bg-gradient-to-br from-orange-500 to-pink-500 text-slate-50 text-sm font-medium cursor-pointer hover:opacity-90 transition-opacity" @click="addToStoplist(confirmingStopword!); confirmingStopword = null">追加</button>
        </div>
      </div>
    </div>

    <!-- 中間データ削除確認 -->
    <div v-if="deletingSummaryTarget" class="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-[100]" @click.self="deletingSummaryTarget = null">
      <div class="w-full max-w-[300px] bg-[#1e293b] border border-white/10 rounded-2xl shadow-[0_24px_80px_rgba(0,0,0,0.5)] p-6 flex flex-col gap-5">
        <p class="m-0 text-slate-200 text-sm text-center">このデータを削除しますか？</p>
        <div class="flex justify-center gap-2">
          <button class="px-5 py-2 rounded-lg border border-white/15 bg-transparent text-slate-400 text-sm cursor-pointer hover:bg-white/[0.06] hover:text-slate-50 transition-all" @click="deletingSummaryTarget = null">キャンセル</button>
          <button class="px-5 py-2 rounded-lg border-none bg-red-500/80 text-slate-50 text-sm font-medium cursor-pointer hover:bg-red-500 transition-colors" @click="confirmDeleteSummaryRow">削除</button>
        </div>
      </div>
    </div>

    <!-- 除外単語モーダル -->
    <div v-if="stoplistOpen" class="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-[100]" @click.self="stoplistOpen = false">
      <div class="w-full max-w-[420px] bg-[#1e293b] border border-white/10 rounded-2xl shadow-[0_24px_80px_rgba(0,0,0,0.5)] flex flex-col max-h-[90vh]">
        <div class="flex items-center justify-between px-6 pt-5 pb-4 border-b border-white/[0.08]">
          <div>
            <h2 class="m-0 text-lg text-slate-50 font-semibold">除外単語</h2>
            <p class="m-0 mt-0.5 text-xs text-slate-500">単語ランキングから除外する単語を管理</p>
          </div>
          <button class="bg-transparent border-none text-slate-500 text-lg cursor-pointer px-2 py-1 rounded-md hover:text-slate-50 transition-colors" @click="stoplistOpen = false">✕</button>
        </div>
        <div class="px-4 py-4 overflow-y-auto flex flex-col gap-3 flex-1 [scrollbar-width:thin] [scrollbar-color:rgba(249,115,22,0.3)_transparent]">
          <div v-if="editingStoplist.length === 0" class="text-center text-slate-600 text-sm py-4">
            除外単語がありません
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
          <div class="flex items-center gap-2 pt-1 border-t border-white/[0.06]">
            <input
              v-model="newStopword"
              type="text"
              placeholder="単語を追加..."
              class="flex-1 bg-white/[0.05] border border-white/[0.10] rounded-lg text-slate-200 text-sm px-3 py-2 outline-none focus:border-orange-500 transition-colors font-[inherit]"
              @keydown.enter="addStopwordInput"
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
    <div v-if="encourageOpen" class="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-[100]" @click.self="encourageOpen = false">
      <div class="w-full max-w-[600px] bg-[#1e293b] border border-white/10 rounded-2xl shadow-[0_24px_80px_rgba(0,0,0,0.5)] flex flex-col max-h-[90vh]">
        <div class="flex items-center justify-between px-6 pt-5 pb-4 border-b border-white/[0.08]">
          <h2 class="m-0 text-lg text-slate-50 font-semibold">💪 はげまし</h2>
          <button class="bg-transparent border-none text-slate-500 text-lg cursor-pointer px-2 py-1 rounded-md hover:text-slate-50 transition-colors" @click="encourageOpen = false">✕</button>
        </div>
        <div class="px-6 py-5 overflow-y-auto flex flex-col gap-3 flex-1">
          <div v-if="isEncouraging" class="flex items-center justify-center gap-2.5 py-8 text-slate-400 text-sm">
            <span class="w-5 h-5 rounded-full border-2 border-orange-500/30 border-t-orange-500 animate-spin block" />
            はげましを考えています...
          </div>
          <div v-else class="text-[#e2e8f0] text-sm leading-relaxed [&_h1]:text-slate-50 [&_h2]:text-slate-50 [&_h3]:text-slate-50 [&_h2]:text-[15px] [&_h2]:my-4 [&_p]:m-0 [&_p]:mb-2.5 [&_ul]:m-0 [&_ul]:mb-2.5 [&_ul]:pl-5 [&_li]:mb-1 [&_strong]:text-slate-50 [&_strong]:font-semibold [&_hr]:border-none [&_hr]:border-t [&_hr]:border-white/[0.08] [&_hr]:my-3" v-html="parsedResult" />
        </div>
        <div class="flex justify-end gap-2 px-6 py-4 pb-5 border-t border-white/[0.08]">
          <button class="px-5 py-2 rounded-lg border border-white/15 bg-transparent text-slate-400 text-sm cursor-pointer hover:bg-white/[0.06] hover:text-slate-50 transition-all" @click="copyResult">{{ resultCopied ? 'コピーしました' : 'コピー' }}</button>
          <button class="px-5 py-2 rounded-lg border-none bg-gradient-to-br from-orange-500 to-pink-500 text-slate-50 text-sm font-medium cursor-pointer hover:opacity-90 transition-opacity" @click="encourageOpen = false">閉じる</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ alias: ['/hagemashi', '/hagemashi/'] })
import { ref, computed, onMounted, watch } from 'vue'
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
const textInputValue = ref('')
const isSubmittingText = ref(false)
const showSettingsMenu = ref(false)
const isMigrating = ref(false)
const migrateStatus = ref('')
const migrateSelectOpen = ref(false)
const migrateSelectedIds = ref<string[]>([])
const selectOpen = ref(false)
const selectedIds = ref<string[]>([])
const encourageOpen = ref(false)
const encourageResult = ref('')
const exportOpen = ref(false)
const exportSelectedDates = ref<string[]>([])
const resultCopied = ref(false)
const isEncouraging = ref(false)
type RecordingTab = 'transcription' | 'words' | 'summary' | 'achievement' | 'kokoro' | 'strengths' | 'achieved' | 'advice' | 'encourage'
type TabKey = 'consult' | 'mood' | RecordingTab
const TAB_KEYS: TabKey[] = ['transcription', 'words', 'summary', 'achievement', 'kokoro', 'strengths', 'achieved', 'advice', 'encourage', 'consult', 'mood']

// URL クエリ（?tab=）とタブ状態を双方向同期する
const route = useRoute()
const router = useRouter()
const routeTab = () => {
  const t = route.query.tab
  return typeof t === 'string' && (TAB_KEYS as string[]).includes(t) ? (t as TabKey) : null
}
const activeTab = ref<TabKey>(routeTab() ?? 'kokoro')

watch(activeTab, (v) => {
  if (route.query.tab !== v) router.replace({ query: { ...route.query, tab: v } })
})
watch(() => route.query.tab, () => {
  const t = routeTab()
  if (t && t !== activeTab.value) activeTab.value = t
})

// 常に表示する主タブ
const primaryTabs: { key: RecordingTab; label: string; short: string }[] = [
  { key: 'kokoro', label: '心', short: '心' },
  { key: 'strengths', label: '強み', short: '強み' },
  { key: 'achieved', label: '達成', short: '達成' },
  { key: 'advice', label: 'アドバイス', short: '助言' },
]
// 展開アイコンを開くと表示する副タブ
const secondaryTabs: { key: RecordingTab; label: string; short: string }[] = [
  { key: 'transcription', label: '記録', short: '記録' },
  { key: 'words', label: '単語', short: '単語' },
  { key: 'summary', label: '中間データ', short: '中間' },
  // { key: 'achievement', label: '達成リスト', short: '達成' }, // 「達成」ツリーマップタブに統合したためコメントアウト
  { key: 'encourage', label: 'はげまし', short: 'はげ' },
]
const recordingTabs: { key: RecordingTab; label: string; short: string }[] = [...primaryTabs, ...secondaryTabs]
const isRecordingTab = computed(() => recordingTabs.some(t => t.key === activeTab.value))
// 副タブの表示状態（明示的に展開したとき、または副タブが選択中のとき表示）
const showMoreTabs = ref(false)
const secondaryVisible = computed(() => showMoreTabs.value || secondaryTabs.some(t => t.key === activeTab.value))
function openRecording() {
  if (!isRecordingTab.value) activeTab.value = 'kokoro'
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

// --- ログ（記録・相談・気分の利用回数） ---
const logOpen = ref(false)
const consultDates = ref<string[]>([])
const recordDates = computed(() => history.value.map(h => h.timestamp))
const moodDates = computed(() => moodEntries.value.map(m => m.createdAt))

// 相談チャットの発言（ConsultChat から常時ミラーされる。中間データへの取り込みに使う）
interface ConsultMessage { role: 'user' | 'assistant'; content: string; timestamp?: string }
const consultMessages = ref<ConsultMessage[]>([])

const LS_DICTIONARY = 'hagemashi-dictionary'
const LS_WORD_RANKING = 'hagemashi-word-ranking'
const LS_PROFILE = 'hagemashi-profile'
const LS_ACHIEVED = 'hagemashi-achieved'
const LS_KOKORO = 'hagemashi-kokoro'
const LS_MOOD = 'hagemashi-mood'

// --- 気分（10段階＋テキスト）---
interface MoodEntry { id: string; score: number; note: string; createdAt: string }
const moodEntries = ref<MoodEntry[]>([])
const moodScore = ref<number | null>(null)
const moodNote = ref('')
const isSavingMood = ref(false)
const moodInputOpen = ref(false)

// 気分スコア(1〜10)を赤→緑のグラデーション色に変換
const moodColor = (score: number): string => {
  const hue = ((Math.max(1, Math.min(10, score)) - 1) / 9) * 120
  return `hsl(${hue}, 70%, 50%)`
}

// 履歴一覧（新しい順・日時整形済み）
const formatMoodDate = (iso: string): string => {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  const hh = String(d.getHours()).padStart(2, '0')
  const mi = String(d.getMinutes()).padStart(2, '0')
  return `${mm}/${dd} ${hh}:${mi}`
}
const moodHistoryRows = computed(() =>
  [...moodEntries.value]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .map(m => ({ ...m, date: formatMoodDate(m.createdAt) }))
)

const persistMoods = async () => {
  if ($dev) {
    localStorage.setItem(LS_MOOD, JSON.stringify(moodEntries.value))
    return
  }
  try {
    await $fetch('/api/hagemashi/mood', { method: 'POST', body: { entries: moodEntries.value } })
  } catch (e: any) {
    error.value = e?.data?.message || '気分の保存に失敗しました'
  }
}

// 気分ボタン → 入力モーダルを開く（気分タブに切り替えてグラフも見せる）
const openMoodInput = () => {
  activeTab.value = 'mood'
  moodScore.value = null
  moodNote.value = ''
  moodInputOpen.value = true
}
const closeMoodInput = () => {
  if (isSavingMood.value) return
  moodInputOpen.value = false
}

const saveMood = async () => {
  if (!moodScore.value || isSavingMood.value) return
  isSavingMood.value = true
  try {
    moodEntries.value = [
      ...moodEntries.value,
      { id: Date.now().toString(), score: moodScore.value, note: moodNote.value.trim(), createdAt: new Date().toISOString() },
    ]
    await persistMoods()
    moodScore.value = null
    moodNote.value = ''
    moodInputOpen.value = false
  } finally {
    isSavingMood.value = false
  }
}

const deleteMood = async (id: string) => {
  moodEntries.value = moodEntries.value.filter(m => m.id !== id)
  if (editingMoodId.value === id) editingMoodId.value = null
  await persistMoods()
}

// --- 履歴の編集 ---
const editingMoodId = ref<string | null>(null)
const editingMoodScore = ref<number>(0)
const editingMoodNote = ref('')
const startEditMood = (row: MoodEntry) => {
  editingMoodId.value = row.id
  editingMoodScore.value = row.score
  editingMoodNote.value = row.note
}
const cancelMoodEdit = () => {
  editingMoodId.value = null
}
const saveMoodEdit = async (id: string) => {
  const target = moodEntries.value.find(m => m.id === id)
  if (!target || !editingMoodScore.value) return
  moodEntries.value = moodEntries.value.map(m =>
    m.id === id ? { ...m, score: editingMoodScore.value, note: editingMoodNote.value.trim() } : m
  )
  editingMoodId.value = null
  await persistMoods()
}

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

interface StrengthItem { title: string; content: string; weight?: number }
interface ProfileData { strengths: StrengthItem[] | string; advice: StrengthItem[] | string; generatedAt: string }
const profileHistory = ref<ProfileData[]>([])
const isProfileLoading = ref(false)

// --- こころ（心の状態 treemap） ---
interface KokoroLeaf { name: string; weight: number; note: string }
interface KokoroData { charge: KokoroLeaf[]; stress: KokoroLeaf[]; summary: string; generatedAt: string }
const kokoroHistory = ref<KokoroData[]>([])
const isKokoroLoading = ref(false)
const expandedKokoroIndices = ref(new Set<number>())
const toggleKokoroHistory = (i: number) => {
  if (expandedKokoroIndices.value.has(i)) expandedKokoroIndices.value.delete(i)
  else expandedKokoroIndices.value.add(i)
  expandedKokoroIndices.value = new Set(expandedKokoroIndices.value)
}
const generateKokoro = async () => {
  if (isKokoroLoading.value) return
  isKokoroLoading.value = true
  try {
    // combinedSummaryRows（記録＋相談の発言＋気分のテキスト）は新しい順のため、古い→新しいの時系列順にしてサーバーに渡す
    // （サーバー側で初期・中期・直近に3等分し、期間全体から均等に分析する）
    const res = await $fetch<KokoroData>('/api/hagemashi/kokoro', {
      method: 'POST',
      body: {
        summaryItems: [...combinedSummaryRows.value].reverse().map(r => ({ sentiment: r.sentiment, text: r.text, date: r.fullDate })),
        wordRanking: wordRanking.value.slice(0, 50),
      },
    })
    kokoroHistory.value = [res, ...kokoroHistory.value]
    if ($dev) {
      localStorage.setItem(LS_KOKORO, JSON.stringify(kokoroHistory.value))
    }
  } catch (e) {
    console.error(e)
  } finally {
    isKokoroLoading.value = false
  }
}

interface Achievement { id: string; sourceId: string; date: string; text: string; level: number }
const achievements = ref<Achievement[]>([])
const expandedProfileIndices = ref(new Set<number>())
const toggleProfileHistory = (i: number) => {
  if (expandedProfileIndices.value.has(i)) expandedProfileIndices.value.delete(i)
  else expandedProfileIndices.value.add(i)
  expandedProfileIndices.value = new Set(expandedProfileIndices.value)
}

// 長期傾向タブ（強み / アドバイス）: 表示中タブに応じて色と対象フィールドを切り替える
const isProfileTab = computed(() => activeTab.value === 'strengths' || activeTab.value === 'advice')
const profileColor = computed(() => (activeTab.value === 'advice' ? '#fbbf24' : '#34d399'))
const profileTabLabel = computed(() => (activeTab.value === 'advice' ? 'アドバイス' : '強み'))
const profileItemsOf = (p: ProfileData | undefined): StrengthItem[] => {
  if (!p) return []
  const v = activeTab.value === 'advice' ? p.advice : p.strengths
  return Array.isArray(v) ? v : []
}

const formatProfileDate = (iso: string): string => {
  if (!iso) return ''
  const d = toJSTDate(iso)
  return `${d.getUTCFullYear()}/${String(d.getUTCMonth() + 1).padStart(2, '0')}/${String(d.getUTCDate()).padStart(2, '0')} ${String(d.getUTCHours()).padStart(2, '0')}:${String(d.getUTCMinutes()).padStart(2, '0')}`
}

const generateProfile = async () => {
  if (isProfileLoading.value) return
  isProfileLoading.value = true
  try {
    // combinedSummaryRows（記録＋相談の発言＋気分のテキスト）は新しい順のため、古い→新しいの時系列順にしてサーバーに渡す
    // （サーバー側で初期・中期・直近に3等分し、期間全体から均等に分析する）
    const res = await $fetch<ProfileData>('/api/hagemashi/profile', {
      method: 'POST',
      body: {
        summaryItems: [...combinedSummaryRows.value].reverse().map(r => ({ sentiment: r.sentiment, text: r.text, date: r.fullDate })),
        wordRanking: wordRanking.value.slice(0, 50),
        vision: vision.value,
      },
    })
    profileHistory.value = [res, ...profileHistory.value]
    if ($dev) {
      localStorage.setItem(LS_PROFILE, JSON.stringify(profileHistory.value))
    }
  } catch (e) {
    console.error(e)
  } finally {
    isProfileLoading.value = false
  }
}

// --- 達成（達成した内容の treemap） ---
interface AchievedItem { title: string; content: string; weight?: number }
interface AchievedData { items: AchievedItem[]; summary: string; generatedAt: string }
const achievedHistory = ref<AchievedData[]>([])
const isAchievedLoading = ref(false)
const expandedAchievedIndices = ref(new Set<number>())
const toggleAchievedHistory = (i: number) => {
  if (expandedAchievedIndices.value.has(i)) expandedAchievedIndices.value.delete(i)
  else expandedAchievedIndices.value.add(i)
  expandedAchievedIndices.value = new Set(expandedAchievedIndices.value)
}
const generateAchieved = async () => {
  if (isAchievedLoading.value) return
  isAchievedLoading.value = true
  try {
    // combinedSummaryRows（記録＋相談の発言＋気分のテキスト）は新しい順のため、古い→新しいの時系列順にしてサーバーに渡す
    // （サーバー側で初期・中期・直近に3等分し、期間全体から均等に分析する）
    const res = await $fetch<AchievedData>('/api/hagemashi/achieved', {
      method: 'POST',
      body: {
        summaryItems: [...combinedSummaryRows.value].reverse().map(r => ({ sentiment: r.sentiment, text: r.text, date: r.fullDate })),
        wordRanking: wordRanking.value.slice(0, 50),
      },
    })
    achievedHistory.value = [res, ...achievedHistory.value]
    if ($dev) {
      localStorage.setItem(LS_ACHIEVED, JSON.stringify(achievedHistory.value))
    }
  } catch (e) {
    console.error(e)
  } finally {
    isAchievedLoading.value = false
  }
}

interface WordEntry { word: string; count: number }
const wordRanking = ref<WordEntry[]>([])

// ワードクラウドに表示する最小出現回数（1〜10、localStorageに保存）
const LS_MIN_WORD_COUNT = 'hagemashi-min-word-count'
const minWordCount = ref(3)
watch(minWordCount, (v) => {
  localStorage.setItem(LS_MIN_WORD_COUNT, String(v))
})
const filteredWordRanking = computed(() => wordRanking.value.filter(w => w.count >= minWordCount.value))
const isTokenizing = ref(false)

const LS_STOPLIST = 'hagemashi-stoplist'
const DEFAULT_STOPLIST = ['今日', '自分', '本当', '非常', '最近', '昨日', '意味', '結構', '頑張', '一緒', '面白', '大事', '普通', '必要', '部分', '話聞', '最後']
const stoplist = ref<string[]>([...DEFAULT_STOPLIST])
const stoplistSet = computed(() => new Set(stoplist.value))
const stoplistOpen = ref(false)
const editingStoplist = ref<string[]>([])
const newStopword = ref('')
const confirmingStopword = ref<string | null>(null)

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
  saveStoplist()
  stoplistOpen.value = false
  reTokenize()
}

function addToStoplist(word: string) {
  if (!stoplist.value.includes(word)) {
    stoplist.value.push(word)
    saveStoplist()
    reTokenize()
  }
}

function addStopwordInput() {
  const w = newStopword.value.trim()
  if (w && !editingStoplist.value.includes(w)) {
    editingStoplist.value.push(w)
    newStopword.value = ''
  }
}

function extractWords(text: string): string[] {
  const words: string[] = []
  const kanjiRe = /[一-鿿㐀-䶿]{2,}/g
  const katakanaRe = /[゠-ヿ]{2,}/g
  let m
  while ((m = kanjiRe.exec(text)) !== null) if (!stoplistSet.value.has(m[0])) words.push(m[0])
  while ((m = katakanaRe.exec(text)) !== null) if (!stoplistSet.value.has(m[0])) words.push(m[0])
  return words
}

async function reTokenize() {
  if (isTokenizing.value) return
  isTokenizing.value = true
  await new Promise(r => setTimeout(r, 0))
  try {
    const freq = new Map<string, number>()
    for (const item of history.value) {
      for (const w of extractWords(item.text)) {
        freq.set(w, (freq.get(w) ?? 0) + 1)
      }
    }
    const sorted = [...freq.entries()]
      .map(([word, count]) => ({ word, count }))
      .sort((a, b) => b.count - a.count)
    wordRanking.value = sorted
    if ($dev) {
      localStorage.setItem(LS_WORD_RANKING, JSON.stringify(sorted))
    } else {
      $fetch('/api/hagemashi/word-ranking', { method: 'POST', body: { words: sorted } }).catch(console.error)
    }
  } finally {
    isTokenizing.value = false
  }
}

const { isLoggedIn, checked, checkAuth, logout } = useAuth()

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
  const storedMinCount = localStorage.getItem(LS_MIN_WORD_COUNT)
  if (storedMinCount) {
    const n = parseInt(storedMinCount)
    if (!isNaN(n) && n >= 1 && n <= 10) minWordCount.value = n
  }
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
    const cachedRanking = localStorage.getItem(LS_WORD_RANKING)
    if (cachedRanking) {
      try { wordRanking.value = JSON.parse(cachedRanking) } catch {}
    }
  }
  if ($dev) {
    const cachedProfile = localStorage.getItem(LS_PROFILE)
    if (cachedProfile) {
      try {
        const raw = JSON.parse(cachedProfile)
        profileHistory.value = Array.isArray(raw) ? raw : [raw]
      } catch {}
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
    const cachedAchieved = localStorage.getItem(LS_ACHIEVED)
    if (cachedAchieved) {
      try {
        const raw = JSON.parse(cachedAchieved)
        achievedHistory.value = Array.isArray(raw) ? raw : [raw]
      } catch {}
    }
  }
  if ($dev) {
    const cachedKokoro = localStorage.getItem(LS_KOKORO)
    if (cachedKokoro) {
      try {
        const raw = JSON.parse(cachedKokoro)
        kokoroHistory.value = Array.isArray(raw) ? raw : [raw]
      } catch {}
    }
  }
  if ($dev) {
    const cachedMood = localStorage.getItem(LS_MOOD)
    if (cachedMood) {
      try {
        const raw = JSON.parse(cachedMood)
        moodEntries.value = Array.isArray(raw) ? raw : []
      } catch {}
    }
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
      if (!loggedIn) { wordRanking.value = []; dictionary.value = []; profileHistory.value = []; achievements.value = []; kokoroHistory.value = []; achievedHistory.value = []; moodEntries.value = []; stoplist.value = [...DEFAULT_STOPLIST]; vision.value = ''; return }
      const [ranking, dict, profile, sl, ach, kokoro, achieved, mood, vis] = await Promise.allSettled([
        $fetch<WordEntry[]>('/api/hagemashi/word-ranking'),
        $fetch<DictionaryEntry[]>('/api/hagemashi/dictionary'),
        $fetch<{ profiles: ProfileData[] }>('/api/hagemashi/profile'),
        $fetch<string[]>('/api/hagemashi/stoplist'),
        $fetch<Achievement[]>('/api/hagemashi/achievements'),
        $fetch<{ entries: KokoroData[] }>('/api/hagemashi/kokoro'),
        $fetch<{ entries: AchievedData[] }>('/api/hagemashi/achieved'),
        $fetch<{ entries: MoodEntry[] }>('/api/hagemashi/mood'),
        $fetch<string>('/api/hagemashi/vision'),
      ])
      wordRanking.value = ranking.status === 'fulfilled' ? ranking.value : []
      dictionary.value = dict.status === 'fulfilled' ? dict.value : []
      profileHistory.value = profile.status === 'fulfilled' ? (profile.value?.profiles ?? []) : []
      stoplist.value = (sl.status === 'fulfilled' && sl.value.length > 0) ? sl.value : [...DEFAULT_STOPLIST]
      achievements.value = ach.status === 'fulfilled' && Array.isArray(ach.value) ? ach.value : []
      kokoroHistory.value = kokoro.status === 'fulfilled' ? (kokoro.value?.entries ?? []) : []
      achievedHistory.value = achieved.status === 'fulfilled' ? (achieved.value?.entries ?? []) : []
      moodEntries.value = mood.status === 'fulfilled' ? (mood.value?.entries ?? []) : []
      vision.value = vis.status === 'fulfilled' ? (vis.value || '') : ''
      maybeAutoPromptVision()
    },
    { immediate: true }
  )
}

const parsedResult = computed(() => marked.parse(encourageResult.value || '') as string)

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
const allSelected = computed(() => history.value.length > 0 && selectedIds.value.length === history.value.length)
const someSelected = computed(() => selectedIds.value.length > 0 && selectedIds.value.length < history.value.length)

const toggleAll = () => {
  if (allSelected.value) {
    selectedIds.value = []
  } else {
    selectedIds.value = history.value.map(i => i.id)
  }
}

const openSelectModal = () => {
  selectedIds.value = history.value.length > 0 ? [history.value[0].id] : []
  selectOpen.value = true
}

const closeSelectModal = () => {
  selectOpen.value = false
  activeTab.value = 'encourage'
}

const toggleSelect = (id: string) => {
  const idx = selectedIds.value.indexOf(id)
  if (idx === -1) selectedIds.value.push(id)
  else selectedIds.value.splice(idx, 1)
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
  const items = history.value.filter(item => selectedIds.value.includes(item.id))
  if (!items.length) return
  const texts = items.map(item => getNotesText(item))
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
    activeTab.value = 'encourage'
  } catch (err) {
    encourageResult.value = err instanceof Error ? err.message : 'はげましの生成に失敗しました'
  } finally {
    isEncouraging.value = false
  }
}

// --- 中間データ再生成 ---
const migrateAllSelected = computed(() => history.value.length > 0 && migrateSelectedIds.value.length === history.value.length)
const migrateSomeSelected = computed(() => migrateSelectedIds.value.length > 0 && migrateSelectedIds.value.length < history.value.length)

const toggleMigrateAll = () => {
  if (migrateAllSelected.value) migrateSelectedIds.value = []
  else migrateSelectedIds.value = history.value.map(i => i.id)
}

const toggleMigrateSelect = (id: string) => {
  const idx = migrateSelectedIds.value.indexOf(id)
  if (idx === -1) migrateSelectedIds.value.push(id)
  else migrateSelectedIds.value.splice(idx, 1)
}

const openMigrateSelect = () => {
  migrateSelectedIds.value = history.value.map(i => i.id)
  migrateSelectOpen.value = true
}

const runMigrateSelected = async () => {
  migrateSelectOpen.value = false
  const targets = history.value.filter(i => migrateSelectedIds.value.includes(i.id))
  if (!targets.length || isMigrating.value) return
  isMigrating.value = true
  let done = 0
  migrateStatus.value = `0/${targets.length}件...`
  for (const item of targets) {
    try {
      const res = await $fetch<{ notes: string }>('/api/hagemashi/summary', {
        method: 'POST',
        body: { text: item.text },
      })
      if (res.notes) updateHistoryNotes(item.id, res.notes)
    } catch (e) {
      console.error(e)
    }
    done++
    migrateStatus.value = `${done}/${targets.length}件...`
  }
  migrateStatus.value = `完了 ${done}/${targets.length}件`
  setTimeout(() => { migrateStatus.value = '' }, 4000)
  isMigrating.value = false
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

const editingSummaryId = ref<string | null>(null)
const editingSentiment = ref<'ポジ' | 'ネガ'>('ポジ')
const editingText = ref('')
const editingItemIndex = ref<number | null>(null)
const deletingSummaryTarget = ref<{ id: string; itemIndex: number | null } | null>(null)

const startEditSummary = (row: { id: string; sentiment: 'ポジ' | 'ネガ'; text: string; itemIndex: number | null }) => {
  editingSummaryId.value = row.id
  editingSentiment.value = row.sentiment
  editingText.value = row.text
  editingItemIndex.value = row.itemIndex
}

const cancelSummary = () => {
  editingSummaryId.value = null
  editingItemIndex.value = null
}

const saveSummary = (id: string) => {
  if (editingItemIndex.value !== null) {
    const item = history.value.find(h => h.id === id)
    if (!item) return
    const parsed = parseSummaryNote(item.notes)
    if (!parsed || !('items' in parsed)) return
    const newItems = parsed.items.map((n, i) =>
      i === editingItemIndex.value ? { sentiment: editingSentiment.value, text: editingText.value } : n
    )
    updateHistoryNotes(id, JSON.stringify({ items: newItems }))
  } else {
    updateHistoryNotes(id, JSON.stringify({ sentiment: editingSentiment.value, text: editingText.value }))
  }
  editingSummaryId.value = null
  editingItemIndex.value = null
}

const confirmDeleteSummaryRow = () => {
  if (!deletingSummaryTarget.value) return
  deleteSummaryRow(deletingSummaryTarget.value.id, deletingSummaryTarget.value.itemIndex)
  deletingSummaryTarget.value = null
}

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

// 相談のユーザー発言・気分の自由記述テキストも中間データに取り込む（AI分析の入力にのみ使う。
// 中間データタブの一覧・編集・削除の対象は history 由来の summaryRows のままにする＝
// consult/mood は元データ側（相談・気分タブ）を編集・削除すれば自動的にここからも消える）
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

  const moodRows: SummaryRow[] = moodEntries.value
    .filter(e => e.note && e.note.trim())
    .map(e => {
      const d = toJSTDate(e.createdAt)
      return {
        id: `mood-${e.id}`,
        ts: d.getTime(),
        date: `${String(d.getUTCMonth() + 1).padStart(2, '0')}/${String(d.getUTCDate()).padStart(2, '0')}`,
        fullDate: `${d.getUTCFullYear()}/${d.getUTCMonth() + 1}/${d.getUTCDate()}`,
        sentiment: e.score >= 6 ? 'ポジ' as const : 'ネガ' as const,
        text: e.note.trim(),
        itemIndex: null,
      }
    })

  // ts 降順（新しい順）に統一する。summaryRows 単体では history の並び順に依存していたが、
  // consult/mood を混ぜるとその前提が崩れるため、ここで明示的にソートする
  return [...summaryRows.value, ...consultRows, ...moodRows].sort((a, b) => b.ts - a.ts)
})

// --- 単語・心クリック時のAI分析ポップアップ（キャッシュ・保存はしない） ---
interface ActiveWordPopup { name: string; count: number }
interface ActiveKokoroPopup { name: string; note: string; group: string; weight: number }
interface ActiveProfilePopup { name: string; note: string; weight: number }
const activeWordPopup = ref<ActiveWordPopup | null>(null)
const activeKokoroPopup = ref<ActiveKokoroPopup | null>(null)
const activeProfilePopup = ref<ActiveProfilePopup | null>(null)

// summaryRows は新しい順のため、AIには古い→新しいの時系列順で渡す
// （新しい順のまま渡すと直近の内容が先頭に来て過度に強調されやすいため）
const activeWordMatches = computed(() => {
  if (!activeWordPopup.value) return []
  const keyword = activeWordPopup.value.name
  return summaryRows.value
    .filter(r => r.text.includes(keyword))
    .map(r => ({ date: r.fullDate, text: r.text }))
    .reverse()
})
// 心の要素名はAIが生成した抽象的なラベルのため文字列一致では拾えない。
// 中間データ全体をそのままAIに渡し、意味的な関連判断はAI自身にやらせる
// （直近だけに絞ると古い記録が最初から候補に入らず、直近の内容ばかりになる）
const activeKokoroMatches = computed(() => {
  if (!activeKokoroPopup.value) return []
  return combinedSummaryRows.value.map(r => ({ date: r.fullDate, text: r.text })).reverse()
})
// 強み・アドバイスの項目も抽象ラベルのため、中間データ全体を渡してAIに意味的関連を判断させる
const activeProfileMatches = computed(() => {
  if (!activeProfilePopup.value) return []
  return combinedSummaryRows.value.map(r => ({ date: r.fullDate, text: r.text })).reverse()
})

// 相談チャットに渡す直近30件（combinedSummaryRows は新しい順）
const recentSummaryItems = computed(() =>
  combinedSummaryRows.value.slice(0, 30).map(r => ({ sentiment: r.sentiment, text: r.text, date: r.date }))
)

const deleteSummaryRow = (id: string, itemIndex: number | null) => {
  if (itemIndex === null) {
    updateHistoryNotes(id, '')
  } else {
    const item = history.value.find(h => h.id === id)
    if (!item) return
    const parsed = parseSummaryNote(item.notes)
    if (!parsed || !('items' in parsed)) return
    const newItems = parsed.items.filter((_, i) => i !== itemIndex)
    updateHistoryNotes(id, JSON.stringify({ items: newItems }))
  }
}

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

// --- 達成リスト ---
const LS_ACHIEVEMENTS = 'hagemashi-achievements'
const isGeneratingAchievements = ref(false)
const achievementStatus = ref('')
const achievementSelectOpen = ref(false)
const achievementSelectedIds = ref<string[]>([])
const editingAchievementId = ref<string | null>(null)
const editingAchievementText = ref('')
const editingAchievementLevel = ref(1)
const deletingAchievementId = ref<string | null>(null)

// 中間データを持つ履歴のみ達成リストの生成対象
const achievementSourceItems = computed(() => history.value.filter(i => parseSummaryNote(i.notes)))

// 履歴順（新しい順）に沿って達成項目を並べる
const achievementRows = computed(() => {
  const bySource = new Map<string, Achievement[]>()
  for (const a of achievements.value) {
    if (!bySource.has(a.sourceId)) bySource.set(a.sourceId, [])
    bySource.get(a.sourceId)!.push(a)
  }
  const rows: Achievement[] = []
  for (const item of history.value) {
    const list = bySource.get(item.id)
    if (list) rows.push(...list)
  }
  return rows
})

function saveAchievements() {
  if ($dev) {
    localStorage.setItem(LS_ACHIEVEMENTS, JSON.stringify(achievements.value))
  } else {
    $fetch('/api/hagemashi/achievements', { method: 'POST', body: { items: achievements.value } }).catch(console.error)
  }
}

// 履歴（文字起こし）削除時、紐づく達成リストも一緒に削除する
function deleteHistoryAndAchievements(id: string) {
  deleteHistory(id)
  if (achievements.value.some(a => a.sourceId === id)) {
    achievements.value = achievements.value.filter(a => a.sourceId !== id)
    saveAchievements()
  }
}

const achievementAllSelected = computed(() => achievementSourceItems.value.length > 0 && achievementSelectedIds.value.length === achievementSourceItems.value.length)
const achievementSomeSelected = computed(() => achievementSelectedIds.value.length > 0 && achievementSelectedIds.value.length < achievementSourceItems.value.length)

const toggleAchievementAll = () => {
  if (achievementAllSelected.value) achievementSelectedIds.value = []
  else achievementSelectedIds.value = achievementSourceItems.value.map(i => i.id)
}

const toggleAchievementSelect = (id: string) => {
  const idx = achievementSelectedIds.value.indexOf(id)
  if (idx === -1) achievementSelectedIds.value.push(id)
  else achievementSelectedIds.value.splice(idx, 1)
}

const openAchievementSelect = () => {
  achievementSelectedIds.value = achievementSourceItems.value.map(i => i.id)
  achievementSelectOpen.value = true
}

// 1つの中間データ（ソース）から達成項目を生成して返す（保存・state更新はしない）
const fetchAchievementsForSource = async (sourceId: string, timestamp: string, notesText: string): Promise<Achievement[]> => {
  const res = await $fetch<{ achievements: { text: string; level: number }[] }>('/api/hagemashi/achievements-generate', {
    method: 'POST',
    body: { text: notesText },
  })
  const d = toJSTDate(timestamp)
  const date = `${String(d.getUTCMonth() + 1).padStart(2, '0')}/${String(d.getUTCDate()).padStart(2, '0')}`
  return (res.achievements ?? []).map(a => ({
    id: `${sourceId}-${Math.random().toString(36).slice(2, 8)}`,
    sourceId,
    date,
    text: a.text,
    level: a.level,
  }))
}

const runAchievementGenerate = async () => {
  achievementSelectOpen.value = false
  const targets = history.value.filter(i => achievementSelectedIds.value.includes(i.id))
  if (!targets.length || isGeneratingAchievements.value) return
  isGeneratingAchievements.value = true
  let done = 0
  achievementStatus.value = `0/${targets.length}件...`
  let next = [...achievements.value]
  for (const item of targets) {
    try {
      const items = await fetchAchievementsForSource(item.id, item.timestamp, getNotesText(item))
      // 成功時のみ、このソースの既存達成を置き換える
      next = next.filter(a => a.sourceId !== item.id)
      next.push(...items)
    } catch (e) {
      console.error(e)
    }
    done++
    achievementStatus.value = `${done}/${targets.length}件...`
  }
  achievements.value = next
  saveAchievements()
  achievementStatus.value = `完了 ${done}/${targets.length}件`
  setTimeout(() => { achievementStatus.value = '' }, 4000)
  isGeneratingAchievements.value = false
}

const startEditAchievement = (row: Achievement) => {
  editingAchievementId.value = row.id
  editingAchievementText.value = row.text
  editingAchievementLevel.value = row.level
}

const cancelAchievement = () => {
  editingAchievementId.value = null
}

const saveAchievement = (id: string) => {
  const a = achievements.value.find(x => x.id === id)
  if (a) {
    a.text = editingAchievementText.value
    a.level = editingAchievementLevel.value
    achievements.value = [...achievements.value]
    saveAchievements()
  }
  editingAchievementId.value = null
}

const confirmDeleteAchievement = () => {
  if (!deletingAchievementId.value) return
  achievements.value = achievements.value.filter(a => a.id !== deletingAchievementId.value)
  saveAchievements()
  deletingAchievementId.value = null
}

// --- 文字起こし後処理 ---
const handleTranscribed = async (text: string) => {
  const replaced = applyDictionary(text)
  const [title, notes] = await Promise.all([fetchTitle(replaced), fetchSummary(replaced)])
  const newId = addHistory(replaced, title, notes || undefined)
  reTokenize()
  // 中間データがあれば達成リストも自動生成（バックグラウンドで実行し、UIはブロックしない）
  if (notes) {
    const item = history.value.find(h => h.id === newId)
    if (item) {
      fetchAchievementsForSource(newId, item.timestamp, getNotesText(item))
        .then((items) => {
          achievements.value = [...achievements.value.filter(a => a.sourceId !== newId), ...items]
          saveAchievements()
        })
        .catch(console.error)
    }
  }
  // 文字起こし完了後、この内容をはげますか確認（既存の選択ポップアップを再利用）
  selectedIds.value = [newId]
  selectOpen.value = true
}

// --- 録音 ---
const { isRecording, isPaused, isProcessing, duration, formatTime, startRecording, pauseRecording, resumeRecording, transcribeRecording, cancelRecording } = useAudioRecorder({
  onTranscribed: handleTranscribed,
  onError: (msg) => { error.value = msg },
  getPrompt: getWhisperPrompt,
})
</script>
