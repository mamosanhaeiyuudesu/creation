<template>
  <div class="flex flex-col items-center px-4 pt-4 lg:pt-8 pb-12 min-h-screen" @click="showSettingsMenu = false">
    <div v-if="showSettingsMenu" class="fixed inset-0 z-40" @click="showSettingsMenu = false" />
    <div class="relative w-full max-w-[680px]">
      <div class="absolute inset-x-0 top-0 h-[2px] rounded-t-2xl bg-gradient-to-r from-emerald-500 to-teal-500 z-10" />
      <div class="w-full bg-white/[0.04] border border-white/[0.08] rounded-2xl p-6 shadow-[0_20px_80px_rgba(0,0,0,0.35)] backdrop-blur-[10px]">

        <!-- Header -->
        <header class="flex items-center justify-between mb-6">
          <div>
            <h1 class="m-0 text-[clamp(20px,4vw,26px)] font-bold bg-gradient-to-br from-emerald-400 to-teal-400 bg-clip-text text-transparent">節約</h1>
          </div>
          <div class="flex items-center gap-3">
            <div class="flex items-center gap-4 text-xs">
              <div class="flex flex-col items-center gap-0.5">
                <span class="text-slate-500">節約</span>
                <span class="text-emerald-400 font-medium tabular-nums">¥{{ totalSetsuyaku.toLocaleString() }}</span>
              </div>
              <div class="flex flex-col items-center gap-0.5">
                <span class="text-slate-500">浪費</span>
                <span class="text-rose-400 font-medium tabular-nums">¥{{ totalRouhi.toLocaleString() }}</span>
              </div>
              <div class="flex flex-col items-center gap-0.5">
                <span class="text-slate-500">差分</span>
                <span :class="diffAmount >= 0 ? 'text-emerald-400' : 'text-rose-400'" class="font-semibold tabular-nums">
                  {{ diffAmount >= 0 ? '+' : '' }}¥{{ diffAmount.toLocaleString() }}
                </span>
              </div>
            </div>
            <div class="relative self-center" @click.stop>
              <button
                class="w-8 h-8 rounded-lg border border-white/10 bg-white/[0.06] text-slate-400 text-base cursor-pointer flex items-center justify-center transition-all hover:bg-white/[0.12] hover:text-[#e2e8f0]"
                title="設定"
                @click="showSettingsMenu = !showSettingsMenu"
              >⚙</button>
              <div v-if="showSettingsMenu" class="absolute right-0 top-full mt-1 bg-[#1e293b] border border-white/10 rounded-xl shadow-xl z-[200] min-w-[140px] py-1 overflow-hidden">
                <button class="w-full text-left px-4 py-2 text-[13px] text-slate-300 hover:bg-white/[0.08] transition-colors cursor-pointer flex items-center gap-2" @click="logout(); showSettingsMenu = false">
                  <span>🚪</span> ログアウト
                </button>
              </div>
            </div>
          </div>
        </header>

        <!-- Tabs -->
        <div class="flex border-b border-white/[0.10] mb-6">
          <button
            @click="activeTab = 'gaman'"
            :class="activeTab === 'gaman' ? 'text-emerald-400 border-b-2 border-emerald-400 -mb-px' : 'text-slate-500 hover:text-slate-300 border-b-2 border-transparent'"
            class="flex-1 py-2.5 text-sm font-medium transition-all"
          >我慢ログ</button>
          <button
            @click="activeTab = 'fukkatsu'"
            :class="activeTab === 'fukkatsu' ? 'text-emerald-400 border-b-2 border-emerald-400 -mb-px' : 'text-slate-500 hover:text-slate-300 border-b-2 border-transparent'"
            class="flex-1 py-2.5 text-sm font-medium transition-all"
          >復活ログ</button>
          <button
            @click="activeTab = 'rouhi'"
            :class="activeTab === 'rouhi' ? 'text-rose-400 border-b-2 border-rose-400 -mb-px' : 'text-slate-500 hover:text-slate-300 border-b-2 border-transparent'"
            class="flex-1 py-2.5 text-sm font-medium transition-all"
          >浪費ログ</button>
          <button
            @click="activeTab = 'sodan'"
            :class="activeTab === 'sodan' ? 'text-emerald-400 border-b-2 border-emerald-400 -mb-px' : 'text-slate-500 hover:text-slate-300 border-b-2 border-transparent'"
            class="flex-1 py-2.5 text-sm font-medium transition-all"
          >相談</button>
        </div>

        <!-- ── Tab: 我慢ログ ── -->
        <div v-if="activeTab === 'gaman'">

          <!-- Form -->
          <div class="space-y-3 mb-5">
            <div class="grid grid-cols-2 gap-3">
              <div>
                <label class="text-xs text-slate-400 mb-1 block">品名</label>
                <input v-model="gamanForm.name" type="text" placeholder="例: マンガ全集"
                  class="w-full bg-white/[0.06] border border-white/[0.12] rounded-lg px-3 py-2 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-emerald-500/50" />
              </div>
              <div>
                <label class="text-xs text-slate-400 mb-1 block">金額（円）</label>
                <input v-model.number="gamanForm.price" type="number" min="0" placeholder="0"
                  class="w-full bg-white/[0.06] border border-white/[0.12] rounded-lg px-3 py-2 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-emerald-500/50" />
              </div>
            </div>
            <div>
              <label class="text-xs text-slate-400 mb-1 block">買わなかった理由</label>
              <textarea v-model="gamanForm.reason" rows="2" placeholder="例: 読む時間がないから、電子書籍で十分だから"
                class="w-full bg-white/[0.06] border border-white/[0.12] rounded-lg px-3 py-2 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-emerald-500/50 resize-none" />
            </div>
            <div>
              <label class="text-xs text-slate-400 mb-1 block">日付</label>
              <input v-model="gamanForm.date" type="date"
                class="bg-white/[0.06] border border-white/[0.12] rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-emerald-500/50" />
            </div>
            <div>
              <label class="text-xs text-slate-400 mb-1 block">タグ</label>
              <div v-if="gamanForm.tags.length" class="flex flex-wrap gap-1.5 mb-2">
                <span v-for="tag in gamanForm.tags" :key="tag"
                  class="flex items-center gap-1 px-2 py-0.5 bg-emerald-500/15 text-emerald-400 text-xs rounded-full border border-emerald-500/30">
                  {{ tag }}
                  <button @click="removeGamanFormTag(tag)" class="text-emerald-400/60 hover:text-emerald-300 leading-none ml-0.5">×</button>
                </span>
              </div>
              <input v-model="gamanTagInput" @keydown.enter.prevent="addGamanTag" type="text"
                placeholder="タグを入力してEnter（例: 本、家電）"
                class="w-full bg-white/[0.06] border border-white/[0.12] rounded-lg px-3 py-2 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-emerald-500/50" />
              <div v-if="gamanTagSuggestions.length" class="flex flex-wrap gap-1 mt-2">
                <button v-for="tag in gamanTagSuggestions" :key="tag" @click="addGamanTagDirect(tag)"
                  class="px-2 py-0.5 text-xs text-slate-400 border border-white/[0.08] rounded-full hover:border-emerald-500/30 hover:text-emerald-400 transition-colors">
                  + {{ tag }}
                </button>
              </div>
            </div>
            <button @click="saveGaman" :disabled="!gamanForm.name.trim() || !gamanForm.price || !gamanForm.reason.trim() || gamanSaving"
              class="w-full py-2 bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/30 text-emerald-400 text-sm font-medium rounded-lg transition-all disabled:opacity-40 disabled:cursor-not-allowed">
              {{ gamanSaving ? '保存中...' : '記録する' }}
            </button>
          </div>

          <div class="border-t border-white/[0.06] mb-4" />

          <!-- Records -->
          <div>
            <div class="flex items-center justify-between mb-2">
              <h3 class="text-sm font-semibold text-slate-300 m-0">
                我慢ログ（{{ filteredGamanRecords.length }}件<template v-if="gamanFilterTags.length"> / {{ gamanRecords.length }}件中</template>）
              </h3>
              <span class="text-xs text-emerald-400 font-medium">合計 ¥{{ filteredGamanTotal.toLocaleString() }}</span>
            </div>
            <div v-if="allTags.length" class="flex flex-wrap gap-1 mb-3">
              <button v-for="tag in allTags" :key="tag" @click="toggleGamanFilter(tag)"
                :class="gamanFilterTags.includes(tag) ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40' : 'text-slate-400 border-white/[0.12] hover:border-emerald-500/30 hover:text-emerald-400'"
                class="px-2.5 py-0.5 text-xs rounded-full border transition-all">
                {{ tag }}
              </button>
            </div>
            <p v-if="gamanLoading" class="text-center py-6 text-slate-500 text-sm m-0">読み込み中...</p>
            <p v-else-if="!gamanRecords.length" class="text-center py-6 text-slate-500 text-sm m-0">まだ記録がありません</p>
            <p v-else-if="!filteredGamanRecords.length" class="text-center py-6 text-slate-500 text-sm m-0">該当する記録がありません</p>
            <div class="space-y-2">
              <div v-for="record in filteredGamanRecords" :key="record.id"
                class="p-3 bg-white/[0.03] border border-white/[0.06] rounded-xl">
                <template v-if="gamanEditingId !== record.id">
                  <div class="flex items-start gap-3">
                    <div class="flex-1 min-w-0">
                      <div class="flex items-center gap-2 mb-0.5 flex-wrap">
                        <span class="text-sm font-medium text-slate-100">{{ record.name }}</span>
                        <span class="text-xs text-emerald-400">¥{{ record.price.toLocaleString() }}</span>
                      </div>
                      <div class="flex items-center gap-2 flex-wrap mb-1.5">
                        <span v-for="tag in record.tags" :key="tag"
                          class="px-1.5 py-0.5 bg-emerald-500/10 text-emerald-400/70 text-[10px] rounded-full border border-emerald-500/20">{{ tag }}</span>
                        <span class="text-[10px] text-slate-500">{{ record.date }}</span>
                        <button @click="toggleExpanded(record.id)" class="flex items-center gap-0.5 text-[10px] text-slate-500 hover:text-slate-300 transition-colors bg-transparent border-none cursor-pointer p-0 ml-auto">
                          理由 {{ expandedIds.has(record.id) ? '▲' : '▼' }}
                        </button>
                      </div>
                      <p v-if="expandedIds.has(record.id)" class="text-xs text-slate-400 leading-relaxed m-0 mt-1 border-t border-white/[0.06] pt-1.5">{{ record.reason }}</p>
                    </div>
                    <div class="flex items-center gap-2 flex-shrink-0">
                      <button @click="startGamanEdit(record)" class="text-slate-500 hover:text-slate-300 text-[11px] border border-white/[0.08] rounded px-1.5 py-0.5 transition-colors bg-transparent cursor-pointer">編集</button>
                      <button @click="deleteGaman(record.id)" class="text-slate-600 hover:text-red-400 text-sm transition-colors bg-transparent border-none cursor-pointer p-0">✕</button>
                    </div>
                  </div>
                </template>
                <template v-else>
                  <div class="space-y-2">
                    <div class="grid grid-cols-2 gap-2">
                      <input v-model="gamanEditForm.name" type="text" placeholder="品名"
                        class="w-full bg-white/[0.08] border border-white/[0.18] rounded-lg px-2.5 py-1.5 text-sm text-slate-100 focus:outline-none focus:border-emerald-500/50" />
                      <input v-model.number="gamanEditForm.price" type="number" min="0" placeholder="金額"
                        class="w-full bg-white/[0.08] border border-white/[0.18] rounded-lg px-2.5 py-1.5 text-sm text-slate-100 focus:outline-none focus:border-emerald-500/50" />
                    </div>
                    <textarea v-model="gamanEditForm.reason" rows="2" placeholder="買わなかった理由"
                      class="w-full bg-white/[0.08] border border-white/[0.18] rounded-lg px-2.5 py-1.5 text-sm text-slate-100 focus:outline-none focus:border-emerald-500/50 resize-none" />
                    <input v-model="gamanEditForm.date" type="date"
                      class="bg-white/[0.08] border border-white/[0.18] rounded-lg px-2.5 py-1.5 text-sm text-slate-100 focus:outline-none focus:border-emerald-500/50" />
                    <div>
                      <div v-if="gamanEditForm.tags.length" class="flex flex-wrap gap-1 mb-1.5">
                        <span v-for="tag in gamanEditForm.tags" :key="tag"
                          class="flex items-center gap-0.5 px-1.5 py-0.5 bg-emerald-500/15 text-emerald-400 text-[10px] rounded-full border border-emerald-500/30">
                          {{ tag }}<button @click="removeGamanEditTag(tag)" class="text-emerald-400/60 hover:text-emerald-300 leading-none bg-transparent border-none cursor-pointer p-0 ml-0.5">×</button>
                        </span>
                      </div>
                      <input v-model="gamanEditTagInput" @keydown.enter.prevent="addGamanEditTag" type="text" placeholder="タグ追加（Enter）"
                        class="w-full bg-white/[0.08] border border-white/[0.18] rounded-lg px-2.5 py-1.5 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-emerald-500/50" />
                      <div v-if="gamanEditTagSuggestions.length" class="flex flex-wrap gap-1 mt-1.5">
                        <button v-for="tag in gamanEditTagSuggestions" :key="tag" @click="addGamanEditTagDirect(tag)"
                          class="px-1.5 py-0.5 text-[10px] text-slate-400 border border-white/[0.08] rounded-full hover:border-emerald-500/30 hover:text-emerald-400 transition-colors bg-transparent cursor-pointer">+ {{ tag }}</button>
                      </div>
                    </div>
                    <div class="flex gap-2">
                      <button @click="saveGamanEdit(record.id)" :disabled="!gamanEditForm.name.trim() || !gamanEditForm.price || !gamanEditForm.reason.trim()"
                        class="flex-1 py-1.5 bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/30 text-emerald-400 text-xs font-medium rounded-lg transition-all disabled:opacity-40 disabled:cursor-not-allowed">保存</button>
                      <button @click="cancelGamanEdit()" class="px-4 py-1.5 border border-white/[0.12] text-slate-400 hover:text-slate-200 text-xs rounded-lg transition-all bg-transparent cursor-pointer">キャンセル</button>
                    </div>
                  </div>
                </template>
              </div>
            </div>
          </div>
        </div>

        <!-- ── Tab: 復活ログ ── -->
        <div v-if="activeTab === 'fukkatsu'">

          <!-- Form -->
          <div class="space-y-3 mb-5">
            <div class="grid grid-cols-2 gap-3">
              <div>
                <label class="text-xs text-slate-400 mb-1 block">品名</label>
                <input v-model="fukkatsuForm.name" type="text" placeholder="例: ワイヤレスイヤホン"
                  class="w-full bg-white/[0.06] border border-white/[0.12] rounded-lg px-3 py-2 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-emerald-500/50" />
              </div>
              <div>
                <label class="text-xs text-slate-400 mb-1 block">相当額（円）</label>
                <input v-model.number="fukkatsuForm.price" type="number" min="0" placeholder="0"
                  class="w-full bg-white/[0.06] border border-white/[0.12] rounded-lg px-3 py-2 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-emerald-500/50" />
              </div>
            </div>
            <div>
              <label class="text-xs text-slate-400 mb-1 block">再使用した理由</label>
              <textarea v-model="fukkatsuForm.reason" rows="2" placeholder="例: 新しいものを買わずに済んだ、まだ使えると気づいた"
                class="w-full bg-white/[0.06] border border-white/[0.12] rounded-lg px-3 py-2 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-emerald-500/50 resize-none" />
            </div>
            <div>
              <label class="text-xs text-slate-400 mb-1 block">日付</label>
              <input v-model="fukkatsuForm.date" type="date"
                class="bg-white/[0.06] border border-white/[0.12] rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-emerald-500/50" />
            </div>
            <div>
              <label class="text-xs text-slate-400 mb-1 block">タグ</label>
              <div v-if="fukkatsuForm.tags.length" class="flex flex-wrap gap-1.5 mb-2">
                <span v-for="tag in fukkatsuForm.tags" :key="tag"
                  class="flex items-center gap-1 px-2 py-0.5 bg-emerald-500/15 text-emerald-400 text-xs rounded-full border border-emerald-500/30">
                  {{ tag }}
                  <button @click="removeFukkatsuFormTag(tag)" class="text-emerald-400/60 hover:text-emerald-300 leading-none ml-0.5">×</button>
                </span>
              </div>
              <input v-model="fukkatsuTagInput" @keydown.enter.prevent="addFukkatsuTag" type="text"
                placeholder="タグを入力してEnter（例: 家電、衣類）"
                class="w-full bg-white/[0.06] border border-white/[0.12] rounded-lg px-3 py-2 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-emerald-500/50" />
              <div v-if="fukkatsuTagSuggestions.length" class="flex flex-wrap gap-1 mt-2">
                <button v-for="tag in fukkatsuTagSuggestions" :key="tag" @click="addFukkatsuTagDirect(tag)"
                  class="px-2 py-0.5 text-xs text-slate-400 border border-white/[0.08] rounded-full hover:border-emerald-500/30 hover:text-emerald-400 transition-colors">
                  + {{ tag }}
                </button>
              </div>
            </div>
            <button @click="saveFukkatsu" :disabled="!fukkatsuForm.name.trim() || !fukkatsuForm.price || !fukkatsuForm.reason.trim() || fukkatsuSaving"
              class="w-full py-2 bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/30 text-emerald-400 text-sm font-medium rounded-lg transition-all disabled:opacity-40 disabled:cursor-not-allowed">
              {{ fukkatsuSaving ? '保存中...' : '記録する' }}
            </button>
          </div>

          <div class="border-t border-white/[0.06] mb-4" />

          <!-- Records -->
          <div>
            <div class="flex items-center justify-between mb-2">
              <h3 class="text-sm font-semibold text-slate-300 m-0">
                復活ログ（{{ filteredFukkatsuRecords.length }}件<template v-if="fukkatsuFilterTags.length"> / {{ fukkatsuRecords.length }}件中</template>）
              </h3>
              <span class="text-xs text-emerald-400 font-medium">節約相当 ¥{{ filteredFukkatsuTotal.toLocaleString() }}</span>
            </div>
            <div v-if="allTags.length" class="flex flex-wrap gap-1 mb-3">
              <button v-for="tag in allTags" :key="tag" @click="toggleFukkatsuFilter(tag)"
                :class="fukkatsuFilterTags.includes(tag) ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40' : 'text-slate-400 border-white/[0.12] hover:border-emerald-500/30 hover:text-emerald-400'"
                class="px-2.5 py-0.5 text-xs rounded-full border transition-all">
                {{ tag }}
              </button>
            </div>
            <p v-if="fukkatsuLoading" class="text-center py-6 text-slate-500 text-sm m-0">読み込み中...</p>
            <p v-else-if="!fukkatsuRecords.length" class="text-center py-6 text-slate-500 text-sm m-0">まだ記録がありません</p>
            <p v-else-if="!filteredFukkatsuRecords.length" class="text-center py-6 text-slate-500 text-sm m-0">該当する記録がありません</p>
            <div class="space-y-2">
              <div v-for="record in filteredFukkatsuRecords" :key="record.id"
                class="p-3 bg-white/[0.03] border border-white/[0.06] rounded-xl">
                <template v-if="fukkatsuEditingId !== record.id">
                  <div class="flex items-start gap-3">
                    <div class="flex-1 min-w-0">
                      <div class="flex items-center gap-2 mb-0.5 flex-wrap">
                        <span class="text-sm font-medium text-slate-100">{{ record.name }}</span>
                        <span class="text-xs text-teal-400">¥{{ record.price.toLocaleString() }} 節約</span>
                      </div>
                      <div class="flex items-center gap-2 flex-wrap mb-1.5">
                        <span v-for="tag in record.tags" :key="tag"
                          class="px-1.5 py-0.5 bg-teal-500/10 text-teal-400/70 text-[10px] rounded-full border border-teal-500/20">{{ tag }}</span>
                        <span class="text-[10px] text-slate-500">{{ record.date }}</span>
                        <button @click="toggleExpanded(record.id)" class="flex items-center gap-0.5 text-[10px] text-slate-500 hover:text-slate-300 transition-colors bg-transparent border-none cursor-pointer p-0 ml-auto">
                          理由 {{ expandedIds.has(record.id) ? '▲' : '▼' }}
                        </button>
                      </div>
                      <p v-if="expandedIds.has(record.id)" class="text-xs text-slate-400 leading-relaxed m-0 mt-1 border-t border-white/[0.06] pt-1.5">{{ record.reason }}</p>
                    </div>
                    <div class="flex items-center gap-2 flex-shrink-0">
                      <button @click="startFukkatsuEdit(record)" class="text-slate-500 hover:text-slate-300 text-[11px] border border-white/[0.08] rounded px-1.5 py-0.5 transition-colors bg-transparent cursor-pointer">編集</button>
                      <button @click="deleteFukkatsu(record.id)" class="text-slate-600 hover:text-red-400 text-sm transition-colors bg-transparent border-none cursor-pointer p-0">✕</button>
                    </div>
                  </div>
                </template>
                <template v-else>
                  <div class="space-y-2">
                    <div class="grid grid-cols-2 gap-2">
                      <input v-model="fukkatsuEditForm.name" type="text" placeholder="品名"
                        class="w-full bg-white/[0.08] border border-white/[0.18] rounded-lg px-2.5 py-1.5 text-sm text-slate-100 focus:outline-none focus:border-emerald-500/50" />
                      <input v-model.number="fukkatsuEditForm.price" type="number" min="0" placeholder="金額"
                        class="w-full bg-white/[0.08] border border-white/[0.18] rounded-lg px-2.5 py-1.5 text-sm text-slate-100 focus:outline-none focus:border-emerald-500/50" />
                    </div>
                    <textarea v-model="fukkatsuEditForm.reason" rows="2" placeholder="使って節約できた理由"
                      class="w-full bg-white/[0.08] border border-white/[0.18] rounded-lg px-2.5 py-1.5 text-sm text-slate-100 focus:outline-none focus:border-emerald-500/50 resize-none" />
                    <input v-model="fukkatsuEditForm.date" type="date"
                      class="bg-white/[0.08] border border-white/[0.18] rounded-lg px-2.5 py-1.5 text-sm text-slate-100 focus:outline-none focus:border-emerald-500/50" />
                    <div>
                      <div v-if="fukkatsuEditForm.tags.length" class="flex flex-wrap gap-1 mb-1.5">
                        <span v-for="tag in fukkatsuEditForm.tags" :key="tag"
                          class="flex items-center gap-0.5 px-1.5 py-0.5 bg-emerald-500/15 text-emerald-400 text-[10px] rounded-full border border-emerald-500/30">
                          {{ tag }}<button @click="removeFukkatsuEditTag(tag)" class="text-emerald-400/60 hover:text-emerald-300 leading-none bg-transparent border-none cursor-pointer p-0 ml-0.5">×</button>
                        </span>
                      </div>
                      <input v-model="fukkatsuEditTagInput" @keydown.enter.prevent="addFukkatsuEditTag" type="text" placeholder="タグ追加（Enter）"
                        class="w-full bg-white/[0.08] border border-white/[0.18] rounded-lg px-2.5 py-1.5 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-emerald-500/50" />
                      <div v-if="fukkatsuEditTagSuggestions.length" class="flex flex-wrap gap-1 mt-1.5">
                        <button v-for="tag in fukkatsuEditTagSuggestions" :key="tag" @click="addFukkatsuEditTagDirect(tag)"
                          class="px-1.5 py-0.5 text-[10px] text-slate-400 border border-white/[0.08] rounded-full hover:border-emerald-500/30 hover:text-emerald-400 transition-colors bg-transparent cursor-pointer">+ {{ tag }}</button>
                      </div>
                    </div>
                    <div class="flex gap-2">
                      <button @click="saveFukkatsuEdit(record.id)" :disabled="!fukkatsuEditForm.name.trim() || !fukkatsuEditForm.price || !fukkatsuEditForm.reason.trim()"
                        class="flex-1 py-1.5 bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/30 text-emerald-400 text-xs font-medium rounded-lg transition-all disabled:opacity-40 disabled:cursor-not-allowed">保存</button>
                      <button @click="cancelFukkatsuEdit()" class="px-4 py-1.5 border border-white/[0.12] text-slate-400 hover:text-slate-200 text-xs rounded-lg transition-all bg-transparent cursor-pointer">キャンセル</button>
                    </div>
                  </div>
                </template>
              </div>
            </div>
          </div>
        </div>

        <!-- ── Tab: 浪費ログ ── -->
        <div v-if="activeTab === 'rouhi'">

          <!-- Form -->
          <div class="space-y-3 mb-5">
            <div class="grid grid-cols-2 gap-3">
              <div>
                <label class="text-xs text-slate-400 mb-1 block">品名</label>
                <input v-model="rouhiForm.name" type="text" placeholder="例: 衝動買いしたもの"
                  class="w-full bg-white/[0.06] border border-white/[0.12] rounded-lg px-3 py-2 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-rose-500/50" />
              </div>
              <div>
                <label class="text-xs text-slate-400 mb-1 block">金額（円）</label>
                <input v-model.number="rouhiForm.price" type="number" min="0" placeholder="0"
                  class="w-full bg-white/[0.06] border border-white/[0.12] rounded-lg px-3 py-2 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-rose-500/50" />
              </div>
            </div>
            <div>
              <label class="text-xs text-slate-400 mb-1 block">買ってしまった理由</label>
              <textarea v-model="rouhiForm.reason" rows="2" placeholder="例: セールで安かったから、なんとなく欲しくなった"
                class="w-full bg-white/[0.06] border border-white/[0.12] rounded-lg px-3 py-2 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-rose-500/50 resize-none" />
            </div>
            <div>
              <label class="text-xs text-slate-400 mb-1 block">日付</label>
              <input v-model="rouhiForm.date" type="date"
                class="bg-white/[0.06] border border-white/[0.12] rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-rose-500/50" />
            </div>
            <div>
              <label class="text-xs text-slate-400 mb-1 block">タグ</label>
              <div v-if="rouhiForm.tags.length" class="flex flex-wrap gap-1.5 mb-2">
                <span v-for="tag in rouhiForm.tags" :key="tag"
                  class="flex items-center gap-1 px-2 py-0.5 bg-rose-500/15 text-rose-400 text-xs rounded-full border border-rose-500/30">
                  {{ tag }}
                  <button @click="removeRouhiFormTag(tag)" class="text-rose-400/60 hover:text-rose-300 leading-none ml-0.5">×</button>
                </span>
              </div>
              <input v-model="rouhiTagInput" @keydown.enter.prevent="addRouhiTag" type="text"
                placeholder="タグを入力してEnter（例: 衝動買い、食費）"
                class="w-full bg-white/[0.06] border border-white/[0.12] rounded-lg px-3 py-2 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-rose-500/50" />
              <div v-if="rouhiTagSuggestions.length" class="flex flex-wrap gap-1 mt-2">
                <button v-for="tag in rouhiTagSuggestions" :key="tag" @click="addRouhiTagDirect(tag)"
                  class="px-2 py-0.5 text-xs text-slate-400 border border-white/[0.08] rounded-full hover:border-rose-500/30 hover:text-rose-400 transition-colors">
                  + {{ tag }}
                </button>
              </div>
            </div>
            <button @click="saveRouhi" :disabled="!rouhiForm.name.trim() || !rouhiForm.price || !rouhiForm.reason.trim() || rouhiSaving"
              class="w-full py-2 bg-rose-500/20 hover:bg-rose-500/30 border border-rose-500/30 text-rose-400 text-sm font-medium rounded-lg transition-all disabled:opacity-40 disabled:cursor-not-allowed">
              {{ rouhiSaving ? '保存中...' : '記録する' }}
            </button>
          </div>

          <div class="border-t border-white/[0.06] mb-4" />

          <!-- Records -->
          <div>
            <div class="flex items-center justify-between mb-2">
              <h3 class="text-sm font-semibold text-slate-300 m-0">
                浪費ログ（{{ filteredRouhiRecords.length }}件<template v-if="rouhiFilterTags.length"> / {{ rouhiRecords.length }}件中</template>）
              </h3>
              <span class="text-xs text-rose-400 font-medium">合計 ¥{{ filteredRouhiTotal.toLocaleString() }}</span>
            </div>
            <div v-if="allTags.length" class="flex flex-wrap gap-1 mb-3">
              <button v-for="tag in allTags" :key="tag" @click="toggleRouhiFilter(tag)"
                :class="rouhiFilterTags.includes(tag) ? 'bg-rose-500/20 text-rose-400 border-rose-500/40' : 'text-slate-400 border-white/[0.12] hover:border-rose-500/30 hover:text-rose-400'"
                class="px-2.5 py-0.5 text-xs rounded-full border transition-all">
                {{ tag }}
              </button>
            </div>
            <p v-if="rouhiLoading" class="text-center py-6 text-slate-500 text-sm m-0">読み込み中...</p>
            <p v-else-if="!rouhiRecords.length" class="text-center py-6 text-slate-500 text-sm m-0">まだ記録がありません</p>
            <p v-else-if="!filteredRouhiRecords.length" class="text-center py-6 text-slate-500 text-sm m-0">該当する記録がありません</p>
            <div class="space-y-2">
              <div v-for="record in filteredRouhiRecords" :key="record.id"
                class="p-3 bg-white/[0.03] border border-white/[0.06] rounded-xl">
                <template v-if="rouhiEditingId !== record.id">
                  <div class="flex items-start gap-3">
                    <div class="flex-1 min-w-0">
                      <div class="flex items-center gap-2 mb-0.5 flex-wrap">
                        <span class="text-sm font-medium text-slate-100">{{ record.name }}</span>
                        <span class="text-xs text-rose-400">¥{{ record.price.toLocaleString() }}</span>
                      </div>
                      <div class="flex items-center gap-2 flex-wrap mb-1.5">
                        <span v-for="tag in record.tags" :key="tag"
                          class="px-1.5 py-0.5 bg-rose-500/10 text-rose-400/70 text-[10px] rounded-full border border-rose-500/20">{{ tag }}</span>
                        <span class="text-[10px] text-slate-500">{{ record.date }}</span>
                        <button @click="toggleExpanded(record.id)" class="flex items-center gap-0.5 text-[10px] text-slate-500 hover:text-slate-300 transition-colors bg-transparent border-none cursor-pointer p-0 ml-auto">
                          理由 {{ expandedIds.has(record.id) ? '▲' : '▼' }}
                        </button>
                      </div>
                      <p v-if="expandedIds.has(record.id)" class="text-xs text-slate-400 leading-relaxed m-0 mt-1 border-t border-white/[0.06] pt-1.5">{{ record.reason }}</p>
                    </div>
                    <div class="flex items-center gap-2 flex-shrink-0">
                      <button @click="startRouhiEdit(record)" class="text-slate-500 hover:text-slate-300 text-[11px] border border-white/[0.08] rounded px-1.5 py-0.5 transition-colors bg-transparent cursor-pointer">編集</button>
                      <button @click="deleteRouhi(record.id)" class="text-slate-600 hover:text-red-400 text-sm transition-colors bg-transparent border-none cursor-pointer p-0">✕</button>
                    </div>
                  </div>
                </template>
                <template v-else>
                  <div class="space-y-2">
                    <div class="grid grid-cols-2 gap-2">
                      <input v-model="rouhiEditForm.name" type="text" placeholder="品名"
                        class="w-full bg-white/[0.08] border border-white/[0.18] rounded-lg px-2.5 py-1.5 text-sm text-slate-100 focus:outline-none focus:border-rose-500/50" />
                      <input v-model.number="rouhiEditForm.price" type="number" min="0" placeholder="金額"
                        class="w-full bg-white/[0.08] border border-white/[0.18] rounded-lg px-2.5 py-1.5 text-sm text-slate-100 focus:outline-none focus:border-rose-500/50" />
                    </div>
                    <textarea v-model="rouhiEditForm.reason" rows="2" placeholder="買ってしまった理由"
                      class="w-full bg-white/[0.08] border border-white/[0.18] rounded-lg px-2.5 py-1.5 text-sm text-slate-100 focus:outline-none focus:border-rose-500/50 resize-none" />
                    <input v-model="rouhiEditForm.date" type="date"
                      class="bg-white/[0.08] border border-white/[0.18] rounded-lg px-2.5 py-1.5 text-sm text-slate-100 focus:outline-none focus:border-rose-500/50" />
                    <div>
                      <div v-if="rouhiEditForm.tags.length" class="flex flex-wrap gap-1 mb-1.5">
                        <span v-for="tag in rouhiEditForm.tags" :key="tag"
                          class="flex items-center gap-0.5 px-1.5 py-0.5 bg-rose-500/15 text-rose-400 text-[10px] rounded-full border border-rose-500/30">
                          {{ tag }}<button @click="removeRouhiEditTag(tag)" class="text-rose-400/60 hover:text-rose-300 leading-none bg-transparent border-none cursor-pointer p-0 ml-0.5">×</button>
                        </span>
                      </div>
                      <input v-model="rouhiEditTagInput" @keydown.enter.prevent="addRouhiEditTag" type="text" placeholder="タグ追加（Enter）"
                        class="w-full bg-white/[0.08] border border-white/[0.18] rounded-lg px-2.5 py-1.5 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-rose-500/50" />
                      <div v-if="rouhiEditTagSuggestions.length" class="flex flex-wrap gap-1 mt-1.5">
                        <button v-for="tag in rouhiEditTagSuggestions" :key="tag" @click="addRouhiEditTagDirect(tag)"
                          class="px-1.5 py-0.5 text-[10px] text-slate-400 border border-white/[0.08] rounded-full hover:border-rose-500/30 hover:text-rose-400 transition-colors bg-transparent cursor-pointer">+ {{ tag }}</button>
                      </div>
                    </div>
                    <div class="flex gap-2">
                      <button @click="saveRouhiEdit(record.id)" :disabled="!rouhiEditForm.name.trim() || !rouhiEditForm.price || !rouhiEditForm.reason.trim()"
                        class="flex-1 py-1.5 bg-rose-500/20 hover:bg-rose-500/30 border border-rose-500/30 text-rose-400 text-xs font-medium rounded-lg transition-all disabled:opacity-40 disabled:cursor-not-allowed">保存</button>
                      <button @click="cancelRouhiEdit()" class="px-4 py-1.5 border border-white/[0.12] text-slate-400 hover:text-slate-200 text-xs rounded-lg transition-all bg-transparent cursor-pointer">キャンセル</button>
                    </div>
                  </div>
                </template>
              </div>
            </div>
          </div>
        </div>

        <!-- ── Tab: 相談 ── -->
        <div v-if="activeTab === 'sodan'">

          <!-- Form -->
          <div class="space-y-3 mb-5">
            <textarea v-model="wantsInput" rows="3" placeholder="欲しいもの・なぜ欲しいかを書いてください"
              class="w-full bg-white/[0.06] border border-white/[0.12] rounded-lg px-3 py-2 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-emerald-500/50 resize-none" />
            <div v-if="allTags.length" class="flex flex-wrap gap-1.5">
              <button v-for="tag in allTags" :key="tag" @click="toggleWantTag(tag)"
                :class="wantTags.includes(tag) ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40' : 'text-slate-400 border-white/[0.12] hover:border-emerald-500/30 hover:text-emerald-400'"
                class="px-2.5 py-0.5 text-xs rounded-full border transition-all">
                {{ tag }}
              </button>
            </div>
            <button @click="getAdvice" :disabled="!wantsInput.trim() || isAdvising"
              class="w-full py-2 bg-teal-500/20 hover:bg-teal-500/30 border border-teal-500/30 text-teal-400 text-sm font-medium rounded-lg transition-all disabled:opacity-40 disabled:cursor-not-allowed">
              {{ isAdvising ? '考え中...' : 'アドバイスをもらう' }}
            </button>
            <div v-if="adviceResult"
              class="bg-white/[0.04] border border-white/[0.08] rounded-xl p-4 text-sm text-slate-200 whitespace-pre-wrap leading-relaxed">
              {{ adviceResult }}
            </div>
            <p v-if="adviceError" class="text-xs text-red-400 m-0">{{ adviceError }}</p>
          </div>

          <div class="border-t border-white/[0.06] mb-4" />

          <!-- History -->
          <div>
            <h3 class="text-sm font-semibold text-slate-300 m-0 mb-2">
              相談履歴（{{ filteredSodanRecords.length }}件<template v-if="sodanFilterTags.length"> / {{ sodanRecords.length }}件中</template>）
            </h3>
            <div v-if="allTags.length" class="flex flex-wrap gap-1 mb-3">
              <button v-for="tag in allTags" :key="tag" @click="toggleSodanFilter(tag)"
                :class="sodanFilterTags.includes(tag) ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40' : 'text-slate-400 border-white/[0.12] hover:border-emerald-500/30 hover:text-emerald-400'"
                class="px-2.5 py-0.5 text-xs rounded-full border transition-all">
                {{ tag }}
              </button>
            </div>
            <p v-if="!sodanRecords.length" class="text-center py-6 text-slate-500 text-sm m-0">まだ相談履歴がありません</p>
            <p v-else-if="!filteredSodanRecords.length" class="text-center py-6 text-slate-500 text-sm m-0">該当する履歴がありません</p>
            <div class="space-y-2">
              <div v-for="record in filteredSodanRecords" :key="record.id"
                class="p-3 bg-white/[0.03] border border-white/[0.06] rounded-xl">
                <template v-if="sodanEditingId !== record.id">
                  <div class="flex items-start justify-between gap-2 mb-1.5">
                    <p class="text-sm font-medium text-slate-100 m-0 leading-snug">{{ record.wants }}</p>
                    <div class="flex items-center gap-2 flex-shrink-0">
                      <button @click="startSodanEdit(record)" class="text-slate-500 hover:text-slate-300 text-[11px] border border-white/[0.08] rounded px-1.5 py-0.5 transition-colors bg-transparent cursor-pointer">編集</button>
                      <button @click="deleteSodan(record.id)" class="text-slate-600 hover:text-red-400 text-sm transition-colors bg-transparent border-none cursor-pointer p-0">✕</button>
                    </div>
                  </div>
                  <div class="flex items-center gap-2 flex-wrap mb-1.5">
                    <span v-for="tag in record.tags" :key="tag"
                      class="px-1.5 py-0.5 bg-emerald-500/10 text-emerald-400/70 text-[10px] rounded-full border border-emerald-500/20">{{ tag }}</span>
                    <span class="text-[10px] text-slate-500">{{ record.date }}</span>
                    <button @click="toggleExpanded(record.id)" class="flex items-center gap-0.5 text-[10px] text-slate-500 hover:text-slate-300 transition-colors bg-transparent border-none cursor-pointer p-0 ml-auto">
                      アドバイス {{ expandedIds.has(record.id) ? '▲' : '▼' }}
                    </button>
                  </div>
                  <p v-if="expandedIds.has(record.id)" class="text-xs text-slate-400 leading-relaxed m-0 whitespace-pre-wrap border-t border-white/[0.06] pt-1.5">{{ record.result }}</p>
                </template>
                <template v-else>
                  <div class="space-y-2">
                    <div>
                      <label class="text-[10px] text-slate-500 mb-1 block">欲しいもの・相談内容</label>
                      <textarea v-model="sodanEditForm.wants" rows="2"
                        class="w-full bg-white/[0.08] border border-white/[0.18] rounded-lg px-2.5 py-1.5 text-sm text-slate-100 focus:outline-none focus:border-emerald-500/50 resize-none" />
                    </div>
                    <div>
                      <label class="text-[10px] text-slate-500 mb-1 block">AIのアドバイス</label>
                      <textarea v-model="sodanEditForm.result" rows="4"
                        class="w-full bg-white/[0.08] border border-white/[0.18] rounded-lg px-2.5 py-1.5 text-xs text-slate-100 focus:outline-none focus:border-emerald-500/50 resize-none" />
                    </div>
                    <div class="flex gap-2">
                      <button @click="saveSodanEdit(record.id)" :disabled="!sodanEditForm.wants.trim()"
                        class="flex-1 py-1.5 bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/30 text-emerald-400 text-xs font-medium rounded-lg transition-all disabled:opacity-40 disabled:cursor-not-allowed">保存</button>
                      <button @click="cancelSodanEdit()" class="px-4 py-1.5 border border-white/[0.12] text-slate-400 hover:text-slate-200 text-xs rounded-lg transition-all bg-transparent cursor-pointer">キャンセル</button>
                    </div>
                  </div>
                </template>
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'

