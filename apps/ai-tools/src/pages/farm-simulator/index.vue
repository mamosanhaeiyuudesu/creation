<template>
  <div class="fsr-shell">
    <!-- PC の左サイドバー（キキガキ本番版と同じ作り）。スマホでは上のヘッダーとタブに任せる -->
    <aside class="fsr-side">
      <div class="fsr-logo">
        <span class="fsr-logo-mark" aria-hidden="true">
          <svg viewBox="0 0 24 24"><path d="M4 19h16" /><path d="M6 16c2-6 4-9 6-9s4 3 6 9" /></svg>
        </span>
        収穫・出荷の見通し
      </div>

      <nav class="fsr-side-nav">
        <button type="button" class="fsr-side-link" :class="{ 'is-active': tab === 'outlook' }" @click="tab = 'outlook'">
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 19h16" /><path d="M6 16c2-6 4-9 6-9s4 3 6 9" /></svg>
          見通し
        </button>
        <button type="button" class="fsr-side-link" :class="{ 'is-active': tab === 'data' }" @click="tab = 'data'">
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 4h9l3 3v13H6z" /><path d="M9 11h6M9 15h6" /></svg>
          記録の読み込み
          <span v-if="parsed?.errors.length" class="fsr-badge">{{ parsed.errors.length }}</span>
        </button>
      </nav>

      <div class="fsr-side-weather">
        <p class="fsr-field-label !mb-1">天気（気象庁）</p>
        <p class="fsr-note m-0">{{ weatherLabel }}</p>
      </div>

      <p class="fsr-note px-2 m-0">
        和歌山県かつらぎ町の果樹の、収穫・出荷の量と時期を、過去の記録と気象庁の天気から見通す道具です。
      </p>

      <nav class="fsr-side-foot">
        <button v-if="isLoggedIn" type="button" @click="showPasswordModal = true">パスワードを変える</button>
        <button v-if="isLoggedIn" type="button" @click="doLogout">ログアウト</button>
      </nav>
    </aside>

    <div class="fsr-shell-main">
      <header class="fsr-mobile-head">
        <div class="fsr-logo">
          <span class="fsr-logo-mark" aria-hidden="true">
            <svg viewBox="0 0 24 24"><path d="M4 19h16" /><path d="M6 16c2-6 4-9 6-9s4 3 6 9" /></svg>
          </span>
          収穫・出荷の見通し
        </div>
      </header>
      <div class="fsr-mobile-tabs">
        <button type="button" class="fsr-chip" :class="{ 'is-on': tab === 'outlook' }" @click="tab = 'outlook'">見通し</button>
        <button type="button" class="fsr-chip" :class="{ 'is-on': tab === 'data' }" @click="tab = 'data'">
          記録の読み込み<span v-if="parsed?.errors.length" class="fsr-badge">{{ parsed.errors.length }}</span>
        </button>
      </div>

      <main class="w-full max-w-[1120px] mx-auto px-3 sm:px-5 pt-3 lg:pt-5 pb-12">
        <!-- ───────── 記録の読み込み ───────── -->
        <template v-if="tab === 'data'">
          <h1 class="fsr-h1 m-0">記録の読み込み</h1>
          <p class="fsr-lead mt-1 mb-0">
            過去の収穫・出荷の記録（CSV）を読み込みます。ファイルを選ぶか、表計算ソフトからそのまま貼り付けてください。
            記録はこの画面の中だけで使い、保存しません。
          </p>

          <div class="fsr-actions mt-3">
            <label class="fsr-action">
              <input type="file" accept=".csv,.txt,.tsv,text/csv,text/plain" class="hidden" @change="onPickFile" />
              <span class="fsr-action-icon is-sub">
                <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 16V4M7 9l5-5 5 5" /><path d="M5 20h14" /></svg>
              </span>
              <span class="min-w-0">
                <span class="fsr-action-title">CSVファイルを選ぶ</span>
                <span class="fsr-action-desc">日付・品目・種別・数量・単価・出荷先・メモ</span>
              </span>
            </label>
            <button type="button" class="fsr-action" @click="pasteOpen = !pasteOpen">
              <span class="fsr-action-icon is-sub">
                <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 4h8v3H8z" /><path d="M6 6H5v14h14V6h-1" /></svg>
              </span>
              <span class="min-w-0">
                <span class="fsr-action-title">貼り付けて読み込む</span>
                <span class="fsr-action-desc">表計算ソフトの表をコピーして貼る</span>
              </span>
            </button>
            <button type="button" class="fsr-action" @click="loadDemo">
              <span class="fsr-action-icon" :class="{ 'is-sub': !!parsed }">
                <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5l11 7-11 7z" /></svg>
              </span>
              <span class="min-w-0">
                <span class="fsr-action-title">デモで試す（ダミー）</span>
                <span class="fsr-action-desc">桃・柿・いちじく・キウイ、3季節ぶん</span>
              </span>
            </button>
          </div>

          <section v-if="pasteOpen" class="fsr-card mt-3 overflow-hidden">
            <div class="fsr-card-body">
              <label class="fsr-field-label" for="fsr-paste">記録を貼り付け（1行目は見出し）</label>
              <textarea
                id="fsr-paste"
                v-model="pasteText"
                rows="7"
                class="fsr-input fsr-num"
                placeholder="日付,品目,種別,数量,単価,出荷先,メモ&#10;2025-07-10,桃,収穫,320,,,&#10;2025-07-11,桃,出荷,290,650,JA,"
              />
            </div>
            <div class="fsr-card-foot">
              <button type="button" class="fsr-btn" :disabled="!pasteText.trim()" @click="loadText(pasteText, '貼り付けた記録', false)">読み込む</button>
            </div>
          </section>

          <p v-if="fileError" class="fsr-notice fsr-notice--error mt-3 mb-0">{{ fileError }}</p>

          <!-- 読み込んだ結果 -->
          <section v-if="parsed" class="fsr-card mt-4 overflow-hidden">
            <div class="fsr-card-head">
              <h2 class="fsr-h2 m-0 flex items-center gap-2">
                読み込んだ記録
                <span v-if="isDemo" class="fsr-tag fsr-tag--warn">ダミー</span>
              </h2>
              <span class="fsr-note">{{ sourceName }}</span>
            </div>
            <div class="fsr-card-body">
              <dl class="fsr-facts">
                <div><dt>使える行</dt><dd class="fsr-num">{{ parsed.summary.rows.toLocaleString('ja-JP') }}行</dd></div>
                <div><dt>期間</dt><dd class="fsr-num">{{ parsed.summary.from ? `${fmtDate(parsed.summary.from)}〜${fmtDate(parsed.summary.to!)}` : '—' }}</dd></div>
                <div>
                  <dt>品目</dt>
                  <dd>
                    <span v-for="it in itemCounts" :key="it.item" class="inline-block mr-3 fsr-num">{{ it.item }} {{ it.count }}行</span>
                  </dd>
                </div>
                <div>
                  <dt>欠けている項目</dt>
                  <dd class="fsr-num">
                    <template v-if="missingList.length">{{ missingList.join('・') }}</template>
                    <template v-else>ありません</template>
                  </dd>
                </div>
              </dl>
              <p v-if="parsed.summary.missing.price" class="fsr-note mt-2 mb-0">
                単価が空の行は、金額の見通しに使いません（量の見通しには使います）。
              </p>
            </div>

            <div v-if="parsed.errors.length" class="border-t border-[var(--fsr-line)]">
              <p class="fsr-notice fsr-notice--warn m-3">
                読めなかった行が {{ parsed.errors.length }} 行あります。この行は除いて計算します。
              </p>
              <div class="overflow-x-auto">
                <table class="fsr-table">
                  <thead><tr><th>行</th><th class="!text-left">理由</th><th class="!text-left">中身</th></tr></thead>
                  <tbody>
                    <tr v-for="e in parsed.errors" :key="e.line">
                      <td class="fsr-num">{{ e.line }}行目</td>
                      <td class="!text-left !whitespace-normal !text-[var(--fsr-danger)]">{{ e.message }}</td>
                      <td class="!text-left fsr-note">{{ e.raw }}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
            <div class="fsr-card-foot">
              <button type="button" class="fsr-btn" :disabled="!parsed.records.length" @click="tab = 'outlook'">見通しを見る</button>
            </div>
          </section>

          <details class="fsr-card mt-4 overflow-hidden">
            <summary class="fsr-details-summary">CSVの書き方</summary>
            <div class="px-4 pb-4 text-[13.5px]">
              <p class="m-0 mb-2">1行目に見出し、2行目から1日1行（同じ日に何回あってもよい）。</p>
              <pre class="fsr-pre">日付,品目,種別,数量,単価,出荷先,メモ
