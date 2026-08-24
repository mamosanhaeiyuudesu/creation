<template>
  <div class="max-w-[900px] mx-auto px-4 sm:px-6 pt-6 pb-24">
    <Breadcrumb class="mb-2" :items="[{ label: '管理トップ', to: '/guesthouse' }, { label: '顧客分析' }]" />

    <div class="flex items-start justify-between gap-3 mb-2">
      <h1 class="gh-display text-[22px] font-bold flex items-center gap-2">
        顧客分析
        <HelpTip label="このページの説明">
          <ul class="space-y-1.5">
            <li class="flex gap-1.5"><span class="shrink-0">・</span><span>お客さん日記と聞き取りメモを、AIが<b>決まった分類</b>に整理して集計しています。</span></li>
            <li class="flex gap-1.5"><span class="shrink-0">・</span><span>新しく書いた日記・編集した日記があるときだけ「更新」で読み直します（前に読んだ分は読み直さないので、待たされません）。</span></li>
            <li class="flex gap-1.5"><span class="shrink-0">・</span><span>満足度に点数は付けません。<b>お客様が実際に書かれた言葉</b>と、それが何件あったかだけを出します。</span></li>
            <li class="flex gap-1.5"><span class="shrink-0">・</span><span>上の切り替えで、<b>全部まとめて</b>見るか、<b>宿ごとに分けて</b>見るかを選べます。</span></li>
          </ul>
        </HelpTip>
      </h1>
      <button class="gh-btn-ghost !h-9 !px-3.5 text-[12.5px] shrink-0" :disabled="busy || loading" @click="refresh">
        {{ busy ? '分析中…' : '更新' }}
      </button>
    </div>

    <div v-if="notAdmin" class="rounded-2xl border border-[var(--gh-line)] bg-[var(--gh-card)] px-4 py-10 text-center">
      <p class="text-[15px] font-bold mb-1">管理者専用のページです</p>
    </div>

    <template v-else>
      <p class="text-[12.5px] text-[var(--gh-ink-soft)] mb-1">
        分析済み {{ data?.basedOn ?? 0 }} 組 ／ 日記 {{ data?.diaryCount ?? 0 }} 件
        <span v-if="data?.computedAt"> ・ 最終更新 {{ formatDate(data.computedAt) }}</span>
      </p>
      <p v-if="data?.stale" class="text-[12.5px] text-[var(--gh-warn)] mb-3">
        <template v-if="busy">読み込んでいます… 残り {{ remaining }} 件（この画面を開いたままお待ちください）</template>
        <template v-else>まだ読み込んでいない日記が {{ remaining }} 件あります。「更新」で分析できます。</template>
      </p>
      <div v-else class="mb-3" />

      <p v-if="error" class="text-[12.5px] text-[var(--gh-warn)] mb-4">{{ error }}</p>

      <div v-if="loading" class="space-y-3">
        <div v-for="i in 3" :key="i" class="h-32 rounded-2xl bg-[var(--gh-paper-2)]/70 animate-pulse" />
      </div>

      <p v-else-if="!allProfiles.length" class="rounded-2xl border border-[var(--gh-line)] bg-[var(--gh-card)] text-center text-[var(--gh-ink-soft)] py-12 text-[13.5px]">
        まだ分析結果がありません。<br class="sm:hidden" />お客さん日記を書いたうえで「更新」を押してください。
      </p>

      <div v-else class="space-y-8">
        <!-- 施設の切り替え：混在（全部まとめて）／宿ごとに絞り込み。以下すべての集計に効く -->
        <section class="rounded-2xl border border-[var(--gh-line)] bg-[var(--gh-card)] px-4 py-3.5">
          <p class="text-[12.5px] font-bold mb-2 flex items-center gap-2">
            どの宿で見るか
            <HelpTip label="宿の切り替えについて">
              1組のお客様の日記には、<b>この宿の話</b>と、お客様がご自身で手配された<b>宿坊の話</b>が混ざります。宿坊の分は「満足と体験」「不便・不満」のタブで分けています。<br />
              阪中さんが登録されている<b>宿が2つ以上ある</b>ときは、ここで宿を選ぶと、その宿に泊まられたお客様だけで数え直します（満足度・関心・体験・旅程、すべてが切り替わります）。<b>すべての宿</b>を選ぶと、全部まとめた通しの数字になります。
            </HelpTip>
          </p>
          <div class="flex flex-wrap gap-1.5">
            <button type="button" class="gh-chip" :class="{ 'gh-chip--on': !houseFilter }" @click="selectHouse('')">
              すべての宿（まとめて） <b class="ml-0.5">{{ allProfiles.length }}</b>
            </button>
            <button
              v-for="h in houseTabs"
              :key="h.id"
              type="button"
              class="gh-chip"
              :class="{ 'gh-chip--on': houseFilter === h.id }"
              @click="selectHouse(h.id)"
            >
              {{ h.name }} <b class="ml-0.5">{{ h.count }}</b>
            </button>
          </div>
          <p v-if="houseFilter" class="text-[11.5px] text-[var(--gh-ink-soft)] mt-2">
            「{{ currentHouseName }}」に泊まられた {{ profiles.length }} 組だけで数えています。
          </p>
          <!-- 宿が1つしか登録されていないと分けようがないので、分け方そのものを案内する -->
          <p v-else-if="houseTabs.length < 2" class="text-[11.5px] text-[var(--gh-ink-soft)] mt-2">
            いまは宿が1つだけです。別の宿のぶんを分けて見るには、
            <NuxtLink to="/guesthouse/houses" class="text-[var(--gh-forest-deep)] underline underline-offset-2">宿の登録</NuxtLink>
            でその宿を足し、そちらの会話・日記として記録してください。
          </p>
        </section>

        <p v-if="!profiles.length" class="rounded-2xl border border-[var(--gh-line)] bg-[var(--gh-card)] text-center text-[var(--gh-ink-soft)] py-12 text-[13.5px]">
          この宿のお客様は、まだ分析結果がありません。
        </p>

        <template v-else>
          <!-- 旅程：日本旅行全体の中での高野山エリア -->
          <section>
            <h2 class="gh-display text-[16px] font-bold mb-1 flex items-center gap-2">
              旅程のなかの宿
              <HelpTip label="旅程のなかの宿とは">
                日記の旅程から「この宿の前にいた場所（From）」「次に向かう場所（To）」を読み取って、つないだ図です。日本の旅のどのあたりに高野山エリアが置かれているかが見えます。帯にカーソルを合わせると組数が出ます。<br />
                前後がはっきり書かれていない日記でも、旅程の並び（経由地）が読み取れていれば、その<b>隣の地点</b>を From / To として使っています。
              </HelpTip>
            </h2>
            <p class="text-[12px] text-[var(--gh-ink-soft)] mb-3">左が前の滞在地（From）、中央が宿、右が次の行き先（To）。帯の太さが組数です。</p>
            <div class="rounded-2xl border border-[var(--gh-line)] bg-[var(--gh-card)] p-2 sm:p-3 overflow-x-auto">
              <JourneySankey :profiles="profiles" />
            </div>
          </section>

          <!-- 旅程の順番：旅全体のうち何番目にこの宿へ来たか -->
          <section>
            <h2 class="gh-display text-[16px] font-bold mb-1 flex items-center gap-2">
              旅程のなかの位置
              <HelpTip label="旅程のなかの位置とは">
                日記の旅程に書かれた経由地を通った順に数えて、<b>旅全体のうち何番目にこの宿へ来たか</b>を出しています（例：全10地点中8番目＝旅の後半）。前半・中盤・後半のざっくりした3つに丸めているので、「東京から入る人」「高山から回ってくる人」のように経路が違っても、<b>旅のどのあたりで来られるか</b>の傾向として読めます。
              </HelpTip>
            </h2>
            <p class="text-[12px] text-[var(--gh-ink-soft)] mb-3">後半が多ければ「旅の締めくくりに選ばれている」、前半が多ければ「旅の入り口になっている」ということです。</p>
            <RoutePosition :profiles="profiles" />
          </section>

          <!-- 満足と体験（1つの軸にまとめたもの）-->
          <section>
            <h2 class="gh-display text-[16px] font-bold mb-1 flex items-center gap-2">
              満足と体験
              <HelpTip label="満足と体験の見方">
                日記のなかで、どの側面が良い方向・気になる方向で語られたかを数えたものです。<b>点数は付けていません</b>——自由に書かれた文章から点数を作ると、根拠のない精度が出てしまうためです。行を開くと、その根拠になったお客様の言葉がそのまま出ます。<br />
                「宿が提供した体験」は<b>満足と同じことを別の名前で数えていた</b>ので、この軸にまとめました（体験は側面のひとつとして数えます）。<br />
                お客様は高野山の宿坊など<b>ご自身で手配された宿</b>にも泊まっておられます。その感想を混ぜると宿そのものの評価が読めなくなるので、<b>この宿／宿坊・ほかの宿／エリア</b>を分けて数えています（既定は「この宿」）。どちらの話か本文から判断できなかった感想は「エリア・その他」に入ります。
              </HelpTip>
            </h2>
            <p class="text-[12px] text-[var(--gh-ink-soft)] mb-3">行をタップすると、根拠になった日記の言葉が読めます。</p>
            <div class="flex flex-wrap gap-1.5 mb-3">
              <button
                v-for="t in subjectTabs"
                :key="t.key"
                type="button"
                class="gh-chip"
                :class="{ 'gh-chip--on': aspectSubject === t.key }"
                @click="selectSubject(t.key)"
              >
                {{ t.label }} <b class="ml-0.5">{{ t.count }}</b>
              </button>
            </div>
            <p v-if="!aspectStats.length" class="rounded-2xl border border-[var(--gh-line)] bg-[var(--gh-card)] text-center text-[var(--gh-ink-soft)] py-8 text-[13px]">
              {{ ASPECT_SUBJECT_LABEL[aspectSubject] }}についての感想は、まだ読み取れていません。
            </p>
            <ul v-else class="space-y-2">
              <li v-for="a in aspectStats" :key="a.aspect" class="rounded-2xl border border-[var(--gh-line)] bg-[var(--gh-card)] overflow-hidden">
                <button type="button" class="w-full text-left px-4 py-3 flex items-center gap-3" @click="toggleAspect(a.aspect)">
                  <span class="font-bold text-[14px] w-[7.5rem] shrink-0">{{ a.aspect }}</span>
                  <span class="flex-1 flex h-2.5 rounded-full overflow-hidden bg-[var(--gh-paper-2)]">
                    <span class="bg-[var(--gh-forest)]" :style="{ width: (a.positive / maxAspect) * 100 + '%' }" />
                    <span class="bg-[var(--gh-warn)]" :style="{ width: (a.negative / maxAspect) * 100 + '%' }" />
                  </span>
                  <span class="text-[12px] text-[var(--gh-ink-soft)] shrink-0 tabular-nums">
                    <b class="text-[var(--gh-forest-deep)]">{{ a.positive }}</b><template v-if="a.negative"> / <b class="text-[var(--gh-warn)]">{{ a.negative }}</b></template>
                  </span>
                  <span class="text-[11px] text-[var(--gh-ink-faint)] shrink-0">{{ openAspect === a.aspect ? '▲' : '▼' }}</span>
                </button>
                <ul v-if="openAspect === a.aspect" class="border-t border-[var(--gh-line)] px-4 py-3 space-y-2">
                  <li v-for="(m, i) in a.mentions" :key="i" class="text-[12.5px] leading-relaxed">
                    <span class="gh-chip !py-0.5 !px-2 !text-[10.5px] mr-1.5" :class="m.sentiment === 'negative' ? '!text-[var(--gh-warn)]' : '!text-[var(--gh-forest-deep)]'">
                      {{ m.sentiment === 'negative' ? '気になる' : '良い' }}
                    </span>
                    <NuxtLink :to="`/guesthouse/session/${m.sessionId}`" class="text-[var(--gh-forest-deep)] underline underline-offset-2">{{ m.guestName || '名前未設定' }}</NuxtLink>
                    <span class="text-[var(--gh-ink-soft)]">：「{{ m.quote }}」</span>
                  </li>
                </ul>
              </li>
            </ul>

            <!-- 体験の内わけ：宿の中でのことと、ツアーで外へ出て得たことを分ける -->
            <h3 class="text-[13px] font-bold mt-5 mb-1 flex items-center gap-2">
              体験の内わけ
              <HelpTip label="体験の内わけについて">
                お客様が実際に参加された体験を、<b>宿にいるあいだのこと</b>と<b>ツアーで外へ出て得たこと</b>に分けています。<br />
                果物の味や川遊びのようなツアーの体験が宿の感想に混ざると、<b>宿単体としてどうだったか</b>が読めなくなるため、読み取りの時点で分けています。
              </HelpTip>
            </h3>
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-2">
              <div>
                <p class="text-[12px] text-[var(--gh-ink-soft)] mb-1.5">宿での体験</p>
                <div v-if="innExpStats.length" class="flex flex-wrap gap-1.5">
                  <span v-for="e in innExpStats" :key="e.name" class="gh-chip">
                    {{ e.name }} <b class="text-[var(--gh-forest-deep)] ml-0.5">{{ e.count }}</b>
                  </span>
                </div>
                <p v-else class="text-[12.5px] text-[var(--gh-ink-faint)]">まだ読み取れていません。</p>
              </div>
              <div>
                <p class="text-[12px] text-[var(--gh-ink-soft)] mb-1.5">ツアーでの体験</p>
                <div v-if="tourExpStats.length" class="flex flex-wrap gap-1.5">
                  <span v-for="e in tourExpStats" :key="e.name" class="gh-chip !text-[var(--gh-persimmon)] !border-[color-mix(in_srgb,var(--gh-persimmon)_45%,transparent)]">
                    {{ e.name }} <b class="ml-0.5">{{ e.count }}</b>
                  </span>
                </div>
                <p v-else class="text-[12.5px] text-[var(--gh-ink-faint)]">まだ読み取れていません。</p>
              </div>
            </div>
          </section>

          <!-- 不便・不満（独立した軸として明示的に出す）-->
          <section>
            <h2 class="gh-display text-[16px] font-bold mb-1 flex items-center gap-2">
              不便・不満
              <HelpTip label="不便・不満の見方">
                日記のなかで<b>気になる方向で語られたこと</b>だけを集めた一覧です。良かったことは日記に多く書かれますが、宿を良くする材料になるのはこちらなので、独立して出しています。<br />
                「この宿」「宿坊・ほかの宿」「エリア」の印が付いているので、<b>阪中さんが手を打てるものかどうか</b>が分かります。<br />
                言葉は日記の原文そのままです（言い換えていません）。
              </HelpTip>
            </h2>
            <p class="text-[12px] text-[var(--gh-ink-soft)] mb-3">名前をタップすると、その会話・日記に戻れます。</p>
            <p v-if="!issueGroups.length" class="rounded-2xl border border-[var(--gh-line)] bg-[var(--gh-card)] text-center text-[var(--gh-ink-soft)] py-8 text-[13px]">
              気になる方向で語られたことは、まだ読み取れていません。
            </p>
            <ul v-else class="space-y-2">
              <li v-for="g in issueGroups" :key="g.aspect" class="rounded-2xl border border-[var(--gh-line)] bg-[var(--gh-card)] px-4 py-3">
                <p class="text-[13px] font-bold mb-1.5">
                  {{ g.aspect }}
                  <span class="text-[11.5px] font-normal text-[var(--gh-ink-soft)] ml-1">{{ g.mentions.length }}件</span>
                </p>
                <ul class="space-y-1.5">
                  <li v-for="(m, i) in g.mentions" :key="i" class="text-[12.5px] leading-relaxed">
                    <span class="gh-chip !py-0.5 !px-2 !text-[10.5px] mr-1.5">{{ ASPECT_SUBJECT_LABEL[m.subject] }}</span>
                    <NuxtLink :to="`/guesthouse/session/${m.sessionId}`" class="text-[var(--gh-forest-deep)] underline underline-offset-2">{{ m.guestName || '名前未設定' }}</NuxtLink>
                    <span class="text-[var(--gh-ink-soft)]">：「{{ m.quote }}」</span>
                  </li>
                </ul>
              </li>
            </ul>
          </section>

          <!-- 関心の対象 / エリア内の訪問先 -->
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <section>
              <h2 class="gh-display text-[16px] font-bold mb-3 flex items-center gap-2">
                関心の対象
                <HelpTip label="関心の対象とは">
                  満足度（何が良かったか）とは別に、そのお客様が<b>何に心を動かされていたか</b>を見る軸です。ご家族や同行者のこと、自然、歴史・宗教…と分かると、次に何をお伝えするとよいかの手がかりになります。
                </HelpTip>
              </h2>
              <ul v-if="topicStats.length" class="space-y-1.5">
                <li v-for="t in topicStats" :key="t.name" class="flex items-center gap-2.5 text-[13px]">
                  <span class="w-[6rem] shrink-0">{{ t.name }}</span>
                  <span class="flex-1 h-2 rounded-full bg-[var(--gh-paper-2)] overflow-hidden">
                    <span class="block h-full rounded-full bg-[var(--gh-forest-soft)]" :style="{ width: (t.count / topicStats[0].count) * 100 + '%' }" />
                  </span>
                  <span class="text-[12px] text-[var(--gh-ink-soft)] tabular-nums shrink-0">{{ t.count }}</span>
                </li>
              </ul>
              <p v-else class="text-[12.5px] text-[var(--gh-ink-soft)]">まだ読み取れていません。</p>
            </section>

            <section>
              <h2 class="gh-display text-[16px] font-bold mb-3 flex items-center gap-2">
                エリア内で回られた場所
                <HelpTip label="この一覧について">
                  日記の旅程に出てきた、宿の外の立ち寄り先です。ここに出てこない場所は「まだ案内できていない／書き留められていない」ということでもあります。
                </HelpTip>
              </h2>
              <div v-if="spotStats.length" class="flex flex-wrap gap-1.5">
                <span v-for="s in spotStats" :key="s.name" class="gh-chip">
                  {{ s.name }} <b class="text-[var(--gh-forest-deep)] ml-0.5">{{ s.count }}</b>
                </span>
              </div>
              <p v-else class="text-[12.5px] text-[var(--gh-ink-soft)]">まだ読み取れていません。</p>
            </section>
          </div>

          <!-- ほかに泊まられた宿（宿坊など） -->
          <section v-if="shukuboStats.length">
            <h2 class="gh-display text-[16px] font-bold mb-1 flex items-center gap-2">
              ほかに泊まられた宿
              <HelpTip label="この一覧について">
                お客様がご自身で手配された、この宿以外の宿泊先（高野山の宿坊など）です。<b>この宿の感想と混ざらないように</b>分けて持っています。どの宿坊と組み合わせて泊まられているかが分かると、前後の一泊をどう案内するかの材料になります。
              </HelpTip>
            </h2>
            <p class="text-[12px] text-[var(--gh-ink-soft)] mb-3">この宿とあわせて泊まられている宿です。「満足と体験」の「宿坊・ほかの宿」タブに、その感想が入っています。</p>
            <div class="flex flex-wrap gap-1.5">
              <span v-for="s in shukuboStats" :key="s.name" class="gh-chip">
                {{ s.name }} <b class="text-[var(--gh-forest-deep)] ml-0.5">{{ s.count }}</b>
              </span>
            </div>
          </section>

          <!-- 分析軸そのものをAIに問い直す -->
          <section>
            <h2 class="gh-display text-[16px] font-bold mb-1 flex items-center gap-2">
              AIに切り口を提案してもらう
              <HelpTip label="この機能について">
                ここまでの分類（満足・体験・関心・不便…）は、はじめに立てた<b>仮説</b>です。日記がたまってくると、もっと役に立つ切り口が別にあるかもしれません。<br />
                このボタンは、集計結果ではなく<b>日記の生の文章</b>をAIに読ませて、「他にどんな切り口で分けると、次の一手につながるか」を提案させます。<br />
                提案は<b>保存しません</b>。読んで良さそうなものがあれば、実際の分類に取り入れます（そのときはアプリ側の設定を書き換えます）。
              </HelpTip>
            </h2>
            <p class="text-[12px] text-[var(--gh-ink-soft)] mb-3">
              今の分け方でいいのかを、日記そのものを読ませて相談します{{ houseFilter ? `（「${currentHouseName}」の日記だけを読みます）` : '' }}。
            </p>
            <div class="flex flex-wrap items-center gap-2 mb-3">
              <button class="gh-btn !h-9 !px-4 text-[12.5px]" :disabled="axesBusy" @click="suggestAxes">
                {{ axesBusy ? '考えています…' : axes ? 'もう一度たずねる' : '提案してもらう' }}
              </button>
              <button v-if="axes?.items.length" class="gh-btn-ghost !h-9 !px-3.5 text-[12.5px]" @click="copyAxes">
                {{ copied ? 'コピーしました' : '文章をコピー' }}
              </button>
            </div>
            <p v-if="axesError" class="text-[12.5px] text-[var(--gh-warn)] mb-2">{{ axesError }}</p>
            <div v-if="axesBusy" class="h-24 rounded-2xl bg-[var(--gh-paper-2)]/70 animate-pulse" />
            <template v-else-if="axes">
              <p v-if="!axes.items.length" class="rounded-2xl border border-[var(--gh-line)] bg-[var(--gh-card)] text-center text-[var(--gh-ink-soft)] py-8 text-[13px]">
                提案できる切り口は見つかりませんでした。日記がたまってから、もう一度たずねてみてください。
              </p>
              <template v-else>
                <ul class="space-y-2">
                  <li v-for="(a, i) in axes.items" :key="i" class="rounded-2xl border border-[var(--gh-line)] bg-[var(--gh-card)] px-4 py-3">
                    <p class="text-[14px] font-bold mb-1">{{ a.title }}</p>
                    <p class="text-[12.5px] text-[var(--gh-ink-soft)] leading-relaxed mb-1.5">{{ a.why }}</p>
                    <div v-if="a.values.length" class="flex flex-wrap gap-1.5 mb-1.5">
                      <span v-for="v in a.values" :key="v" class="gh-chip !py-0.5 !px-2 !text-[10.5px]">{{ v }}</span>
                    </div>
                    <p v-if="a.evidence" class="text-[12px] text-[var(--gh-ink-faint)] leading-relaxed">根拠：{{ a.evidence }}</p>
                  </li>
                </ul>
                <p v-if="axes.redundant.length" class="text-[12.5px] text-[var(--gh-ink-soft)] mt-2.5 leading-relaxed">
                  重なっているかもしれない今の軸：{{ axes.redundant.join(' / ') }}
                </p>
                <p class="text-[11.5px] text-[var(--gh-ink-faint)] mt-1.5">日記 {{ axes.basedOn }} 件を読んだ提案です。</p>
              </template>
            </template>
          </section>
        </template>
      </div>
    </template>

    <AuthModal v-if="showAuthModal" accent="orange" />
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useAuth } from '~/composables/useAuth'
import AuthModal from '~/components/AuthModal.vue'
import HelpTip from '~/components/guesthouse/HelpTip.vue'
import Breadcrumb from '~/components/guesthouse/Breadcrumb.vue'
import JourneySankey from '~/components/guesthouse/JourneySankey.client.vue'
import RoutePosition from '~/components/guesthouse/RoutePosition.vue'
import type { AspectSubject, AxisSuggestResult, GuestProfile, Insights, InsightsRefreshResult } from '~/types/guesthouse'

