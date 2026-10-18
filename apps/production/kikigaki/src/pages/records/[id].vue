<template>
  <!-- 欄からカーソルを外したとき・1行の欄で Enter を押したときは、待たずにすぐ保存する -->
  <div class="kk-review" @focusout="flushSave" @keydown.enter="onEnterSave">
    <p v-if="loading" class="kk-lead py-10 text-center">読み込んでいます…</p>

    <template v-else-if="record">
      <!-- 見出しと操作を1行に。PDFのように左右に並べて、スクロールせず全体が見えるようにする -->
      <div class="kk-review-head">
        <div class="kk-review-title">
          <NuxtLink to="/" class="kk-back" title="一覧へ" aria-label="一覧へ">
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 5l-7 7 7 7" /></svg>
          </NuxtLink>
          <div class="kk-review-titlebar">
            <h1 class="kk-review-h1">内容を確かめる</h1>
            <!-- 種類（話し合い／聞き取り）。押すと、種類を選び直して元の文章からつくり直せる -->
            <div ref="modeRoot" class="kk-pop-wrap">
              <button
                type="button"
                class="kk-mode-btn"
                :class="{ 'is-open': openPop === 'restructure' }"
                :aria-expanded="openPop === 'restructure'"
                :disabled="restructuring"
                title="種類を変えて、元の文章からまとめ直す"
                @click="togglePop('restructure')"
              >
                <MinutesModeBadge :mode="minutes.mode" />
                <span v-if="restructuring" class="kk-mode-btn-text">まとめ直しています…</span>
                <svg v-if="!restructuring" viewBox="0 0 24 24" aria-hidden="true"><path d="M7 10l5 5 5-5" /></svg>
              </button>
              <div v-if="openPop === 'restructure'" class="kk-pop kk-pop--wide kk-pop--left" role="dialog" aria-label="種類を変える">
                <p class="kk-pop-title">種類を変える</p>
                <div class="kk-mode-choice" role="radiogroup" aria-label="どんな記録か">
                  <button
                    v-for="m in MINUTES_MODES"
                    :key="m.value"
                    type="button"
                    role="radio"
                    class="kk-mode-opt"
                    :class="{ 'is-on': restructureMode === m.value }"
                    :aria-checked="restructureMode === m.value"
                    :disabled="restructuring"
                    @click="restructureMode = m.value"
                  >
                    <span class="kk-mode-opt-label">{{ m.label }}</span>
                    <span class="kk-mode-opt-desc">{{ m.desc }}</span>
                  </button>
                </div>
                <p class="kk-note mt-2 mb-0">
                  元の文章から、選んだ種類でAIがまとめ直します。いまの内容は置き換わり、手で直したところも元に戻ります（タグは残ります）。
                </p>
                <div class="flex justify-end mt-2">
                  <button type="button" class="kk-pop-run" :disabled="restructuring" @click="runRestructure">
                    {{ restructuring ? 'まとめ直しています…' : restructureRunLabel }}
                  </button>
                </div>
              </div>
            </div>
            <!-- 自動保存の状態。直してから少し待つと自動で保存される -->
            <span class="kk-autosave" :class="`is-${autoState}`" role="status" aria-live="polite">{{ autoLabel }}</span>
          </div>
        </div>

        <div ref="toolsRoot" class="kk-head-actions">
          <!-- 不明点 は普段は小さく畳み、押したときだけ下に開く -->
          <!-- 元の文章（取り込んだ全文）。右からせり出す欄で、左の列を直しながら見比べられる -->
          <button
            type="button"
            class="kk-icon-btn"
            :class="{ 'is-open': sourceOpen }"
            :aria-expanded="sourceOpen"
            title="取り込んだ元の文章を見る"
            @click="toggleSource"
          >
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 5h16M4 10h16M4 15h10M4 20h7" /></svg>
            元の文章
          </button>

          <div v-if="minutes.unclearPoints.length" class="kk-pop-wrap">
            <button
              type="button"
              class="kk-icon-btn kk-icon-btn--warn"
              :class="{ 'is-open': openPop === 'unclear' }"
              :aria-expanded="openPop === 'unclear'"
              @click="togglePop('unclear')"
            >
              <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9" /><path d="M12 8v5M12 16.5v.01" /></svg>
              不明点
              <span class="kk-badge">{{ minutes.unclearPoints.length }}</span>
            </button>
            <div v-if="openPop === 'unclear'" class="kk-pop" role="dialog" aria-label="不明点">
              <p class="kk-pop-title">AIが判断しきれなかったところ</p>
              <ul class="kk-pop-list">
                <li v-for="(p, i) in minutes.unclearPoints" :key="i">{{ p }}</li>
              </ul>
            </div>
          </div>

          <!-- 「AIに直してもらう」は 2026-10-18 に画面から外した（「つくり直す」と並ぶと迷うため。本人の判断）。
               戻すときはこのコメントを外す。script 側の runRevise と /api/minutes/revise は残してある。
          <div class="kk-pop-wrap">
            <button
              type="button"
              class="kk-icon-btn kk-icon-btn--ai"
              :class="{ 'is-open': openPop === 'revise' }"
              :aria-expanded="openPop === 'revise'"
              :disabled="revising || restructuring"
              @click="togglePop('revise')"
            >
              <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3l1.8 4.7L18.5 9.5l-4.7 1.8L12 16l-1.8-4.7L5.5 9.5l4.7-1.8zM18 15l.9 2.1L21 18l-2.1.9L18 21l-.9-2.1L15 18l2.1-.9z" /></svg>
              {{ revising ? 'AIが直しています…' : 'AIに直してもらう' }}
            </button>
            <div v-if="openPop === 'revise'" class="kk-pop kk-pop--wide" role="dialog" aria-label="AIに直してもらう">
              <p class="kk-pop-title">AIに直してほしいこと</p>
              <textarea
                ref="reviseInput"
                v-model="reviseInstruction"
                rows="3"
                class="kk-input resize-none"
                placeholder="れい: 阪中さんを坂中さんに直して"
                aria-label="AIに直してほしいこと"
                @keydown.enter.exact="onReviseEnter"
              />
              <div class="flex items-center justify-between gap-2 mt-2">
                <span class="kk-note">Shift+Enter で改行</span>
                <button type="button" class="kk-pop-run" :disabled="revising || !reviseInstruction.trim()" @click="runRevise">
                  {{ revising ? '直しています…' : '直してもらう' }}
                </button>
              </div>
            </div>
          </div>
          -->

          <span class="kk-head-sep" aria-hidden="true" />

          <button type="button" class="kk-icon-btn kk-icon-btn--danger" title="削除" @click="confirmingDelete = true">
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3" /></svg>
            削除
          </button>
          <!-- ドライブ・PDF。PCでは見出しの右に並べ、スマホでは画面の下に固定する（ai-tools 版と同じ置き方。
               長い議事録を下まで読んでも、上に戻らずに押せるように）。
               保存ボタンは置かない（自動保存＋欄を離れたとき・一覧へ戻るときにも保存される） -->
          <div class="kk-save-bar">
          <button
            v-if="driveConnected"
            type="button"
            class="kk-icon-btn"
            :disabled="generatingPdf || driveSaving"
            title="Googleドライブに保存"
            @click="saveToDrive"
          >
            <GoogleDriveIcon />
            {{ driveSaving ? '保存中…' : 'ドライブ' }}
          </button>
          <button type="button" class="kk-icon-btn kk-icon-btn--primary" :disabled="generatingPdf || driveSaving" title="PDFのダウンロード" @click="downloadPdf">
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 4v11M7 11l5 5 5-5M5 20h14" /></svg>
            {{ generatingPdf ? 'PDF作成中…' : 'PDF' }}
          </button>
          </div>
        </div>
      </div>

      <p v-if="errorMessage" class="kk-notice kk-notice--error kk-msg mt-2">
        <span>{{ errorMessage }}</span>
        <button type="button" class="kk-msg-close" aria-label="閉じる" @click="errorMessage = ''">✕</button>
      </p>
      <p v-if="savedMessage" class="kk-notice kk-notice--info kk-msg mt-2">
        <span>{{ savedMessage }}</span>
        <button type="button" class="kk-msg-close" aria-label="閉じる" @click="savedMessage = ''">✕</button>
      </p>

      <div class="kk-review-grid">
        <div v-for="col in ['left', 'right']" :key="col" class="kk-review-col">
          <!-- 左だけ: 会議の名前・日・まとめ -->
          <template v-if="col === 'left'">
            <section class="kk-card kk-review-card">
              <!-- 名前は横一行を使う（長い名前でも見切れないように） -->
              <label class="kk-field-label" for="minutes-title">{{ labels.title }}</label>
              <input id="minutes-title" v-model="minutes.title" class="kk-input" :placeholder="labels.titlePlaceholder">
              <!-- 日・参加者・タグはその下に横に並べる（幅が足りなければ縦に積む） -->
              <div class="kk-meta-pair">
              <div class="kk-meta-date">
                <label class="kk-field-label mt-2" for="minutes-date">{{ labels.date }}</label>
                <input id="minutes-date" v-model="minutes.date" type="date" class="kk-input">
              </div>
              <div class="kk-meta-people">
              <!-- 参加者は1人1欄。末尾の空欄に入れて Enter（または欄を離れる）と確定し、次の空欄が出る -->
              <p class="kk-field-label mt-2">{{ labels.people }}<span class="kk-sec-count ml-1">{{ minutes.participants.length }}</span></p>
              <ul class="kk-people">
                <li v-for="(_, i) in minutes.participants" :key="i" class="kk-person">
                  <input
                    v-model="minutes.participants[i]"
                    class="kk-input kk-person-input"
                    :aria-label="`${labels.person}${i + 1}`"
                    @keydown.enter="onPersonEnter"
                  >
                  <button type="button" class="kk-person-del" :aria-label="`${minutes.participants[i] || labels.person}を外す`" @click="minutes.participants.splice(i, 1)">✕</button>
                </li>
                <li class="kk-person">
                  <input
                    ref="newPersonInput"
                    v-model="newPerson"
                    class="kk-input kk-person-input kk-person-input--new"
                    :placeholder="minutes.participants.length ? '＋ 次の人' : 'れい: 田中さん'"
                    :aria-label="`${labels.person}を追加`"
                    @keydown.enter="onNewPersonEnter"
                    @blur="commitNewPerson"
                  >
                </li>
              </ul>
              </div>
              <div class="kk-meta-tags">
                <p class="kk-field-label mt-2">タグ<span class="kk-sec-count ml-1">{{ minutes.tags.length }}</span></p>
                <TagInput v-model="minutes.tags" :suggestions="tagSuggestions" />
              </div>
              </div>
            </section>

            <section class="kk-card kk-review-card">
              <div class="kk-sec-head">
                <h2 class="kk-sec-title">{{ labels.summary }}</h2>
              </div>
              <AutoTextarea v-model="minutes.summary" :placeholder="labels.summaryPlaceholder" />
            </section>
          </template>

          <!-- 決まったこと・話し合ったこと（1人の話では 伝えたかったこと・話の内容）。
               同じ形なので部品で回す。左＝話し合い／話の内容、右＝決定／伝えたかったこと -->
          <section v-for="group in pointGroups.filter((g) => g.col === col)" :key="group.key" class="kk-card kk-review-card">
            <div class="kk-sec-head">
              <h2 class="kk-sec-title">{{ group.label }}<span class="kk-sec-count">{{ group.items.length }}</span></h2>
              <button type="button" class="kk-add" @click="group.items.push({ content: '', note: '' })"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5v14M5 12h14" /></svg>追加</button>
            </div>

            <p v-if="!group.items.length" class="kk-empty">見つかりませんでした。</p>
            <ul v-else class="kk-items">
              <li v-for="(item, i) in group.items" :key="i" class="kk-item">
                <!-- 番号と削除は左の細い列に縦に並べる（右側を空けて、スマホで本文の幅を取るため） -->
                <div class="kk-item-side">
                  <span class="kk-num">{{ i + 1 }}</span>
                  <button type="button" class="kk-row-del" aria-label="この行を削除" title="削除" @click="askRemoveRow(group.items, i)"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3" /></svg></button>
                </div>
                <div class="kk-item-body">
                  <AutoTextarea v-model="item.content" :placeholder="group.placeholder" class="font-bold" />
                  <!-- 補足は字下げと縦線で本文にぶら下がるものと分かるので、ラベルは出さず空のときの案内文字だけにする -->
                  <div class="kk-sub">
                    <AutoTextarea v-model="item.note" :placeholder="group.subLabel" class="flex-1" />
                  </div>
                </div>
              </li>
            </ul>
          </section>

          <!-- 右だけ: つぎの予定・やること（会議のときだけ。1人の話では拾わない） -->
          <template v-if="col === 'right' && minutes.mode === 'meeting'">
            <section class="kk-card kk-review-card">
              <div class="kk-sec-head">
                <h2 class="kk-sec-title">つぎの予定<span class="kk-sec-count">{{ minutes.eventCandidates.length }}</span></h2>
                <button type="button" class="kk-add" @click="addEvent"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5v14M5 12h14" /></svg>追加</button>
              </div>

              <p v-if="!minutes.eventCandidates.length" class="kk-empty">見つかりませんでした。</p>
              <ul v-else class="kk-items">
                <li v-for="(ev, i) in minutes.eventCandidates" :key="i" class="kk-item">
                  <!-- 番号と削除は左の細い列に縦に並べる（右側を空けて、スマホで本文の幅を取るため） -->
                  <div class="kk-item-side">
                    <span class="kk-num">{{ i + 1 }}</span>
                    <button type="button" class="kk-row-del" aria-label="この行を削除" title="削除" @click="askRemoveRow(minutes.eventCandidates, i)"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3" /></svg></button>
                  </div>
                  <div class="kk-item-body">
                  <AutoTextarea v-model="ev.title" placeholder="予定の名前" class="font-bold" />
                  <div class="kk-fields">
                    <div>
                      <label class="kk-field-label">日にちと時間</label>
                      <input v-model="ev.start" type="datetime-local" class="kk-input">
                      <p v-if="ev.datetime" class="kk-note m-0">会議では「{{ ev.datetime }}」と話していました。</p>
                    </div>
                    <div>
                      <label class="kk-field-label">場所</label>
                      <input v-model="ev.location" class="kk-input" placeholder="れい: 公民館">
                    </div>
                  </div>
                  </div>
                </li>
              </ul>
            </section>

            <section class="kk-card kk-review-card">
              <div class="kk-sec-head">
                <h2 class="kk-sec-title">やること<span class="kk-sec-count">{{ minutes.taskCandidates.length }}</span></h2>
                <button type="button" class="kk-add" @click="addTask"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5v14M5 12h14" /></svg>追加</button>
              </div>

              <p v-if="!minutes.taskCandidates.length" class="kk-empty">見つかりませんでした。</p>
              <ul v-else class="kk-items">
                <li v-for="(task, i) in minutes.taskCandidates" :key="i" class="kk-item">
                  <!-- 番号と削除は左の細い列に縦に並べる（右側を空けて、スマホで本文の幅を取るため） -->
                  <div class="kk-item-side">
                    <span class="kk-num">{{ i + 1 }}</span>
                    <button type="button" class="kk-row-del" aria-label="この行を削除" title="削除" @click="askRemoveRow(minutes.taskCandidates, i)"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3" /></svg></button>
                  </div>
                  <div class="kk-item-body">
                  <AutoTextarea v-model="task.task" placeholder="やること" class="font-bold" />
                  <div class="kk-fields">
                    <div>
                      <label class="kk-field-label">だれが</label>
                      <input v-model="task.assignee" class="kk-input" placeholder="れい: 田中さん">
                    </div>
                    <div>
                      <label class="kk-field-label">いつまでに</label>
                      <input v-model="task.dueDate" type="date" class="kk-input">
                      <p v-if="task.due" class="kk-note m-0">会議では「{{ task.due }}」と話していました。</p>
                    </div>
                  </div>
                  </div>
                </li>
              </ul>
            </section>
          </template>
        </div>
      </div>

      <!-- 行を消す前の確認 -->
      <BottomSheet :model-value="!!pendingRow" title="この行を削除しますか？" @update:model-value="pendingRow = null">
        <p class="kk-lead">一度消すと元には戻せません。</p>
        <div class="mt-4 flex flex-col gap-2">
          <button class="kk-btn-sub" @click="confirmRemoveRow">はい、削除します</button>
          <button class="kk-btn-text" @click="pendingRow = null">やめる</button>
        </div>
      </BottomSheet>

      <!-- 削除の確認。外をクリックすれば閉じる -->
      <BottomSheet v-model="confirmingDelete" title="この議事録を消しますか？" :closable="!deleting">
        <p class="kk-lead">一度消すと元には戻せません。</p>
        <div class="mt-4 flex flex-col gap-2">
          <button class="kk-btn-sub" :disabled="deleting" @click="remove">はい、消します</button>
          <button class="kk-btn-text" :disabled="deleting" @click="confirmingDelete = false">やめる</button>
        </div>
      </BottomSheet>

    </template>

    <!-- 元の文章の欄。背景を暗くしない（左の列を直しながら読めるように）。読むだけで、ここでは直せない -->
    <Transition name="kk-source-t">
      <aside v-if="sourceOpen && record" class="kk-source" role="complementary" aria-label="元の文章">
        <div class="kk-source-head">
          <p class="kk-source-title">
            元の文章
            <span class="kk-note">{{ transcriptLength.toLocaleString() }}字<template v-if="record.audioName"> ・ {{ record.audioName }}</template></span>
          </p>
          <button type="button" class="kk-source-close" aria-label="閉じる" @click="sourceOpen = false">✕</button>
        </div>
        <div class="kk-source-tools">
          <input
            ref="sourceSearchInput"
            v-model="sourceQuery"
            class="kk-input kk-source-search"
            placeholder="この中を探す（れい: 田中）"
            aria-label="元の文章の中を探す"
            @keydown.enter.prevent="onSourceEnter"
          >
          <span v-if="sourceQuery.trim()" class="kk-source-count">{{ matchCount ? `${matchIndex + 1} / ${matchCount}` : '0件' }}</span>
          <button type="button" class="kk-source-btn" :disabled="!matchCount" aria-label="前の当たり" @click="gotoMatch(-1)">↑</button>
          <button type="button" class="kk-source-btn" :disabled="!matchCount" aria-label="次の当たり" @click="gotoMatch(1)">↓</button>
          <button type="button" class="kk-source-btn kk-source-copy" @click="copyTranscript">{{ copied ? 'コピーしました' : 'コピー' }}</button>
        </div>
        <div ref="sourceBody" class="kk-source-body">
          <p v-if="!record.transcript" class="kk-note m-0">元の文章は保存されていません。</p>
          <!-- v-html は使わない（元の文章は利用者が入れたものなので、そのまま文字として出す） -->
          <p v-else class="kk-source-text"><template v-for="(seg, i) in sourceSegments" :key="i"><mark v-if="seg.hit" class="kk-source-mark" :class="{ 'is-current': seg.hitIndex === matchIndex }" :data-hit="seg.hitIndex">{{ seg.text }}</mark><template v-else>{{ seg.text }}</template></template></p>
        </div>
      </aside>
    </Transition>

    <!-- PDFは部品で作る（一覧画面と共通） -->
    <MinutesPdfMaker ref="pdfMaker" />
  </div>