interface SetsuyakuRecord {
  id: string
  date: string
  name: string
  price: number
  reason: string
  tags: string[]
}

interface SodanRecord {
  id: string
  date: string
  wants: string
  tags: string[]
  result: string
}

const today = () => new Date().toISOString().slice(0, 10)

useHead({
  title: '節約',
  link: [
    { rel: 'icon', type: 'image/svg+xml', href: `data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>💰</text></svg>` },
  ],
})

const isDev = import.meta.dev

function lsGet(key: string): SetsuyakuRecord[] {
  try {
    const parsed = JSON.parse(localStorage.getItem(key) || '[]')
    return (parsed as SetsuyakuRecord[]).map(r => ({ ...r, tags: Array.isArray(r.tags) ? r.tags : [] }))
  } catch { return [] }
}
function lsGetSodan(): SodanRecord[] {
  try {
    const parsed = JSON.parse(localStorage.getItem('setsuyaku_sodan') || '[]')
    return (parsed as SodanRecord[]).map(r => ({ ...r, tags: Array.isArray(r.tags) ? r.tags : [] }))
  } catch { return [] }
}
function lsSetSodan(records: SodanRecord[]) {
  localStorage.setItem('setsuyaku_sodan', JSON.stringify(records))
}

function lsSet(key: string, records: SetsuyakuRecord[]) {
  localStorage.setItem(key, JSON.stringify(records))
}

