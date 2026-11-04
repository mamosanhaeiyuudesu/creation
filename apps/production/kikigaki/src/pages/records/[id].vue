<template>
  <!-- 欄からカーソルを外したとき・1行の欄で Enter を押したときは、待たずにすぐ保存する。
       1列の議事録（今の版の聞き取り。PDFがA4縦）は、横長で読みにくくならないよう、紙1枚の幅にして真ん中に置く -->
  <div class="kk-review" :class="{ 'is-doc': record && columns.length === 1 }" @focusout="flushSave" @keydown.enter="onEnterSave">
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
            <!-- 種類（話し合い／聞き取り）。ラベルだけで押せない（作り直して中身を置き換えると手で直したところが消えるので、
                 別の種類で作りたいときは、元のテキストの欄の「このテキストから新しく作る」で新しい議事録にする） -->
            <MinutesModeBadge :mode="minutes.mode" />
            <!-- 自動保存の状態。直してから少し待つと自動で保存される -->
            <span class="kk-autosave" :class="`is-${autoState}`" role="status" aria-live="polite">{{ autoLabel }}</span>
          </div>
        </div>

        <div class="kk-head-actions">
          <!-- 元のテキスト（取り込んだ全文）。右からせり出す欄。欄の外を押すと閉じる -->
          <button
            ref="sourceToggle"
            type="button"
            class="kk-icon-btn"
            :class="{ 'is-open': sourceOpen }"
            :aria-expanded="sourceOpen"
            title="取り込んだ元のテキストを見る"
            @click="toggleSource"
          >
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 5h16M4 10h16M4 15h10M4 20h7" /></svg>
            元のテキスト
          </button>

          <span class="kk-head-sep kk-wide-only" aria-hidden="true" />

          <button type="button" class="kk-icon-btn kk-icon-btn--danger kk-wide-only" title="削除" @click="confirmingDelete = true">
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3" /></svg>
            削除
          </button>
          <!-- ドライブ・PDF。PCでは見出しの右に並べ、スマホでは画面の下に固定する（ai-tools 版と同じ置き方。
               長い議事録を下まで読んでも、上に戻らずに押せるように）。
               スマホの下の列は「戻る・ドライブ・PDF・削除」を同じ幅で並べる（戻る・削除はスマホだけ）。
               保存ボタンは置かない（自動保存＋欄を離れたとき・一覧へ戻るときにも保存される） -->
          <div class="kk-save-bar">
          <NuxtLink to="/" class="kk-icon-btn kk-narrow-only" title="一覧へ戻る">
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 5l-7 7 7 7" /></svg>
            戻る
          </NuxtLink>
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
          <button type="button" class="kk-icon-btn kk-icon-btn--danger kk-narrow-only" title="削除" @click="confirmingDelete = true">
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3" /></svg>
            削除
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

      <!-- AIで修正と、AIが判断しきれなかったところ。よく使うので、押して開く窓にせず、いつも画面の上に出しておく。
           直すたびに入力欄は閉じず、続けて直せる。解消した不明点は AI が一覧から外す（× で手でも消せる） -->
      <section class="kk-assist mt-2" :class="{ 'has-unclear': minutes.unclearPoints.length }">
        <div class="kk-card kk-assist-card">
          <!-- 左の列に見出し（戻すボタンと、右端に操作のヒント）と入力欄、右の列に実行ボタン。ヒントの右端を入力欄の右端にそろえる -->
          <div class="kk-assist-grid">
            <div class="kk-assist-titlebar">
              <label class="kk-assist-title" for="revise-input">
                <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3l1.8 4.7L18.5 9.5l-4.7 1.8L12 16l-1.8-4.7L5.5 9.5l4.7-1.8zM18 15l.9 2.1L21 18l-2.1.9L18 21l-.9-2.1L15 18l2.1-.9z" /></svg>
                AIで修正
              </label>
              <button v-if="undoMinutes" type="button" class="kk-assist-undo" :disabled="revising" @click="undoRevise">
                <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 14L4 9l5-5M4 9h10a6 6 0 010 12h-3" /></svg>
                直す前に戻す
              </button>
              <span class="kk-assist-hint">Enter で送る・Shift+Enter で改行</span>
            </div>
            <textarea
              id="revise-input"
              ref="reviseInput"
              v-model="reviseInstruction"
              rows="2"
              class="kk-input kk-assist-input"
              placeholder="れい: 阪中さんを坂中さんに直して"
              @keydown.enter.exact="onReviseEnter"
            />
            <button type="button" class="kk-pop-run kk-assist-run" :disabled="revising || !reviseInstruction.trim()" @click="runRevise">
              {{ revising ? '修正中…' : '修正' }}
            </button>
          </div>
        </div>

        <!-- AIが判断しきれなかったところ。ふだんは2件まで1行ずつ見せ、下の矢印で全文を開く。
             開いたときは下の欄（話の内容など）に上からかぶさる（中でスクロールさせない。欄の高さもずらさない） -->
        <div
          v-if="minutes.unclearPoints.length"
          ref="unclearSlot"
          class="kk-unclear-slot"
          :style="unclearOpen ? { height: `${unclearSlotHeight}px` } : undefined"
        >
          <div class="kk-card kk-assist-card kk-assist-card--unclear" :class="{ 'is-open': unclearOpen }">
            <div class="kk-assist-titlebar">
              <p class="kk-assist-title">
                <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9" /><path d="M12 8v5M12 16.5v.01" /></svg>
                AIが判断しきれなかったところ
                <span class="kk-badge">{{ minutes.unclearPoints.length }}</span>
              </p>
            </div>
            <ul ref="unclearList" class="kk-assist-list">
              <li v-for="(p, i) in shownUnclear" :key="`${i}-${p}`">
                <span class="kk-unclear-text">{{ p }}</span>
                <button type="button" class="kk-assist-done" :aria-label="`「${p}」を確かめたので消す`" title="確かめたので消す" @click="minutes.unclearPoints.splice(i, 1)">✕</button>
              </li>
            </ul>
            <!-- 開く・閉じるは一覧の下の矢印だけ（文字は出さない） -->
            <button
              v-if="unclearOpen || unclearMore"
              type="button"
              class="kk-unclear-toggle"
              :aria-expanded="unclearOpen"
              :aria-label="unclearOpen ? '閉じる' : 'すべて見る'"
              :title="unclearOpen ? '閉じる' : 'すべて見る'"
              @click="toggleUnclear"
            >
              <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 9l6 6 6-6" /></svg>
            </button>
          </div>
        </div>
      </section>

      <!-- 欄の並びは版と種類で決まる（columns）。今の版の話し合いは、左に 名前・概要・決まったこと・やること、右に 話し合ったこと。
           今の版の聞き取りはPDFと同じ1列（名前・概要・話の内容・やること） -->
      <div class="kk-review-grid" :class="{ 'is-single': columns.length === 1 }">
        <div v-for="(col, ci) in columns" :key="ci" class="kk-review-col">
          <template v-for="key in col" :key="key">
            <section v-if="key === 'meta'" class="kk-card kk-review-card">
              <!-- 名前は横一行を使う（長い名前でも見切れないように） -->
              <label class="kk-field-label" for="minutes-title">{{ labels.title }}</label>
              <input id="minutes-title" v-model="minutes.title" class="kk-input" :placeholder="labels.titlePlaceholder">
              <!-- 日・参加者・タグはその下に横に並べる（幅が足りなければ縦に積む） -->
              <div class="kk-meta-pair">
              <div class="kk-meta-date">
                <label class="kk-field-label mt-2" for="minutes-date">{{ labels.date }}</label>
                <DateInput id="minutes-date" v-model="minutes.date" />
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
                <p class="kk-field-label mt-2">{{ lb('tags') }}<span class="kk-sec-count ml-1">{{ minutes.tags.length }}</span></p>
                <TagInput v-model="minutes.tags" :suggestions="tagSuggestions" />
              </div>
              </div>
            </section>

            <section v-else-if="key === 'summary'" class="kk-card kk-review-card">
              <div class="kk-sec-head">
                <h2 class="kk-sec-title">{{ labels.summary }}</h2>
                <button type="button" class="kk-sec-pdf" :disabled="!!sectionPdfBusy || generatingPdf" :aria-label="`${labels.summary}をPDFでダウンロード`" title="このセクションをPDFでダウンロード" @click="downloadSection('summary', labels.summary)"><span v-if="sectionPdfBusy === 'summary'" class="kk-sec-pdf-spin" /><svg v-else viewBox="0 0 24 24" aria-hidden="true"><path d="M12 4v11M7 11l5 5 5-5M5 20h14" /></svg></button>
              </div>
              <AutoTextarea v-model="minutes.summary" :placeholder="labels.summaryPlaceholder" />
            </section>

          <!-- 決まったこと・話し合ったこと（1人の話では 伝えたかったこと・話の内容）。同じ形なので部品で回す -->
          <template v-else-if="pointGroups[key]">
          <section v-for="group in [pointGroups[key]!]" :key="group.key" class="kk-card kk-review-card">
            <div class="kk-sec-head">
              <h2 class="kk-sec-title">{{ group.label }}<span class="kk-sec-count">{{ group.items.length }}</span></h2>
              <button type="button" class="kk-sec-pdf" :disabled="!!sectionPdfBusy || generatingPdf" :aria-label="`${group.label}をPDFでダウンロード`" title="このセクションをPDFでダウンロード" @click="downloadSection(group.key, group.label)"><span v-if="sectionPdfBusy === group.key" class="kk-sec-pdf-spin" /><svg v-else viewBox="0 0 24 24" aria-hidden="true"><path d="M12 4v11M7 11l5 5 5-5M5 20h14" /></svg></button>
            </div>

            <p v-if="!group.items.length" class="kk-empty">見つかりませんでした。</p>
            <ul v-else class="kk-items">
              <li v-for="(item, i) in group.items" :key="i" class="kk-item">
                <!-- 番号と削除は左の細い列に置く（右側を空けて、スマホで本文の幅を取るため） -->
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
            <!-- 追加は欄のいちばん下に（見出しの右はPDFのダウンロード） -->
            <button type="button" class="kk-add-row" aria-label="追加" title="追加" @click="group.items.push({ content: '', note: '' })"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5v14M5 12h14" /></svg></button>
          </section>
          </template>

            <!-- 次の予定（古い会議だけ） -->
            <section v-else-if="key === 'events'" class="kk-card kk-review-card">
              <div class="kk-sec-head">
                <h2 class="kk-sec-title">{{ lb('eventCandidates') }}<span class="kk-sec-count">{{ minutes.eventCandidates.length }}</span></h2>
                <button type="button" class="kk-sec-pdf" :disabled="!!sectionPdfBusy || generatingPdf" :aria-label="`${lb('eventCandidates')}をPDFでダウンロード`" title="このセクションをPDFでダウンロード" @click="downloadSection('events', lb('eventCandidates'))"><span v-if="sectionPdfBusy === 'events'" class="kk-sec-pdf-spin" /><svg v-else viewBox="0 0 24 24" aria-hidden="true"><path d="M12 4v11M7 11l5 5 5-5M5 20h14" /></svg></button>
              </div>

              <p v-if="!minutes.eventCandidates.length" class="kk-empty">見つかりませんでした。</p>
              <ul v-else class="kk-items">
                <li v-for="(ev, i) in minutes.eventCandidates" :key="i" class="kk-item">
                  <!-- 番号と削除は左の細い列に置く（右側を空けて、スマホで本文の幅を取るため） -->
                  <div class="kk-item-side">
                    <span class="kk-num">{{ i + 1 }}</span>
                    <button type="button" class="kk-row-del" aria-label="この行を削除" title="削除" @click="askRemoveRow(minutes.eventCandidates, i)"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3" /></svg></button>
                  </div>
                  <div class="kk-item-body">
                  <AutoTextarea v-model="ev.title" placeholder="予定の名前" class="font-bold" />
                  <div class="kk-fields">
                    <div>
                      <label class="kk-field-label">日にちと時間</label>
                      <!-- 日付はカレンダー、時刻は別の欄（時刻は空でもよい） -->
                      <div class="kk-when">
                        <DateInput :model-value="ev.start.slice(0, 10)" @update:model-value="setEventDate(ev, $event)" />
                        <input
                          :value="ev.start.slice(11, 16)"
                          type="time"
                          class="kk-input kk-when-time"
                          aria-label="時刻"
                          :disabled="!ev.start"
                          @change="setEventTime(ev, ($event.target as HTMLInputElement).value)"
                        >
                      </div>
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
              <!-- 追加は欄のいちばん下に（見出しの右はPDFのダウンロード） -->
              <button type="button" class="kk-add-row" aria-label="追加" title="追加" @click="addEvent"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5v14M5 12h14" /></svg></button>
            </section>

            <section v-else-if="key === 'tasks'" class="kk-card kk-review-card">
              <div class="kk-sec-head">
                <h2 class="kk-sec-title">{{ lb('taskCandidates') }}<span class="kk-sec-count">{{ minutes.taskCandidates.length }}</span></h2>
                <button type="button" class="kk-sec-pdf" :disabled="!!sectionPdfBusy || generatingPdf" :aria-label="`${lb('taskCandidates')}をPDFでダウンロード`" title="このセクションをPDFでダウンロード" @click="downloadSection('tasks', lb('taskCandidates'))"><span v-if="sectionPdfBusy === 'tasks'" class="kk-sec-pdf-spin" /><svg v-else viewBox="0 0 24 24" aria-hidden="true"><path d="M12 4v11M7 11l5 5 5-5M5 20h14" /></svg></button>
              </div>

              <p v-if="!minutes.taskCandidates.length" class="kk-empty">見つかりませんでした。</p>
              <ul v-else class="kk-items">
                <li v-for="(task, i) in minutes.taskCandidates" :key="i" class="kk-item">
                  <!-- 番号と削除は左の細い列に置く（右側を空けて、スマホで本文の幅を取るため） -->
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
                      <DateInput v-model="task.dueDate" />
                      <p v-if="task.due" class="kk-note m-0">会議では「{{ task.due }}」と話していました。</p>
                    </div>
                  </div>
                  </div>
                </li>
              </ul>
              <!-- 追加は欄のいちばん下に（見出しの右はPDFのダウンロード） -->
              <button type="button" class="kk-add-row" aria-label="追加" title="追加" @click="addTask"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5v14M5 12h14" /></svg></button>
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
      <BottomSheet v-model="confirmingDelete" :title="`この${recordName(minutes.mode)}を消しますか？`" :closable="!deleting">
        <p class="kk-lead">一度消すと元には戻せません。</p>
        <div class="mt-4 flex flex-col gap-2">
          <button class="kk-btn-sub" :disabled="deleting" @click="remove">はい、消します</button>
          <button class="kk-btn-text" :disabled="deleting" @click="confirmingDelete = false">やめる</button>
        </div>
      </BottomSheet>

    </template>

    <!-- 元のテキストの欄。背景は暗くしない（議事録と見比べられるように）。読むだけで、ここでは直せない。欄の外を押すと閉じる -->
    <Transition name="kk-source-t">
      <aside v-if="sourceOpen && record" ref="sourceAside" class="kk-source" role="complementary" aria-label="元のテキスト">
        <div class="kk-source-head">
          <p class="kk-source-title">
            元のテキスト
            <span class="kk-note">{{ transcriptLength.toLocaleString() }}字<template v-if="record.audioName"> ・ {{ record.audioName }}</template></span>
          </p>
          <!-- 別の種類で作りたいときなど。今の議事録は置き換えず、新しい議事録をもう1つ作る（色は左メニューの「新しく作る」とそろえる） -->
          <button v-if="record.transcript" type="button" class="kk-source-new" @click="createFromSource">
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5v14M5 12h14" /></svg>
            このテキストから新しく作る
          </button>
          <button type="button" class="kk-source-close" aria-label="閉じる" @click="sourceOpen = false">✕</button>
        </div>
        <div class="kk-source-tools">
          <input
            ref="sourceSearchInput"
            v-model="sourceQuery"
            class="kk-input kk-source-search"
            placeholder="この中を探す（れい: 田中）"
            aria-label="元のテキストの中を探す"
            @keydown.enter.prevent="onSourceEnter"
          >
          <span v-if="sourceQuery.trim()" class="kk-source-count">{{ matchCount ? `${matchIndex + 1} / ${matchCount}` : '0件' }}</span>
          <button type="button" class="kk-source-btn" :disabled="!matchCount" aria-label="前の当たり" @click="gotoMatch(-1)">↑</button>
          <button type="button" class="kk-source-btn" :disabled="!matchCount" aria-label="次の当たり" @click="gotoMatch(1)">↓</button>
          <button type="button" class="kk-source-btn kk-source-copy" @click="copyTranscript">{{ copied ? 'コピーしました' : 'コピー' }}</button>
        </div>
        <div ref="sourceBody" class="kk-source-body">
          <p v-if="!record.transcript" class="kk-note m-0">元のテキストは保存されていません。</p>
          <!-- v-html は使わない（元のテキストは利用者が入れたものなので、そのまま文字として出す） -->
          <p v-else class="kk-source-text"><template v-for="(seg, i) in sourceSegments" :key="i"><mark v-if="seg.hit" class="kk-source-mark" :class="{ 'is-current': seg.hitIndex === matchIndex }" :data-hit="seg.hitIndex">{{ seg.text }}</mark><template v-else>{{ seg.text }}</template></template></p>
        </div>
      </aside>
    </Transition>

    <!-- PDFは部品で作る（一覧画面と共通） -->
    <MinutesPdfMaker ref="pdfMaker" />
    <MinutesSectionPdf ref="sectionPdf" />
  </div>