2025-07-10,桃,収穫,320,,,
2025-07-11,桃,出荷,290,650,JA,秀品</pre>
              <ul class="fsr-note pl-4 my-2">
                <li>種別は「収穫」か「出荷」。数量はkg。単価は円/kg（空でもよい）。</li>
                <li>日付は 2025-07-10・2025/7/10・2025年7月10日 のどれでも読めます。</li>
                <li>キウイは4月始まりの季節で数えます（秋に取って冬〜春に出すため）。</li>
              </ul>
              <button type="button" class="fsr-btn-sub" @click="downloadSample">見本のCSVを保存（ダミー）</button>
            </div>
          </details>
        </template>

        <!-- ───────── 見通し ───────── -->
        <template v-else>
          <template v-if="!parsed?.records.length">
            <h1 class="fsr-h1 m-0">見通し</h1>
            <p class="fsr-lead mt-1">
              過去の収穫・出荷の記録を読み込むと、これからの量と時期を幅つきで見通せます。天気は気象庁の観測（かつらぎ）を自動で取り込みます。
            </p>
            <div class="flex flex-wrap gap-2 mt-3">
              <button class="fsr-btn" @click="loadDemo">デモで試す（ダミー）</button>
              <button class="fsr-btn-sub" @click="tab = 'data'">自分の記録を読み込む</button>
            </div>
          </template>

          <template v-else>
            <div class="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
              <h1 class="fsr-h1 m-0 flex items-center gap-2">
                {{ targetSeason }}年の見通し
                <span v-if="isDemo" class="fsr-tag fsr-tag--warn">ダミーの記録</span>
              </h1>
              <label class="flex items-center gap-1.5 fsr-note">
                見通す季節
                <select v-model.number="targetSeason" class="fsr-input !w-auto !py-1">
                  <option v-for="s in seasonOptions" :key="s" :value="s">{{ s }}年</option>
                </select>
              </label>
            </div>

            <!-- 品目（複数）と種別 -->
            <div class="fsr-filter mt-3">
              <div class="flex flex-wrap gap-1.5">
                <button
                  v-for="it in items" :key="it" type="button"
                  class="fsr-chip fsr-chip--lg" :class="{ 'is-on': selectedItems.includes(it) }"
                  :aria-pressed="selectedItems.includes(it)"
                  @click="toggleItem(it)"
                >{{ it }}</button>
              </div>
              <div class="fsr-seg" role="group" aria-label="収穫か出荷か">
                <button type="button" :class="{ 'is-on': kind === 'harvest' }" @click="kind = 'harvest'">収穫</button>
                <button type="button" :class="{ 'is-on': kind === 'ship' }" @click="kind = 'ship'">出荷</button>
              </div>
            </div>

            <!-- 必ず出す注意書き -->
            <p class="fsr-notice fsr-notice--info mt-3 mb-0">
              予測は、記録の量と質で変わります。目安として使ってください。
            </p>
            <p v-if="weatherNotice" class="fsr-notice mt-2 mb-0" :class="weatherNotice.error ? 'fsr-notice--warn' : 'fsr-notice--info'">
              {{ weatherNotice.text }}
            </p>

            <div class="fsr-grid mt-3">
              <div class="fsr-results space-y-3">
                <p v-if="!selectedItems.length" class="fsr-card fsr-card-body fsr-lead text-center !py-8 m-0">上で品目を選んでください。</p>
                <a href="#fsr-cond" class="fsr-jump">気温・単価を変えて試す ↓</a>

                <!-- 品目ごとの見通し -->
                <section v-for="o in outlooks" :key="o.item" class="fsr-card overflow-hidden">
                  <div class="fsr-card-head">
                    <h2 class="fsr-h2 m-0">{{ o.item }}の{{ KIND_LABELS[o.kind] }}</h2>
                    <span class="fsr-note fsr-num">{{ o.targetSeason }}年の季節{{ profileOf(o.item).seasonStartMonth !== 1 ? `（${profileOf(o.item).seasonStartMonth}月始まり）` : '' }}</span>
                  </div>

                  <div v-if="o.status === 'insufficient'" class="fsr-card-body">
                    <p class="fsr-notice fsr-notice--warn m-0">{{ o.reason }}</p>
                  </div>

                  <div v-else class="fsr-card-body">
                    <!-- いちばん知りたい2つ: どれくらい・いつ -->
                    <div class="fsr-head-nums">
                      <div>
                        <p class="fsr-note m-0">量</p>
                        <p class="fsr-big fsr-num m-0">{{ fmt(o.total!.low) }}<span class="fsr-big-sep">〜</span>{{ fmt(o.total!.high) }}<span class="fsr-big-unit">kg</span></p>
                        <p class="fsr-note fsr-num m-0">真ん中 {{ fmt(o.total!.mid) }}kg</p>
                      </div>
                      <div>
                        <p class="fsr-note m-0">山の時期</p>
                        <p class="fsr-big fsr-num m-0">{{ md(o.timing!.peakFrom) }}<span class="fsr-big-sep">〜</span>{{ md(o.timing!.peakTo) }}</p>
                        <p class="fsr-note fsr-num m-0">{{ md(o.timing!.start) }}ごろから{{ md(o.timing!.end) }}ごろまで</p>
                      </div>
                      <div v-if="o.revenue">
                        <p class="fsr-note m-0">金額</p>
                        <p class="fsr-big fsr-num m-0">{{ man(o.revenue.low) }}<span class="fsr-big-sep">〜</span>{{ man(o.revenue.high) }}</p>
                        <p class="fsr-note fsr-num m-0">単価 {{ fmt(o.price!.applied) }}円/kg{{ scenario.priceChange ? `（もとは${fmt(o.price!.base)}円）` : '' }}</p>
                      </div>
                    </div>
                    <p class="mt-2 mb-0">
                      <span class="fsr-tag" :class="o.weather.shiftDays ? 'fsr-tag--info' : 'fsr-tag--plain'">
                        {{ shiftText(o) }}
                      </span>
                    </p>
                  </div>

                  <div class="px-3 sm:px-4 pb-3">
                    <FsrSeasonChart
                      :bins="o.bins" :past="o.past" :current="o.current" :range="o.range"
                      :start-month="o.startMonth" :title="`${o.item}の${KIND_LABELS[o.kind]}`"
                    />
                  </div>

                  <!-- 根拠 -->
                  <details class="border-t border-[var(--fsr-line)]" :open="evidenceOpen" @toggle="evidenceOpen = ($event.target as HTMLDetailsElement).open">
                    <summary class="fsr-details-summary">根拠（使った記録・天気・幅の出し方）</summary>
                    <dl class="fsr-facts px-4 pb-4">
                      <div>
                        <dt>使った記録</dt>
                        <dd class="fsr-num">
                          {{ o.rowsUsed }}行<template v-if="o.seasonsUsed.length">（{{ o.seasonsUsed.join('・') }}年の{{ o.seasonsUsed.length }}季節）</template>
                          <span v-for="s in o.totalsBySeason" :key="s.season" class="block fsr-note">{{ s.season }}年 合計{{ fmt(Math.round(s.total)) }}kg</span>
                        </dd>
                      </div>
                      <div v-if="o.status === 'ok'">
                        <dt>量の幅</dt>
                        <dd class="fsr-num">季節ごとの合計の平均 ± ばらつき（標準偏差 {{ fmt(o.sdTotal) }}kg）。量は気温では変えていません。</dd>
                      </div>
                      <div v-if="o.status === 'ok'">
                        <dt>時期の出し方</dt>
                        <dd class="fsr-num">
                          <template v-if="o.weather.used">
                            {{ o.weather.gddStartLabel }}から、毎日の平均気温のうち{{ o.weather.baseTemp }}℃を超えた分を足し上げ（積算温度）、
                            過去の山の日の平均（{{ md(o.weather.avgPeakDate) }}）までの値を比べました。
                            過去の平均 {{ fmt(o.weather.requiredGdd!) }}℃・日（{{ o.weather.calibratedSeasons.join('・') }}年）に対して今季は {{ fmt(o.weather.targetGdd!) }}℃・日。
                            この差を、その時期の1日あたりの積算温度（{{ o.weather.gddPerDay }}℃・日）で日数に直しています<template v-if="o.weather.capped">（大きすぎるので±14日で止めています）</template>。
                            幅は、過去の季節にこのやり方を当てたときの外れ方（±{{ o.weather.spreadDays }}日）です。
                            <span v-if="o.weather.helps === false" class="block mt-1 text-[var(--fsr-warn)]">
                              この品目の記録では、気温で補正しても、補正しないときより当たり方が良くなりませんでした。時期は幅を広めに見てください。
                            </span>
                          </template>
                          <template v-else>
                            天気を使っていません（{{ o.weather.reason }}）。過去の季節の平均の時期と、その年ごとのばらつき（±{{ o.weather.spreadDays }}日）です。
                          </template>
                        </dd>
                      </div>
                      <div v-if="o.status === 'ok' && o.weather.used">
                        <dt>天気</dt>
                        <dd class="fsr-num">
                          {{ o.targetSeason }}年の季節: 観測 {{ o.weather.obsDays }}日・予報 {{ o.weather.fcstDays }}日・平年値 {{ o.weather.normalDays }}日
                          <span class="block fsr-note">観測は気象庁アメダス「かつらぎ」（{{ weatherRange }}）。平年値は、そのうち同じ時期（前後7日）の平均。予報は週間予報の「和歌山」の地点。</span>
                        </dd>
                      </div>
                      <div v-if="o.price">
                        <dt>単価</dt>
                        <dd class="fsr-num">単価が入っている行の平均（量で重みづけ）{{ fmt(o.price.base) }}円/kg</dd>
                      </div>
                    </dl>
                  </details>
                </section>

                <!-- AIの説明（計算済みの数字だけを渡す） -->
                <section v-if="okOutlooks.length" class="fsr-card overflow-hidden">
                  <div class="fsr-card-head">
                    <h2 class="fsr-h2 m-0">AIの説明</h2>
                    <button type="button" class="fsr-btn-sub !min-h-[36px]" :disabled="explaining" @click="runExplain">
                      {{ explaining ? '書いています…' : explanation ? '書き直す' : '説明してもらう' }}
                    </button>
                  </div>
                  <div class="fsr-card-body">
                    <p v-if="explainError" class="fsr-notice fsr-notice--error m-0">{{ explainError }}</p>
                    <p v-else-if="explainRejected" class="fsr-notice fsr-notice--warn m-0">
                      AIの文章に、計算していない数字（{{ explainRejected.join('、') }}）が入っていたので表示しません。もう一度「書き直す」を押してください。
                    </p>
                    <div v-else-if="explanation" class="fsr-explain">
                      <p v-for="(para, i) in explanation.split(/\n+/)" :key="i">{{ para }}</p>
                    </div>
                    <p v-else class="fsr-note m-0">
                      上の見通しを、AIが言葉で説明します。AIには計算済みの数字だけを渡し、渡していない数字が文章に出たら表示しません。
                    </p>
                  </div>
                </section>
              </div>
              <!-- 条件を変えて試す -->
              <section id="fsr-cond" class="fsr-card fsr-cond overflow-hidden">
                <div class="fsr-card-head">
                  <h2 class="fsr-h2 m-0">条件を変えて試す</h2>
                  <button v-if="scenario.tempShift || scenario.priceChange" type="button" class="fsr-btn-text !px-0" @click="resetScenario">元に戻す</button>
                </div>
                <div class="fsr-card-body space-y-5">
                  <div>
                    <div class="flex items-baseline justify-between">
                      <label class="text-[14px] font-bold" for="fsr-temp">気温のずれ</label>
                      <span class="fsr-num text-[18px] font-bold" :style="{ color: scenario.tempShift > 0 ? 'var(--fsr-cta-strong)' : scenario.tempShift < 0 ? 'var(--fsr-accent)' : undefined }">
                        {{ signed(scenario.tempShift, 1) }}℃
                      </span>
                    </div>
                    <input id="fsr-temp" v-model.number="scenario.tempShift" type="range" min="-3" max="3" step="0.5" class="fsr-range" />
                    <div class="flex justify-between fsr-note"><span>寒い −3℃</span><span>暑い +3℃</span></div>
                    <p class="fsr-note mt-1 mb-0">これから先の日（予報と平年値）の気温に足します。観測済みの日は変えません。</p>
                  </div>
                  <div>
                    <div class="flex items-baseline justify-between">
                      <label class="text-[14px] font-bold" for="fsr-price">単価の変化</label>
                      <span class="fsr-num text-[18px] font-bold">{{ signed(scenario.priceChange, 0) }}%</span>
                    </div>
                    <input id="fsr-price" v-model.number="scenario.priceChange" type="range" min="-30" max="30" step="5" class="fsr-range" />
                    <div class="flex justify-between fsr-note"><span>−30%</span><span>+30%</span></div>
                    <p class="fsr-note mt-1 mb-0">過去の平均単価に掛けます。金額の見通しだけが動きます。</p>
                  </div>
                </div>
                <details class="border-t border-[var(--fsr-line)]">
                  <summary class="fsr-details-summary">記録が足りるかの基準</summary>
                  <div class="px-4 pb-4 flex flex-wrap gap-3 text-[13.5px]">
                    <label class="flex items-center gap-1.5">
                      <input v-model.number="settings.minSeasons" type="number" min="1" max="10" inputmode="numeric" class="fsr-input fsr-num text-right !w-[64px] !py-1" />季節以上
                    </label>
                    <label class="flex items-center gap-1.5">
                      <input v-model.number="settings.minRows" type="number" min="1" max="1000" inputmode="numeric" class="fsr-input fsr-num text-right !w-[72px] !py-1" />行以上
                    </label>
                    <p class="fsr-note m-0 w-full">これに満たない品目は、見通しを出さずに「記録がたりません」と出します。</p>
                  </div>
                </details>
              </section>

            </div>
          </template>
        </template>
      </main>

      <footer class="fsr-foot">
        <button v-if="isLoggedIn" type="button" class="fsr-btn-text" @click="showPasswordModal = true">パスワードを変える</button>
        <button v-if="isLoggedIn" type="button" class="fsr-btn-text" @click="doLogout">ログアウト</button>
      </footer>
    </div>

    <AuthModal v-if="showAuthModal" accent="sky" />
    <PasswordModal v-model:show="showPasswordModal" accent="sky" />
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref, shallowRef, watch } from 'vue'
import { useAuth } from '~/composables/useAuth'
import AuthModal from '~/components/AuthModal.vue'
import PasswordModal from '~/components/PasswordModal.vue'
import FsrSeasonChart from '~/components/farm-simulator/FsrSeasonChart.vue'
import {
  DEFAULT_SETTINGS,
  KIND_LABELS,
  buildOutlook,
  buildWeatherIndex,
  formatMonthDay,
  outlookFacts,
  parseRecordsCsv,
  profileOf,
  seasonOf,
  seasonStartDate,
} from '~/utils/farm-simulator'
import type { CsvResult, Outlook, RecordKind, WeatherDay } from '~/utils/farm-simulator'
import { buildDemoCsv } from '~/utils/farm-simulator-demo'