const { logout } = useAuth()
const showSettingsMenu = ref(false)

const activeTab = ref<'gaman' | 'fukkatsu' | 'rouhi' | 'sodan'>('gaman')

// ── 我慢ログ ──
const gamanRecords = ref<SetsuyakuRecord[]>([])
const gamanLoading = ref(false)
const gamanSaving = ref(false)
const gamanForm = ref({ name: '', price: 0, reason: '', date: today(), tags: [] as string[] })
const gamanTagInput = ref('')

const allTags = computed(() => {
  const set = new Set<string>()
  gamanRecords.value.forEach(r => r.tags.forEach(t => set.add(t)))
  fukkatsuRecords.value.forEach(r => r.tags.forEach(t => set.add(t)))
  rouhiRecords.value.forEach(r => r.tags.forEach(t => set.add(t)))
  return [...set].sort()
})

const gamanTagSuggestions = computed(() => {
  const available = allTags.value.filter(t => !gamanForm.value.tags.includes(t))
  const q = gamanTagInput.value.trim()
  return q ? available.filter(t => t.includes(q)) : available
})

function addGamanTag() {
  const tag = gamanTagInput.value.trim()
  if (tag && !gamanForm.value.tags.includes(tag)) gamanForm.value.tags.push(tag)
  gamanTagInput.value = ''
}
function addGamanTagDirect(tag: string) {
  if (!gamanForm.value.tags.includes(tag)) gamanForm.value.tags.push(tag)
  gamanTagInput.value = ''
}
function removeGamanFormTag(tag: string) {
  gamanForm.value.tags = gamanForm.value.tags.filter(t => t !== tag)
}