</template>

<script setup lang="ts">
import { SERVICE } from '~/config/service'
import { apiMessage } from '~/utils/apiMessage'
import { minutesLabel, recordName, type LabelKey } from '~/config/minutesLabels'
import { emptyMinutes, hasTasksSection, isCurrentLayout, isLegacyMeeting } from '~/types/minutes'
import type { EventItem, Minutes, MinutesRecord, SectionKind } from '~/types/minutes'
import type MinutesPdfMakerType from '~/components/MinutesPdfMaker.vue'
import type MinutesSectionPdfType from '~/components/MinutesSectionPdf.vue'

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
/** 「AIで修正」をかける前の中身。「直す前に戻す」で戻せるのは直前の1回分だけ（何回も戻れると意味が分かりにくいため） */
const undoMinutes = ref<Minutes | null>(null)

const confirmingDelete = ref(false)
const deleting = ref(false)
const reviseInput = ref<HTMLTextAreaElement | null>(null)

function onDocKeydown(e: KeyboardEvent) {
  if (e.key !== 'Escape') return
  if (unclearOpen.value) unclearOpen.value = false
  else if (sourceOpen.value) sourceOpen.value = false
}

// ── 元のテキスト ──
const sourceOpen = ref(false)
const sourceAside = ref<HTMLElement | null>(null)
const sourceToggle = ref<HTMLElement | null>(null)
const sourceQuery = ref('')
const matchIndex = ref(0)
const copied = ref(false)
const sourceBody = ref<HTMLElement | null>(null)
const sourceSearchInput = ref<HTMLInputElement | null>(null)