definePageMeta({ layout: 'farm-simulator' })
useHead({ title: '収穫・出荷の見通し | farm-simulator' })

const { isLoggedIn, checked, checkAuth, logout } = useAuth()
const showAuthModal = computed(() => checked.value && !isLoggedIn.value)
const showPasswordModal = ref(false)

const tab = ref<'outlook' | 'data'>('outlook')

// ── 記録 ──
const parsed = shallowRef<CsvResult | null>(null)
const isDemo = ref(false)
const sourceName = ref('')
const pasteOpen = ref(false)
const pasteText = ref('')
const fileError = ref('')

function loadText(text: string, name: string, demo: boolean) {
  const r = parseRecordsCsv(text)
  parsed.value = r
  isDemo.value = demo
  sourceName.value = name
  fileError.value = r.records.length ? '' : '使える行がありませんでした。見出しと列の並びを確かめてください。'
  selectedItems.value = r.summary.items.slice(0, 4)
  targetSeason.value = seasonOptions.value[0] ?? new Date().getFullYear()
  explanation.value = ''
  pasteOpen.value = false
  if (r.records.length) void loadWeather()
}

function loadDemo() {
  loadText(buildDemoCsv(), 'デモ（ダミーの記録）', true)
  tab.value = 'outlook'
}

async function onPickFile(e: Event) {
  const input = e.target as HTMLInputElement
  const file = input.files?.[0]
  input.value = ''
  if (!file) return
  if (file.size > 5 * 1024 * 1024) {
    fileError.value = 'ファイルが大きすぎます（5MBまで）'
    return
  }
  const buf = await file.arrayBuffer()
  // Excel で保存したCSVは Shift_JIS のことが多い。UTF-8 で読めなければ Shift_JIS で読み直す
  let text = new TextDecoder('utf-8').decode(buf)
  if (text.includes('�')) text = new TextDecoder('shift_jis').decode(buf)
  loadText(text, file.name, false)
}