async function fetchGaman() {
  gamanLoading.value = true
  try {
    if (isDev) {
      gamanRecords.value = lsGet('setsuyaku_gaman')
    } else {
      gamanRecords.value = await $fetch<SetsuyakuRecord[]>('/api/setsuyaku/gaman')
    }
  } catch {}
  gamanLoading.value = false
}

async function saveGaman() {
  if (!gamanForm.value.name.trim() || gamanSaving.value) return
  // 入力欄に未確定のタグがあれば自動で追加
  const pendingTag = gamanTagInput.value.trim()
  if (pendingTag && !gamanForm.value.tags.includes(pendingTag)) gamanForm.value.tags.push(pendingTag)
  gamanTagInput.value = ''
  gamanSaving.value = true
  try {
    const record: SetsuyakuRecord = {
      id: crypto.randomUUID(),
      date: gamanForm.value.date,
      name: gamanForm.value.name.trim(),
      price: gamanForm.value.price || 0,
      reason: gamanForm.value.reason.trim(),
      tags: [...gamanForm.value.tags],
    }
    if (isDev) {
      const stored = lsGet('setsuyaku_gaman')
      stored.unshift(record)
      lsSet('setsuyaku_gaman', stored)
      gamanRecords.value.unshift(record)
    } else {
      const saved = await $fetch<SetsuyakuRecord>('/api/setsuyaku/gaman', { method: 'POST', body: record })
      gamanRecords.value.unshift(saved)
    }
    gamanForm.value = { name: '', price: 0, reason: '', date: today(), tags: [] }
  } catch {}
  gamanSaving.value = false
}