const transcriptLength = computed(() => record.value?.transcript.length ?? 0)

const { openWith: openTextSheet } = useTextSheet()

/** 作る画面を、このテキスト・日付・タグを入れた状態で開く（種類はいつもの「話し合い」から） */
function createFromSource() {
  if (!record.value) return
  sourceOpen.value = false
  openTextSheet({ text: record.value.transcript, date: minutes.date, tags: [...minutes.tags] })
}

function toggleSource() {
  sourceOpen.value = !sourceOpen.value
  if (sourceOpen.value) nextTick(() => sourceSearchInput.value?.focus())
}

/** 元のテキストを、当たった語とそれ以外に切り分ける（色付けのため。大文字小文字は区別しない） */
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
    errorMessage.value = 'コピーできませんでした。テキストを選んでコピーしてください。'
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

// ── AIが判断しきれなかったところ: ふだんは2件まで1行ずつ。開くと全部を全文で、下の欄にかぶせて出す ──
const UNCLEAR_PREVIEW = 2
const unclearOpen = ref(false)
const unclearSlot = ref<HTMLElement | null>(null)
const unclearList = ref<HTMLElement | null>(null)
/** 開いている間、欄の場所の高さを閉じていたときのままにする（下の欄がずれないように） */
const unclearSlotHeight = ref(0)
/** 閉じた状態で見えていないものがあるか（3件目以降がある・1行に収まらず省いている） */
const unclearMore = ref(false)