definePageMeta({ layout: 'guesthouse' })
useHead({ title: '顧客分析 | ゲストハウス案内' })

const { isLoggedIn, checked, checkAuth } = useAuth()
const showAuthModal = computed(() => checked.value && !isLoggedIn.value)

// 感想の主語のラベル。サーバ側の語彙（guesthouse-insights.ts の ASPECT_SUBJECTS）と対で、
// 増やすときは両方を直す（サーバ utils はクライアントに持ち込めないのでここに持ち直している）。
const ASPECT_SUBJECT_LABEL: Record<AspectSubject, string> = {
  inn: 'この宿',
  shukubo: '宿坊・ほかの宿',
  other: 'エリア・その他',
}

const data = ref<Insights | null>(null)
const loading = ref(true)
const busy = ref(false)
const error = ref('')
const notAdmin = ref(false)
const openAspect = ref('')
// 満足度をどの主語で見るか。既定は「この宿」＝宿そのものの評価だけを見る状態。
const aspectSubject = ref<AspectSubject>('inn')
// どの宿で見るか。空文字＝すべての宿をまとめて（混在）見る状態。
const houseFilter = ref('')

/** まだ読み込んでいない日記の件数（更新中は残り件数として出す）。 */
const remaining = computed(() => Math.max(0, (data.value?.diaryCount ?? 0) - (data.value?.basedOn ?? 0)))