async function deleteGaman(id: string) {
  if (!confirm('この記録を削除しますか？')) return
  if (isDev) {
    lsSet('setsuyaku_gaman', lsGet('setsuyaku_gaman').filter(r => r.id !== id))
  } else {
    await $fetch(`/api/setsuyaku/gaman/${id}`, { method: 'DELETE' }).catch(() => {})
  }
  gamanRecords.value = gamanRecords.value.filter(r => r.id !== id)
}

const totalGaman = computed(() => gamanRecords.value.reduce((s, r) => s + r.price, 0))

const gamanFilterTags = ref<string[]>([])
function toggleGamanFilter(tag: string) {
  const idx = gamanFilterTags.value.indexOf(tag)
  if (idx === -1) gamanFilterTags.value.push(tag)
  else gamanFilterTags.value.splice(idx, 1)
}
const filteredGamanRecords = computed(() => {
  if (!gamanFilterTags.value.length) return gamanRecords.value
  return gamanRecords.value.filter(r => r.tags.some(t => gamanFilterTags.value.includes(t)))
})
const filteredGamanTotal = computed(() => filteredGamanRecords.value.reduce((s, r) => s + r.price, 0))

const gamanEditingId = ref<string | null>(null)
const gamanEditForm = ref({ name: '', price: 0, reason: '', date: '', tags: [] as string[] })
const gamanEditTagInput = ref('')
const gamanEditTagSuggestions = computed(() => {
  const available = allTags.value.filter(t => !gamanEditForm.value.tags.includes(t))
  const q = gamanEditTagInput.value.trim()
  return q ? available.filter(t => t.includes(q)) : available
})
function startGamanEdit(record: SetsuyakuRecord) {
  gamanEditingId.value = record.id
  gamanEditForm.value = { name: record.name, price: record.price, reason: record.reason, date: record.date, tags: [...record.tags] }
  gamanEditTagInput.value = ''
}
function cancelGamanEdit() { gamanEditingId.value = null }
function addGamanEditTag() {
  const tag = gamanEditTagInput.value.trim()
  if (tag && !gamanEditForm.value.tags.includes(tag)) gamanEditForm.value.tags.push(tag)
  gamanEditTagInput.value = ''
}
function addGamanEditTagDirect(tag: string) {
  if (!gamanEditForm.value.tags.includes(tag)) gamanEditForm.value.tags.push(tag)
  gamanEditTagInput.value = ''
}
function removeGamanEditTag(tag: string) {
  gamanEditForm.value.tags = gamanEditForm.value.tags.filter(t => t !== tag)
}
async function saveGamanEdit(id: string) {
  const pending = gamanEditTagInput.value.trim()
  if (pending && !gamanEditForm.value.tags.includes(pending)) gamanEditForm.value.tags.push(pending)
  gamanEditTagInput.value = ''
  const f = gamanEditForm.value
  if (!f.name.trim() || !f.price || !f.reason.trim()) return
  const updated = { name: f.name.trim(), price: f.price, reason: f.reason.trim(), date: f.date, tags: [...f.tags] }
  if (isDev) {
    lsSet('setsuyaku_gaman', lsGet('setsuyaku_gaman').map(r => r.id === id ? { ...r, ...updated } : r))
  } else {
    await $fetch(`/api/setsuyaku/gaman/${id}`, { method: 'PATCH', body: updated }).catch(() => {})
  }
  gamanRecords.value = gamanRecords.value.map(r => r.id === id ? { ...r, ...updated } : r)
  gamanEditingId.value = null
}