const shownUnclear = computed(() =>
  unclearOpen.value ? minutes.unclearPoints : minutes.unclearPoints.slice(0, UNCLEAR_PREVIEW)
)

function measureUnclear() {
  if (unclearOpen.value) return
  const texts = [...(unclearList.value?.querySelectorAll<HTMLElement>('.kk-unclear-text') ?? [])]
  unclearMore.value =
    minutes.unclearPoints.length > UNCLEAR_PREVIEW || texts.some((el) => el.scrollWidth > el.clientWidth + 1)
}

function toggleUnclear() {
  if (!unclearOpen.value) unclearSlotHeight.value = unclearSlot.value?.offsetHeight ?? 0
  unclearOpen.value = !unclearOpen.value
  if (!unclearOpen.value) nextTick(measureUnclear)
}

// 件数が変わったとき・欄の幅が変わって省くかどうかが変わったときに見直す
let unclearObserver: ResizeObserver | undefined
watch(unclearList, (el) => {
  unclearObserver?.disconnect()
  if (!el) return
  unclearObserver = new ResizeObserver(measureUnclear)
  unclearObserver.observe(el)
})
watch(
  () => minutes.unclearPoints.join('\n'),
  () => {
    if (!minutes.unclearPoints.length) unclearOpen.value = false
    nextTick(measureUnclear)
  }
)

