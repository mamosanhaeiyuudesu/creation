<template>
  <div class="flex flex-col items-center px-4 pt-4 lg:pt-8 pb-12 min-h-screen" @click="showSettingsMenu = false">
    <div v-if="showSettingsMenu" class="fixed inset-0 z-40" @click="showSettingsMenu = false" />
    <div class="relative z-50 w-full max-w-[600px] ml-2.5">
      <div class="absolute inset-x-0 top-0 h-[2px] rounded-t-2xl bg-gradient-to-r from-orange-500 to-pink-500 z-10" />
      <div class="w-full bg-white/[0.04] border border-white/[0.08] rounded-2xl p-7 shadow-[0_20px_80px_rgba(0,0,0,0.35),0_0_40px_rgba(249,115,22,0.06)] backdrop-blur-[10px] grid gap-4 max-h-[70dvh] overflow-y-auto [scrollbar-width:thin] [scrollbar-color:rgba(249,115,22,0.3)_transparent]">

      <!-- Header -->
      <header class="relative flex items-center justify-center">
        <div class="text-center">
          <h1 class="m-0 text-[clamp(24px,4vw,32px)] font-bold bg-gradient-to-br from-orange-500 to-pink-500 bg-clip-text text-transparent">はげまし</h1>
          <p class="mt-2 mb-0 text-slate-400 text-base">話して、はげましてもらおう</p>
        </div>
        <div class="absolute right-0 top-1/2 -translate-y-1/2" @click.stop>
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
            <button class="w-full text-left px-4 py-2 text-[13px] text-slate-300 hover:bg-white/[0.08] transition-colors cursor-pointer flex items-center gap-2" @click="pushSettingsOpen = true; showSettingsMenu = false">
              <span>🔔</span> 通知設定
            </button>
            <button class="w-full text-left px-4 py-2 text-[13px] text-slate-300 hover:bg-white/[0.08] transition-colors cursor-pointer flex items-center gap-2" @click="logout(); showSettingsMenu = false">
              <span>🚪</span> ログアウト
            </button>
          </div>
        </div>
      </header>

      <!-- Recorder -->
      <div class="flex flex-col items-center gap-3">
        <div class="flex gap-4 items-center">
          <template v-if="isRecording">
            <button class="w-20 h-20 rounded-full border-2 border-red-500 bg-red-500/10 text-slate-50 text-2xl flex flex-col items-center justify-center gap-1 cursor-pointer transition-all hover:bg-red-500/20" @click="pauseRecording">
              <span class="block leading-none">⏸️</span>
              <span class="text-[10px] font-medium">一時停止</span>
            </button>
          </template>
          <template v-else-if="isPaused">
            <div class="flex rounded-full overflow-hidden border-2 border-orange-500 h-20">
              <button class="flex flex-col items-center justify-center gap-1 w-20 bg-orange-500/10 border-none text-slate-50 cursor-pointer transition-colors hover:bg-orange-500/25 p-0" @click="resumeRecording">
                <span class="text-xl leading-none">▶</span>
                <span class="text-[10px] font-medium">再開</span>
              </button>
              <div class="w-px bg-orange-500/40 self-stretch" />
              <button class="flex flex-col items-center justify-center gap-1 w-20 bg-red-500/10 border-none text-slate-50 cursor-pointer transition-colors hover:bg-red-500/25 p-0" @click="cancelRecording">
                <span class="text-xl leading-none">✕</span>
                <span class="text-[10px] font-medium">中止</span>
              </button>
              <div class="w-px bg-orange-500/40 self-stretch" />
              <button class="flex flex-col items-center justify-center gap-1 w-20 bg-green-400/10 border-none text-slate-50 cursor-pointer transition-colors hover:bg-green-400/25 p-0" @click="transcribeRecording">
                <span class="text-xl leading-none">✍️</span>
                <span class="text-[10px] font-medium">文字起こし</span>
              </button>
            </div>
          </template>
          <template v-else-if="isProcessing">
            <button class="w-20 h-20 rounded-full border-2 border-orange-500 bg-orange-500/10 text-slate-50 text-2xl flex flex-col items-center justify-center gap-1 opacity-60 cursor-not-allowed" disabled>
              <span class="block leading-none">⏳</span>
              <span class="text-[10px] font-medium">解析中</span>
            </button>
          </template>
          <template v-else>
            <button class="w-20 h-20 rounded-full border-2 border-orange-500 bg-orange-500/10 text-slate-50 text-2xl flex flex-col items-center justify-center gap-1 cursor-pointer transition-all hover:bg-orange-500/20 hover:scale-105" @click="startRecording">
              <span class="block leading-none">🎙️</span>
              <span class="text-[10px] font-medium">録音</span>
            </button>
          </template>

          <!-- はげます button -->
          <button
            v-if="!isRecording && !isPaused && !isProcessing"
            class="w-20 h-20 rounded-full border-2 border-orange-500/50 bg-orange-500/[0.08] text-slate-50 flex flex-col items-center justify-center gap-1 transition-all disabled:opacity-35 disabled:cursor-not-allowed"
            :class="history.length > 0 && !isEncouraging ? 'cursor-pointer hover:bg-orange-500/[0.20] hover:border-orange-500/80 hover:scale-105' : ''"
            :disabled="history.length === 0 || isEncouraging"
            @click="openSelectModal"
          >
            <span class="text-2xl leading-none">💪</span>
            <span class="text-[10px] font-medium">はげます</span>
          </button>
        </div>
        <div v-if="isRecording || duration > 0" class="text-xl text-red-500 font-mono font-semibold">
          {{ formatTime(duration) }}
        </div>
      </div>

      <!-- Error -->
      <div v-if="error" class="bg-red-500/10 border border-red-500/30 rounded-2xl p-4">
        <p class="m-0 mb-3 text-red-300 text-sm">{{ error }}</p>
        <button class="w-full py-3 px-6 border-none bg-gradient-to-br from-orange-500 to-pink-500 text-slate-50 rounded-lg text-sm font-medium cursor-pointer hover:opacity-90 transition-opacity" @click="error = ''">閉じる</button>
      </div>

      <!-- History tabs -->
      <div v-if="history.length > 0 || encourageHistory.length > 0" class="mt-1 min-w-0">
        <div class="flex items-center gap-0 border-b border-white/[0.08]">
          <button
            class="px-3 pb-2 text-sm font-medium border-b-2 -mb-px transition-colors"
            :class="activeTab === 'transcription' ? 'border-orange-500 text-slate-50' : 'border-transparent text-slate-400 hover:text-slate-300'"
            @click="activeTab = 'transcription'"
          ><span class="sm:hidden">文字起</span><span class="hidden sm:inline">文字起こし</span></button>
          <button
            class="px-3 pb-2 text-sm font-medium border-b-2 -mb-px transition-colors"
            :class="activeTab === 'encourage' ? 'border-orange-500 text-slate-50' : 'border-transparent text-slate-400 hover:text-slate-300'"
            @click="activeTab = 'encourage'"
          ><span class="sm:hidden">はげ</span><span class="hidden sm:inline">はげまし</span></button>
          <button
            class="px-3 pb-2 text-sm font-medium border-b-2 -mb-px transition-colors"
            :class="activeTab === 'summary' ? 'border-orange-500 text-slate-50' : 'border-transparent text-slate-400 hover:text-slate-300'"
            @click="activeTab = 'summary'"
          ><span class="sm:hidden">中間</span><span class="hidden sm:inline">中間データ</span></button>
          <button
            class="px-3 pb-2 text-sm font-medium border-b-2 -mb-px transition-colors"
            :class="activeTab === 'words' ? 'border-orange-500 text-slate-50' : 'border-transparent text-slate-400 hover:text-slate-300'"
            @click="activeTab = 'words'"
          >単語</button>
          <button
            class="px-3 pb-2 text-sm font-medium border-b-2 -mb-px transition-colors"
            :class="activeTab === 'profile' ? 'border-orange-500 text-slate-50' : 'border-transparent text-slate-400 hover:text-slate-300'"
            @click="activeTab = 'profile'"
          ><span class="sm:hidden">プロフ</span><span class="hidden sm:inline">プロファイリング</span></button>
        </div>
        <div class="flex items-center gap-2 mb-1 min-h-8">
          <template v-if="activeTab === 'summary' && summaryRows.length > 0">
            <input
              v-model="summarySearchQuery"
              type="search"
              placeholder="検索..."
              class="w-1/3 bg-white/[0.05] border border-white/[0.08] rounded-lg text-slate-200 text-xs px-2.5 py-1 outline-none focus:border-orange-500/60 transition-colors placeholder-slate-600 font-[inherit]"
            />
            <div class="flex gap-1 shrink-0">
              <button
                class="px-2 py-0.5 rounded-md text-[11px] font-semibold border transition-all cursor-pointer"
                :class="summaryFilter === 'all' ? 'border-white/20 bg-white/10 text-slate-200' : 'border-white/[0.06] bg-transparent text-slate-500 hover:text-slate-300'"
                @click="summaryFilter = 'all'"
              >全件</button>
              <button
                class="px-2 py-0.5 rounded-md text-[11px] font-semibold border transition-all cursor-pointer"
                :class="summaryFilter === 'ポジ' ? 'border-emerald-500/60 bg-emerald-500/15 text-emerald-400' : 'border-white/[0.06] bg-transparent text-slate-500 hover:text-slate-300'"
                @click="summaryFilter = summaryFilter === 'ポジ' ? 'all' : 'ポジ'"
              >ポジ</button>
              <button
                class="px-2 py-0.5 rounded-md text-[11px] font-semibold border transition-all cursor-pointer"
                :class="summaryFilter === 'ネガ' ? 'border-orange-500/60 bg-orange-500/15 text-orange-400' : 'border-white/[0.06] bg-transparent text-slate-500 hover:text-slate-300'"
                @click="summaryFilter = summaryFilter === 'ネガ' ? 'all' : 'ネガ'"
              >ネガ</button>
            </div>
            <div class="flex-1" />
            <button
              class="px-3 py-1 rounded-lg text-xs font-medium border border-white/10 bg-white/[0.04] text-slate-400 cursor-pointer hover:bg-white/[0.10] hover:text-slate-200 transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1.5 shrink-0"
              :disabled="isMigrating || history.length === 0"
              @click="openMigrateSelect"
            >
              <span v-if="isMigrating" class="w-3 h-3 rounded-full border border-orange-500/30 border-t-orange-500 animate-spin block" />
              {{ migrateStatus || '再生成' }}
            </button>
          </template>
          <template v-else-if="activeTab === 'summary'">
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
          <button
            v-if="activeTab === 'words'"
            class="ml-auto px-3 py-1 rounded-lg text-xs font-medium border border-white/10 bg-white/[0.04] text-slate-400 cursor-pointer hover:bg-white/[0.10] hover:text-slate-200 transition-all"
            @click="stoplistOpen = true"
          >除外単語</button>
          <button
            v-if="activeTab === 'words'"
            class="px-3 py-1 rounded-lg text-xs font-medium border border-white/10 bg-white/[0.04] text-slate-400 cursor-pointer hover:bg-white/[0.10] hover:text-slate-200 transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1.5"
            :disabled="isTokenizing || history.length === 0"
            @click="reTokenize"
          >
            <span v-if="isTokenizing" class="w-3 h-3 rounded-full border border-orange-500/30 border-t-orange-500 animate-spin block" />
            {{ isTokenizing ? '集計中...' : '再集計' }}
          </button>
          <button
            v-if="activeTab === 'profile'"
            class="ml-auto px-3 py-1 rounded-lg text-xs font-medium border border-white/10 bg-white/[0.04] text-slate-400 cursor-pointer hover:bg-white/[0.10] hover:text-slate-200 transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1.5"
            :disabled="isProfileLoading"
            @click="generateProfile"
          >
            <span v-if="isProfileLoading" class="w-3 h-3 rounded-full border border-orange-500/30 border-t-orange-500 animate-spin block" />
            {{ isProfileLoading ? '生成中...' : '更新' }}
          </button>
        </div>
        <HistoryTable
          v-if="activeTab === 'transcription'"
          :history="history"
          :copiedId="copiedHistoryId"
          :hideHeader="true"
          @copy="copyHistory"
          @delete="deleteHistory"
          @updateTitle="updateHistoryTitle"
        />
        <HistoryTable
          v-else-if="activeTab === 'encourage'"
          :history="encourageHistory"
          :copiedId="copiedEncourageId"
          :hideHeader="true"
          :markdown="true"
          @copy="copyEncourageHistory"
          @delete="deleteEncourageHistory"
          @updateTitle="updateEncourageHistoryTitle"
        />
        <!-- 中間データタブ -->
        <div v-else-if="activeTab === 'summary'" class="py-2">
          <div v-if="summaryRows.length === 0" class="text-center text-slate-500 text-sm py-10">
            録音を文字起こしすると中間データが生成されます
          </div>
          <div v-else-if="filteredSummaryRows.length === 0" class="text-center text-slate-500 text-sm py-10">
            条件に一致する項目がありません
          </div>
          <div v-else class="flex flex-col gap-0">
            <div
              v-for="(row, rowIndex) in filteredSummaryRows"
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

        <!-- プロファイリングタブ -->
        <div v-else-if="activeTab === 'profile'" class="py-2">
          <div v-if="isProfileLoading" class="flex items-center justify-center gap-2 py-10 text-slate-400 text-sm">
            <span class="w-4 h-4 rounded-full border-2 border-orange-500/30 border-t-orange-500 animate-spin block" />
            プロファイルを生成中...
          </div>
          <div v-else-if="profileHistory.length === 0" class="text-center text-slate-500 text-sm py-10">
            更新ボタンを押してプロファイルを生成してください
          </div>
          <div v-else class="flex flex-col gap-4">
            <!-- 最新プロファイル -->
            <div class="flex flex-col gap-3">
              <div class="text-right text-[11px] text-slate-600">最終更新: {{ formatProfileDate(profileHistory[0].generatedAt) }}</div>
              <div class="bg-white/[0.04] border border-white/[0.06] rounded-xl p-3.5">
                <div class="text-xs font-semibold text-orange-400 mb-2">✨ 強み</div>
                <template v-if="Array.isArray(profileHistory[0].strengths)">
                  <div v-for="(s, si) in profileHistory[0].strengths" :key="si" :class="si < profileHistory[0].strengths.length - 1 ? 'mb-3' : ''">
                    <div class="text-sm font-semibold text-slate-100 mb-1">■ {{ s.title }}</div>
                    <p class="m-0 text-sm text-slate-300 leading-relaxed">{{ s.content }}</p>
                  </div>
                </template>
                <p v-else class="m-0 text-sm text-slate-200 leading-relaxed">{{ profileHistory[0].strengths }}</p>
              </div>
              <div class="bg-white/[0.04] border border-white/[0.06] rounded-xl p-3.5">
                <div class="text-xs font-semibold text-sky-400 mb-2">🔄 傾向</div>
                <template v-if="Array.isArray(profileHistory[0].tendencies)">
                  <div v-for="(t, ti) in profileHistory[0].tendencies" :key="ti" :class="ti < profileHistory[0].tendencies.length - 1 ? 'mb-3' : ''">
                    <div class="text-sm font-semibold text-slate-100 mb-1">■ {{ t.title }}</div>
                    <p class="m-0 text-sm text-slate-300 leading-relaxed">{{ t.content }}</p>
                  </div>
                </template>
                <p v-else class="m-0 text-sm text-slate-200 leading-relaxed">{{ profileHistory[0].tendencies }}</p>
              </div>
              <div class="bg-white/[0.04] border border-white/[0.06] rounded-xl p-3.5">
                <div class="text-xs font-semibold text-emerald-400 mb-2">💡 アドバイス</div>
                <template v-if="Array.isArray(profileHistory[0].advice)">
                  <div v-for="(a, ai) in profileHistory[0].advice" :key="ai" :class="ai < profileHistory[0].advice.length - 1 ? 'mb-3' : ''">
                    <div class="text-sm font-semibold text-slate-100 mb-1">■ {{ a.title }}</div>
                    <p class="m-0 text-sm text-slate-300 leading-relaxed">{{ a.content }}</p>
                  </div>
                </template>
                <p v-else class="m-0 text-sm text-slate-200 leading-relaxed">{{ profileHistory[0].advice }}</p>
              </div>
            </div>
            <!-- 過去のプロファイル履歴 -->
            <div v-if="profileHistory.length > 1" class="flex flex-col gap-1.5">
              <div class="text-[11px] text-slate-600 border-t border-white/[0.06] pt-3">過去のプロファイル</div>
              <div v-for="(p, pi) in profileHistory.slice(1)" :key="pi" class="bg-white/[0.02] border border-white/[0.05] rounded-xl overflow-hidden">
                <button
                  class="w-full flex items-center justify-between px-3 py-2.5 cursor-pointer bg-transparent border-none transition-colors hover:bg-white/[0.04]"
                  @click="toggleProfileHistory(pi)"
                >
                  <div class="text-[11px] text-slate-500">{{ formatProfileDate(p.generatedAt) }}</div>
                  <div class="text-slate-600 text-[10px] transition-transform duration-200" :style="expandedProfileIndices.has(pi) ? 'transform: rotate(180deg)' : ''">▼</div>
                </button>
                <div v-if="expandedProfileIndices.has(pi)" class="px-3 pb-3 flex flex-col gap-2 border-t border-white/[0.05]">
                  <div class="mt-2">
                    <div class="text-[11px] font-semibold text-orange-400/70 mb-1">✨ 強み</div>
                    <template v-if="Array.isArray(p.strengths)">
                      <div v-for="(s, si) in p.strengths" :key="si" :class="si < p.strengths.length - 1 ? 'mb-2' : ''">
                        <div class="text-xs font-semibold text-slate-300 mb-0.5">■ {{ s.title }}</div>
                        <p class="m-0 text-xs text-slate-400 leading-relaxed">{{ s.content }}</p>
                      </div>
                    </template>
                    <p v-else class="m-0 text-xs text-slate-400 leading-relaxed">{{ p.strengths }}</p>
                  </div>
                  <div>
                    <div class="text-[11px] font-semibold text-sky-400/70 mb-1">🔄 傾向</div>
                    <template v-if="Array.isArray(p.tendencies)">
                      <div v-for="(t, ti) in p.tendencies" :key="ti" :class="ti < p.tendencies.length - 1 ? 'mb-2' : ''">
                        <div class="text-xs font-semibold text-slate-300 mb-0.5">■ {{ t.title }}</div>
                        <p class="m-0 text-xs text-slate-400 leading-relaxed">{{ t.content }}</p>
                      </div>
                    </template>
                    <p v-else class="m-0 text-xs text-slate-400 leading-relaxed">{{ p.tendencies }}</p>
                  </div>
                  <div>
                    <div class="text-[11px] font-semibold text-emerald-400/70 mb-1">💡 アドバイス</div>
                    <template v-if="Array.isArray(p.advice)">
                      <div v-for="(a, ai) in p.advice" :key="ai" :class="ai < p.advice.length - 1 ? 'mb-2' : ''">
                        <div class="text-xs font-semibold text-slate-300 mb-0.5">■ {{ a.title }}</div>
                        <p class="m-0 text-xs text-slate-400 leading-relaxed">{{ a.content }}</p>
                      </div>
                    </template>
                    <p v-else class="m-0 text-xs text-slate-400 leading-relaxed">{{ p.advice }}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div v-else class="py-2">
          <div v-if="wordRanking.length === 0" class="text-center text-slate-500 text-sm py-10">
            再集計ボタンを押すと単語ランキングを生成します
          </div>
          <div v-else class="flex flex-col gap-0.5">
            <div
              v-for="(entry, i) in wordRanking.slice(0, 80)"
              :key="entry.word"
              class="flex items-center gap-2.5 px-1 py-1 rounded-lg hover:bg-white/[0.04] transition-colors"
            >
              <span class="text-[11px] text-slate-600 w-6 text-right shrink-0 tabular-nums">{{ i + 1 }}</span>
              <span class="text-sm text-slate-200 font-medium w-[7em] shrink-0 truncate">{{ entry.word }}</span>
              <div class="flex-1 h-1 bg-white/[0.06] rounded-full overflow-hidden">
                <div
                  class="h-full bg-gradient-to-r from-orange-500 to-pink-500 rounded-full"
                  :style="{ width: `${(entry.count / wordRanking[0].count) * 100}%` }"
                />
              </div>
              <span class="text-[11px] text-slate-500 shrink-0 w-5 text-right tabular-nums">{{ entry.count }}</span>
              <button
                class="shrink-0 px-1.5 py-0.5 rounded text-[10px] text-slate-600 hover:text-slate-200 hover:bg-white/[0.08] transition-colors cursor-pointer border-none bg-transparent"
                title="除外に追加"
                @click="addToStoplist(entry.word)"
              >除外</button>
            </div>
          </div>
        </div>
      </div>
      </div>
    </div>

    <!-- Auth Modal -->
    <AuthModal v-if="!$dev && checked && !isLoggedIn" accent="orange" />

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

    <!-- 通知設定モーダル -->
    <div v-if="pushSettingsOpen" class="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-[100]" @click.self="pushSettingsOpen = false">
      <div class="w-full max-w-[440px] bg-[#1e293b] border border-white/10 rounded-2xl shadow-[0_24px_80px_rgba(0,0,0,0.5)] flex flex-col max-h-[90vh]">
        <div class="flex items-center justify-between px-6 pt-5 pb-4 border-b border-white/[0.08]">
          <div>
            <h2 class="m-0 text-lg text-slate-50 font-semibold">🔔 通知設定</h2>
            <p class="m-0 mt-0.5 text-xs text-slate-500">最近の傾向をふまえて励ましたり、記録を促します</p>
          </div>
          <button class="bg-transparent border-none text-slate-500 text-lg cursor-pointer px-2 py-1 rounded-md hover:text-slate-50 transition-colors" @click="pushSettingsOpen = false">✕</button>
        </div>
        <div class="px-6 py-4 overflow-y-auto flex flex-col gap-4 flex-1 [scrollbar-width:thin] [scrollbar-color:rgba(249,115,22,0.3)_transparent]">
          <!-- 非対応 -->
          <div v-if="!push.supported.value" class="text-sm text-slate-400 bg-white/[0.04] border border-white/[0.08] rounded-xl p-3">
            この端末・ブラウザはプッシュ通知に対応していません。
          </div>
          <!-- iOS: ホーム画面追加が必要 -->
          <div v-else-if="push.needsInstall.value" class="text-sm text-amber-300/90 bg-amber-500/10 border border-amber-500/25 rounded-xl p-3 leading-relaxed">
            iPhone / iPad では、通知を使うために <b>ホーム画面に追加</b> したこのアプリから開く必要があります。<br />
            共有ボタン → 「ホーム画面に追加」から追加してください。
          </div>
          <template v-else>
            <!-- ON/OFF -->
            <div class="flex items-center justify-between">
              <div>
                <div class="text-sm text-slate-100 font-medium">プッシュ通知</div>
                <div class="text-xs text-slate-500 mt-0.5">{{ push.subscribed.value && push.prefs.value.enabled ? '有効' : '無効' }}</div>
              </div>
              <button
                class="px-4 py-1.5 rounded-lg text-sm font-medium border transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2"
                :class="push.subscribed.value && push.prefs.value.enabled
                  ? 'border-white/15 bg-transparent text-slate-300 hover:bg-white/[0.06]'
                  : 'border-none bg-gradient-to-br from-orange-500 to-pink-500 text-slate-50 hover:opacity-90'"
                :disabled="push.busy.value"
                @click="togglePush"
              >
                <span v-if="push.busy.value" class="w-3.5 h-3.5 rounded-full border border-white/30 border-t-white animate-spin block" />
                {{ push.subscribed.value && push.prefs.value.enabled ? 'オフにする' : 'オンにする' }}
              </button>
            </div>

            <div v-if="push.error.value" class="text-xs text-red-300 bg-red-500/10 border border-red-500/25 rounded-lg px-3 py-2">{{ push.error.value }}</div>

            <!-- 詳細設定（有効時のみ） -->
            <div v-if="push.prefs.value.enabled" class="flex flex-col gap-4 pt-1">
              <label class="flex items-center justify-between gap-3">
                <span class="text-sm text-slate-300">通知する時刻</span>
                <div class="flex items-center gap-1.5">
                  <select v-model.number="push.prefs.value.hour" class="bg-white/[0.05] border border-white/[0.10] rounded-lg text-slate-200 text-sm px-3 py-1.5 outline-none focus:border-orange-500 transition-colors">
                    <option v-for="h in 24" :key="h - 1" :value="h - 1">{{ String(h - 1).padStart(2, '0') }}</option>
                  </select>
                  <span class="text-slate-500">:</span>
                  <select v-model.number="push.prefs.value.minute" class="bg-white/[0.05] border border-white/[0.10] rounded-lg text-slate-200 text-sm px-3 py-1.5 outline-none focus:border-orange-500 transition-colors">
                    <option v-for="m in [0, 15, 30, 45]" :key="m" :value="m">{{ String(m).padStart(2, '0') }}</option>
                  </select>
                </div>
              </label>
              <label class="flex items-center justify-between gap-3">
                <span class="text-sm text-slate-300">通知の間隔</span>
                <select v-model.number="push.prefs.value.minIntervalDays" class="bg-white/[0.05] border border-white/[0.10] rounded-lg text-slate-200 text-sm px-3 py-1.5 outline-none focus:border-orange-500 transition-colors">
                  <option :value="0">毎回</option>
                  <option :value="1">1日に1回まで</option>
                  <option :value="3">3日に1回まで</option>
                  <option :value="7">1週間に1回まで</option>
                </select>
              </label>
              <label class="flex items-center justify-between gap-3">
                <span class="text-sm text-slate-300">記録がないと促す</span>
                <select v-model.number="push.prefs.value.nudgeAfterSilentDays" class="bg-white/[0.05] border border-white/[0.10] rounded-lg text-slate-200 text-sm px-3 py-1.5 outline-none focus:border-orange-500 transition-colors">
                  <option :value="2">2日</option>
                  <option :value="3">3日</option>
                  <option :value="5">5日</option>
                  <option :value="7">1週間</option>
                </select>
              </label>
              <p class="m-0 text-[11px] text-slate-600 leading-relaxed">通知は選んだ時間帯（{{ push.prefs.value.timezone }}）に届きます。最近の記録があれば傾向をふまえた励まし、しばらく記録がなければ音声入力のお誘いが届きます。</p>
            </div>
          </template>
        </div>
        <div v-if="push.supported.value && !push.needsInstall.value && push.prefs.value.enabled" class="flex flex-col gap-2 px-6 py-4 border-t border-white/[0.08]">
          <div v-if="pushTestResult" class="text-xs rounded-lg px-3 py-2 border" :class="pushTestResult.ok ? 'text-emerald-300 bg-emerald-500/10 border-emerald-500/25' : 'text-red-300 bg-red-500/10 border-red-500/25'">
            <div class="font-semibold mb-1">{{ pushTestResult.ok ? 'テスト送信成功' : 'テスト送信失敗' }}</div>
            <div v-for="(r, i) in pushTestResult.results" :key="i" class="font-mono">{{ r.ok ? '✓' : '✗' }} {{ r.endpoint }} {{ r.statusCode ? `[${r.statusCode}]` : '' }} {{ r.error || '' }}</div>
          </div>
          <div class="flex justify-between gap-2">
            <button class="px-4 py-2 rounded-lg border border-white/15 bg-transparent text-slate-400 text-sm cursor-pointer hover:bg-white/[0.06] hover:text-slate-50 transition-all disabled:opacity-40 flex items-center gap-1.5" :disabled="pushTestBusy" @click="sendTestPush">
              <span v-if="pushTestBusy" class="w-3.5 h-3.5 rounded-full border border-slate-400/30 border-t-slate-400 animate-spin block" />
              テスト送信
            </button>
            <div class="flex gap-2">
              <button class="px-5 py-2 rounded-lg border border-white/15 bg-transparent text-slate-400 text-sm cursor-pointer hover:bg-white/[0.06] hover:text-slate-50 transition-all" @click="pushSettingsOpen = false">閉じる</button>
              <button class="px-5 py-2 rounded-lg border-none bg-gradient-to-br from-orange-500 to-pink-500 text-slate-50 text-sm font-medium cursor-pointer hover:opacity-90 transition-opacity disabled:opacity-40" :disabled="push.busy.value" @click="savePushPrefs">保存</button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 履歴選択ポップアップ -->
    <div v-if="selectOpen" class="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-[100]" @click.self="selectOpen = false">
      <div class="w-full max-w-[480px] bg-[#1e293b] border border-white/10 rounded-2xl shadow-[0_24px_80px_rgba(0,0,0,0.5)] flex flex-col max-h-[90vh]">
        <div class="flex items-center justify-between px-6 pt-5 pb-4 border-b border-white/[0.08]">
          <h2 class="m-0 text-lg text-slate-50 font-semibold">はげます対象を選択</h2>
          <button class="bg-transparent border-none text-slate-500 text-lg cursor-pointer px-2 py-1 rounded-md hover:text-slate-50 transition-colors" @click="selectOpen = false">✕</button>
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
            <button class="px-5 py-2 rounded-lg border border-white/15 bg-transparent text-slate-400 text-sm cursor-pointer hover:bg-white/[0.06] hover:text-slate-50 transition-all" @click="selectOpen = false">キャンセル</button>
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

    <!-- Push 通知メッセージモーダル -->
    <div v-if="pushLogModal" class="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-[150]" @click.self="pushLogModal = false">
      <div class="w-full max-w-[400px] bg-[#1e293b] border border-white/10 rounded-2xl shadow-[0_24px_80px_rgba(0,0,0,0.5)] p-6 flex flex-col gap-4">
        <div class="flex items-center justify-between">
          <h2 class="m-0 text-base text-slate-50 font-semibold">{{ pushLogEntry?.title ?? 'はげまし' }}</h2>
          <button class="bg-transparent border-none text-slate-500 text-lg cursor-pointer px-2 py-1 rounded-md hover:text-slate-50 transition-colors" @click="pushLogModal = false">✕</button>
        </div>
        <p class="m-0 text-slate-200 text-sm leading-relaxed">{{ pushLogEntry?.text }}</p>
        <div class="text-[11px] text-slate-600">{{ formatPushLogDate(pushLogEntry?.created_at) }}</div>
        <button class="w-full py-2.5 rounded-lg border-none bg-gradient-to-br from-orange-500 to-pink-500 text-slate-50 text-sm font-medium cursor-pointer hover:opacity-90 transition-opacity" @click="pushLogModal = false">閉じる</button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ alias: ['/hagemashi', '/hagemashi/'] })