// ── 復活ログ ──
const fukkatsuRecords = ref<SetsuyakuRecord[]>([])
const fukkatsuLoading = ref(false)
const fukkatsuSaving = ref(false)
const fukkatsuForm = ref({ name: '', price: 0, reason: '', date: today(), tags: [] as string[] })
const fukkatsuTagInput = ref('')

const fukkatsuTagSuggestions = computed(() => {
  const available = allTags.value.filter(t => !fukkatsuForm.value.tags.includes(t))
  const q = fukkatsuTagInput.value.trim()
  return q ? available.filter(t => t.includes(q)) : available
})

function addFukkatsuTag() {
  const tag = fukkatsuTagInput.value.trim()
  if (tag && !fukkatsuForm.value.tags.includes(tag)) fukkatsuForm.value.tags.push(tag)
  fukkatsuTagInput.value = ''
}
function addFukkatsuTagDirect(tag: string) {
  if (!fukkatsuForm.value.tags.includes(tag)) fukkatsuForm.value.tags.push(tag)
  fukkatsuTagInput.value = ''
}
function removeFukkatsuFormTag(tag: string) {
  fukkatsuForm.value.tags = fukkatsuForm.value.tags.filter(t => t !== tag)
}

async function fetchFukkatsu() {
  fukkatsuLoading.value = true
  try {
    if (isDev) {
      fukkatsuRecords.value = lsGet('setsuyaku_fukkatsu')
    } else {
      fukkatsuRecords.value = await $fetch<SetsuyakuRecord[]>('/api/setsuyaku/fukkatsu')
    }
  } catch {}
  fukkatsuLoading.value = false
}