// 開いた欄（判断しきれなかったところ・元のテキスト）の外を押したら閉じる
function onDocPointerDown(e: PointerEvent) {
  const target = e.target as Node
  if (unclearOpen.value && !unclearSlot.value?.contains(target)) unclearOpen.value = false
  // 「元のテキスト」ボタン自体は開け閉めを受け持つので除く（ここで閉じると、押した直後にまた開いてしまう）
  if (sourceOpen.value && !sourceAside.value?.contains(target) && !sourceToggle.value?.contains(target)) {
    sourceOpen.value = false
  }
}

/** 古い並べ方の会議か（右の真ん中に次の予定がある。作り直すと新しい並べ方になる） */
const legacyMeeting = computed(() => isLegacyMeeting(minutes))

/** 画面の欄。meta＝名前・日・参加者・タグ、summary＝概要、残りは議事録の項目 */
type ColKey = 'meta' | 'summary' | 'decisions' | 'discussions' | 'keyMessages' | 'topics' | 'tasks' | 'events'

/**
 * 左右の列に並べる欄の順。PDFの並べ方とそろえる（utils/printLines.ts）。
 *  - 今の版（layout 3）の話し合い: 左に 名前・概要・決まったこと・やること、右に 話し合ったこと（結論を先に）
 *  - 今の版（layout 3）の聞き取り: PDFがA4縦の1列なので、画面も1列で 名前・概要・話の内容・やること
 *  - 古い版: これまでの並べ方のまま（左に 概要と話の中身、右に 決まったこと・やること など）
 */
const columns = computed<ColKey[][]>(() => {
  const talk = minutes.mode === 'talk'
  if (isCurrentLayout(minutes)) {
    if (talk) return [['meta', 'summary', 'topics', 'tasks']]
    return [['meta', 'summary', 'decisions', 'tasks'], ['topics']]
  }
  if (talk) return [['meta', 'summary', 'topics'], hasTasksSection(minutes) ? ['keyMessages', 'tasks'] : ['keyMessages']]
  if (legacyMeeting.value) return [['meta', 'summary', 'discussions'], ['decisions', 'events', 'tasks']]
  return [['meta', 'summary', 'topics'], ['decisions', 'tasks']]
})

/** まとめ方ごとの欄の名前（1人の話では「会議」と書かない） */
const lb = (key: LabelKey) => minutesLabel(key, minutes.mode)
const labels = computed(() => ({
  title: lb('title'),
  date: lb('date'),
  people: lb('participants'),
  person: lb('participants'),
  summary: lb('summary'),
  ...(minutes.mode === 'talk'
    ? {
        titlePlaceholder: 'れい: 子育てについての講演',
        summaryPlaceholder: 'どんな話だったかのまとめ',
      }
    : {
        titlePlaceholder: 'れい: 青年部の定例会',
        summaryPlaceholder: '会議の流れのまとめ',
      }),
}))

interface PointGroup {
  key: SectionKind
  label: string
  placeholder: string
  subLabel: string
  items: Minutes['decisions']
}

/**
 * 「決まったこと」「話し合ったこと」（1人の話では「伝えたかったこと」「話の内容」）は同じ形なので、まとめて描く。
 * どの列に出すかは columns が決める
 */