</template>

<script setup lang="ts">
import { SERVICE } from '~/config/service'
import { apiMessage } from '~/utils/apiMessage'
import { emptyMinutes, MINUTES_MODES } from '~/types/minutes'
import type { Minutes, MinutesMode, MinutesRecord } from '~/types/minutes'
import type MinutesPdfMakerType from '~/components/MinutesPdfMaker.vue'

useHead({ title: `内容を確かめる — ${SERVICE.name}` })
// PDFのように左右に並べるので、レイアウト側で横幅を広げ画面の高さに収める
definePageMeta({ wide: true })

const route = useRoute()
const router = useRouter()
const { isLoggedIn, authedFetch, waitReady } = useAuth()
const { connected: driveConnected, refresh: refreshDrive, uploadPdf, ensureToken } = useDrive()
const driveSaving = ref(false)
// タグの入力の候補（これまで使ったタグ。多い順）
const { tags: allTags, version: tagsVersion, load: loadTags, touched: touchTags } = useTags()
const tagSuggestions = computed(() => allTags.value.map((t) => t.tag))
/** 最後に保存したときのタグ（保存でタグが変わったかを見るため） */
const savedTags = ref<string[]>([])

const id = computed(() => String(route.params.id ?? ''))
const record = ref<MinutesRecord | null>(null)
const loading = ref(true)
const errorMessage = ref('')
const savedMessage = ref('')
const generatingPdf = ref(false)
const revising = ref(false)
const reviseInstruction = ref('')
const restructuring = ref(false)
/** つくり直すときに選ぶまとめ方。開いたときは、いまのまとめ方と違うほうを選んでおく */
const restructureMode = ref<MinutesMode>('meeting')
/** 実行ボタンの文言。押す前に「何に変わるか」が分かるよう種類の名前を入れる。同じ種類なら最初からやり直す */
const restructureRunLabel = computed(() => {
  if (restructureMode.value === minutes.mode) return 'もう一度まとめ直す'
  const label = MINUTES_MODES.find((m) => m.value === restructureMode.value)?.label ?? ''
  return `「${label}」でまとめ直す`
})
const confirmingDelete = ref(false)
const deleting = ref(false)
/** ツールバーから開く小さな窓（不明点／つくり直す／AIに直してもらう＝いまは画面から外している）。同時に開くのは1つだけ */
type PopName = 'unclear' | 'restructure' | 'revise'
const openPop = ref<PopName | null>(null)
const toolsRoot = ref<HTMLElement | null>(null)
const modeRoot = ref<HTMLElement | null>(null)
const reviseInput = ref<HTMLTextAreaElement | null>(null)