function downloadSample() {
  const blob = new Blob(['﻿' + buildDemoCsv()], { type: 'text/csv' })
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = 'farm-simulator-dummy.csv'
  a.click()
  URL.revokeObjectURL(a.href)
}

const items = computed(() => parsed.value?.summary.items ?? [])
const itemCounts = computed(() =>
  items.value.map((item) => ({ item, count: parsed.value!.records.filter((r) => r.item === item).length }))
)
const missingList = computed(() => {
  const m = parsed.value?.summary.missing
  if (!m) return []
  const out: string[] = []
  if (m.price) out.push(`単価 ${m.price}行`)
  if (m.dest) out.push(`出荷先 ${m.dest}行`)
  if (m.memo) out.push(`メモ ${m.memo}行`)
  return out
})

// ── 品目・種別・季節・条件 ──
const selectedItems = ref<string[]>([])
const kind = ref<RecordKind>('harvest')
const targetSeason = ref(new Date().getFullYear())
const scenario = reactive({ tempShift: 0, priceChange: 0 })
const settings = reactive({ ...DEFAULT_SETTINGS })
const evidenceOpen = ref(false)

function toggleItem(it: string) {
  selectedItems.value = selectedItems.value.includes(it)
    ? selectedItems.value.filter((x) => x !== it)
    : items.value.filter((x) => x === it || selectedItems.value.includes(x))
}
function resetScenario() {
  scenario.tempShift = 0
  scenario.priceChange = 0
}

