<template>
  <div class="fs-shell">
    <!-- PC の左サイドバー（キキガキと同じ作り）。スマホでは上のヘッダーとタブに任せる -->
    <aside class="fs-side">
      <div class="fs-logo">
        <span class="fs-logo-mark" aria-hidden="true">
          <svg viewBox="0 0 24 24"><path d="M4 19h16" /><path d="M5 15l4-4 3 3 6-7" /><path d="M15 7h3v3" /></svg>
        </span>
        経営の見直し
      </div>

      <nav class="fs-side-nav">
        <button type="button" class="fs-side-link" :class="{ 'is-active': tab === 'sim' }" @click="tab = 'sim'">
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 19h16" /><path d="M5 15l4-4 3 3 6-7" /></svg>
          10年の試算
        </button>
        <button type="button" class="fs-side-link" :class="{ 'is-active': tab === 'data' }" @click="tab = 'data'">
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 4h9l3 3v13H6z" /><path d="M9 11h6M9 15h6" /></svg>
          実績（確定申告）
          <span v-if="drafts.length" class="fs-badge">{{ drafts.length }}</span>
        </button>
      </nav>

      <!-- 間違えても怖くないよう、戻る／進むはどの画面でも同じ場所に置く -->
      <div class="fs-side-undo">
        <p class="fs-field-label !mb-1.5">操作の取り消し</p>
        <div class="flex gap-1.5">
          <button type="button" class="fs-btn-sub flex-1 !min-h-[34px]" :disabled="!history.canUndo.value" title="1つ前に戻す（⌘Z）" @click="history.undo()">
            <svg class="fs-ico" viewBox="0 0 24 24" aria-hidden="true"><path d="M9 14L4 9l5-5" /><path d="M4 9h11a5 5 0 010 10h-3" /></svg>
            戻る
          </button>
          <button type="button" class="fs-btn-sub flex-1 !min-h-[34px]" :disabled="!history.canRedo.value" title="やり直す（⇧⌘Z）" @click="history.redo()">
            進む
            <svg class="fs-ico" viewBox="0 0 24 24" aria-hidden="true"><path d="M15 14l5-5-5-5" /><path d="M20 9H9a5 5 0 000 10h3" /></svg>
          </button>
        </div>
        <p class="fs-note mt-1.5 mb-0 min-h-[20px]">{{ saveLabel }}</p>
      </div>

      <p class="fs-note px-2 m-0">
        確定申告の数字から、大まかな利益の動きを試すための道具です。会計ソフト・帳簿ではありません。
      </p>

      <nav class="fs-side-foot">
        <button v-if="isLoggedIn" type="button" @click="showPasswordModal = true">パスワードを変える</button>
        <button v-if="isLoggedIn" type="button" @click="doLogout">ログアウト</button>
      </nav>
    </aside>

    <div class="fs-shell-main">
      <header class="fs-mobile-head">
        <div class="fs-logo">
          <span class="fs-logo-mark" aria-hidden="true">
            <svg viewBox="0 0 24 24"><path d="M4 19h16" /><path d="M5 15l4-4 3 3 6-7" /><path d="M15 7h3v3" /></svg>
          </span>
          経営の見直し
        </div>
        <div class="flex items-center gap-1">
          <button type="button" class="fs-icon-btn" :disabled="!history.canUndo.value" aria-label="1つ前に戻す" @click="history.undo()">
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 14L4 9l5-5" /><path d="M4 9h11a5 5 0 010 10h-3" /></svg>
          </button>
          <button type="button" class="fs-icon-btn" :disabled="!history.canRedo.value" aria-label="やり直す" @click="history.redo()">
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 14l5-5-5-5" /><path d="M20 9H9a5 5 0 000 10h3" /></svg>
          </button>
        </div>
      </header>
      <div class="fs-mobile-tabs">
        <button type="button" class="fs-chip" :class="{ 'is-on': tab === 'sim' }" @click="tab = 'sim'">10年の試算</button>
        <button type="button" class="fs-chip" :class="{ 'is-on': tab === 'data' }" @click="tab = 'data'">
          実績（確定申告）<span v-if="drafts.length" class="fs-badge ml-1">{{ drafts.length }}</span>
        </button>
        <span class="fs-note ml-auto">{{ saveLabel }}</span>
      </div>

      <main class="w-full max-w-[1100px] mx-auto px-3 sm:px-5 pt-3 lg:pt-5 pb-10">
        <p v-if="loading" class="fs-lead py-10 text-center">読み込んでいます…</p>

        <div v-else-if="loadError" class="fs-card fs-card-body text-center py-8">
          <p class="fs-lead mb-3">データを読み込めませんでした。通信を確認してもう一度お試しください。</p>
          <button class="fs-btn-sub" @click="load">読み込み直す</button>
        </div>

        <!-- ───────── 実績（確定申告） ───────── -->
        <template v-else-if="tab === 'data'">
          <h1 class="fs-h1 m-0">実績（確定申告）</h1>
          <p class="fs-lead mt-1 mb-0">
            確定申告書の<strong>損益計算書のページ</strong>（青色申告決算書・収支内訳書の農業所得用）を読み込むと、AIが数字を読み取ります。確定する前に一覧で確認できます。
          </p>

          <p v-if="errorMsg" class="fs-notice fs-notice--error mt-3 mb-0">{{ errorMsg }}</p>

          <!-- 始める操作（キキガキのホームと同じカード型） -->
          <div class="fs-actions mt-3">
            <label class="fs-action" :class="{ 'is-disabled': extracting }">
              <input type="file" accept="image/*,application/pdf" multiple class="hidden" :disabled="extracting" @change="onPick" />
              <!-- 確認待ちがあるときは「確定する」を主役にしたいので、ここは青に下げる -->
              <span class="fs-action-icon" :class="{ 'is-sub': drafts.length > 0 }">
                <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 16V4M7 9l5-5 5 5" /><path d="M5 20h14" /></svg>
              </span>
              <span class="min-w-0">
                <span class="fs-action-title">{{ extracting ? '読み取っています…' : '確定申告書を読み込む' }}</span>
                <span class="fs-action-desc">{{ extracting ? '30秒ほどかかります' : '写真かPDF（4ファイルまで）。画像は保存しません' }}</span>
              </span>
            </label>
            <button type="button" class="fs-action" :disabled="extracting" @click="addManual">
              <span class="fs-action-icon is-sub">
                <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 20h4l10-10-4-4L4 16zM13 7l4 4" /></svg>
              </span>
              <span class="min-w-0">
                <span class="fs-action-title">手で入力する</span>
                <span class="fs-action-desc">読み取れないときや、数字だけ打ちたいとき</span>
              </span>
            </button>
          </div>

          <!-- 確認待ち（下書き）。確認せずにOKして数字が崩れる事故を防ぐため、確定ボタンはここにしか置かない -->
          <section v-for="y in drafts" :key="y.id" class="fs-card mt-4 overflow-hidden">
            <div class="fs-card-head">
              <h2 class="fs-h2 m-0 flex items-center gap-2">
                <span class="fs-tag fs-tag--warn">確認待ち</span>{{ y.year }}年分
              </h2>
              <button type="button" class="fs-btn-text is-danger" @click="removeYear(y.id)">捨てる</button>
            </div>
            <div class="fs-card-body">
              <FsYearEditor :year="y" />
            </div>
            <div class="fs-card-foot">
              <button class="fs-btn" :disabled="suggesting" @click="confirmYear(y.id)">この数字で確定する</button>
              <span class="fs-note">
                {{ confirmed.some((c) => c.year === y.year) ? `確定済みの${y.year}年分と置き換わります` : '確定すると試算の出発点に使えます' }}
              </span>
            </div>
          </section>

          <section class="fs-card mt-4 overflow-hidden">
            <div class="fs-card-head">
              <h2 class="fs-h2 m-0">確定した実績</h2>
              <div class="flex items-center gap-2">
                <span v-if="confirmed.length" class="fs-note">{{ confirmed.length }}年分</span>
                <button v-if="state.years.length" type="button" class="fs-btn-text is-danger" @click="resetAll">すべて消してやり直す</button>
              </div>
            </div>
            <p v-if="!confirmed.length" class="fs-lead px-4 py-8 m-0 text-center">
              まだありません。<br>上の「確定申告書を読み込む」から始めてください。
            </p>
            <div v-else class="overflow-x-auto">
              <table class="fs-table">
                <thead>
                  <tr>
                    <th>年分</th>
                    <th>売上</th>
                    <th v-for="g in groupKeys" :key="g">{{ GROUP_LABELS[g] }}</th>
                    <th>利益</th>
                    <th><span class="sr-only">操作</span></th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="y in confirmed" :key="y.id">
                    <td class="font-bold">{{ y.year }}年</td>
                    <td>{{ formatMan(yearRevenue(y)) }}</td>
                    <td v-for="g in groupKeys" :key="g">{{ formatMan(groupTotal(y, g)) }}</td>
                    <td class="font-bold" :style="{ color: yearProfit(y) < 0 ? 'var(--fs-danger)' : 'var(--fs-ink)' }">{{ formatMan(yearProfit(y)) }}</td>
                    <td>
                      <button type="button" class="fs-btn-text" @click="reopenYear(y.id)">直す</button>
                      <button type="button" class="fs-btn-text is-danger" @click="removeYear(y.id)">削除</button>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>
          <button v-if="confirmed.length && !drafts.length" class="fs-btn mt-4" @click="tab = 'sim'">この実績で試算する</button>
        </template>

        <!-- ───────── 10年の試算 ───────── -->
        <template v-else>
          <template v-if="!result.base">
            <h1 class="fs-h1 m-0">10年の試算</h1>
            <p class="fs-lead mt-1">
              確定申告の実績を出発点に、資材費が上がったら利益がどうなるか、対応策で何が変わるかを試せます。
            </p>
            <button class="fs-btn mt-3" @click="tab = 'data'">まずは確定申告書を読み込む</button>
          </template>

          <template v-else>
            <div class="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
              <h1 class="fs-h1 m-0">10年の試算</h1>
              <p class="fs-note m-0 fs-num">
                出発点: {{ result.base.year }}年の実績（売上 {{ formatMan(baseRows[0]!.revenue) }}・経費 {{ formatMan(baseRows[0]!.expense) }}・利益 {{ formatMan(baseRows[0]!.profit) }}）
              </p>
            </div>

            <!-- ① ひとことの結論。何もしないとどうなるかを最初に見せる -->
            <section class="fs-card fs-headline mt-3" :style="{ '--tone': headline.tone }">
              <p class="fs-note m-0">何もしないと…</p>
              <p class="text-[18px] sm:text-[21px] font-bold leading-snug m-0">
                10年後（{{ baseRows.at(-1)!.year }}年）の利益は
                <span class="fs-num" :style="{ color: headline.tone }">{{ formatMan(baseRows.at(-1)!.profit) }}</span>
              </p>
              <p class="fs-lead m-0 mt-0.5">{{ headline.detail }}</p>
            </section>

            <div class="grid lg:grid-cols-[1fr_320px] gap-3 items-start mt-3">
              <!-- ② グラフ。利益の折れ線に対応策の線を重ねて比べるのが基本、内訳は切り替えて棒で -->
              <section class="fs-card overflow-hidden">
                <div class="fs-card-head">
                  <h2 class="fs-h2 m-0">{{ chartMode === 'profit' ? '利益の推移' : '売上と経費の内訳' }}</h2>
                  <div class="flex gap-1">
                    <button type="button" class="fs-chip" :class="{ 'is-on': chartMode === 'profit' }" @click="chartMode = 'profit'">利益（折れ線）</button>
                    <button type="button" class="fs-chip" :class="{ 'is-on': chartMode === 'breakdown' }" @click="chartMode = 'breakdown'">内訳（棒）</button>
                  </div>
                </div>
                <div class="fs-card-body">
                  <template v-if="chartMode === 'profit'">
                    <div class="flex flex-wrap gap-x-3 gap-y-1 mb-2 text-[11.5px] text-[var(--fs-ink-soft)]">
                      <span v-for="s in lineSeries" :key="s.id" class="flex items-center gap-1.5">
                        <svg width="18" height="6" aria-hidden="true"><line x1="1" y1="3" x2="17" y2="3" :stroke="s.color" :stroke-width="s.width ?? 2" :stroke-dasharray="s.dashed ? '4 3' : undefined" stroke-linecap="round" /></svg>
                        {{ s.label }}
                      </span>
                    </div>
                    <FsProfitChart :series="lineSeries" :years="years" />
                  </template>
                  <template v-else>
                    <div class="flex flex-wrap gap-1 mb-3">
                      <button
                        v-for="s in result.scenarios" :key="s.id" type="button"
                        class="fs-chip" :class="{ 'is-on': selectedScenario.id === s.id }"
                        @click="selectedId = s.id"
                      >{{ s.label }}</button>
                    </div>
                    <FsBreakdownChart :rows="selectedScenario.rows" />
                  </template>
                </div>

                <!-- ③ 対応策ごとの効果を並べる -->
                <div class="overflow-x-auto border-t border-[var(--fs-line)]">
                  <table class="fs-table">
                    <thead>
                      <tr>
                        <th>やり方</th>
                        <th>10年後の利益</th>
                        <th>10年間の合計</th>
                        <th>何もしない場合との差</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr v-for="c in comparison" :key="c.id">
                        <td>
                          <span class="inline-block w-2.5 h-[3px] rounded-full align-middle mr-1.5" :style="{ background: colorOf(c.id) }" />
                          <span :class="{ 'font-bold': c.best }">{{ c.label }}</span>
                          <span v-if="c.best" class="fs-tag fs-tag--info ml-1.5">いちばん効く</span>
                        </td>
                        <td :style="{ color: c.last < 0 ? 'var(--fs-danger)' : undefined }">{{ formatMan(c.last) }}</td>
                        <td>{{ formatMan(c.total) }}</td>
                        <td :class="{ 'font-bold': c.diff > 0 }" :style="{ color: c.diff > 0 ? 'var(--fs-plus)' : undefined }">
                          {{ c.id === 'base' ? '—' : `${c.diff > 0 ? '+' : ''}${formatMan(c.diff)}` }}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                <details class="border-t border-[var(--fs-line)]">
                  <summary class="fs-details-summary">年ごとの数字を表で見る（{{ selectedScenario.label }}）</summary>
                  <div class="overflow-x-auto">
                    <table class="fs-table">
                      <thead>
                        <tr>
                          <th>年</th>
                          <th>売上</th>
                          <th>資材費</th>
                          <th>人件費</th>
                          <th>その他</th>
                          <th>減価償却費</th>
                          <th>利益</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr v-for="r in selectedScenario.rows" :key="r.t">
                          <td>{{ r.year }}<span class="fs-note">{{ r.t === 0 ? ' 実績' : '' }}</span></td>
                          <td>{{ formatMan(r.revenue) }}</td>
                          <td>{{ formatMan(r.material) }}</td>
                          <td>{{ formatMan(r.labor) }}</td>
                          <td>{{ formatMan(r.other) }}</td>
                          <td>{{ formatMan(r.depreciation) }}</td>
                          <td class="font-bold" :style="{ color: r.profit < 0 ? 'var(--fs-danger)' : 'var(--fs-ink)' }">{{ formatMan(r.profit) }}</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </details>
              </section>

              <div class="space-y-3">
                <!-- ④ 前提条件。最初は3つだけ。細かい設定は「詳細設定」を開いたときだけ -->
                <section class="fs-card overflow-hidden">
                  <div class="fs-card-head">
                    <h2 class="fs-h2 m-0">前提条件</h2>
                    <button type="button" class="fs-btn-text !px-0" :disabled="suggesting" @click="runSuggest">
                      {{ suggesting ? 'AIが考え中…' : state.ai ? 'AIの提案に戻す' : 'AIに初期値を出してもらう' }}
                    </button>
                  </div>
                  <div class="fs-card-body">
                    <p v-if="suggestError" class="fs-notice fs-notice--error mt-0 mb-3">{{ suggestError }}</p>
                    <div class="space-y-4">
                      <FsRateField v-model="state.assumptions.revenueRate" label="売上の伸び" :min="-20" :max="20" :reason="state.ai?.reasons.revenue" :suggested="state.ai?.revenueRate" />
                      <FsRateField v-model="state.assumptions.materialRate" label="資材費の上昇率" :min="-10" :max="20" :reason="state.ai?.reasons.material" :suggested="state.ai?.materialRate" />
                      <FsRateField v-model="state.assumptions.laborRate" label="人件費の変化" :min="-20" :max="20" zero-text="固定" :reason="state.ai?.reasons.labor" :suggested="state.ai?.laborRate" />
                    </div>
                  </div>

                  <details class="border-t border-[var(--fs-line)]" :open="advancedOpen" @toggle="advancedOpen = ($event.target as HTMLDetailsElement).open">
                    <summary class="fs-details-summary">詳細設定</summary>
                    <div class="space-y-4 px-4 pb-4">
                      <label v-if="confirmed.length > 1" class="block">
                        <span class="fs-field-label">出発点にする年</span>
                        <select v-model="state.assumptions.baseYear" class="fs-input">
                          <option :value="null">いちばん新しい年（{{ confirmed[0]!.year }}年）</option>
                          <option v-for="y in confirmed" :key="y.id" :value="y.year">{{ y.year }}年</option>
                        </select>
                      </label>

                      <FsRateField v-model="state.assumptions.otherRate" label="その他の経費の上昇率" :min="-10" :max="20" :reason="state.ai?.reasons.other" :suggested="state.ai?.otherRate" />

                      <div>
                        <p class="text-[13.5px] font-bold m-0">箱代の値上げ</p>
                        <p class="fs-note mt-0.5 mb-1.5">桃の箱代が1箱100円上がったら、など。翌年から毎年、資材費に上乗せします。</p>
                        <div class="flex items-center gap-1.5 text-[13px]">
                          <input v-model.number="state.assumptions.boxCount" type="number" inputmode="numeric" min="0" class="fs-input fs-num text-right !w-[90px]" aria-label="1年に使う箱の数" />
                          <span>箱 ×</span>
                          <input v-model.number="state.assumptions.boxPriceUp" type="number" inputmode="numeric" class="fs-input fs-num text-right !w-[80px]" aria-label="1箱あたりの値上げ額" />
                          <span>円</span>
                        </div>
                        <p v-if="boxExtra" class="fs-note fs-num mt-1 mb-0">→ 1年あたり {{ formatYen(boxExtra) }} の上乗せ</p>
                      </div>

                      <div>
                        <p class="text-[13.5px] font-bold m-0">科目ごとの上昇率</p>
                        <p class="fs-note mt-0.5 mb-2">空欄なら上の率を使います。肥料だけ大きく上がる、などのときに。</p>
                        <div class="space-y-1.5">
                          <label v-for="d in rateItems" :key="d.key" class="flex items-center gap-2 text-[13px]">
                            <span class="flex-1 min-w-0 truncate">{{ d.label }}<span class="fs-note">（{{ GROUP_LABELS[d.group!] }}）</span></span>
                            <input
                              :value="state.assumptions.itemRates[d.key] ?? ''"
                              type="number" inputmode="decimal" step="0.5"
                              :placeholder="String(groupRateOf(d.group!))"
                              class="fs-input fs-num text-right !w-[72px] !py-1"
                              @input="setItemRate(d.key, ($event.target as HTMLInputElement).value)"
                            />
                            <span class="fs-note">%</span>
                          </label>
                        </div>
                      </div>
                    </div>
                  </details>
                </section>

                <!-- ⑤ 対応策。オンにした策ごとに線が1本増える -->
                <section class="fs-card overflow-hidden">
                  <div class="fs-card-head">
                    <h2 class="fs-h2 m-0">対応策を試す</h2>
                  </div>
                  <div class="fs-card-body">
                    <p class="fs-note mt-0 mb-2.5">オンにすると、その策をとった場合の線がグラフに重なります。</p>
                    <div class="space-y-2">
                      <div v-for="s in state.strategies" :key="s.key" class="fs-opt" :class="{ 'is-on': s.enabled }">
                        <label class="flex items-center gap-2 cursor-pointer">
                          <input v-model="s.enabled" type="checkbox" class="w-4 h-4" :style="{ accentColor: 'var(--fs-accent)' }" />
                          <span class="inline-block w-3 h-[3px] rounded-full" :style="{ background: STRATEGY_COLORS[s.key] }" />
                          <span class="fs-opt-label">{{ STRATEGY_LABELS[s.key].name }}</span>
                        </label>
                        <div v-if="s.enabled" class="flex flex-wrap items-center gap-1.5 mt-2 text-[13px]">
                          <span>{{ STRATEGY_LABELS[s.key].verb }}</span>
                          <input v-model.number="s.value" type="number" inputmode="decimal" step="1" class="fs-input fs-num text-right !w-[64px] !py-1" :aria-label="`${STRATEGY_LABELS[s.key].verb}（%）`" />
                          <span>%</span>
                          <select v-model.number="s.startYear" class="fs-input !w-auto !py-1 ml-auto" aria-label="いつから">
                            <option v-for="n in SIM_YEARS" :key="n" :value="n">{{ n === 1 ? '来年から' : `${n}年後から` }}</option>
                          </select>
                        </div>
                      </div>
                    </div>
                  </div>
                </section>

                <p class="fs-note px-1 m-0">
                  大まかな利益の動きをつかむための試算です。確定申告の書類づくりには使えません。
                  利益は「青色申告特別控除前の所得」に近いもので、棚卸しの増減などは含めていません。
                </p>
              </div>
            </div>
          </template>
        </template>
      </main>

      <footer class="fs-foot">
        <button v-if="isLoggedIn" type="button" class="fs-btn-text" @click="showPasswordModal = true">パスワードを変える</button>
        <button v-if="isLoggedIn" type="button" class="fs-btn-text" @click="doLogout">ログアウト</button>
      </footer>
    </div>

    <!-- 消した直後に「元に戻す」をその場で出す。戻るボタンを探させない -->
    <Transition name="fs-toast">
      <div v-if="toast" class="fs-toast" role="status">
        <span>{{ toast.msg }}</span>
        <button v-if="toast.undo" type="button" class="fs-toast-btn" @click="undoFromToast">元に戻す</button>
      </div>
    </Transition>

    <AuthModal v-if="showAuthModal" accent="sky" />
    <PasswordModal v-model:show="showPasswordModal" accent="sky" />
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useAuth } from '~/composables/useAuth'
import { useUndoHistory } from '~/composables/useUndoHistory'
import { useFarmManagerImage } from '~/composables/useFarmManagerImage'
import AuthModal from '~/components/AuthModal.vue'
import PasswordModal from '~/components/PasswordModal.vue'
import FsProfitChart from '~/components/farm-simulation/FsProfitChart.vue'
import FsBreakdownChart from '~/components/farm-simulation/FsBreakdownChart.vue'
import FsYearEditor from '~/components/farm-simulation/FsYearEditor.vue'
import FsRateField from '~/components/farm-simulation/FsRateField.vue'
import type { LineSeries } from '~/components/farm-simulation/FsProfitChart.vue'
import {
  EXPENSE_ITEMS,
  GROUP_LABELS,
  REVENUE_ITEMS,
  SIM_YEARS,
  STRATEGY_LABELS,
  emptyState,
} from '~/types/farm-simulation'
import type { AiSuggestion, ExpenseGroup, SimState, StrategyKey, TaxYear, TaxYearDraft } from '~/types/farm-simulation'
import { firstYearBelow, formatMan, formatYen, simulate, yearProfit, yearRevenue } from '~/utils/farm-simulation'