function togglePop(name: PopName) {
  openPop.value = openPop.value === name ? null : name
  if (openPop.value === 'revise') nextTick(() => reviseInput.value?.focus())
  if (openPop.value === 'restructure') restructureMode.value = minutes.mode === 'talk' ? 'meeting' : 'talk'
}

// 窓の外を押したら閉じる
function onDocPointerDown(e: PointerEvent) {
  if (!openPop.value) return
  const target = e.target as Node
  if (toolsRoot.value?.contains(target) || modeRoot.value?.contains(target)) return
  openPop.value = null
}

function onDocKeydown(e: KeyboardEvent) {
  if (e.key !== 'Escape') return
  if (openPop.value) openPop.value = null
  else if (sourceOpen.value) sourceOpen.value = false
}

// ── 元の文章 ──
const sourceOpen = ref(false)
const sourceQuery = ref('')
const matchIndex = ref(0)
const copied = ref(false)
const sourceBody = ref<HTMLElement | null>(null)
const sourceSearchInput = ref<HTMLInputElement | null>(null)

const transcriptLength = computed(() => record.value?.transcript.length ?? 0)

function toggleSource() {
  sourceOpen.value = !sourceOpen.value
  openPop.value = null
  if (sourceOpen.value) nextTick(() => sourceSearchInput.value?.focus())
}