/** 抽出できているすべての組（宿の絞り込み前）。 */
const allProfiles = computed<GuestProfile[]>(() => data.value?.profiles ?? [])

/** 宿の切り替えタブ。組数の多い順（登録だけあって日記が無い宿は出さない）。 */
const houseTabs = computed(() => {
  const map = new Map<string, { id: string; name: string; count: number }>()
  for (const p of allProfiles.value) {
    const cur = map.get(p.houseId) ?? { id: p.houseId, name: p.houseName || '宿名なし', count: 0 }
    cur.count++
    map.set(p.houseId, cur)
  }
  return [...map.values()].sort((a, b) => b.count - a.count)
})

const currentHouseName = computed(() => houseTabs.value.find((h) => h.id === houseFilter.value)?.name ?? '')

/** 以下すべての集計の対象。宿を選んでいればその宿のお客様だけ、選んでいなければ全部。 */
const profiles = computed<GuestProfile[]>(() =>
  houseFilter.value ? allProfiles.value.filter((p) => p.houseId === houseFilter.value) : allProfiles.value
)

function selectHouse(id: string) {
  houseFilter.value = id
  openAspect.value = '' // 対象が変わるので、開いていた引用は閉じる
  axes.value = null // 提案は読んだ日記の範囲つきなので、宿を変えたら出したままにしない
}