definePageMeta({ layout: 'farm-simulation' })
useHead({ title: '経営の見直し | farm-simulation' })

const { isLoggedIn, checked, checkAuth, logout } = useAuth()
const showAuthModal = computed(() => checked.value && !isLoggedIn.value)
const showPasswordModal = ref(false)

// 線の色は対応策（もの）に固定する。オン/オフで本数が変わっても色が入れ替わらないように。
// 「何もしない」は基準線なので色を付けず、濃い墨の破線にする。
const BASE_COLOR = '#1f2a37'
const STRATEGY_COLORS: Record<StrategyKey, string> = { price: '#2a78d6', labor: '#eb6834', supplier: '#1baf7a' }
const ALL_COLOR = '#6250d6'
function colorOf(id: string): string {
  if (id === 'base') return BASE_COLOR
  if (id === 'all') return ALL_COLOR
  return STRATEGY_COLORS[id as StrategyKey] ?? BASE_COLOR
}

const state = ref<SimState>(emptyState())
const history = useUndoHistory(state)
const loading = ref(true)
const loadError = ref(false)
const loaded = ref(false)
const tab = ref<'sim' | 'data'>('sim')
const chartMode = ref<'profit' | 'breakdown'>('profit')
const selectedId = ref<string>('base')
const advancedOpen = ref(false)