/** 元の文章を、当たった語とそれ以外に切り分ける（色付けのため。大文字小文字は区別しない） */
const sourceSegments = computed(() => {
  const text = record.value?.transcript ?? ''
  const q = sourceQuery.value.trim()
  if (!q) return [{ text, hit: false, hitIndex: -1 }]
  const lower = text.toLowerCase()
  const needle = q.toLowerCase()
  const segs: { text: string; hit: boolean; hitIndex: number }[] = []
  let pos = 0
  let n = 0
  for (;;) {
    const at = lower.indexOf(needle, pos)
    if (at < 0) break
    if (at > pos) segs.push({ text: text.slice(pos, at), hit: false, hitIndex: -1 })
    segs.push({ text: text.slice(at, at + q.length), hit: true, hitIndex: n++ })
    pos = at + q.length
  }
  if (pos < text.length) segs.push({ text: text.slice(pos), hit: false, hitIndex: -1 })
  return segs
})
const matchCount = computed(() => sourceSegments.value.filter((s) => s.hit).length)

function scrollToMatch() {
  nextTick(() => {
    const el = sourceBody.value?.querySelector(`[data-hit="${matchIndex.value}"]`)
    el?.scrollIntoView({ block: 'center' })
  })
}

function gotoMatch(step: number) {
  if (!matchCount.value) return
  matchIndex.value = (matchIndex.value + step + matchCount.value) % matchCount.value
  scrollToMatch()
}

/** Enter で次の当たりへ（IMEの変換確定のEnterでは動かない） */
function onSourceEnter(e: KeyboardEvent) {
  if (e.isComposing || e.keyCode === 229) return
  gotoMatch(e.shiftKey ? -1 : 1)
}

// 探す語を変えたら、最初の当たりへ
watch(sourceQuery, () => {
  matchIndex.value = 0
  if (matchCount.value) scrollToMatch()
})

async function copyTranscript() {
  try {
    await navigator.clipboard.writeText(record.value?.transcript ?? '')
    copied.value = true
    setTimeout(() => (copied.value = false), 2000)
  } catch {
    errorMessage.value = 'コピーできませんでした。文章を選んでコピーしてください。'
  }
}

/** Enter で送る。IMEの変換確定のEnterでは送らない（日本語入力で二重に走るのを防ぐ） */
function onReviseEnter(e: KeyboardEvent) {
  if (e.isComposing || e.keyCode === 229) return
  e.preventDefault()
  runRevise()
}
/** 消す確認待ちの行。はいで splice する */
const pendingRow = ref<{ list: unknown[]; index: number } | null>(null)

function askRemoveRow(list: unknown[], index: number) {
  pendingRow.value = { list, index }
}

function confirmRemoveRow() {
  const p = pendingRow.value
  if (p) p.list.splice(p.index, 1)
  pendingRow.value = null
}

/** 画面で編集している議事録。保存・PDFともこれをもとに行う */
const minutes = reactive<Minutes>(emptyMinutes())

/** まとめ方ごとの欄の名前（1人の話では「会議」と書かない） */
const labels = computed(() =>
  minutes.mode === 'talk'
    ? {
        title: 'タイトル',
        titlePlaceholder: 'れい: 子育てについての講演',
        date: '話した日',
        people: '話し手',
        person: '話し手',
        summary: '話のまとめ',
        summaryPlaceholder: 'どんな話だったかのまとめ',
      }
    : {
        title: '会議の名前',
        titlePlaceholder: 'れい: 青年部の定例会',
        date: '会議をした日',
        people: '会議の参加者',
        person: '参加者',
        summary: '会議のまとめ',
        summaryPlaceholder: '会議の流れのまとめ',
      }
)

/**
 * 「決まったこと」「話し合ったこと」（1人の話では「伝えたかったこと」「話の内容」）は同じ形なので、まとめて描く
 */
const pointGroups = computed(() =>
  minutes.mode === 'talk'
    ? [
        {
          key: 'keyMessages',
          col: 'right',
          label: '伝えたかったこと',
          placeholder: '伝えたかったこと',
          subLabel: '話の要旨',
          items: minutes.keyMessages,
        },
        {
          key: 'topics',
          col: 'left',
          label: '話の内容',
          placeholder: '話題',
          subLabel: '中身',
          items: minutes.topics,
        },
      ]
    : [
        {
          key: 'decisions',
          col: 'right',
          label: 'この会で決まったこと',
          placeholder: '決まったこと',
          subLabel: '補足',
          items: minutes.decisions,
        },
        {
          key: 'discussions',
          col: 'left',
          label: '話し合ったこと',
          placeholder: '話し合ったこと',
          subLabel: '補足',
          items: minutes.discussions,
        },
      ]
)

function applyMinutes(src: Minutes) {
  minutes.mode = src.mode
  minutes.title = src.title
  minutes.date = src.date
  minutes.participants = [...src.participants]
  minutes.tags = [...src.tags]
  minutes.summary = src.summary
  minutes.decisions = src.decisions.map((d) => ({ ...d }))
  minutes.discussions = src.discussions.map((d) => ({ ...d }))
  minutes.keyMessages = src.keyMessages.map((d) => ({ ...d }))
  minutes.topics = src.topics.map((d) => ({ ...d }))
  minutes.taskCandidates = src.taskCandidates.map((t) => ({ ...t }))
  minutes.eventCandidates = src.eventCandidates.map((e) => ({ ...e }))
  minutes.unclearPoints = [...src.unclearPoints]
}

// ── 参加者 ──
const newPerson = ref('')
const newPersonInput = ref<HTMLInputElement | null>(null)

/** 末尾の空欄に入れた名前を1人分として確定する */
function commitNewPerson() {
  const name = newPerson.value.trim()
  if (!name) return
  minutes.participants.push(name)
  newPerson.value = ''
}

/** Enter で確定し、そのまま次の人を打てるよう空欄にとどまる。IMEの変換確定のEnterでは確定しない */
function onNewPersonEnter(e: KeyboardEvent) {
  if (e.isComposing || e.keyCode === 229) return
  e.preventDefault()
  commitNewPerson()
  nextTick(() => newPersonInput.value?.focus())
}