/** 主語（この宿／宿坊・ほかの宿／エリア）ごとの言及数。タブに件数を出して、分けたことが見えるようにする。 */
const subjectTabs = computed(() =>
  (Object.keys(ASPECT_SUBJECT_LABEL) as AspectSubject[]).map((key) => ({
    key,
    label: ASPECT_SUBJECT_LABEL[key],
    count: profiles.value.reduce((n, p) => n + p.aspects.filter((a) => a.subject === key).length, 0),
  }))
)

function selectSubject(key: AspectSubject) {
  aspectSubject.value = key
  openAspect.value = '' // 主語を変えたら開いていた行は閉じる（別の主語の引用が出たままにならないように）
}

/** 満足と体験：側面ごとの件数と、根拠になった引用。選んだ主語のぶんだけを、言及の多い順に。 */
const aspectStats = computed(() => {
  const map = new Map<string, { aspect: string; positive: number; negative: number; mentions: { sessionId: string; guestName: string; sentiment: string; quote: string }[] }>()
  for (const p of profiles.value) {
    for (const a of p.aspects) {
      if (a.subject !== aspectSubject.value) continue
      const cur = map.get(a.aspect) ?? { aspect: a.aspect, positive: 0, negative: 0, mentions: [] }
      if (a.sentiment === 'negative') cur.negative++
      else cur.positive++
      cur.mentions.push({ sessionId: p.sessionId, guestName: p.guestName, sentiment: a.sentiment, quote: a.quote })
      map.set(a.aspect, cur)
    }
  }
  return [...map.values()].sort((x, y) => y.positive + y.negative - (x.positive + x.negative))
})