const groupKeys: ExpenseGroup[] = ['material', 'labor', 'other', 'depreciation']

const drafts = computed(() => state.value.years.filter((y) => y.status === 'draft'))
const confirmed = computed(() =>
  state.value.years.filter((y) => y.status === 'confirmed').sort((a, b) => b.year - a.year)
)

function groupTotal(y: TaxYear, g: ExpenseGroup): number {
  return EXPENSE_ITEMS.filter((d) => d.group === g).reduce((s, d) => s + (y.expenses[d.key] ?? 0), 0)
}

// ── 試算（画面上で即時に再計算） ──
const result = computed(() => simulate(state.value))
const baseRows = computed(() => result.value.scenarios[0]?.rows ?? [])
const years = computed(() => baseRows.value.map((r) => r.year))

const lineSeries = computed<LineSeries[]>(() =>
  result.value.scenarios.map((s) => ({
    id: s.id,
    label: s.label,
    short: s.short,
    color: colorOf(s.id),
    values: s.rows.map((r) => r.profit),
    dashed: s.id === 'base',
    width: s.id === 'all' ? 3 : 2,
  }))
)

const selectedScenario = computed(
  () => result.value.scenarios.find((s) => s.id === selectedId.value) ?? result.value.scenarios[0]!
)

const headline = computed(() => {
  const rows = baseRows.value
  const start = rows[0]?.profit ?? 0
  const end = rows.at(-1)?.profit ?? 0
  const red = firstYearBelow(rows, 0)
  const half = start > 0 ? firstYearBelow(rows, start / 2) : null
  const diff = end - start
  let detail: string
  if (red !== null && start >= 0) detail = `${red}年後（${rows[red]!.year}年）に赤字になります。`
  else if (half !== null) detail = `${half}年後（${rows[half]!.year}年）に、利益が去年の半分を割ります。`
  else if (Math.abs(diff) < 10_000) detail = '去年とほぼ同じ利益が続きます。'
  else detail = `去年より${diff < 0 ? '' : '+'}${formatMan(diff)}。`
  const bad = end < 0 || (start > 0 && end < start * 0.8)
  const good = end >= start
  return {
    detail,
    tone: bad ? 'var(--fs-danger)' : good ? 'var(--fs-plus)' : 'var(--fs-warn)',
  }
})