/** 入力済みの欄で Enter を押したら、末尾の空欄へ移る */
function onPersonEnter(e: KeyboardEvent) {
  if (e.isComposing || e.keyCode === 229) return
  e.preventDefault()
  newPersonInput.value?.focus()
}


function addTask() {
  minutes.taskCandidates.push({ assignee: '', task: '', due: '', dueDate: '' })
}

function addEvent() {
  minutes.eventCandidates.push({ datetime: '', title: '', location: '', start: '', end: '' })
}

async function load() {
  loading.value = true
  try {
    const res = await authedFetch<{ record: MinutesRecord }>(`/api/records/${id.value}`)
    record.value = res.record
    applyMinutes(res.record.minutes)
    savedTags.value = [...res.record.minutes.tags]
    markSaved()
    lastSavedAt.value = ''
  } catch (e) {
    errorMessage.value = apiMessage(e, 'この議事録を開けませんでした。一覧からもう一度お試しください。')
    record.value = null
  }
  loading.value = false
}

/** タグが保存で増減したら、左メニューの件数と入力の候補を合わせる */
function syncSavedTags(tags: string[]) {
  if (tags.join('\n') === savedTags.value.join('\n')) return
  savedTags.value = [...tags]
  touchTags()
}

/** 保存（PDF化の前に呼ぶ。保存し忘れた直しがPDFに出ないように） */
async function saveMinutes(): Promise<void> {
  clearTimeout(autoTimer)
  // 末尾の空欄に打ちかけの名前があれば、それも参加者として保存する
  commitNewPerson()
  const res = await authedFetch<{ minutes: Minutes }>(`/api/records/${id.value}`, {
    method: 'PATCH',
    body: { minutes: toRaw(minutes) },
  })
  // サーバーが正規化した結果（日付の形・空の行を落とすなど）を画面へ返す。
  // PDF化の前だけ返す（自動保存では返さない＝入力中の画面を書き換えない）
  applyMinutes(res.minutes)
  markSaved()
  syncSavedTags(res.minutes.tags)
}

// ── 自動保存 ───────────────────────────────────────────
// 直してから AUTOSAVE_DELAY_MS 何も触らなかったら保存する。
// ★自動保存ではサーバーの正規化結果を画面に返さない。返すと「＋追加」で出したばかりの空の行が
//   消えたり、入力中の欄が書き換わったりするため。整えた形はPDF化・開き直しで揃う。
// ★参加者の打ちかけ（末尾の空欄）も確定させない（打っている途中の名前を横取りしないため）。

const AUTOSAVE_DELAY_MS = 2000
const AUTOSAVE_RETRY_MS = 10_000
type AutoState = 'saved' | 'dirty' | 'saving' | 'error'
const autoState = ref<AutoState>('saved')
const lastSavedAt = ref('')
/** 最後に保存した中身（これと違えば未保存） */
let lastSavedJson = ''
let autoTimer: ReturnType<typeof setTimeout> | undefined

const autoLabel = computed(() => {
  switch (autoState.value) {
    case 'saving':
      return '保存中…'
    case 'dirty':
      return '未保存の変更があります'
    case 'error':
      return '保存できませんでした（自動でやり直します）'
    default:
      return lastSavedAt.value ? `保存しました ${lastSavedAt.value}` : '保存済み'
  }
})

function snapshot(): string {
  return JSON.stringify(minutes)
}

function nowLabel(): string {
  const d = new Date()
  return `${d.getHours()}:${String(d.getMinutes()).padStart(2, '0')}`
}

/** いまの画面の中身を「保存済み」として覚える（読み込み・保存のあとに呼ぶ） */
function markSaved() {
  lastSavedJson = snapshot()
  lastSavedAt.value = nowLabel()
  autoState.value = 'saved'
}

function scheduleAutoSave(delay = AUTOSAVE_DELAY_MS) {
  clearTimeout(autoTimer)
  autoTimer = setTimeout(autoSave, delay)
}

async function autoSave(): Promise<boolean> {
  if (deleting.value || !record.value) return true
  // ボタンでの保存・PDF作り・AIの直しの最中は、それが終わってからにする
  if (
    generatingPdf.value ||
    driveSaving.value ||
    revising.value ||
    restructuring.value ||
    autoState.value === 'saving'
  ) {
    scheduleAutoSave()
    return false
  }
  const json = snapshot()
  if (json === lastSavedJson) {
    autoState.value = 'saved'
    return true
  }
  autoState.value = 'saving'
  try {
    const res = await authedFetch<{ minutes: Minutes }>(`/api/records/${id.value}`, {
      method: 'PATCH',
      body: { minutes: JSON.parse(json) },
    })
    lastSavedJson = json
    lastSavedAt.value = nowLabel()
    syncSavedTags(res.minutes.tags)
    // 保存している間にまた直していたら、もう一度
    if (snapshot() !== json) {
      autoState.value = 'dirty'
      scheduleAutoSave()
    } else {
      autoState.value = 'saved'
    }
    return true
  } catch {
    autoState.value = 'error'
    scheduleAutoSave(AUTOSAVE_RETRY_MS)
    return false
  }
}

/** 未保存の直しがあれば、待たずにすぐ保存する（欄を離れたとき・Enter のとき） */
function flushSave() {
  if (loading.value || !record.value || snapshot() === lastSavedJson) return
  clearTimeout(autoTimer)
  // 押したキーの処理（参加者の確定など）が画面に反映されてから保存する
  nextTick(() => autoSave())
}

/** 1行の入力欄で Enter を押したら保存する。複数行の欄（textarea）の Enter は改行なので保存しない */
function onEnterSave(e: KeyboardEvent) {
  if (e.isComposing || e.keyCode === 229) return
  const el = e.target as HTMLElement | null
  if (el?.tagName !== 'INPUT') return
  flushSave()
}

watch(
  minutes,
  () => {
    if (loading.value || !record.value) return
    if (snapshot() === lastSavedJson) {
      if (autoState.value === 'dirty') autoState.value = 'saved'
      return
    }
    if (autoState.value !== 'saving') autoState.value = 'dirty'
    scheduleAutoSave()
  },
  { deep: true }
)

// 一覧へ戻るときは、残っている直しを保存してから移る。保存できなければ確かめる
onBeforeRouteLeave(async () => {
  if (deleting.value || !record.value || snapshot() === lastSavedJson) return true
  clearTimeout(autoTimer)
  if (await autoSave()) return true
  return window.confirm('保存できていない変更があります。このまま移動しますか？')
})

// タブを閉じる・再読み込みするときに未保存なら、ブラウザの「このページを離れますか？」を出す
function onBeforeUnload(e: BeforeUnloadEvent) {
  if (!record.value || deleting.value || snapshot() === lastSavedJson) return
  e.preventDefault()
  e.returnValue = ''
}

async function runRevise() {
  const instruction = reviseInstruction.value.trim()
  if (!instruction) return
  errorMessage.value = ''
  savedMessage.value = ''
  revising.value = true
  try {
    const res = await authedFetch<{ minutes: Minutes }>('/api/minutes/revise', {
      method: 'POST',
      body: { id: id.value, minutes: toRaw(minutes), instruction },
    })
    applyMinutes(res.minutes)
    reviseInstruction.value = ''
    openPop.value = null
    // 直した結果は自動保存で保存される（watch が拾う）
    savedMessage.value = 'AIが直しました。内容を確かめてください（自動で保存されます）。'
  } catch (e) {
    errorMessage.value = apiMessage(e, 'AIが直せませんでした。もう一度お試しください。')
  }
  revising.value = false
}