/** 記録のいちばん新しい季節の次と、その次 */
const seasonOptions = computed(() => {
  const recs = parsed.value?.records ?? []
  if (!recs.length) return []
  const latest = Math.max(...recs.map((r) => seasonOf(r.date, profileOf(r.item).seasonStartMonth)))
  return [latest + 1, latest + 2]
})

// ── 天気 ──
const weatherDays = shallowRef<WeatherDay[]>([])
const forecastDays = shallowRef<WeatherDay[]>([])
const weatherState = reactive({
  loading: false,
  done: 0,
  total: 0,
  failed: [] as string[],
  error: '',
  forecastError: '',
  forecastAt: '',
})

function jstToday(): string {
  return new Date(Date.now() + 9 * 3600 * 1000).toISOString().slice(0, 10)
}

/** 記録の最初の季節の始まり〜今月の天気を、取り終えるまで呼び直して集める */
async function loadWeather() {
  const recs = parsed.value?.records ?? []
  if (!recs.length || !isLoggedIn.value) return
  const from = recs
    .map((r) => {
      const sm = profileOf(r.item).seasonStartMonth
      return seasonStartDate(seasonOf(r.date, sm), sm)
    })
    .sort()[0]!.slice(0, 7)
  const to = jstToday().slice(0, 7)
  weatherState.loading = true
  weatherState.failed = []
  weatherState.error = ''
  weatherState.forecastError = ''
  try {
    for (let round = 0; round < 20; round++) {
      const res = await $fetch<any>('/api/farm-simulator/weather', { query: { from, to, forecast: round === 0 ? '1' : '0' } })
      weatherDays.value = res.days
      if (round === 0) {
        forecastDays.value = res.forecast?.days ?? []
        weatherState.forecastAt = res.forecast?.fetchedAt ?? ''
        weatherState.forecastError = res.forecastError ?? ''
      }
      weatherState.total = res.totalMonths
      weatherState.done = res.totalMonths - res.remaining - res.failed.length
      weatherState.failed = res.failed
      if (!res.remaining || (!res.fetched && res.failed.length)) break
    }
  } catch (e: any) {
    weatherState.error = e?.data?.message || e?.message || '天気を取り込めませんでした'
  } finally {
    weatherState.loading = false
  }
}