const comparison = computed(() => {
  const list = result.value.scenarios.map((s) => {
    // 10年間の合計は試算の10年ぶんだけ（実績の年は全員同じなので入れない）
    const total = s.rows.slice(1).reduce((sum, r) => sum + r.profit, 0)
    return { id: s.id, label: s.label, last: s.rows.at(-1)!.profit, total, diff: 0, best: false }
  })
  const baseTotal = list[0]?.total ?? 0
  list.forEach((c) => (c.diff = c.total - baseTotal))
  // 単独の対応策のうち、いちばん効くもの（「全部やる」は比べる対象から外す）
  const singles = list.filter((c) => c.id !== 'base' && c.id !== 'all' && c.diff > 0)
  if (singles.length >= 2) singles.reduce((a, b) => (b.diff > a.diff ? b : a)).best = true
  return list
})

const boxExtra = computed(() => Math.max(0, state.value.assumptions.boxCount || 0) * (state.value.assumptions.boxPriceUp || 0))

const rateItems = computed(() => {
  const base = result.value.base
  return EXPENSE_ITEMS.filter((d) => d.group !== 'depreciation' && (base?.expenses[d.key] ?? 0) !== 0)
})

function groupRateOf(g: ExpenseGroup): number {
  const a = state.value.assumptions
  return g === 'material' ? a.materialRate : g === 'labor' ? a.laborRate : g === 'other' ? a.otherRate : 0
}