const maxAspect = computed(() => Math.max(1, ...aspectStats.value.map((a) => a.positive + a.negative)))

/**
 * 不便・不満だけを集めた独立の軸。満足と同じ材料（negative の感想）から作るが、
 * 主語のタブでは絞らない——宿の話も宿坊・エリアの話も、まとめて見えたほうが手を打てるため
 * （どれについての不満かは、行ごとの印で分かるようにする）。
 */
const issueGroups = computed(() => {
  const map = new Map<string, { aspect: string; mentions: { subject: AspectSubject; sessionId: string; guestName: string; quote: string }[] }>()
  for (const p of profiles.value) {
    for (const a of p.aspects) {
      if (a.sentiment !== 'negative') continue
      const cur = map.get(a.aspect) ?? { aspect: a.aspect, mentions: [] }
      cur.mentions.push({ subject: a.subject, sessionId: p.sessionId, guestName: p.guestName, quote: a.quote })
      map.set(a.aspect, cur)
    }
  }
  return [...map.values()].sort((x, y) => y.mentions.length - x.mentions.length)
})

/** 文字列配列の項目を数えて多い順に並べる（関心の対象・立ち寄り先・体験で共用）。 */
function countBy(pick: (p: GuestProfile) => string[]) {
  const map = new Map<string, number>()
  for (const p of profiles.value) {
    for (const v of pick(p)) map.set(v, (map.get(v) ?? 0) + 1)
  }
  return [...map].map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count)
}