import { ref, computed, onMounted, watch } from 'vue'
import { marked } from 'marked'

useHead({
  title: import.meta.dev ? 'はげまし (dev)' : 'はげまし',
  link: [
    { rel: 'icon', type: 'image/svg+xml', href: `data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>💪</text></svg>` },
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
import { usePushNotifications } from '~/composables/usePushNotifications'

const $dev = import.meta.dev
const route = useRoute()
const router = useRouter()

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
const showSettingsMenu = ref(false)

// プッシュ通知
const pushSettingsOpen = ref(false)

interface PushLogEntry { title: string; text: string; created_at: string }
const pushLogModal = ref(false)
const pushLogEntry = ref<PushLogEntry | null>(null)

function formatPushLogDate(createdAt?: string): string {
  if (!createdAt) return ''
  const d = new Date(createdAt.replace(' ', 'T') + 'Z')
  const jst = new Date(d.getTime() + 9 * 60 * 60 * 1000)
  const mo = String(jst.getUTCMonth() + 1).padStart(2, '0')
  const day = String(jst.getUTCDate()).padStart(2, '0')
  const h = String(jst.getUTCHours()).padStart(2, '0')
  const mi = String(jst.getUTCMinutes()).padStart(2, '0')
  return `${mo}/${day} ${h}:${mi}`
}
const push = usePushNotifications()
async function togglePush() {
  if (push.subscribed.value && push.prefs.value.enabled) {
    await push.disable()
  } else {
    await push.enable()
  }
}
async function savePushPrefs() {
  try {
    await push.savePrefs()
    pushSettingsOpen.value = false
  } catch (e: any) {
    push.error.value = e?.message || '保存に失敗しました'
  }
}

const pushTestBusy = ref(false)
const pushTestResult = ref<{ ok: boolean; results: { endpoint: string; ok: boolean; statusCode: number; expired: boolean; error?: string }[] } | null>(null)
async function sendTestPush() {
  pushTestBusy.value = true
  pushTestResult.value = null
  try {
    pushTestResult.value = await $fetch('/api/hagemashi/push/test', { method: 'POST' })
  } catch (e: any) {
    pushTestResult.value = { ok: false, results: [{ endpoint: 'error', ok: false, statusCode: 0, expired: false, error: e?.data?.message || String(e) }] }
  } finally {
    pushTestBusy.value = false
  }
}
onMounted(() => {
  push.init()

  // SW から通知クリックを postMessage で受け取り、モーダルを表示
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.addEventListener('message', async (ev: MessageEvent) => {
      const data = ev.data
      if (data?.type !== 'hagemashi-push-click') return
      const pushId = new URL(data.url as string, location.origin).searchParams.get('push')
      if (!pushId) return
      try {
        pushLogEntry.value = await $fetch<PushLogEntry>(`/api/hagemashi/push/log/${pushId}`)
        pushLogModal.value = true
      } catch {}
    })
  }
})
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
const activeTab = ref<'transcription' | 'encourage' | 'summary' | 'words' | 'profile'>('transcription')
const charLimit = ref(1000)
const encourageStyle = ref<'calm' | 'loud'>('loud')

const LS_DICTIONARY = 'hagemashi-dictionary'
const LS_WORD_RANKING = 'hagemashi-word-ranking'
const LS_PROFILE = 'hagemashi-profile'

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

interface StrengthItem { title: string; content: string }
interface ProfileData { strengths: StrengthItem[] | string; tendencies: StrengthItem[] | string; advice: StrengthItem[] | string; generatedAt: string }
const profileHistory = ref<ProfileData[]>([])
const isProfileLoading = ref(false)
const expandedProfileIndices = ref(new Set<number>())
const toggleProfileHistory = (i: number) => {
  if (expandedProfileIndices.value.has(i)) expandedProfileIndices.value.delete(i)
  else expandedProfileIndices.value.add(i)
  expandedProfileIndices.value = new Set(expandedProfileIndices.value)
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
    const res = await $fetch<ProfileData>('/api/hagemashi/profile', {
      method: 'POST',
      body: {
        summaryItems: summaryRows.value.map(r => ({ sentiment: r.sentiment, text: r.text, date: r.date })),
        wordRanking: wordRanking.value.slice(0, 50),
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

interface WordEntry { word: string; count: number }
const wordRanking = ref<WordEntry[]>([])
const isTokenizing = ref(false)

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
})

if (!$dev) {
  watch(
    isLoggedIn,
    async (loggedIn) => {
      if (!loggedIn) { wordRanking.value = []; dictionary.value = []; profileHistory.value = []; stoplist.value = [...DEFAULT_STOPLIST]; return }
      const [ranking, dict, profile, sl] = await Promise.allSettled([
        $fetch<WordEntry[]>('/api/hagemashi/word-ranking'),
        $fetch<DictionaryEntry[]>('/api/hagemashi/dictionary'),
        $fetch<{ profiles: ProfileData[] }>('/api/hagemashi/profile'),
        $fetch<string[]>('/api/hagemashi/stoplist'),
      ])
      wordRanking.value = ranking.status === 'fulfilled' ? ranking.value : []
      dictionary.value = dict.status === 'fulfilled' ? dict.value : []
      profileHistory.value = profile.status === 'fulfilled' ? (profile.value?.profiles ?? []) : []
      stoplist.value = (sl.status === 'fulfilled' && sl.value.length > 0) ? sl.value : [...DEFAULT_STOPLIST]

      // Push 通知からの遷移: ?push=<id> があれば内容を表示
      const pushId = route.query.push as string | undefined
      if (pushId) {
        try {
          pushLogEntry.value = await $fetch<PushLogEntry>(`/api/hagemashi/push/log/${pushId}`)
          pushLogModal.value = true
          router.replace('/hagemashi')
        } catch {}
      }
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
const summarySearchQuery = ref('')
const summaryFilter = ref<'all' | 'ポジ' | 'ネガ'>('all')

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

const summaryRows = computed(() => {
  const rows: { id: string; date: string; sentiment: 'ポジ' | 'ネガ'; text: string; itemIndex: number | null }[] = []
  for (const item of history.value) {
    const parsed = parseSummaryNote(item.notes)
    if (!parsed) continue
    const d = toJSTDate(item.timestamp)
    const date = `${String(d.getUTCMonth() + 1).padStart(2, '0')}/${String(d.getUTCDate()).padStart(2, '0')}`
    if ('items' in parsed) {
      for (let i = 0; i < parsed.items.length; i++) {
        const n = parsed.items[i]
        if (n.text) rows.push({ id: item.id, date, sentiment: n.sentiment, text: n.text, itemIndex: i })
      }
    } else {
      rows.push({ id: item.id, date, sentiment: parsed.sentiment, text: parsed.text, itemIndex: null })
    }
  }
  return rows
})

const filteredSummaryRows = computed(() => {
  const q = summarySearchQuery.value.trim().toLowerCase()
  return summaryRows.value.filter(row => {
    if (summaryFilter.value !== 'all' && row.sentiment !== summaryFilter.value) return false
    if (q && !row.text.toLowerCase().includes(q)) return false
    return true
  })
})

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

// --- 文字起こし後処理 ---
const handleTranscribed = async (text: string) => {
  const replaced = applyDictionary(text)
  const [title, notes] = await Promise.all([fetchTitle(replaced), fetchSummary(replaced)])
  addHistory(replaced, title, notes || undefined)
}

// --- 録音 ---
const { isRecording, isPaused, isProcessing, duration, formatTime, startRecording, pauseRecording, resumeRecording, transcribeRecording, cancelRecording } = useAudioRecorder({
  onTranscribed: handleTranscribed,
  onError: (msg) => { error.value = msg },
  getPrompt: getWhisperPrompt,
})
</script>