function setItemRate(key: string, raw: string) {
  const rates = { ...state.value.assumptions.itemRates }
  const n = Number(raw)
  if (raw.trim() === '' || !Number.isFinite(n)) delete rates[key]
  else rates[key] = n
  state.value.assumptions.itemRates = rates
}

// ── 読み込み・保存 ──
async function load() {
  loading.value = true
  loadError.value = false
  try {
    const res = await $fetch<{ state: SimState }>('/api/farm-simulation/state')
    state.value = res.state
    lastSaved = JSON.stringify(res.state)
    history.reset()
    loaded.value = true
    tab.value = state.value.years.some((y) => y.status === 'confirmed') ? 'sim' : 'data'
  } catch (e: any) {
    if (e?.statusCode !== 401) loadError.value = true
  } finally {
    loading.value = false
  }
}

const saveStatus = ref<'idle' | 'saving' | 'saved' | 'error'>('idle')
const saveLabel = computed(
  () => ({ idle: '', saving: '保存中…', saved: '保存しました', error: '保存できませんでした' })[saveStatus.value]
)
let saveTimer: ReturnType<typeof setTimeout> | null = null
/** 最後にサーバーと一致していた状態。読み込んだだけ・戻して元どおりになっただけでは保存しない。 */
let lastSaved = ''
watch(
  state,
  () => {
    if (!loaded.value || JSON.stringify(state.value) === lastSaved) return
    if (saveTimer) clearTimeout(saveTimer)
    saveTimer = setTimeout(save, 800)
  },
  { deep: true }
)