const weatherIndex = computed(() => buildWeatherIndex(weatherDays.value, forecastDays.value))
const weatherRange = computed(() => {
  const w = weatherIndex.value
  return w.firstObs && w.lastObs ? `${fmtDate(w.firstObs)}〜${fmtDate(w.lastObs)}` : 'なし'
})
const weatherLabel = computed(() => {
  if (weatherState.loading) return `取り込み中…（${weatherState.done}/${weatherState.total}か月）`
  if (!weatherDays.value.length) return parsed.value ? '取り込めていません' : '記録を読み込むと、必要な期間を自動で取り込みます'
  const f = forecastDays.value.length ? `、予報 ${forecastDays.value.length}日（和歌山）` : ''
  return `観測 かつらぎ ${weatherRange.value}${f}`
})
const weatherNotice = computed<{ text: string; error: boolean } | null>(() => {
  if (weatherState.loading) return { text: `気象庁の天気を取り込んでいます（${weatherState.done}/${weatherState.total}か月）。取り込み終わるまでは、時期の補正が途中の値です。`, error: false }
  if (weatherState.error) return { text: `天気を取り込めませんでした（${weatherState.error}）。天気なしで計算しています。`, error: true }
  const parts: string[] = []
  if (weatherState.failed.length) parts.push(`${weatherState.failed.join('・')}の天気を取れませんでした`)
  if (weatherState.forecastError) parts.push('予報を取れませんでした')
  if (parts.length) return { text: `${parts.join('。')}。取れた分だけで計算しています（足りない日は平年値で埋めます）。`, error: true }
  return null
})

// ── 見通し（画面の中で即時に計算） ──
const outlooks = computed<Outlook[]>(() => {
  const recs = parsed.value?.records ?? []
  return selectedItems.value.map((item) =>
    buildOutlook({
      records: recs,
      item,
      kind: kind.value,
      targetSeason: targetSeason.value,
      weather: weatherIndex.value,
      scenario: { tempShift: scenario.tempShift, priceChange: scenario.priceChange },
      settings: { minSeasons: Math.max(1, settings.minSeasons || 1), minRows: Math.max(1, settings.minRows || 1) },
    })
  )
})
const okOutlooks = computed(() => outlooks.value.filter((o) => o.status === 'ok'))

function shiftText(o: Outlook): string {
  const d = o.weather.shiftDays
  if (!o.weather.used) return '時期は平均の年どおり（天気なし）'
  if (!d) return '時期は平均の年とほぼ同じ'
  return `平均の年より${Math.abs(d)}日${d < 0 ? '早い' : '遅い'}見込み`
}

// ── AIの説明 ──
const explaining = ref(false)
const explanation = ref('')
const explainError = ref('')
const explainRejected = ref<string[] | null>(null)

// 条件や品目を変えたら、前の説明は今の数字と合わなくなるので消す
watch([outlooks], () => {
  explanation.value = ''
  explainRejected.value = null
  explainError.value = ''
})