async function saveFukkatsu() {
  if (!fukkatsuForm.value.name.trim() || fukkatsuSaving.value) return
  const pendingTag = fukkatsuTagInput.value.trim()
  if (pendingTag && !fukkatsuForm.value.tags.includes(pendingTag)) fukkatsuForm.value.tags.push(pendingTag)
  fukkatsuTagInput.value = ''
  fukkatsuSaving.value = true
  try {
    const record: SetsuyakuRecord = {
      id: crypto.randomUUID(),
      date: fukkatsuForm.value.date,
      name: fukkatsuForm.value.name.trim(),
      price: fukkatsuForm.value.price || 0,
      reason: fukkatsuForm.value.reason.trim(),
      tags: [...fukkatsuForm.value.tags],
    }
    if (isDev) {
      const stored = lsGet('setsuyaku_fukkatsu')
      stored.unshift(record)
      lsSet('setsuyaku_fukkatsu', stored)
      fukkatsuRecords.value.unshift(record)
    } else {
      const saved = await $fetch<SetsuyakuRecord>('/api/setsuyaku/fukkatsu', { method: 'POST', body: record })
      fukkatsuRecords.value.unshift(saved)
    }
    fukkatsuForm.value = { name: '', price: 0, reason: '', date: today(), tags: [] }
  } catch {}
  fukkatsuSaving.value = false
}

async function deleteFukkatsu(id: string) {
  if (!confirm('この記録を削除しますか？')) return
  if (isDev) {
    lsSet('setsuyaku_fukkatsu', lsGet('setsuyaku_fukkatsu').filter(r => r.id !== id))
  } else {
    await $fetch(`/api/setsuyaku/fukkatsu/${id}`, { method: 'DELETE' }).catch(() => {})
  }
  fukkatsuRecords.value = fukkatsuRecords.value.filter(r => r.id !== id)
}

const totalFukkatsu = computed(() => fukkatsuRecords.value.reduce((s, r) => s + r.price, 0))

const fukkatsuFilterTags = ref<string[]>([])
function toggleFukkatsuFilter(tag: string) {
  const idx = fukkatsuFilterTags.value.indexOf(tag)
  if (idx === -1) fukkatsuFilterTags.value.push(tag)
  else fukkatsuFilterTags.value.splice(idx, 1)
}
const filteredFukkatsuRecords = computed(() => {
  if (!fukkatsuFilterTags.value.length) return fukkatsuRecords.value
  return fukkatsuRecords.value.filter(r => r.tags.some(t => fukkatsuFilterTags.value.includes(t)))
})
const filteredFukkatsuTotal = computed(() => filteredFukkatsuRecords.value.reduce((s, r) => s + r.price, 0))

const fukkatsuEditingId = ref<string | null>(null)
const fukkatsuEditForm = ref({ name: '', price: 0, reason: '', date: '', tags: [] as string[] })
const fukkatsuEditTagInput = ref('')
const fukkatsuEditTagSuggestions = computed(() => {
  const available = allTags.value.filter(t => !fukkatsuEditForm.value.tags.includes(t))
  const q = fukkatsuEditTagInput.value.trim()
  return q ? available.filter(t => t.includes(q)) : available
})
function startFukkatsuEdit(record: SetsuyakuRecord) {
  fukkatsuEditingId.value = record.id
  fukkatsuEditForm.value = { name: record.name, price: record.price, reason: record.reason, date: record.date, tags: [...record.tags] }
  fukkatsuEditTagInput.value = ''
}
function cancelFukkatsuEdit() { fukkatsuEditingId.value = null }
function addFukkatsuEditTag() {
  const tag = fukkatsuEditTagInput.value.trim()
  if (tag && !fukkatsuEditForm.value.tags.includes(tag)) fukkatsuEditForm.value.tags.push(tag)
  fukkatsuEditTagInput.value = ''
}
function addFukkatsuEditTagDirect(tag: string) {
  if (!fukkatsuEditForm.value.tags.includes(tag)) fukkatsuEditForm.value.tags.push(tag)
  fukkatsuEditTagInput.value = ''
}
function removeFukkatsuEditTag(tag: string) {
  fukkatsuEditForm.value.tags = fukkatsuEditForm.value.tags.filter(t => t !== tag)
}
async function saveFukkatsuEdit(id: string) {
  const pending = fukkatsuEditTagInput.value.trim()
  if (pending && !fukkatsuEditForm.value.tags.includes(pending)) fukkatsuEditForm.value.tags.push(pending)
  fukkatsuEditTagInput.value = ''
  const f = fukkatsuEditForm.value
  if (!f.name.trim() || !f.price || !f.reason.trim()) return
  const updated = { name: f.name.trim(), price: f.price, reason: f.reason.trim(), date: f.date, tags: [...f.tags] }
  if (isDev) {
    lsSet('setsuyaku_fukkatsu', lsGet('setsuyaku_fukkatsu').map(r => r.id === id ? { ...r, ...updated } : r))
  } else {
    await $fetch(`/api/setsuyaku/fukkatsu/${id}`, { method: 'PATCH', body: updated }).catch(() => {})
  }
  fukkatsuRecords.value = fukkatsuRecords.value.map(r => r.id === id ? { ...r, ...updated } : r)
  fukkatsuEditingId.value = null
}

// ── 浪費ログ ──
const rouhiRecords = ref<SetsuyakuRecord[]>([])
const rouhiLoading = ref(false)
const rouhiSaving = ref(false)
const rouhiForm = ref({ name: '', price: 0, reason: '', date: today(), tags: [] as string[] })
const rouhiTagInput = ref('')

const rouhiTagSuggestions = computed(() => {
  const available = allTags.value.filter(t => !rouhiForm.value.tags.includes(t))
  const q = rouhiTagInput.value.trim()
  return q ? available.filter(t => t.includes(q)) : available
})

function addRouhiTag() {
  const tag = rouhiTagInput.value.trim()
  if (tag && !rouhiForm.value.tags.includes(tag)) rouhiForm.value.tags.push(tag)
  rouhiTagInput.value = ''
}
function addRouhiTagDirect(tag: string) {
  if (!rouhiForm.value.tags.includes(tag)) rouhiForm.value.tags.push(tag)
  rouhiTagInput.value = ''
}
function removeRouhiFormTag(tag: string) {
  rouhiForm.value.tags = rouhiForm.value.tags.filter(t => t !== tag)
}

async function fetchRouhi() {
  rouhiLoading.value = true
  try {
    if (isDev) {
      rouhiRecords.value = lsGet('setsuyaku_rouhi')
    } else {
      rouhiRecords.value = await $fetch<SetsuyakuRecord[]>('/api/setsuyaku/rouhi')
    }
  } catch {}
  rouhiLoading.value = false
}

async function saveRouhi() {
  if (!rouhiForm.value.name.trim() || rouhiSaving.value) return
  const pendingTag = rouhiTagInput.value.trim()
  if (pendingTag && !rouhiForm.value.tags.includes(pendingTag)) rouhiForm.value.tags.push(pendingTag)
  rouhiTagInput.value = ''
  rouhiSaving.value = true
  try {
    const record: SetsuyakuRecord = {
      id: crypto.randomUUID(),
      date: rouhiForm.value.date,
      name: rouhiForm.value.name.trim(),
      price: rouhiForm.value.price || 0,
      reason: rouhiForm.value.reason.trim(),
      tags: [...rouhiForm.value.tags],
    }
    if (isDev) {
      const stored = lsGet('setsuyaku_rouhi')
      stored.unshift(record)
      lsSet('setsuyaku_rouhi', stored)
      rouhiRecords.value.unshift(record)
    } else {
      const saved = await $fetch<SetsuyakuRecord>('/api/setsuyaku/rouhi', { method: 'POST', body: record })
      rouhiRecords.value.unshift(saved)
    }
    rouhiForm.value = { name: '', price: 0, reason: '', date: today(), tags: [] }
  } catch {}
  rouhiSaving.value = false
}