async function save() {
  saveStatus.value = 'saving'
  const snap = JSON.stringify(state.value)
  try {
    await $fetch('/api/farm-simulation/state', { method: 'PUT', body: { state: JSON.parse(snap) } })
    lastSaved = snap
    saveStatus.value = 'saved'
  } catch {
    saveStatus.value = 'error'
  }
}

// ── 確定申告書の読み込み ──
const { fileToDataUrl: imageToDataUrl } = useFarmManagerImage()
const extracting = ref(false)
const errorMsg = ref('')
const MAX_PDF_BYTES = 10 * 1024 * 1024

function readAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader()
    r.onload = () => resolve(String(r.result))
    r.onerror = () => reject(new Error('ファイルを読み込めませんでした'))
    r.readAsDataURL(file)
  })
}

async function onPick(e: Event) {
  const input = e.target as HTMLInputElement
  const files = Array.from(input.files ?? [])
  input.value = ''
  if (!files.length) return
  errorMsg.value = ''
  if (files.length > 4) {
    errorMsg.value = '一度に読み込めるのは4ファイルまでです。'
    return
  }
  extracting.value = true
  try {
    const dataUrls: string[] = []
    for (const f of files) {
      if (f.type === 'application/pdf') {
        if (f.size > MAX_PDF_BYTES) throw new Error('PDFが大きすぎます（10MBまで）。損益計算書のページだけにしてください。')
        dataUrls.push(await readAsDataUrl(f))
      } else if (f.type.startsWith('image/')) {
        dataUrls.push(await imageToDataUrl(f))
      } else {
        throw new Error('写真（画像）かPDFを選んでください。')
      }
    }
    const draft = await $fetch<TaxYearDraft>('/api/farm-simulation/extract', {
      method: 'POST',
      body: { files: dataUrls, name: files.map((f) => f.name).join('、') },
    })
    state.value.years.push({ ...draft, id: crypto.randomUUID(), status: 'draft' })
  } catch (err: any) {
    errorMsg.value = err?.data?.message || err?.statusMessage || err?.message || '読み取りに失敗しました。'
  } finally {
    extracting.value = false
  }
}

function emptyAmounts(defs: { key: string }[]): Record<string, number> {
  return Object.fromEntries(defs.map((d) => [d.key, 0]))
}

function addManual() {
  state.value.years.push({
    id: crypto.randomUUID(),
    year: new Date().getFullYear() - 1,
    status: 'draft',
    revenue: emptyAmounts(REVENUE_ITEMS),
    expenses: emptyAmounts(EXPENSE_ITEMS),
    printed: { revenueTotal: null, expenseTotal: null, income: null },
    uncertain: [],
    warnings: [],
    source: '手入力',
  })
}

async function confirmYear(id: string) {
  const y = state.value.years.find((x) => x.id === id)
  if (!y) return
  const firstTime = !state.value.years.some((x) => x.status === 'confirmed')
  const replaced = state.value.years.filter((x) => x.status === 'confirmed' && x.year === y.year && x.id !== id)
  state.value.years = state.value.years.filter((x) => !replaced.includes(x))
  y.status = 'confirmed'
  y.uncertain = []
  showToast(replaced.length ? `${y.year}年分を置き換えました` : `${y.year}年分を確定しました`, replaced.length > 0)
  if (firstTime) {
    tab.value = 'sim'
    // 最初の確定のときだけ、AIに前提条件の初期値を出してもらう（あとから自分で変えられる）
    if (!state.value.ai) await runSuggest()
  }
}

function reopenYear(id: string) {
  const y = state.value.years.find((x) => x.id === id)
  if (y) y.status = 'draft'
  window.scrollTo({ top: 0, behavior: 'smooth' })
}