/** 種類を変えて、元の文章からまとめ直す。結果は自動保存で保存される */
async function runRestructure() {
  errorMessage.value = ''
  savedMessage.value = ''
  restructuring.value = true
  try {
    const res = await authedFetch<{ minutes: Minutes }>('/api/minutes/restructure', {
      method: 'POST',
      body: { id: id.value, mode: restructureMode.value },
    })
    // タグは画面で付けたばかりのもの（まだ保存していないもの）も残す
    const tags = [...minutes.tags]
    applyMinutes(res.minutes)
    minutes.tags = tags
    openPop.value = null
    const label = MINUTES_MODES.find((m) => m.value === res.minutes.mode)?.label ?? ''
    savedMessage.value = `「${label}」にまとめ直しました。内容を確かめてください。`
  } catch (e) {
    errorMessage.value = apiMessage(e, 'まとめ直せませんでした。もう一度お試しください。')
  }
  restructuring.value = false
}

async function remove() {
  clearTimeout(autoTimer)
  deleting.value = true
  errorMessage.value = ''
  try {
    await authedFetch(`/api/records/${id.value}`, { method: 'DELETE' })
    await router.push('/')
  } catch (e) {
    errorMessage.value = apiMessage(e, '消せませんでした。もう一度お試しください。')
    deleting.value = false
  }
}

// ── PDF ────────────────────────────────────────────────
// 作り方（印刷用の見た目・文字数を超えたときの要約・画像化）は MinutesPdfMaker にまとめてある。

const pdfMaker = ref<InstanceType<typeof MinutesPdfMakerType> | null>(null)

/** 議事録からPDFを組み立てる（ダウンロードとドライブ保存で共通） */
async function createPdf() {
  // 先に保存する（保存し忘れた直しがPDFに出ないように）
  await saveMinutes()
  if (!pdfMaker.value) throw new Error('PDFの中身を用意できませんでした。画面を開き直してお試しください。')
  return await pdfMaker.value.make(toRaw(minutes))
}

async function downloadPdf() {
  errorMessage.value = ''
  savedMessage.value = ''
  generatingPdf.value = true
  try {
    const { pdf, fileName } = await createPdf()
    pdf.save(fileName)
    savedMessage.value = 'PDFを保存しました。スマホの「ファイル」や「ダウンロード」から開けます。'
  } catch (e) {
    errorMessage.value = apiMessage(e, 'PDFをつくれませんでした。もう一度お試しください。')
  }
  generatingPdf.value = false
}

/** PDFをGoogleドライブの「キキガキ議事録」フォルダへ保存する（ダウンロードはしない） */
async function saveToDrive() {
  errorMessage.value = ''
  savedMessage.value = ''
  driveSaving.value = true
  try {
    // 許可の画面はボタンを押した直後でないとブラウザに止められるので、PDF作りより先に権限を取る
    await ensureToken()
  } catch (e) {
    errorMessage.value = apiMessage(e, 'Googleドライブとつなげませんでした。もう一度お試しください。')
    driveSaving.value = false
    return
  }
  try {
    const { pdf, fileName } = await createPdf()
    await uploadPdf(pdf.output('blob'), fileName)
    savedMessage.value = 'Googleドライブの「キキガキ議事録」フォルダに保存しました（同じ名前のPDFは上書きしました）。'
  } catch (e) {
    errorMessage.value = apiMessage(e, 'ドライブに保存できませんでした。もう一度お試しください。')
  }
  driveSaving.value = false
}

// 左メニューでタグの名前を変えた・消したときは、開いている議事録のタグも読み直す
// （古いタグのまま保存すると、変更・削除したタグが元に戻ってしまうため）
watch(tagsVersion, async () => {
  try {
    const res = await authedFetch<{ record: MinutesRecord }>(`/api/records/${id.value}`)
    if (res.record.minutes.tags.join('\n') !== savedTags.value.join('\n')) {
      minutes.tags = [...res.record.minutes.tags]
      savedTags.value = [...res.record.minutes.tags]
    }
  } catch {
    // 読めなければそのまま（次に開き直したときに揃う）
  }
})

watch(isLoggedIn, async (v) => {
  if (v) await load()
})

onMounted(async () => {
  window.addEventListener('beforeunload', onBeforeUnload)
  document.addEventListener('pointerdown', onDocPointerDown)
  document.addEventListener('keydown', onDocKeydown)
  refreshDrive()
  await waitReady()
  if (!isLoggedIn.value) {
    await router.replace('/')
    return
  }
  await load()
  loadTags().catch(() => {})
})

onUnmounted(() => {
  clearTimeout(autoTimer)
  window.removeEventListener('beforeunload', onBeforeUnload)
  document.removeEventListener('pointerdown', onDocPointerDown)
  document.removeEventListener('keydown', onDocKeydown)
})
</script>

<style scoped>
/* 項目（主）と補足（従）の段差をつけるための見た目。
   同じ大きさの入力欄が並ぶと、どれが本文でどれが補足なのか読み取れないため。 */