const topicStats = computed(() => countBy((p) => p.topics))
const shukuboStats = computed(() => countBy((p) => p.shukuboStays))
const spotStats = computed(() => countBy((p) => p.areaSpots))
const innExpStats = computed(() => countBy((p) => p.innExperiences))
const tourExpStats = computed(() => countBy((p) => p.tourExperiences))

function toggleAspect(aspect: string) {
  openAspect.value = openAspect.value === aspect ? '' : aspect
}

function formatDate(s: string): string {
  const m = s?.match(/^(\d{4})-(\d{2})-(\d{2})/)
  return m ? `${Number(m[2])}/${Number(m[3])}` : s || ''
}

// ── 分析軸の提案（保存しない。そのつどの相談）──────────────────────
const axes = ref<AxisSuggestResult | null>(null)
const axesBusy = ref(false)
const axesError = ref('')
const copied = ref(false)

async function suggestAxes() {
  axesBusy.value = true
  axesError.value = ''
  try {
    axes.value = await $fetch<AxisSuggestResult>('/api/guesthouse/insights/suggest-axes', {
      method: 'POST',
      body: { houseId: houseFilter.value },
    })
  } catch (e: any) {
    axesError.value = e?.data?.message || '提案の作成に失敗しました。時間をおいて試してください。'
  } finally {
    axesBusy.value = false
  }
}