function removeYear(id: string) {
  const y = state.value.years.find((x) => x.id === id)
  state.value.years = state.value.years.filter((x) => x.id !== id)
  if (y) showToast(`${y.year}年分を消しました`, true)
}

function resetAll() {
  state.value = emptyState()
  showToast('すべて消しました', true)
}

// ── AIの初期値 ──
const suggesting = ref(false)
const suggestError = ref('')

async function runSuggest() {
  const yearsToSend = state.value.years.filter((y) => y.status === 'confirmed')
  if (!yearsToSend.length) return
  suggesting.value = true
  suggestError.value = ''
  try {
    const s = await $fetch<AiSuggestion>('/api/farm-simulation/suggest', { method: 'POST', body: { years: yearsToSend } })
    state.value.ai = s
    Object.assign(state.value.assumptions, {
      revenueRate: s.revenueRate,
      materialRate: s.materialRate,
      laborRate: s.laborRate,
      otherRate: s.otherRate,
    })
  } catch (err: any) {
    // 失敗しても試算は既定値で続けられる。止めない
    suggestError.value = err?.data?.message || 'AIの提案を受け取れませんでした。数字は自分で変えられます。'
  } finally {
    suggesting.value = false
  }
}

// ── トースト・戻る/進む ──
const toast = ref<{ msg: string; undo: boolean } | null>(null)
let toastTimer: ReturnType<typeof setTimeout> | null = null
function showToast(msg: string, undo: boolean) {
  toast.value = { msg, undo }
  if (toastTimer) clearTimeout(toastTimer)
  toastTimer = setTimeout(() => (toast.value = null), 6000)
}
function undoFromToast() {
  history.undo()
  toast.value = null
}

function onKeydown(e: KeyboardEvent) {
  const target = e.target as HTMLElement | null
  // 入力欄の中ではブラウザ標準の取り消し（文字単位）を優先する
  if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'SELECT')) return
  if (!(e.metaKey || e.ctrlKey)) return
  const k = e.key.toLowerCase()
  if (k === 'z' && !e.shiftKey) {
    e.preventDefault()
    history.undo()
  } else if ((k === 'z' && e.shiftKey) || k === 'y') {
    e.preventDefault()
    history.redo()
  }
}

async function doLogout() {
  await logout()
  window.location.reload()
}

// AuthModal はログインしても画面を読み込み直さないので、ここで取り直す
watch(isLoggedIn, (v) => {
  if (v) load()
})

onMounted(async () => {
  window.addEventListener('keydown', onKeydown)
  await checkAuth()
  if (isLoggedIn.value) await load()
  else loading.value = false
})

onBeforeUnmount(() => {
  window.removeEventListener('keydown', onKeydown)
  if (saveTimer) {
    clearTimeout(saveTimer)
    if (loaded.value) save()
  }
})
</script>

<style scoped>
/* 外枠はキキガキ本番版の layouts/default.vue と同じ作り（PCは左メニュー｜本文、スマホは上のヘッダー＋タブ） */
.fs-shell { min-height: 100dvh; display: flex; flex-direction: column; }
.fs-shell-main { flex: 1; min-width: 0; display: flex; flex-direction: column; }

.fs-logo {
  display: inline-flex;
  align-items: center;
  gap: 0.45rem;
  font-size: 17px;
  font-weight: 700;
  color: var(--fs-accent);
  letter-spacing: 0.04em;
  white-space: nowrap;
}
.fs-logo-mark {
  width: 26px;
  height: 26px;
  border-radius: 7px;
  background: var(--fs-accent);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex: none;
}
.fs-logo-mark svg { width: 17px; height: 17px; fill: none; stroke: #fff; stroke-width: 2; stroke-linecap: round; stroke-linejoin: round; }

.fs-side { display: none; }
.fs-mobile-head {
  padding: 0.6rem 0.9rem;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
  background: var(--fs-panel);
  border-bottom: 1px solid var(--fs-line);
}
.fs-mobile-tabs {
  display: flex;
  align-items: center;
  gap: 0.35rem;
  padding: 0.5rem 0.9rem;
  background: var(--fs-panel);
  border-bottom: 1px solid var(--fs-line);
  position: sticky;
  top: 0;
  z-index: 10;
}
.fs-icon-btn {
  width: 36px;
  height: 36px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: 1px solid var(--fs-line-strong);
  border-radius: 999px;
  background: var(--fs-panel);
  color: var(--fs-ink-soft);
}
.fs-icon-btn:disabled { opacity: 0.35; }
.fs-icon-btn svg, .fs-ico { width: 16px; height: 16px; fill: none; stroke: currentColor; stroke-width: 2; stroke-linecap: round; stroke-linejoin: round; flex: none; }
.fs-foot { display: flex; justify-content: center; gap: 0.5rem; border-top: 1px solid var(--fs-line); padding: 0.6rem 1rem; }

@media (min-width: 1024px) {
  .fs-shell { flex-direction: row; }
  .fs-side {
    width: 248px;
    flex: none;
    display: flex;
    flex-direction: column;
    gap: 0.9rem;
    padding: 0.9rem 0.7rem 0.8rem;
    background: var(--fs-panel);
    border-right: 1px solid var(--fs-line);
    position: sticky;
    top: 0;
    align-self: flex-start;
    height: 100dvh;
    overflow-y: auto;
  }
  .fs-side .fs-logo { padding: 0 0.5rem; }
  .fs-mobile-head, .fs-mobile-tabs, .fs-foot { display: none; }
}

.fs-side-nav { display: flex; flex-direction: column; gap: 2px; }
.fs-side-link {
  display: flex;
  align-items: center;
  gap: 0.55rem;
  width: 100%;
  padding: 0.45rem 0.6rem;
  border: 0;
  border-radius: 8px;
  background: transparent;
  font-family: inherit;
  font-size: 13.5px;
  color: var(--fs-ink);
  text-align: left;
  cursor: pointer;
}
.fs-side-link svg { width: 17px; height: 17px; fill: none; stroke: currentColor; stroke-width: 1.8; stroke-linecap: round; stroke-linejoin: round; }
.fs-side-link:hover { background: var(--fs-bg); }
.fs-side-link.is-active { background: var(--fs-accent-soft); color: var(--fs-accent-strong); font-weight: 700; }
.fs-side-undo { padding: 0.75rem 0.5rem 0; border-top: 1px solid var(--fs-line); }
.fs-side-foot { margin-top: auto; display: flex; flex-direction: column; align-items: flex-start; gap: 0.15rem; padding: 0 0.6rem; }
.fs-side-foot button { font-size: 11.5px; color: var(--fs-ink-faint); background: none; border: 0; padding: 0; cursor: pointer; }
.fs-side-foot button:hover { color: var(--fs-ink-soft); text-decoration: underline; }

.fs-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 18px;
  height: 18px;
  padding: 0 5px;
  border-radius: 999px;
  background: var(--fs-cta);
  color: #fff;
  font-size: 11px;
  font-weight: 700;
  margin-left: auto;
}
.fs-chip .fs-badge { margin-left: 0.25rem; }