.kk-num {
  flex-shrink: 0;
  width: 1.35rem;
  height: 1.35rem;
  border-radius: 999px;
  background: var(--kk-accent-soft);
  color: var(--kk-accent-strong);
  font-size: 11px;
  font-weight: 700;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

/* 補足は本文の下に字下げし、左の縦線で「本文にぶら下がるもの」だと分かるようにする */
.kk-sub {
  display: flex;
  align-items: flex-start;
  gap: 0.4rem;
  margin: 0.25rem 0 0 0.5rem;
  padding-left: 0.5rem;
  border-left: 2px solid var(--kk-line);
}


/* ── 確認画面: PDFと同じく左右2列。広い画面では高さを画面に収め、列の中だけ動かす ── */
.kk-review-head {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem 1rem;
}
.kk-review-title {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  min-width: 0;
  flex: 1 1 260px;
}
/* 元の文章の欄（右からせり出す。背景は暗くしない） */
.kk-source {
  position: fixed;
  top: 0;
  right: 0;
  bottom: 0;
  z-index: 70;
  width: min(520px, 100vw);
  display: flex;
  flex-direction: column;
  background: var(--kk-panel);
  border-left: 1px solid var(--kk-line);
  box-shadow: -10px 0 30px rgba(20, 60, 120, 0.14);
}
.kk-source-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
  padding: 0.6rem 0.9rem 0.4rem;
}
.kk-source-title {
  margin: 0;
  min-width: 0;
  font-size: 15px;
  font-weight: 700;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.kk-source-title .kk-note {
  margin-left: 0.4rem;
  font-weight: 400;
}
.kk-source-close {
  flex: none;
  width: 32px;
  height: 32px;
  border: 0;
  border-radius: 8px;
  background: transparent;
  color: var(--kk-ink-soft);
  cursor: pointer;
}
.kk-source-close:hover {
  background: var(--kk-accent-soft);
}
.kk-source-tools {
  display: flex;
  align-items: center;
  gap: 0.3rem;
  padding: 0 0.9rem 0.6rem;
  border-bottom: 1px solid var(--kk-line);
}
.kk-source-search {
  flex: 1;
  min-width: 0;
  padding: 0.3rem 0.6rem;
}
.kk-source-count {
  flex: none;
  font-size: 11.5px;
  color: var(--kk-ink-faint);
  min-width: 3.2rem;
  text-align: center;
}
.kk-source-btn {
  flex: none;
  height: 30px;
  min-width: 30px;
  padding: 0 0.45rem;
  border: 1px solid var(--kk-line);
  border-radius: 7px;
  background: #fff;
  font-family: inherit;
  font-size: 12px;
  color: var(--kk-ink-soft);
  cursor: pointer;
}
.kk-source-btn:hover:not(:disabled) {
  border-color: var(--kk-accent);
  color: var(--kk-accent-strong);
}
.kk-source-btn:disabled {
  opacity: 0.4;
  cursor: default;
}
.kk-source-copy {
  min-width: 4.5rem;
}
.kk-source-body {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  padding: 0.8rem 0.9rem 1.5rem;
}
.kk-source-text {
  margin: 0;
  font-size: 13.5px;
  line-height: 1.9;
  white-space: pre-wrap;
  word-break: break-word;
  color: var(--kk-ink);
}
.kk-source-mark {
  background: #fff1b8;
  color: inherit;
  border-radius: 2px;
}
.kk-source-mark.is-current {
  background: var(--kk-cta);
  color: #fff;
}
.kk-source-t-enter-active,
.kk-source-t-leave-active {
  transition: transform 0.2s ease-out;
}
.kk-source-t-enter-from,
.kk-source-t-leave-to {
  transform: translateX(100%);
}
.kk-autosave {
  font-size: 11.5px;
  font-weight: 500;
  color: var(--kk-ink-faint);
  vertical-align: 0.1em;
}
.kk-autosave.is-saving,
.kk-autosave.is-dirty {
  color: var(--kk-accent-strong);
}
.kk-autosave.is-error {
  color: var(--kk-danger);
  font-weight: 700;
}
.kk-autosave.is-saved::before {
  content: '✓ ';
}
.kk-review-titlebar {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 0.25rem 0.5rem;
  min-width: 0;
}
/* 見出しの横の種類ラベル。押せることが分かるよう、下向きの矢印と枠を付ける */
.kk-mode-btn {
  display: inline-flex;
  align-items: center;
  gap: 0.15rem;
  padding: 2px 4px 2px 2px;
  border: 1px solid transparent;
  border-radius: 999px;
  background: transparent;
  font-family: inherit;
  color: var(--kk-ink-faint);
  cursor: pointer;
}
.kk-mode-btn:hover:not(:disabled),
.kk-mode-btn.is-open {
  border-color: var(--kk-line-strong);
  background: var(--kk-panel);
}
.kk-mode-btn:disabled {
  cursor: default;
}
.kk-mode-btn > svg {
  width: 14px;
  height: 14px;
  fill: none;
  stroke: currentColor;
  stroke-width: 2;
  stroke-linecap: round;
  stroke-linejoin: round;
}
.kk-mode-btn-text {
  font-size: 11.5px;
  font-weight: 700;
  color: var(--kk-ink-soft);
}
.kk-review-h1 {
  margin: 0;
  font-size: 17px;
  font-weight: 700;
  line-height: 1.4;
}
.kk-back {
  width: 30px;
  height: 30px;
  flex: none;
  border-radius: 8px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  color: var(--kk-ink-soft);
}
.kk-back:hover { background: var(--kk-accent-soft); color: var(--kk-accent-strong); }
.kk-back svg {
  width: 18px;
  height: 18px;
  fill: none;
  stroke: currentColor;
  stroke-width: 2.2;
  stroke-linecap: round;
  stroke-linejoin: round;
}

.kk-head-actions {
  position: relative;
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.35rem;
  margin-left: auto;
}
.kk-head-sep {
  width: 1px;
  height: 20px;
  background: var(--kk-line);
  margin: 0 0.15rem;
}
.kk-icon-btn {
  display: inline-flex;
  align-items: center;
  gap: 0.3rem;
  height: 32px;
  padding: 0 0.65rem;
  border-radius: 8px;
  border: 1px solid var(--kk-line);
  background: #fff;
  color: var(--kk-ink);
  font-family: inherit;
  font-size: 12.5px;
  font-weight: 700;
  text-decoration: none;
  cursor: pointer;
  white-space: nowrap;
}
.kk-icon-btn svg {
  width: 15px;
  height: 15px;
  fill: none;
  stroke: currentColor;
  stroke-width: 2;
  stroke-linecap: round;
  stroke-linejoin: round;
}
.kk-icon-btn:hover:not(:disabled) { border-color: var(--kk-accent); background: var(--kk-accent-soft); }
.kk-icon-btn:disabled { opacity: 0.45; cursor: default; }
.kk-icon-btn--danger { color: var(--kk-danger); }
.kk-icon-btn--primary { background: var(--kk-cta); border-color: var(--kk-cta); color: #fff; }
.kk-icon-btn--primary:hover:not(:disabled) { background: var(--kk-cta-strong); border-color: var(--kk-cta-strong); }
.kk-icon-btn--warn { color: var(--kk-warn); border-color: #f5d6ad; background: var(--kk-warn-soft); }
.kk-icon-btn--warn:hover:not(:disabled),
.kk-icon-btn--warn.is-open { border-color: var(--kk-cta); background: #ffe9cc; }
.kk-icon-btn--ai { color: var(--kk-accent-strong); border-color: #c5dbf5; background: var(--kk-accent-soft); }
.kk-icon-btn--ai.is-open { border-color: var(--kk-accent); }
.kk-badge {
  min-width: 18px;
  height: 18px;
  padding: 0 5px;
  border-radius: 999px;
  background: var(--kk-cta);
  color: #fff;
  font-size: 11px;
  line-height: 18px;
  text-align: center;
}

/* ツールバーから下に開く小さな窓 */
.kk-pop-wrap {
  position: relative;
}
.kk-pop {
  position: absolute;
  top: calc(100% + 6px);
  right: 0;
  z-index: 60;
  width: 340px;
  max-width: calc(100vw - 24px);
  max-height: 60vh;
  overflow-y: auto;
  padding: 0.7rem 0.85rem;
  background: var(--kk-panel);
  border: 1px solid var(--kk-line);
  border-radius: 10px;
  box-shadow: 0 10px 30px rgba(20, 60, 120, 0.18);
}
.kk-pop--wide {
  width: 400px;
}
/* 画面の左側（見出しの横）から開く窓は、左端をそろえる（右にそろえると画面の外にはみ出す） */
.kk-pop--left {
  left: 0;
  right: auto;
  /* 左端が見出しの分だけ右にずれているので、スマホでも右にはみ出さない幅にする */
  max-width: calc(100vw - 72px);
}
.kk-save-bar {
  display: contents;
}
/* スマホ・タブレット（1列表示）では、ドライブ・PDFを画面の下に固定する */
@media (max-width: 1023px) {
  .kk-review {
    padding-bottom: calc(64px + env(safe-area-inset-bottom));
  }
  .kk-save-bar {
    position: fixed;
    left: 0;
    right: 0;
    bottom: 0;
    z-index: 50;
    display: flex;
    gap: 0.4rem;
    padding: 0.5rem 0.75rem calc(0.5rem + env(safe-area-inset-bottom));
    background: rgba(255, 255, 255, 0.96);
    border-top: 1px solid var(--kk-line);
    box-shadow: 0 -4px 16px rgba(20, 60, 120, 0.08);
    backdrop-filter: blur(6px);
  }
  .kk-save-bar .kk-icon-btn {
    flex: 1 1 0;
    min-width: 0;
    height: 44px;
    justify-content: center;
    padding: 0 0.4rem;
    font-size: 12.5px;
  }
  .kk-save-bar .kk-icon-btn--primary {
    flex-grow: 1.4;
  }
  .kk-save-bar .kk-icon-btn svg {
    width: 17px;
    height: 17px;
  }
}

/* スマホではボタンが折り返して途中に来るので、ボタン1つに合わせず、ボタン列の幅いっぱいに出す
   （右端合わせのままだと画面の左にはみ出す） */
@media (max-width: 640px) {
  .kk-head-actions {
    width: 100%;
  }
  .kk-pop-wrap {
    position: static;
  }
  .kk-pop,
  .kk-pop--wide {
    left: 0;
    right: 0;
    width: auto;
    max-width: none;
  }
}
.kk-pop-title {
  margin: 0 0 0.4rem;
  font-size: 13px;
  font-weight: 700;
}
.kk-pop-list {
  margin: 0;
  padding-left: 1.1rem;
  font-size: 13px;
  line-height: 1.7;
  display: flex;
  flex-direction: column;
  gap: 0.3rem;
}
.kk-pop-run {
  height: 32px;
  padding: 0 1rem;
  border: 0;
  border-radius: 999px;
  background: var(--kk-accent);
  color: #fff;
  font-family: inherit;
  font-size: 12.5px;
  font-weight: 700;
  cursor: pointer;
}
.kk-pop-run:hover:not(:disabled) { background: var(--kk-accent-strong); }
.kk-pop-run:disabled { opacity: 0.45; cursor: default; }

.kk-review-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 0.6rem;
  margin-top: 0.6rem;
}
.kk-review-col {
  display: flex;
  flex-direction: column;
  gap: 0.6rem;
  min-height: 0;
}
.kk-review-card {
  padding: 0.6rem 0.8rem 0.7rem;
}

/* 名前の下に、日・参加者・タグを横に並べる（入りきらなければ折り返す） */
.kk-meta-pair {
  display: flex;
  flex-wrap: wrap;
  gap: 0 1rem;
}
.kk-meta-date {
  flex: 0 0 160px;
}
.kk-meta-people,
.kk-meta-tags {
  flex: 1 1 200px;
  min-width: 0;
}

/* 参加者: 名前ごとの小さな欄を横に並べ、入りきらなければ折り返す */
.kk-people {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-wrap: wrap;
  gap: 0.35rem;
}
.kk-person {
  position: relative;
  width: 9.5rem;
}
.kk-person-input {
  padding-right: 1.6rem;
}
.kk-person-input--new {
  padding-right: 0.6rem;
  border-style: dashed;
  background: #fafcff;
}
.kk-person-del {
  position: absolute;
  top: 50%;
  right: 0.25rem;
  transform: translateY(-50%);
  width: 1.25rem;
  height: 1.25rem;
  border: 0;
  border-radius: 999px;
  background: transparent;
  color: var(--kk-ink-faint);
  font-size: 11px;
  line-height: 1;
  cursor: pointer;
}
.kk-person-del:hover { background: var(--kk-danger-soft); color: var(--kk-danger); }

/* 各欄の見出し行: 見出し・件数・説明・追加ボタンを1行に収める */
.kk-sec-head {
  display: flex;
  align-items: baseline;
  flex-wrap: wrap;
  gap: 0.15rem 0.5rem;
  margin-bottom: 0.35rem;
}
.kk-sec-title {
  margin: 0;
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  font-size: 13.5px;
  font-weight: 700;
  padding-left: 0.5rem;
  border-left: 3px solid var(--kk-accent);
  line-height: 1.3;
}
.kk-sec-count {
  font-size: 11px;
  font-weight: 700;
  color: var(--kk-accent-strong);
  background: var(--kk-accent-soft);
  border-radius: 999px;
  padding: 0 0.4rem;
}
.kk-add {
  margin-left: auto;
  display: inline-flex;
  align-items: center;
  gap: 0.2rem;
  height: 26px;
  padding: 0 0.55rem;
  border: 1px solid var(--kk-line);
  border-radius: 999px;
  background: #fff;
  font-family: inherit;
  font-size: 12px;
  font-weight: 700;
  color: var(--kk-accent);
  cursor: pointer;
}
.kk-add:hover { border-color: var(--kk-accent); background: var(--kk-accent-soft); }
.kk-add svg {
  width: 12px;
  height: 12px;
  fill: none;
  stroke: currentColor;
  stroke-width: 2.6;
  stroke-linecap: round;
}
.kk-empty {
  margin: 0;
  font-size: 12.5px;
  color: var(--kk-ink-faint);
}

.kk-items {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
}
.kk-item {
  padding: 0.4rem 0;
  border-top: 1px dashed var(--kk-line);
}
.kk-item:first-child {
  border-top: 0;
  padding-top: 0;
}
.kk-item {
  display: flex;
  align-items: flex-start;
  gap: 0.4rem;
}
/* 左の細い列: 番号の下に削除 */
.kk-item-side {
  flex: none;
  width: 1.6rem;
  padding-top: 0.35rem;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.2rem;
}
.kk-item-body {
  flex: 1;
  min-width: 0;
}
.kk-fields {
  margin: 0.3rem 0 0;
  display: grid;
  grid-template-columns: 1fr;
  gap: 0.35rem 0.5rem;
}
@media (min-width: 640px) {
  .kk-fields {
    grid-template-columns: 1fr 1fr;
  }
}

@media (min-width: 1024px) {
  .kk-review {
    height: 100%;
    display: flex;
    flex-direction: column;
    min-height: 0;
  }
  .kk-review-grid {
    flex: 1;
    min-height: 0;
    grid-template-columns: 1fr 1fr;
  }
  .kk-review-col {
    overflow-y: auto;
    padding-right: 0.25rem;
  }
}

.kk-msg {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 0.75rem;
}
.kk-msg-close {
  flex-shrink: 0;
  border: 0;
  background: transparent;
  color: inherit;
  font-size: 14px;
  line-height: 1;
  cursor: pointer;
  padding: 0.1rem 0.3rem;
}
/* 行の削除はゴミ箱アイコン（一覧・見出しの「削除」とそろえる）。番号の下に置く。
   PCではその項目に乗せたとき・入力中のときだけ出し、並んだ項目の邪魔をしない。
   スマホは乗せる操作が無いので、常に薄く出しておく */
.kk-row-del {
  flex: none;
  width: 1.6rem;
  height: 1.6rem;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: 0;
  border-radius: 6px;
  background: transparent;
  color: var(--kk-ink-faint);
  cursor: pointer;
  opacity: 0.55;
  transition: opacity 0.15s, background-color 0.15s, color 0.15s;
}
.kk-row-del svg {
  width: 15px;
  height: 15px;
  fill: none;
  stroke: currentColor;
  stroke-width: 2;
  stroke-linecap: round;
  stroke-linejoin: round;
}
@media (hover: hover) {
  .kk-row-del {
    opacity: 0;
  }
  .kk-item:hover .kk-row-del,
  .kk-item:focus-within .kk-row-del {
    opacity: 0.7;
  }
}
.kk-row-del:hover,
.kk-row-del:focus-visible {
  opacity: 1 !important;
  background: var(--kk-danger-soft);
  color: var(--kk-danger);
}
</style>