/** LINEなどで共有できるように、提案をそのまま貼れる文章にする。 */
function axesAsText(): string {
  const a = axes.value
  if (!a) return ''
  const lines = [`【AIからの分析軸の提案】お客さん日記 ${a.basedOn} 件をもとに`]
  a.items.forEach((it, i) => {
    lines.push('', `${i + 1}. ${it.title}`)
    if (it.why) lines.push(`　なぜ見るか：${it.why}`)
    if (it.values.length) lines.push(`　分け方の候補：${it.values.join(' / ')}`)
    if (it.evidence) lines.push(`　根拠：${it.evidence}`)
  })
  if (a.redundant.length) lines.push('', `重なっているかもしれない今の軸：${a.redundant.join(' / ')}`)
  return lines.join('\n')
}

async function copyAxes() {
  try {
    await navigator.clipboard.writeText(axesAsText())
    copied.value = true
    setTimeout(() => (copied.value = false), 1800)
  } catch {
    // クリップボードが使えない環境では何もしない（画面の文字を選んでコピーできる）
  }
}

async function load() {
  loading.value = true
  try {
    data.value = await $fetch<Insights>('/api/guesthouse/insights')
  } catch (e: any) {
    if ((e?.statusCode ?? e?.response?.status) === 403) notAdmin.value = true
    data.value = null
  } finally {
    loading.value = false
  }
}

/**
 * 未読み込みの日記を読み直す。
 * サーバは1回につき少しずつしか進めない（Claude を日記1件ごとに呼ぶため）ので、
 * 進みが止まるまで続けて呼ぶ。途中の結果もそのつど画面に反映するので、残り件数が減っていくのが見える。
 */
async function refresh() {
  busy.value = true
  error.value = ''
  try {
    for (let i = 0; i < 30; i++) {
      const res = await $fetch<InsightsRefreshResult>('/api/guesthouse/insights/refresh', { method: 'POST' })
      data.value = res
      if (!res.stale || res.extracted === 0) break
    }
  } catch (e: any) {
    error.value = e?.data?.message || '分析に失敗しました。時間をおいて「更新」を押すと、続きから読み込みます。'
  } finally {
    busy.value = false
  }
}

onMounted(async () => {
  await checkAuth()
  if (!isLoggedIn.value) {
    loading.value = false
    return
  }
  await load()
})
</script>