const pointGroups = computed<Partial<Record<ColKey, PointGroup>>>(() => {
  const talk = minutes.mode === 'talk'
  const current = isCurrentLayout(minutes)
  return {
    decisions: { key: 'decisions', label: lb('decisions'), placeholder: lb('decisions'), subLabel: '補足', items: minutes.decisions },
    // 古い議事録: discussions に入っているのは「決まっていないこと」だけ
    discussions: { key: 'discussions', label: lb('discussions'), placeholder: lb('discussions'), subLabel: '補足', items: minutes.discussions },
    keyMessages: { key: 'keyMessages', label: lb('keyMessages'), placeholder: lb('keyMessages'), subLabel: '話の要旨', items: minutes.keyMessages },
    topics: {
      key: 'topics',
      label: lb('topics'),
      // 今の版の聞き取りは、見出しが要点の一文
      placeholder: talk && current ? '要点（一文で）' : '話題',
      subLabel: talk ? '中身' : '話した中身',
      items: minutes.topics,
    },
  }
})

function applyMinutes(src: Minutes) {
  minutes.mode = src.mode
  minutes.layout = src.layout
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

/** 予定の日付を変える。時刻は残す（日付を消したら時刻も消す） */
function setEventDate(ev: EventItem, ymd: string) {
  const time = ev.start.slice(11, 16)
  ev.start = ymd ? (time ? `${ymd}T${time}` : ymd) : ''
}

/** 予定の時刻を変える。空にすると日付だけになる */
function setEventTime(ev: EventItem, time: string) {
  const ymd = ev.start.slice(0, 10)
  if (!ymd) return
  ev.start = time ? `${ymd}T${time}` : ymd
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

// 名前・日付・種類・タグを直したら、左メニューの一覧にもすぐ映す（保存を待たない。一覧の読み直しもしない）
const { patchLocal, removeLocal } = useRecordList()
watch(
  () => [record.value?.id, minutes.title, minutes.date, minutes.mode, minutes.tags.join('\n')],
  () => {
    // 左の一覧で別の議事録へ移った直後は、まだ前の中身が残っているので、読み込んだ議事録の id で合わせる
    if (!record.value) return
    patchLocal(record.value.id, { title: minutes.title, date: minutes.date, mode: minutes.mode, tags: [...minutes.tags] })
  }
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
  const sent = reviseInstruction.value
  const instruction = sent.trim()
  if (!instruction || revising.value) return
  errorMessage.value = ''
  savedMessage.value = ''
  revising.value = true
  const before: Minutes = JSON.parse(snapshot())
  try {
    const res = await authedFetch<{ minutes: Minutes }>('/api/minutes/revise', {
      method: 'POST',
      body: { id: id.value, minutes: before, instruction },
    })
    applyMinutes(res.minutes)
    undoMinutes.value = before
    // 待っている間に次の指示を書き始めていたら、それは消さない
    if (reviseInstruction.value === sent) reviseInstruction.value = ''
    // 続けて直せるよう、入力欄に戻る
    nextTick(() => reviseInput.value?.focus())
    // 直した結果は自動保存で保存される（watch が拾う）
    const solved = before.unclearPoints.filter((p) => !res.minutes.unclearPoints.includes(p)).length
    savedMessage.value = solved
      ? `AIが直しました。判断しきれなかったところが${solved}つ解消しました。`
      : 'AIが直しました。内容を確かめてください（自動で保存されます）。'
  } catch (e) {
    errorMessage.value = apiMessage(e, 'AIが直せませんでした。もう一度お試しください。')
  }
  revising.value = false
}

/** 直前の「AIで修正」をかける前に戻す（1回分だけ） */
function undoRevise() {
  if (!undoMinutes.value) return
  // タグはAIの対象外。戻したあとで付けたタグを消さないよう、今のタグを残す
  const tags = [...minutes.tags]
  applyMinutes(undoMinutes.value)
  minutes.tags = tags
  undoMinutes.value = null
  errorMessage.value = ''
  savedMessage.value = 'AIで直す前に戻しました。'
}

async function remove() {
  clearTimeout(autoTimer)
  deleting.value = true
  errorMessage.value = ''
  try {
    await authedFetch(`/api/records/${id.value}`, { method: 'DELETE' })
    removeLocal(id.value)
    await router.push('/')
  } catch (e) {
    errorMessage.value = apiMessage(e, '消せませんでした。もう一度お試しください。')
    deleting.value = false
  }
}

// ── PDF ────────────────────────────────────────────────
// 作り方（印刷用の見た目・ページ分け・画像化）は MinutesPdfMaker にまとめてある。

const pdfMaker = ref<InstanceType<typeof MinutesPdfMakerType> | null>(null)

/** 議事録からPDFを組み立てる（ダウンロードとドライブ保存で共通） */
async function createPdf() {
  // 先に保存する（保存し忘れた直しがPDFに出ないように）
  await saveMinutes()
  if (!pdfMaker.value) throw new Error('PDFの中身を用意できませんでした。画面を開き直してお試しください。')
  return await pdfMaker.value.make(toRaw(minutes))
}

// ── セクションごとのPDF（見出しの右の小さなアイコン） ──
const sectionPdf = ref<InstanceType<typeof MinutesSectionPdfType> | null>(null)
/** いまPDFを作っているセクション（そのアイコンだけ回す） */
const sectionPdfBusy = ref<SectionKind | ''>('')

async function downloadSection(kind: SectionKind, label: string) {
  errorMessage.value = ''
  savedMessage.value = ''
  sectionPdfBusy.value = kind
  try {
    // 先に保存する（保存し忘れた直しがPDFに出ないように）
    await saveMinutes()
    if (!sectionPdf.value) throw new Error('PDFの中身を用意できませんでした。画面を開き直してお試しください。')
    const { pdf, fileName } = await sectionPdf.value.make(toRaw(minutes), kind, label)
    pdf.save(fileName)
  } catch (e) {
    errorMessage.value = apiMessage(e, 'PDFを作れませんでした。もう一度お試しください。')
  }
  sectionPdfBusy.value = ''
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
    errorMessage.value = apiMessage(e, 'PDFを作れませんでした。もう一度お試しください。')
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
  unclearObserver?.disconnect()
  clearTimeout(autoTimer)
  window.removeEventListener('beforeunload', onBeforeUnload)
  document.removeEventListener('keydown', onDocKeydown)
  document.removeEventListener('pointerdown', onDocPointerDown)
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
/* 1列の議事録（聞き取り）は、1行がおよそ45〜50字に収まる幅にする。見出し・AIの欄・本文の左右の端をそろえる */
.kk-review.is-doc {
  width: 100%;
  max-width: 780px;
  margin: 0 auto;
}
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
/* 元のテキストの欄（右からせり出す。背景は暗くしない） */
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
  margin-left: auto;
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
.kk-source-new {
  flex: none;
  margin-left: 10px;
  height: 30px;
  padding: 0 0.7rem 0 0.55rem;
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  border: 0;
  border-radius: 8px;
  background: var(--kk-cta);
  color: #fff;
  font-family: inherit;
  font-size: 12.5px;
  font-weight: 700;
  cursor: pointer;
}
.kk-source-new:hover {
  background: var(--kk-cta-strong);
}
.kk-source-new svg {
  width: 14px;
  height: 14px;
  fill: none;
  stroke: currentColor;
  stroke-width: 2.4;
  stroke-linecap: round;
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
  flex: 1;
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 0.25rem 0.5rem;
  min-width: 0;
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

.kk-save-bar {
  display: contents;
}
.kk-narrow-only {
  display: none !important;
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
  .kk-narrow-only {
    display: inline-flex !important;
  }
  .kk-wide-only {
    display: none !important;
  }
  /* 「元のテキスト」は見出しの行の右端に置く（削除は下の列へ移した） */
  .kk-review-head {
    flex-wrap: nowrap;
  }
  .kk-review-title {
    flex: 1 1 auto;
  }
  .kk-head-actions {
    flex: none;
    width: auto !important;
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

/* ── 画面の上の欄: AIで修正・AIが判断しきれなかったところ（広い画面では横に並べる） ── */
.kk-assist {
  display: grid;
  grid-template-columns: 1fr;
  gap: 0.6rem;
}
@media (min-width: 1024px) {
  .kk-assist.has-unclear {
    grid-template-columns: 1fr 1fr;
  }
}
.kk-assist-card {
  padding: 0.55rem 0.8rem 0.6rem;
  min-width: 0;
}
.kk-assist-card--unclear {
  border-color: #f5d6ad;
  background: var(--kk-warn-soft);
}
.kk-assist-title {
  display: flex;
  align-items: center;
  gap: 0.35rem;
  margin: 0 0 0.35rem;
  font-size: 13.5px;
  font-weight: 700;
  color: var(--kk-accent-strong);
}
.kk-assist-card--unclear .kk-assist-title {
  color: var(--kk-warn);
}
.kk-assist-title svg,
.kk-assist-undo svg {
  width: 15px;
  height: 15px;
  flex: none;
  fill: none;
  stroke: currentColor;
  stroke-width: 2;
  stroke-linecap: round;
  stroke-linejoin: round;
}
.kk-assist-grid {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  grid-template-areas:
    'title .'
    'input run';
  gap: 0.3rem 0.5rem;
  align-items: center;
}
.kk-assist-titlebar {
  grid-area: title;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  min-width: 0;
}
.kk-assist-titlebar .kk-assist-title {
  margin: 0;
}
.kk-assist-hint {
  margin-left: auto;
  font-size: 11.5px;
  color: var(--kk-ink-faint);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.kk-assist-input {
  grid-area: input;
  min-width: 0;
  resize: none;
  align-self: stretch;
}
.kk-assist-run {
  grid-area: run;
  /* 大きさは見出しの PDF などのボタンとそろえる */
  align-self: center;
  height: 32px;
  padding: 0 0.85rem;
  border-radius: 8px;
}
.kk-assist-undo {
  flex: none;
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  padding: 0 0.4rem;
  border: 0;
  border-radius: 6px;
  background: transparent;
  color: var(--kk-accent-strong);
  white-space: nowrap;
  font-family: inherit;
  font-size: 12.5px;
  font-weight: 700;
  cursor: pointer;
}
.kk-assist-undo:hover:not(:disabled) { background: var(--kk-accent-soft); }
.kk-assist-undo:disabled { opacity: 0.45; cursor: default; }
.kk-assist-list {
  list-style: none;
  margin: 0;
  padding: 0;
  font-size: 13px;
  line-height: 1.6;
}
.kk-unclear-slot {
  position: relative;
  min-width: 0;
}
.kk-unclear-slot .kk-assist-card {
  height: 100%;
}
.kk-assist-card--unclear .kk-assist-titlebar {
  margin-bottom: 0.35rem;
}
/* 開いたら下の欄にかぶさる */
.kk-assist-card--unclear.is-open {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  z-index: 30;
  height: auto;
  min-height: 100%;
  box-shadow: 0 12px 32px rgba(120, 70, 10, 0.18);
}
/* 閉じているときは1件1行。収まらない分は「…」で省く */
.kk-unclear-text {
  flex: 1;
  min-width: 0;
}
.kk-assist-card--unclear:not(.is-open) .kk-unclear-text {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.kk-unclear-toggle {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 18px;
  margin-top: 0.1rem;
  padding: 0;
  border: 0;
  border-radius: 6px;
  background: transparent;
  color: var(--kk-warn);
  cursor: pointer;
}
.kk-unclear-toggle:hover {
  background: #fff3e2;
}
.kk-unclear-toggle svg {
  width: 18px;
  height: 18px;
  fill: none;
  stroke: currentColor;
  stroke-width: 2.4;
  stroke-linecap: round;
  stroke-linejoin: round;
  transition: transform 0.15s;
}
.kk-unclear-toggle[aria-expanded='true'] svg {
  transform: rotate(180deg);
}
.kk-assist-list li {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 0.4rem;
  padding: 0.2rem 0;
  border-top: 1px dashed #f5d6ad;
}
.kk-assist-list li:first-child {
  border-top: 0;
  padding-top: 0;
}
.kk-assist-done {
  flex: none;
  width: 1.6rem;
  height: 1.6rem;
  border: 0;
  border-radius: 6px;
  background: transparent;
  color: var(--kk-ink-faint);
  font-size: 11px;
  line-height: 1;
  cursor: pointer;
}
.kk-assist-done:hover,
.kk-assist-done:focus-visible {
  background: #ffe9cc;
  color: var(--kk-warn);
}

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
/* 見出しの右の、そのセクションだけのPDF（小さなダウンロードのアイコン） */
.kk-sec-pdf {
  margin-left: auto;
  flex: none;
  width: 26px;
  height: 26px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: 1px solid transparent;
  border-radius: 7px;
  background: transparent;
  color: var(--kk-ink-faint);
  cursor: pointer;
}
.kk-sec-pdf:hover:not(:disabled) {
  border-color: var(--kk-line);
  background: #fff;
  color: var(--kk-accent-strong);
}
.kk-sec-pdf:disabled {
  opacity: 0.45;
  cursor: default;
}
.kk-sec-pdf svg {
  width: 14px;
  height: 14px;
  fill: none;
  stroke: currentColor;
  stroke-width: 2;
  stroke-linecap: round;
  stroke-linejoin: round;
}
.kk-sec-pdf-spin {
  width: 12px;
  height: 12px;
  border-radius: 999px;
  border: 2px solid var(--kk-accent);
  border-top-color: transparent;
  animation: kk-sec-spin 0.8s linear infinite;
}
@keyframes kk-sec-spin {
  to { transform: rotate(360deg); }
}
/* 欄のいちばん下の「＋」（項目を足す） */
.kk-add-row {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 30px;
  margin-top: 0.4rem;
  border: 1px dashed var(--kk-line-strong);
  border-radius: 8px;
  background: transparent;
  color: var(--kk-accent);
  cursor: pointer;
}
.kk-add-row:hover {
  border-color: var(--kk-accent);
  background: var(--kk-accent-soft);
}
.kk-add-row svg {
  width: 15px;
  height: 15px;
  fill: none;
  stroke: currentColor;
  stroke-width: 2.4;
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
/* 左の細い列: 番号は上、削除はその項目のいちばん下（番号のすぐ下だと押し間違えやすいため） */
.kk-item-side {
  flex: none;
  align-self: stretch;
  width: 1.6rem;
  padding-top: 0.35rem;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.2rem;
}
.kk-item-side .kk-row-del {
  margin-top: auto;
}
.kk-item-body {
  flex: 1;
  min-width: 0;
}
.kk-when {
  display: flex;
  gap: 0.35rem;
}
.kk-when > :first-child {
  flex: 1;
  min-width: 0;
}
.kk-when-time {
  width: 6.5rem;
  flex: none;
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
  .kk-review-grid.is-single {
    grid-template-columns: 1fr;
  }
  /* 紙1枚の幅では「AIで修正」と「判断しきれなかったところ」を横に並べると窮屈なので、縦に重ねる */
  .kk-review.is-doc .kk-assist.has-unclear {
    grid-template-columns: 1fr;
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
/* 行の削除はゴミ箱アイコン（一覧・見出しの「削除」とそろえる）。左の列のいちばん下に置く。
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