async function runExplain() {
  explaining.value = true
  explainError.value = ''
  explainRejected.value = null
  try {
    const facts = outlooks.value.map((o) =>
      o.status === 'ok'
        ? outlookFacts(o, { ...scenario })
        : { 品目: o.item, 種別: KIND_LABELS[o.kind], 状態: o.reason }
    )
    const res = await $fetch<{ text: string | null; rejected: boolean; unknown: string[] }>('/api/farm-simulator/explain', {
      method: 'POST',
      body: { facts },
    })
    if (res.rejected || !res.text) explainRejected.value = res.unknown
    else explanation.value = res.text
  } catch (e: any) {
    explainError.value = e?.data?.message || 'AIの説明を受け取れませんでした。もう一度お試しください。'
  } finally {
    explaining.value = false
  }
}

// ── 表示の小道具 ──
function fmt(n: number): string {
  return Math.round(n).toLocaleString('ja-JP')
}
function man(yen: number): string {
  return yen >= 10_000 ? `${(Math.round(yen / 1000) / 10).toLocaleString('ja-JP')}万円` : `${fmt(yen)}円`
}
function md(date: string): string {
  return formatMonthDay(date)
}
function fmtDate(date: string): string {
  const [y, m, d] = date.split('-').map(Number)
  return `${y}/${m}/${d}`
}
function signed(n: number, digits: number): string {
  const s = Math.abs(n).toFixed(digits)
  return n > 0 ? `+${s}` : n < 0 ? `−${s}` : s
}

async function doLogout() {
  await logout()
  parsed.value = null
}

onMounted(async () => {
  await checkAuth()
})

// ログインした直後に、読み込み済みの記録があれば天気を取り直す
watch(isLoggedIn, (v) => {
  if (v && parsed.value?.records.length && !weatherDays.value.length) void loadWeather()
})
</script>

<style scoped>
/* 外枠は farm-simulation（＝キキガキ本番版の layouts/default.vue）と同じ作り */
.fsr-shell { min-height: 100dvh; display: flex; flex-direction: column; }
.fsr-shell-main { flex: 1; min-width: 0; display: flex; flex-direction: column; }