/* 始める操作（キキガキのホームの kk-action と同じ） */
.fs-actions { display: grid; grid-template-columns: repeat(auto-fill, minmax(260px, 1fr)); gap: 0.6rem; }
.fs-action {
  display: flex;
  align-items: center;
  gap: 0.7rem;
  padding: 0.75rem 0.9rem;
  border: 1px solid var(--fs-line);
  border-radius: 10px;
  background: var(--fs-panel);
  box-shadow: var(--fs-shadow);
  font-family: inherit;
  text-align: left;
  color: var(--fs-ink);
  cursor: pointer;
  transition: border-color 0.15s, box-shadow 0.15s;
}
.fs-action:hover:not(:disabled):not(.is-disabled) { border-color: var(--fs-accent); box-shadow: 0 4px 16px rgba(29, 111, 214, 0.14); }
.fs-action:disabled, .fs-action.is-disabled { opacity: 0.55; cursor: default; box-shadow: none; }
.fs-action-icon {
  width: 34px;
  height: 34px;
  flex: none;
  border-radius: 9px;
  background: var(--fs-cta);
  display: inline-flex;
  align-items: center;
  justify-content: center;
}
.fs-action-icon.is-sub { background: var(--fs-accent); }
.fs-action-icon svg { width: 18px; height: 18px; fill: none; stroke: #fff; stroke-width: 2.2; stroke-linecap: round; stroke-linejoin: round; }
.fs-action-title { display: block; font-size: 14px; font-weight: 700; line-height: 1.4; }
.fs-action-desc { display: block; font-size: 11.5px; color: var(--fs-ink-faint); line-height: 1.5; }

.fs-card-foot {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.75rem;
  padding: 0.75rem 1rem;
  border-top: 1px solid var(--fs-line);
  background: #f8fafd;
}

.fs-tag { display: inline-flex; align-items: center; height: 20px; padding: 0 0.5rem; border-radius: 999px; font-size: 11px; font-weight: 700; }
.fs-tag--warn { background: var(--fs-warn-soft); color: var(--fs-warn); border: 1px solid #f5d6ad; }
.fs-tag--info { background: var(--fs-accent-soft); color: var(--fs-accent-strong); }

.fs-headline { padding: 0.8rem 1rem 0.85rem 1.1rem; border-left: 4px solid var(--tone); }

.fs-details-summary {
  padding: 0.6rem 1rem;
  font-size: 13px;
  font-weight: 700;
  color: var(--fs-ink-soft);
  cursor: pointer;
  user-select: none;
}
.fs-details-summary:hover { color: var(--fs-accent-strong); }

/* 対応策の1行（キキガキの kk-mode-opt と同じ選択の見せ方） */
.fs-opt { padding: 0.55rem 0.75rem; border: 1px solid var(--fs-line-strong); border-radius: 10px; background: var(--fs-panel); transition: border-color 0.15s, background-color 0.15s; }
.fs-opt:hover { border-color: var(--fs-accent); }
.fs-opt.is-on { border-color: var(--fs-accent); background: var(--fs-accent-soft); box-shadow: inset 0 0 0 1px var(--fs-accent); }
.fs-opt-label { font-size: 13.5px; font-weight: 700; }
.fs-opt.is-on .fs-opt-label { color: var(--fs-accent-strong); }

.fs-toast {
  position: fixed;
  left: 50%;
  bottom: 24px;
  transform: translateX(-50%);
  z-index: 50;
  display: flex;
  align-items: center;
  gap: 0.75rem;
  max-width: 92vw;
  padding: 0.5rem 0.5rem 0.5rem 1.1rem;
  border-radius: 999px;
  background: var(--fs-ink);
  color: #fff;
  font-size: 13px;
  box-shadow: 0 8px 30px rgba(20, 60, 120, 0.25);
}
.fs-toast-btn { border: 0; border-radius: 999px; padding: 0.3rem 0.8rem; background: rgba(255, 255, 255, 0.16); color: #fff; font-family: inherit; font-size: 13px; font-weight: 700; cursor: pointer; white-space: nowrap; }
.fs-toast-btn:hover { background: rgba(255, 255, 255, 0.26); }
.fs-toast-enter-active, .fs-toast-leave-active { transition: opacity 0.2s, transform 0.2s; }
.fs-toast-enter-from, .fs-toast-leave-to { opacity: 0; transform: translate(-50%, 8px); }
</style>