async function deleteRouhi(id: string) {
  if (!confirm('この記録を削除しますか？')) return
  if (isDev) {
    lsSet('setsuyaku_rouhi', lsGet('setsuyaku_rouhi').filter(r => r.id !== id))
  } else {
    await $fetch(`/api/setsuyaku/rouhi/${id}`, { method: 'DELETE' }).catch(() => {})
  }
  rouhiRecords.value = rouhiRecords.value.filter(r => r.id !== id)
}

const totalRouhi = computed(() => rouhiRecords.value.reduce((s, r) => s + r.price, 0))

const rouhiFilterTags = ref<string[]>([])
function toggleRouhiFilter(tag: string) {
  const idx = rouhiFilterTags.value.indexOf(tag)
  if (idx === -1) rouhiFilterTags.value.push(tag)
  else rouhiFilterTags.value.splice(idx, 1)
}
const filteredRouhiRecords = computed(() => {
  if (!rouhiFilterTags.value.length) return rouhiRecords.value
  return rouhiRecords.value.filter(r => r.tags.some(t => rouhiFilterTags.value.includes(t)))
})
const filteredRouhiTotal = computed(() => filteredRouhiRecords.value.reduce((s, r) => s + r.price, 0))

const rouhiEditingId = ref<string | null>(null)
const rouhiEditForm = ref({ name: '', price: 0, reason: '', date: '', tags: [] as string[] })
const rouhiEditTagInput = ref('')
const rouhiEditTagSuggestions = computed(() => {
  const available = allTags.value.filter(t => !rouhiEditForm.value.tags.includes(t))
  const q = rouhiEditTagInput.value.trim()
  return q ? available.filter(t => t.includes(q)) : available
})
function startRouhiEdit(record: SetsuyakuRecord) {
  rouhiEditingId.value = record.id
  rouhiEditForm.value = { name: record.name, price: record.price, reason: record.reason, date: record.date, tags: [...record.tags] }
  rouhiEditTagInput.value = ''
}
function cancelRouhiEdit() { rouhiEditingId.value = null }
function addRouhiEditTag() {
  const tag = rouhiEditTagInput.value.trim()
  if (tag && !rouhiEditForm.value.tags.includes(tag)) rouhiEditForm.value.tags.push(tag)
  rouhiEditTagInput.value = ''
}
function addRouhiEditTagDirect(tag: string) {
  if (!rouhiEditForm.value.tags.includes(tag)) rouhiEditForm.value.tags.push(tag)
  rouhiEditTagInput.value = ''
}
function removeRouhiEditTag(tag: string) {
  rouhiEditForm.value.tags = rouhiEditForm.value.tags.filter(t => t !== tag)
}
async function saveRouhiEdit(id: string) {
  const pending = rouhiEditTagInput.value.trim()
  if (pending && !rouhiEditForm.value.tags.includes(pending)) rouhiEditForm.value.tags.push(pending)
  rouhiEditTagInput.value = ''
  const f = rouhiEditForm.value
  if (!f.name.trim() || !f.price || !f.reason.trim()) return
  const updated = { name: f.name.trim(), price: f.price, reason: f.reason.trim(), date: f.date, tags: [...f.tags] }
  if (isDev) {
    lsSet('setsuyaku_rouhi', lsGet('setsuyaku_rouhi').map(r => r.id === id ? { ...r, ...updated } : r))
  } else {
    await $fetch(`/api/setsuyaku/rouhi/${id}`, { method: 'PATCH', body: updated }).catch(() => {})
  }
  rouhiRecords.value = rouhiRecords.value.map(r => r.id === id ? { ...r, ...updated } : r)
  rouhiEditingId.value = null
}

// ── ヘッダー合計 ──
const totalSetsuyaku = computed(() => totalGaman.value + totalFukkatsu.value)
const diffAmount = computed(() => totalSetsuyaku.value - totalRouhi.value)

// ── AI アドバイス ──
const wantsInput = ref('')
const wantTags = ref<string[]>([])
const adviceResult = ref('')
const adviceError = ref('')
const isAdvising = ref(false)

function toggleWantTag(tag: string) {
  const idx = wantTags.value.indexOf(tag)
  if (idx === -1) wantTags.value.push(tag)
  else wantTags.value.splice(idx, 1)
}

// ── 相談履歴 ──
const sodanRecords = ref<SodanRecord[]>([])
const sodanFilterTags = ref<string[]>([])

function toggleSodanFilter(tag: string) {
  const idx = sodanFilterTags.value.indexOf(tag)
  if (idx === -1) sodanFilterTags.value.push(tag)
  else sodanFilterTags.value.splice(idx, 1)
}

const filteredSodanRecords = computed(() => {
  if (!sodanFilterTags.value.length) return sodanRecords.value
  return sodanRecords.value.filter(r => r.tags.some(t => sodanFilterTags.value.includes(t)))
})

async function fetchSodan() {
  try {
    if (isDev) {
      sodanRecords.value = lsGetSodan()
    } else {
      sodanRecords.value = await $fetch<SodanRecord[]>('/api/setsuyaku/sodan')
    }
  } catch {}
}

async function deleteSodan(id: string) {
  if (!confirm('この相談履歴を削除しますか？')) return
  if (isDev) {
    lsSetSodan(lsGetSodan().filter(r => r.id !== id))
  } else {
    await $fetch(`/api/setsuyaku/sodan/${id}`, { method: 'DELETE' }).catch(() => {})
  }
  sodanRecords.value = sodanRecords.value.filter(r => r.id !== id)
}

const sodanEditingId = ref<string | null>(null)
const sodanEditForm = ref({ wants: '', result: '' })
function startSodanEdit(record: SodanRecord) {
  sodanEditingId.value = record.id
  sodanEditForm.value = { wants: record.wants, result: record.result }
}
function cancelSodanEdit() { sodanEditingId.value = null }
async function saveSodanEdit(id: string) {
  const f = sodanEditForm.value
  if (!f.wants.trim()) return
  const updated = { wants: f.wants.trim(), result: f.result }
  if (isDev) {
    lsSetSodan(lsGetSodan().map(r => r.id === id ? { ...r, ...updated } : r))
  } else {
    await $fetch(`/api/setsuyaku/sodan/${id}`, { method: 'PATCH', body: updated }).catch(() => {})
  }
  sodanRecords.value = sodanRecords.value.map(r => r.id === id ? { ...r, ...updated } : r)
  sodanEditingId.value = null
}

async function getAdvice() {
  if (!wantsInput.value.trim() || isAdvising.value) return
  isAdvising.value = true
  adviceResult.value = ''
  adviceError.value = ''
  try {
    const filtered = wantTags.value.length
      ? gamanRecords.value.filter(r => r.tags.some(t => wantTags.value.includes(t)))
      : gamanRecords.value
    const res = await $fetch<{ result: string }>('/api/setsuyaku/advice', {
      method: 'POST',
      body: { wants: wantsInput.value.trim(), wantTags: wantTags.value, records: filtered },
    })
    adviceResult.value = res.result
    const record: SodanRecord = {
      id: crypto.randomUUID(),
      date: today(),
      wants: wantsInput.value.trim(),
      tags: [...wantTags.value],
      result: res.result,
    }
    if (isDev) {
      const stored = lsGetSodan()
      stored.unshift(record)
      lsSetSodan(stored)
    } else {
      await $fetch('/api/setsuyaku/sodan', { method: 'POST', body: record }).catch(() => {})
    }
    sodanRecords.value.unshift(record)
    wantsInput.value = ''
    wantTags.value = []
  } catch (e) {
    adviceError.value = e instanceof Error ? e.message : 'アドバイスの取得に失敗しました'
  } finally {
    isAdvising.value = false
  }
}

const expandedIds = ref<Set<string>>(new Set())
function toggleExpanded(id: string) {
  const next = new Set(expandedIds.value)
  if (next.has(id)) next.delete(id)
  else next.add(id)
  expandedIds.value = next
}

onMounted(() => {
  fetchGaman()
  fetchFukkatsu()
  fetchRouhi()
  fetchSodan()
})
</script>