.fsr-logo { display: inline-flex; align-items: center; gap: 0.45rem; font-size: 17px; font-weight: 700; color: var(--fsr-accent); letter-spacing: 0.04em; white-space: nowrap; }
.fsr-logo-mark { width: 26px; height: 26px; border-radius: 7px; background: var(--fsr-accent); display: inline-flex; align-items: center; justify-content: center; flex: none; }
.fsr-logo-mark svg { width: 17px; height: 17px; fill: none; stroke: #fff; stroke-width: 2; stroke-linecap: round; stroke-linejoin: round; }

.fsr-side { display: none; }
.fsr-mobile-head { padding: 0.6rem 0.9rem; display: flex; align-items: center; background: var(--fsr-panel); border-bottom: 1px solid var(--fsr-line); }
.fsr-mobile-tabs { display: flex; align-items: center; gap: 0.35rem; padding: 0.5rem 0.9rem; background: var(--fsr-panel); border-bottom: 1px solid var(--fsr-line); position: sticky; top: 0; z-index: 10; }
.fsr-foot { display: flex; justify-content: center; gap: 0.5rem; border-top: 1px solid var(--fsr-line); padding: 0.6rem 1rem; }

@media (min-width: 1024px) {
  .fsr-shell { flex-direction: row; }
  .fsr-side { width: 248px; flex: none; display: flex; flex-direction: column; gap: 0.9rem; padding: 0.9rem 0.7rem 0.8rem; background: var(--fsr-panel); border-right: 1px solid var(--fsr-line); position: sticky; top: 0; align-self: flex-start; height: 100dvh; overflow-y: auto; }
  .fsr-side .fsr-logo { padding: 0 0.5rem; }
  .fsr-mobile-head, .fsr-mobile-tabs, .fsr-foot { display: none; }
}

.fsr-side-nav { display: flex; flex-direction: column; gap: 2px; }
.fsr-side-link { display: flex; align-items: center; gap: 0.55rem; width: 100%; padding: 0.45rem 0.6rem; border: 0; border-radius: 8px; background: transparent; font-family: inherit; font-size: 13.5px; color: var(--fsr-ink); text-align: left; cursor: pointer; }
.fsr-side-link svg { width: 17px; height: 17px; fill: none; stroke: currentColor; stroke-width: 1.8; stroke-linecap: round; stroke-linejoin: round; }
.fsr-side-link:hover { background: var(--fsr-bg); }
.fsr-side-link.is-active { background: var(--fsr-accent-soft); color: var(--fsr-accent-strong); font-weight: 700; }
.fsr-side-weather { padding: 0.75rem 0.5rem 0; border-top: 1px solid var(--fsr-line); }
.fsr-side-foot { margin-top: auto; display: flex; flex-direction: column; align-items: flex-start; gap: 0.15rem; padding: 0 0.6rem; }
.fsr-side-foot button { font-size: 11.5px; color: var(--fsr-ink-faint); background: none; border: 0; padding: 0; cursor: pointer; }
.fsr-side-foot button:hover { color: var(--fsr-ink-soft); text-decoration: underline; }

.fsr-badge { display: inline-flex; align-items: center; justify-content: center; min-width: 18px; height: 18px; padding: 0 5px; border-radius: 999px; background: var(--fsr-cta); color: #fff; font-size: 11px; font-weight: 700; margin-left: auto; }
.fsr-chip .fsr-badge { margin-left: 0.25rem; }
.fsr-chip--lg { height: 34px; padding: 0 0.95rem; font-size: 14px; }

/* 始める操作（キキガキのホームの kk-action と同じ） */
.fsr-actions { display: grid; grid-template-columns: repeat(auto-fill, minmax(250px, 1fr)); gap: 0.6rem; }
.fsr-action { display: flex; align-items: center; gap: 0.7rem; padding: 0.75rem 0.9rem; border: 1px solid var(--fsr-line); border-radius: 10px; background: var(--fsr-panel); box-shadow: var(--fsr-shadow); font-family: inherit; text-align: left; color: var(--fsr-ink); cursor: pointer; transition: border-color 0.15s, box-shadow 0.15s; }
.fsr-action:hover { border-color: var(--fsr-accent); box-shadow: 0 4px 16px rgba(29, 111, 214, 0.14); }
.fsr-action-icon { width: 34px; height: 34px; flex: none; border-radius: 9px; background: var(--fsr-cta); display: inline-flex; align-items: center; justify-content: center; }
.fsr-action-icon.is-sub { background: var(--fsr-accent); }
.fsr-action-icon svg { width: 18px; height: 18px; fill: none; stroke: #fff; stroke-width: 2.2; stroke-linecap: round; stroke-linejoin: round; }
.fsr-action-title { display: block; font-size: 14.5px; font-weight: 700; line-height: 1.4; }
.fsr-action-desc { display: block; font-size: 12px; color: var(--fsr-ink-faint); line-height: 1.5; }

.fsr-card-foot { display: flex; flex-wrap: wrap; align-items: center; gap: 0.75rem; padding: 0.75rem 1rem; border-top: 1px solid var(--fsr-line); background: #f8fafd; }
.fsr-tag { display: inline-flex; align-items: center; height: 22px; padding: 0 0.55rem; border-radius: 999px; font-size: 12px; font-weight: 700; }
.fsr-tag--warn { background: var(--fsr-warn-soft); color: var(--fsr-warn); border: 1px solid #f5d6ad; }
.fsr-tag--info { background: var(--fsr-accent-soft); color: var(--fsr-accent-strong); }
.fsr-tag--plain { background: var(--fsr-bg); color: var(--fsr-ink-soft); }
.fsr-details-summary { padding: 0.6rem 1rem; font-size: 13.5px; font-weight: 700; color: var(--fsr-ink-soft); cursor: pointer; user-select: none; }
.fsr-details-summary:hover { color: var(--fsr-accent-strong); }
.fsr-pre { margin: 0; padding: 0.6rem 0.75rem; border-radius: 8px; background: var(--fsr-bg); font-size: 12.5px; line-height: 1.6; overflow-x: auto; }

/* 項目名：中身 の並び。スマホは縦、PCは横 */
.fsr-facts { margin: 0; display: grid; gap: 0.55rem; }
.fsr-facts > div { display: grid; gap: 0.1rem; }
.fsr-facts dt { font-size: 12px; font-weight: 700; color: var(--fsr-ink-faint); }
.fsr-facts dd { margin: 0; font-size: 14px; line-height: 1.7; }
@media (min-width: 640px) {
  .fsr-facts > div { grid-template-columns: 8.5em 1fr; gap: 0.75rem; }
  .fsr-facts dd { font-size: 13.5px; }
}

/* 品目と種別の切り替え */
.fsr-filter { display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 0.6rem; }
.fsr-seg { display: inline-flex; padding: 3px; border: 1px solid var(--fsr-line-strong); border-radius: 999px; background: var(--fsr-panel); }
.fsr-seg button { min-height: 34px; padding: 0 1.1rem; border: 0; border-radius: 999px; background: transparent; font-family: inherit; font-size: 14px; font-weight: 700; color: var(--fsr-ink-soft); cursor: pointer; }
.fsr-seg button.is-on { background: var(--fsr-accent); color: #fff; }

/* スマホ: 見通し → 条件の順。PC: 見通しが左、条件は右に固定 */
.fsr-grid { display: grid; gap: 0.75rem; }
@media (min-width: 1024px) {
  .fsr-grid { grid-template-columns: minmax(0, 1fr) 300px; align-items: start; }
  .fsr-cond { grid-column: 2; grid-row: 1; position: sticky; top: 1rem; }
  .fsr-results { grid-column: 1; grid-row: 1; }
}

/* いちばん大きな数字 */
.fsr-head-nums { display: grid; gap: 0.75rem; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); }
.fsr-big { font-size: 24px; font-weight: 700; line-height: 1.3; letter-spacing: 0.01em; color: var(--fsr-ink); }
.fsr-big-sep { font-size: 16px; font-weight: 500; color: var(--fsr-ink-soft); margin: 0 0.1em; }
.fsr-big-unit { font-size: 15px; font-weight: 500; color: var(--fsr-ink-soft); margin-left: 0.15em; }
@media (min-width: 1024px) {
  .fsr-big { font-size: 22px; }
}

.fsr-jump { display: block; text-align: right; font-size: 13.5px; font-weight: 700; color: var(--fsr-accent-strong); }
@media (min-width: 1024px) { .fsr-jump { display: none; } }
.fsr-range { width: 100%; height: 32px; accent-color: var(--fsr-accent); }
.fsr-explain p { margin: 0 0 0.6rem; line-height: 1.85; }
.fsr-explain p:last-child { margin-bottom: 0; }
</style>
