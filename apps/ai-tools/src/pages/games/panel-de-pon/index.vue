<template>
  <div
    class="pdp-root flex flex-col items-center lg:items-stretch py-3 lg:pb-2 min-h-full lg:h-screen select-none"
    :class="gameMode === 'puzzle' ? 'pdp-puzzle' : ''"
  >
    <AuthModal v-if="showAuthModal" accent="sky" />

    <!-- Stage Clear overlay -->
    <Transition name="ovl">
      <div v-if="phase === 'stageclear'" class="pdp-ovl z-50">
        <div class="pdp-card pdp-acc-red pdp-pop">
          <div class="flex justify-center gap-1.5 text-3xl mb-2">
            <span class="animate-[wiggle_0.5s_ease_infinite]">🎉</span>
            <span class="animate-[wiggle_0.5s_ease_0.1s_infinite]">⭐</span>
            <span class="animate-[wiggle_0.5s_ease_0.2s_infinite]">🎉</span>
          </div>
          <p class="pdp-card-kicker">たいけつ {{ stage }} クリア！</p>
          <h2 class="pdp-praise">{{ clearPraise?.title }}</h2>
          <p class="pdp-card-text !mb-4">{{ clearPraise?.message }}</p>
          <div v-if="records.length" class="pdp-clear-rank">
            <div class="pdp-side-label">{{ gameMode === 'puzzle' ? '最新クリア' : `たいけつ ${stage} ランキング` }}</div>
            <div
              v-for="rec in records" :key="rec.rank"
              class="pdp-rk-row px-1.5 py-0.5 text-xs"
              :class="{ 'is-top': rec.rank === 1 }"
            >
              <span class="pdp-rk-no w-4 text-right text-[10px]">{{ rec.rank }}</span>
              <span class="font-mono font-bold w-8 shrink-0">{{ rec.name }}</span>
              <span class="pdp-dim font-mono text-[9px] shrink-0">{{ formatDate(rec.recorded_at) }}</span>
              <span v-if="gameMode === 'normal'" class="font-mono text-right flex-1">{{ formatTime(rec.seconds) }}</span>
            </div>
          </div>
          <button v-if="stage < STAGE_TARGETS.length" class="pdp-btn" @click="goNextStage">次のたいけつへ →</button>
          <button v-else class="pdp-btn pdp-btn--gold" @click="resetToStart">🏆 全クリア！最初から</button>
        </div>
      </div>
    </Transition>

    <!-- Game Over overlay -->
    <Transition name="ovl">
      <div v-if="phase === 'gameover'" class="pdp-ovl z-50">
        <div class="pdp-card pdp-card--sm pdp-acc-red">
          <div class="text-5xl mb-3">💀</div>
          <h2 class="pdp-card-title">ゲームオーバー</h2>
          <p class="pdp-card-sub">たいけつ {{ stage }}</p>
          <button class="pdp-btn mb-2" @click="startGame">このたいけつからリトライ</button>
          <button class="pdp-btn pdp-btn--ghost" @click="resetToStart">たいけつ1から</button>
        </div>
      </div>
    </Transition>

    <!-- Name Entry Modal -->
    <Transition name="ovl">
      <div v-if="showNameEntry" class="pdp-ovl z-[60]">
        <div class="pdp-card pdp-card--sm pdp-acc-gold">
          <div class="text-4xl mb-3">{{ gameMode === 'puzzle' ? '🧩' : '🏆' }}</div>
          <h2 class="pdp-card-title">{{ gameMode === 'puzzle' ? 'クリア記録！' : '記録達成！' }}</h2>
          <p class="pdp-card-sub mb-1">{{ gameMode === 'puzzle' ? `なぞとき ST${stage}` : `たいけつ ${stage}` }} クリアタイム</p>
          <p class="font-mono text-2xl font-bold mb-4">{{ formatTime(clearSeconds) }}</p>
          <p class="pdp-dim text-xs mb-3">名前を3文字で入力（↑↓で変更・Enter登録）</p>

          <!-- Name suggestions from leaderboard -->
          <div v-if="suggestedNames.length > 0" class="flex flex-wrap gap-1.5 justify-center mb-3">
            <button
              v-for="name in suggestedNames"
              :key="name"
              class="pdp-chip px-3 py-1 font-mono text-sm"
              @click="selectSuggestedName(name)"
            >{{ name }}</button>
          </div>

          <div class="flex gap-2 justify-center mb-3">
            <div
              v-for="(ch, i) in nameChars" :key="i"
              class="pdp-namebox"
              :class="{ 'is-on': nameInputIdx === i }"
              @click="nameInputIdx = i"
            >{{ ch }}</div>
          </div>

          <div class="flex gap-2 justify-center mb-5">
            <div v-for="(_, i) in nameChars" :key="i" class="flex flex-col items-center gap-1">
              <button class="pdp-chip w-11 h-8 text-xs" @click="changeLetter(i, 1); nameInputIdx = i">▲</button>
              <button class="pdp-chip w-11 h-8 text-xs" @click="changeLetter(i, -1); nameInputIdx = i">▼</button>
            </div>
          </div>

          <button class="pdp-btn mb-2" @click="submitRecord">登録する</button>
          <button class="pdp-btn pdp-btn--ghost" @click="showNameEntry = false">スキップ</button>
        </div>
      </div>
    </Transition>

    <!-- Ranking Popup -->
    <Transition name="ovl">
      <div v-if="showRankingPopup" class="pdp-ovl z-[70]" @click.self="showRankingPopup = false">
        <div class="pdp-card pdp-card--sm pdp-acc-gold" style="max-width: 20rem">
          <div class="text-3xl mb-2">{{ gameMode === 'puzzle' ? '🧩' : '🏆' }}</div>
          <h2 class="pdp-card-title" style="font-size: 1.1rem">
            {{ gameMode === 'puzzle' ? `なぞとき ST${stage} 最新記録` : `たいけつ ${stage} ランキング` }}
          </h2>
          <p class="pdp-dim text-xs mb-4">あなたの記録: {{ formatTime(submittedSeconds) }}</p>

          <div class="flex flex-col gap-1 text-left mb-5">
            <div
              v-for="rec in records" :key="rec.rank"
              class="pdp-rk-row px-3 py-1.5 text-sm"
              :class="{ 'is-me': rec.rank === submittedRank }"
            >
              <span class="pdp-rk-no w-5 text-right text-[11px]">{{ rec.rank }}</span>
              <span class="font-mono font-bold w-10 shrink-0">{{ rec.name }}</span>
              <span class="pdp-dim font-mono text-[10px] shrink-0">{{ formatDate(rec.recorded_at) }}</span>
              <span class="flex-1 font-mono text-right">{{ formatTime(rec.seconds) }}</span>
              <span v-if="rec.rank === submittedRank" class="pdp-new">NEW</span>
            </div>
          </div>

          <button class="pdp-btn pdp-btn--ghost" @click="showRankingPopup = false">閉じる</button>
        </div>
      </div>
    </Transition>

    <!-- Start Ranking（スタートを押すと、そのステージのランキングを見せてから始める） -->
    <Transition name="ovl">
      <div v-if="showStartRanking" class="pdp-ovl z-[66]" @click.self="showStartRanking = false">
        <div class="pdp-card pdp-card--sm pdp-acc-gold" style="max-width: 20rem">
          <div class="text-3xl mb-2">{{ gameMode === 'puzzle' ? '🧩' : '🏆' }}</div>
          <h2 class="pdp-card-title" style="font-size: 1.1rem; margin-bottom: 16px">
            {{ gameMode === 'puzzle' ? `なぞとき ST${stage} 最新クリア` : `たいけつ ${stage} ランキング` }}
          </h2>
          <div v-if="recordsLoading" class="pdp-dim text-xs py-2 mb-4">…</div>
          <div v-else-if="records.length === 0" class="pdp-dim text-xs py-2 mb-4">記録なし</div>
          <div v-else class="flex flex-col gap-1 text-left mb-5">
            <div
              v-for="rec in records" :key="rec.rank"
              class="pdp-rk-row px-3 py-1 text-sm"
              :class="{ 'is-top': rec.rank === 1 }"
            >
              <span class="pdp-rk-no w-5 text-right text-[11px]">{{ rec.rank }}</span>
              <span class="font-mono font-bold w-10 shrink-0">{{ rec.name }}</span>
              <span class="pdp-dim font-mono text-[10px] shrink-0">{{ formatDate(rec.recorded_at) }}</span>
              <span v-if="gameMode === 'normal'" class="flex-1 font-mono text-right">{{ formatTime(rec.seconds) }}</span>
            </div>
          </div>
          <button class="pdp-btn mb-2" @click="confirmStartRanking">スタート</button>
          <button class="pdp-btn pdp-btn--ghost" @click="showStartRanking = false">もどる</button>
        </div>
      </div>
    </Transition>

    <!-- Puzzle Clear overlay -->
    <Transition name="ovl">
      <div v-if="phase === 'puzzleclear'" class="pdp-ovl z-50">
        <div class="pdp-card pdp-acc-blue pdp-pop">
          <div class="flex justify-center gap-1.5 text-3xl mb-2">
            <span class="animate-[wiggle_0.5s_ease_infinite]">🧩</span>
            <span class="animate-[wiggle_0.5s_ease_0.1s_infinite]">✨</span>
            <span class="animate-[wiggle_0.5s_ease_0.2s_infinite]">🧩</span>
          </div>
          <p class="pdp-card-kicker">なぞとき ST{{ stage }} クリア！</p>
          <h2 class="pdp-praise">{{ clearPraise?.title }}</h2>
          <p class="pdp-card-text !mb-4">{{ clearPraise?.message }}</p>
          <div v-if="records.length" class="pdp-clear-rank">
            <div class="pdp-side-label">{{ gameMode === 'puzzle' ? '最新クリア' : `たいけつ ${stage} ランキング` }}</div>
            <div
              v-for="rec in records" :key="rec.rank"
              class="pdp-rk-row px-1.5 py-0.5 text-xs"
              :class="{ 'is-top': rec.rank === 1 }"
            >
              <span class="pdp-rk-no w-4 text-right text-[10px]">{{ rec.rank }}</span>
              <span class="font-mono font-bold w-8 shrink-0">{{ rec.name }}</span>
              <span class="pdp-dim font-mono text-[9px] shrink-0">{{ formatDate(rec.recorded_at) }}</span>
              <span v-if="gameMode === 'normal'" class="font-mono text-right flex-1">{{ formatTime(rec.seconds) }}</span>
            </div>
          </div>
          <button v-if="stage < PUZZLE_STAGES.length" class="pdp-btn" @click="goNextPuzzle">次のなぞときへ →</button>
          <button v-else class="pdp-btn pdp-btn--gold" @click="() => { stage = 1; startPuzzle() }">🏆 全クリア！最初から</button>
        </div>
      </div>
    </Transition>

    <!-- Puzzle Fail overlay -->
    <Transition name="ovl">
      <div v-if="phase === 'puzzlefail'" class="pdp-ovl z-50">
        <div class="pdp-card pdp-card--sm pdp-acc-gold">
          <div class="text-5xl mb-3">😵</div>
          <h2 class="pdp-card-title">手数切れ</h2>
          <p class="pdp-card-sub">なぞとき ST{{ stage }}</p>
          <button class="pdp-btn mb-2" @click="startPuzzle">もう一度</button>
          <button class="pdp-btn pdp-btn--ghost" @click="backToIdle">モード選択に戻る</button>
        </div>
      </div>
    </Transition>

    <!-- Stage/Puzzle Select overlay -->
    <Transition name="ovl">
      <div v-if="phase === 'stageselect' || showStagePicker" class="pdp-ovl z-[65]" @click.self="closeStagePicker">
        <div class="pdp-card w-full max-h-[85vh] flex flex-col" style="max-width: 28rem; text-align: left; padding: 24px">
          <div class="flex items-center justify-between mb-4">
            <h2 class="pdp-card-title !mb-0 !text-lg" style="color: var(--acc)">
              {{ gameMode === 'puzzle' ? '🧩 なぞときを選択' : '🎮 たいけつを選択' }}
            </h2>
            <button v-if="showStagePicker" class="pdp-link text-xs" @click="showStagePicker = false">閉じる ✕</button>
            <button v-else class="pdp-link text-xs" @click="phase = 'idle'">← モード選択</button>
          </div>
          <div class="grid grid-cols-4 gap-2 overflow-y-auto p-1.5">
            <button
              v-for="n in stageCount" :key="n"
              class="pdp-stagecard"
              :class="{ 'is-on': n === savedStage && gameMode === 'normal', 'is-focus': pickFocus === n - 1 }"
              @click="chooseStage(n)"
            >
              <span class="text-lg font-black">{{ n }}</span>
              <span class="text-[10px] pdp-dim">{{ gameMode === 'puzzle' ? `${PUZZLE_STAGES[n - 1].moves}手` : `目標${STAGE_TARGETS[n - 1]}` }}</span>
            </button>
          </div>
        </div>
      </div>
    </Transition>

    <!-- Portrait warning (mobile only, hidden in landscape) -->
    <div class="portrait-notice lg:hidden fixed inset-0 bg-black/90 z-[80] flex items-center justify-center flex-col gap-4 text-center p-6">
      <div class="text-5xl">📱</div>
      <p class="text-white text-xl font-bold">端末を横にしてください</p>
      <p class="text-sm" style="color: var(--pdp-sub)">このゲームは横画面でお楽しみください</p>
    </div>

    <!-- Header (mobile only. desktop は右サイドに集約) -->
    <div class="lg:hidden flex items-center gap-3 mb-3">
      <h1 class="pdp-title">
        パネルでポン
        <span v-if="phase !== 'idle'" class="pdp-title-mode">— {{ gameMode === 'puzzle' ? 'なぞときモード' : 'たいけつモード' }}</span>
      </h1>
      <button
        v-if="phase !== 'idle'"
        class="pdp-chip px-2.5 py-1 text-[11px] font-medium"
        :disabled="phase === 'paused'"
        @click="selectMode(gameMode === 'puzzle' ? 'normal' : 'puzzle')"
      >{{ gameMode === 'puzzle' ? '🎮 たいけつへ' : '🧩 なぞときへ' }}</button>
    </div>

    <!-- Board area: mobile=[dpad|game|buttons], desktop=[空き|game|サイド] -->
    <div class="flex items-end w-full px-3 lg:px-6 lg:grid lg:grid-cols-[1fr_auto_1fr] lg:gap-6 lg:items-center lg:flex-1 lg:min-h-0">

      <!-- D-pad (mobile only, left side) -->
      <div class="flex-1 flex items-center justify-start lg:hidden">
        <div class="grid grid-cols-3" style="width: 153px; gap: 6px">
          <div />
          <button class="dpad-sm" @touchstart.prevent="moveCursor(-1, 0)">▲</button>
          <div />
          <button class="dpad-sm" @touchstart.prevent="moveCursor(0, -1)">◄</button>
          <div style="width:45px;height:45px" />
          <button class="dpad-sm" @touchstart.prevent="moveCursor(0, 1)">►</button>
          <div />
          <button class="dpad-sm" @touchstart.prevent="moveCursor(1, 0)">▼</button>
          <div />
        </div>
      </div>

      <!-- Game column（画面中央） -->
      <div class="flex-none flex flex-col items-center lg:col-start-2 lg:row-start-1">
        <!-- Stage + chain above board -->
        <div class="pdp-stagebar lg:hidden">
          <span class="pdp-stagebar-name">{{ gameMode === 'puzzle' ? 'なぞとき' : 'たいけつ' }} {{ stage }}</span>
          <Transition name="chain">
            <span v-if="chainLevel >= 2" class="pdp-chain animate-bounce">{{ chainLevel }}チェーン!</span>
          </Transition>
        </div>

        <!-- board（メーターは右隣に絶対配置し、盤面を中央から動かさない） -->
        <div class="relative flex-shrink-0">
          <div
            class="pdp-board relative overflow-hidden"
            :style="{ width: `${COLS * CELL_W}px`, height: `${ROWS * CELL}px` }"
          >
            <!-- Inner board (transforms for rise effect) -->
            <div
              class="absolute top-0 left-0"
              :style="{
                width: `${COLS * CELL_W}px`,
                transform: `translateY(${-riseOffset}px)`,
              }"
            >
              <!-- Panel rows (ROWS+1 total: ROWS from grid + nextRow) -->
              <div v-for="(row, r) in allRows" :key="r" class="flex">
                <div
                  v-for="(color, c) in row"
                  :key="c"
                  class="panel-cell"
                  :class="{ 'panel-flashing': r < ROWS && flashSet.has(`${r},${c}`) }"
                  :style="cellStyle(color)"
                >
                  <span v-if="color" class="panel-sym">{{ PANEL_CFG[color as Color].sym }}</span>
                </div>
              </div>

              <!-- Cursor -->
              <div
                v-if="phase === 'playing'"
                class="pointer-events-none absolute z-10 cursor-box"
                :style="{
                  left: `${cursor.col * CELL_W}px`,
                  top: `${cursor.row * CELL}px`,
                  width:  cursorDir === 'h' ? `${2 * CELL_W}px` : `${CELL_W}px`,
                  height: cursorDir === 'h' ? `${CELL}px`     : `${2 * CELL}px`,
                }"
              />
            </div>

            <!-- チェーン表示（desktop は盤面の上に重ねる） -->
            <Transition name="chain">
              <span v-if="chainLevel >= 2" class="pdp-chain pdp-chain--float hidden lg:block animate-bounce">{{ chainLevel }}チェーン!</span>
            </Transition>

            <!-- Ready overlay (board only) -->
            <Transition name="ovl">
              <div v-if="phase === 'ready'" class="pdp-boardcover z-20 gap-2" style="background: rgba(24,24,24,0.96)">
                <div class="text-sm font-bold">{{ gameMode === 'puzzle' ? `なぞとき ${stage}` : `たいけつ ${stage}` }}</div>
                <div class="pdp-dim text-xs">スタートを押してください</div>
                <div class="pdp-dim text-[11px] mt-2">コントローラー: ○ スタート ／ ✕ {{ gameMode === 'puzzle' ? 'なぞとき' : 'たいけつ' }}選択</div>
              </div>
            </Transition>

            <!-- Pause overlay (board only) -->
            <Transition name="ovl">
              <div v-if="phase === 'paused'" class="pdp-boardcover z-20 gap-3" style="background: rgba(24,24,24,0.96)">
                <div class="text-4xl">⏸</div>
                <button class="pdp-btn mt-1" style="width: 9rem" @click="handleStart">スタートで再開</button>
              </div>
            </Transition>

            <!-- Danger flash overlay -->
            <div
              v-if="isDanger"
              class="absolute inset-0 pointer-events-none animate-[dangerPulse_0.5s_ease_infinite]"
              style="background: rgba(224,40,60,0.14)"
            />

            <!-- Moves left (puzzle mode, top-right big number) -->
            <div
              v-if="gameMode === 'puzzle' && phase === 'playing'"
              class="absolute top-1.5 right-2 z-20 pointer-events-none text-right leading-none"
            >
              <div class="pdp-dim text-[9px] font-medium tracking-widest">のこり</div>
              <div
                class="font-extrabold tabular-nums drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)] transition-colors"
                :class="movesLeft <= 1 ? 'animate-pulse' : ''"
                :style="{ fontSize: '2.75rem', color: movesLeft <= 1 ? 'var(--pdp-red)' : 'var(--pdp-blue)' }"
              >{{ movesLeft }}</div>
            </div>

            <!-- Idle overlay -->
            <div v-if="phase === 'idle'" class="pdp-boardcover" style="background: rgba(24,24,24,0.82)">
              <div class="flex flex-col gap-3 items-center px-4 pdp-modes">
                <p class="pdp-dim text-xs tracking-widest mb-1 w-full text-center" style="flex-basis:100%">モードを選択</p>
                <button class="pdp-btn pdp-modebtn" :class="{ 'is-focus': modeFocus === 0 }" @click="selectMode('normal')">
                  <span class="pdp-modeico">🎮</span>たいけつ
                  <span v-if="savedStage > 1" class="block text-[10px] font-normal opacity-80 mt-0.5">ST{{ savedStage }}から再開</span>
                </button>
                <button class="pdp-btn pdp-btn--blue pdp-modebtn" :class="{ 'is-focus': modeFocus === 1 }" @click="selectMode('puzzle')"><span class="pdp-modeico">🧩</span>なぞとき</button>
              </div>
            </div>
          </div>

          <!-- 縦のスコアメーター（下から溜まる。desktop・たいけつモード） -->
          <div
            v-if="gameMode === 'normal' && (phase === 'ready' || phase === 'playing' || phase === 'stageclear' || phase === 'gameover')"
            class="pdp-meter hidden lg:flex"
          >
            <div class="pdp-meter-target"><span>目標</span>{{ stageTarget }}</div>
            <div class="pdp-meter-track">
              <div class="pdp-meter-fill" :style="{ height: `${progressPct}%` }" />
              <i class="pdp-meter-tick" style="bottom: 25%" />
              <i class="pdp-meter-tick" style="bottom: 50%" />
              <i class="pdp-meter-tick" style="bottom: 75%" />
            </div>
            <div class="pdp-meter-score">{{ score }}</div>
          </div>
        </div>
      </div><!-- /game column -->

      <!-- Action buttons (mobile only, right side) -->
      <div class="flex-1 flex items-center justify-end lg:hidden">
        <div class="flex flex-row gap-3">
          <button class="dpad-action" @touchstart.prevent="toggleDir">{{ cursorDir === 'h' ? '⇄' : '⇅' }}</button>
          <button class="dpad-action dpad-action--swap" @touchstart.prevent="doSwap">入替</button>
        </div>
      </div>

      <!-- タイトル・モード・たいけつ選択（desktop only。盤面の左上寄り） -->
      <div class="pdp-side hidden lg:flex lg:col-start-1 lg:row-start-1">
        <h1 class="pdp-title">パネルでポン</h1>
        <div v-if="phase !== 'idle'" class="pdp-title-mode">{{ gameMode === 'puzzle' ? 'なぞときモード' : 'たいけつモード' }}</div>
        <div class="flex flex-col gap-2 mt-3">
          <button class="pdp-btn pdp-btn--side" :disabled="phase === 'paused'" @click="openStagePicker">
            {{ gameMode === 'puzzle' ? '🧩 なぞとき' : '🎮 たいけつ' }} {{ stage }} ▾
          </button>
          <button
            v-if="phase !== 'idle'"
            class="pdp-chip px-2.5 py-1.5 text-xs font-medium"
            :disabled="phase === 'paused'"
            @click="selectMode(gameMode === 'puzzle' ? 'normal' : 'puzzle')"
          >{{ gameMode === 'puzzle' ? '🎮 たいけつへ' : '🧩 なぞときへ' }}</button>
        </div>
      </div>
    </div><!-- /board area -->

    <!-- Stage selector (mobile only, below board area) -->
    <div class="lg:hidden mt-2 px-3 w-full">
      <div class="pdp-side-label !mb-1.5">{{ gameMode === 'puzzle' ? 'なぞとき選択' : 'たいけつ選択' }}</div>
      <div class="grid grid-cols-5 gap-1">
        <button
          v-for="n in stageCount" :key="n"
          class="pdp-stagebtn"
          :disabled="phase === 'paused'"
          :class="{ 'is-on': stage === n && phase !== 'idle' }"
          @click="jumpToStage(n)"
        >{{ n }}</button>
      </div>
    </div>

    <!-- Controls hint（使い方は従来どおり画面下） -->
    <div class="pdp-hint mt-3 lg:mt-2 flex flex-col items-center gap-1.5">
      <!-- Gamepad status -->
      <div class="flex items-center gap-1.5 text-xs" :style="{ color: gpConnected ? 'var(--pdp-green)' : 'var(--pdp-dim)' }">
        <span>🎮</span>
        <span>{{ gpConnected ? 'コントローラー接続中' : 'コントローラー未接続（繋いでボタンを押すと認識）' }}</span>
      </div>
      <!-- Keyboard hint (PC only) -->
      <div class="hidden lg:flex items-center gap-4 text-xs" style="color: var(--pdp-sub)">
        <span class="flex items-center gap-1.5"><kbd class="pdp-kbd">↑↓←→</kbd>移動</span>
        <span class="flex items-center gap-1.5"><kbd class="pdp-kbd">Z</kbd><kbd class="pdp-kbd">Space</kbd>入替</span>
        <span class="flex items-center gap-1.5"><kbd class="pdp-kbd">X</kbd>縦横切替</span>
        <span class="pdp-dim">｜</span>
        <span class="flex items-center gap-1.5"><kbd class="pdp-kbd">Enter</kbd><kbd class="pdp-kbd">Esc</kbd>開始/停止</span>
      </div>
    </div>

  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import { useAuth } from '~/composables/useAuth'

useHead({
  title: 'パネルでポン',
  link: [
    { key: 'icon', rel: 'icon', type: 'image/svg+xml', href: `data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>🎴</text></svg>` },
    // こども丸ゴシックが端末に無いときの代わり（丸ゴシック系のWebフォント）
    { rel: 'preconnect', href: 'https://fonts.googleapis.com' },
    { rel: 'preconnect', href: 'https://fonts.gstatic.com', crossorigin: '' },
    { rel: 'stylesheet', href: 'https://fonts.googleapis.com/css2?family=Zen+Maru+Gothic:wght@500;700;900&display=swap' },
  ],
})

// ── Constants ─────────────────────────────────────────────────
const COLS = 6
const ROWS = 12

const isMobile = ref(false)
const viewH = ref(800)
const checkMobile = () => {
  isMobile.value = window.innerWidth < 1024
  viewH.value = window.innerHeight
}
// PCのパネルは横長（縦の1.3倍）。縦は CELL、横は CELL_W
const CELL_W_RATIO = 1.3
// PCは縦幅いっぱいに盤面を広げる（上のステージ表示・下の使い方ぶんを差し引いて12行に割る）
const LAYOUT_RESERVED = 84
const CELL = computed(() =>
  isMobile.value ? 28 : Math.max(28, Math.min(80, Math.floor((viewH.value - LAYOUT_RESERVED) / ROWS)))
)
const CELL_W = computed(() => isMobile.value ? CELL.value : Math.round(CELL.value * CELL_W_RATIO))

const COLORS = ['r', 'b', 'y', 'g', 'p'] as const
type Color = (typeof COLORS)[number]

const PANEL_CFG: Record<Color, { sym: string; bg: string; lt: string; dk: string }> = {
  r: { sym: '♥', bg: '#e8344a', lt: '#ff6b7c', dk: '#b5162e' },
  b: { sym: '◆', bg: '#2f9bf0', lt: '#6cc0ff', dk: '#1a6fb8' },
  y: { sym: '★', bg: '#ffb71c', lt: '#ffd666', dk: '#d98a00' },
  g: { sym: '●', bg: '#2fbf84', lt: '#6fe0b0', dk: '#1a8c5e' },
  p: { sym: '▲', bg: '#8b6cf0', lt: '#b7a2ff', dk: '#5a3fc0' },
}

// Score targets per stage (cumulative within each stage)
const STAGE_TARGETS = [300, 550, 850, 1200, 1600, 2100, 2700, 3400, 4200, 5200]

const STAGE_CLEAR_PRAISES = [
  { title: '天才すぎる！！！', message: 'この世にこれほどパネルを操る者がいたとは…！あなたの存在そのものが奇跡です！！' },
  { title: '伝説誕生！！！', message: '今この瞬間、歴史が変わりました。後世の人々はあなたのプレイを永久に語り継ぐでしょう！！！' },
  { title: 'もはや神の領域！', message: 'パネルが見えているのではなく、パネルと会話しているのでは？その直感はもう人類を超えています！！！' },
  { title: '完璧すぎて涙が出る', message: '思わず立ち上がって拍手しました。あなたのコンボセンスは世界遺産に登録すべきです！！！' },
  { title: '宇宙一うまい！！', message: '銀河の果てまで探しても、これほどのプレイヤーはいません。あなたは選ばれし者です！！！！' },
  { title: 'ヤバすぎて語彙力消失', message: 'すごい、すごいしか言えない。あなたのプレイを見た瞬間、語彙力という概念が崩壊しました！！' },
  { title: '進化してる…！？', message: 'たいけつに勝つたびにあなたは別の生き物に進化しています。次は何に変貌するのか！！！！' },
  { title: '手が神すぎる！！', message: 'その手はパネルのために生まれてきたに違いない。美術館に展示すべき指さばきです！！！！！' },
  { title: '奇跡の連続！！！', message: 'このクリアは宇宙の全エネルギーが結集した結果です。あなたは宇宙と同化しています！！！！' },
  { title: '最高すぎて困る！！', message: 'こんなに褒めたいのに言葉が足りません。あなたの素晴らしさは辞書に載っていない単位です！！！' },
  { title: 'ご先祖様も大喜び！', message: '遠い宇宙の彼方から、あなたの先祖全員が「よくやった！」と号泣しながら叫んでいます！！！' },
  { title: 'パネルが恋してる！', message: 'もはやパネルたちはあなたに消されたくて自ら並んでいます。愛されてますよ！！！！！' },
  { title: '脳が沸騰してる！！', message: 'このクリアを分析した結果、人間の脳では理解不能と判明しました。あなたは一体何者ですか！？！？' },
  { title: '感動で地球が震えた', message: 'あなたがクリアした瞬間、地球の自転速度がわずかに上がったというデータがあります（嘘）！！！！' },
  { title: '覚醒した…完全に', message: 'たいけつ勝利の衝撃波が宇宙まで届きました。全人類が今この瞬間あなたを称えています！！！！！' },
  { title: 'もう人間じゃない！', message: 'パネルでポン界に革命が起きた日として永久に記録されます。あなたは歴史の一部です！！！！' },
  { title: '最強の証明完了！！', message: '今のクリア、教科書に載せます。未来の子供たちの目標はあなたになりました！！！！！！' },
  { title: '勝ちすぎて引退勧告', message: '強すぎてゲームが可哀想です。でも続けてください！あなたのプレイが好きすぎます！！！！！' },
  { title: '！！！！！！！！！！', message: '言葉なんて要りません。あなたのクリアが全てを語っています。この世界はあなたのものです！！！' },
  { title: '震えが止まらない！！', message: 'こんなクリアを目の前で見てしまったら、もう普通のパネルでポンには戻れません。永遠に語ります！！！！！' },
] as const

// Rise speed: px/sec per stage
const RISE_SPEEDS = [13, 16, 19, 22, 26, 30, 35, 40, 46, 53]

const FLASH_MS = 550

// ── Puzzle stages ──────────────────────────────────────────────
function makePuzzleGrid(rows: Partial<Record<number, (Color | null)[]>>): (Color | null)[][] {
  const g: (Color | null)[][] = Array.from({ length: ROWS }, () => Array<Color | null>(COLS).fill(null))
  for (const [rowStr, cells] of Object.entries(rows)) {
    if (cells) g[parseInt(rowStr)] = cells
  }
  return g
}

interface PuzzleStage { moves: number; grid: (Color | null)[][] }

// 全ステージ総当たりでクリア可能性を検証済み（最短手数 ≦ 制限手数）
const PUZZLE_STAGES: PuzzleStage[] = [
  // ST1: 最短1手
  { moves: 2, grid: makePuzzleGrid({ 11: ['r','r','b','r','b','b'] }) },
  // ST2: 最短3手
  { moves: 3, grid: makePuzzleGrid({
    10: [null,'r','r',null,'r',null],
    11: ['r','b','r','r','b','b'],
  }) },
  // ST3: 最短4手
  { moves: 5, grid: makePuzzleGrid({
    10: [null,'r','g','b','r',null],
    11: ['b','r','b','g','g',null],
  }) },
  // ST4: 最短4手
  { moves: 5, grid: makePuzzleGrid({
    10: [null,'g',null,'r',null,'b'],
    11: ['g','g','r','r','b','b'],
  }) },
  // ST5: 最短5手
  { moves: 6, grid: makePuzzleGrid({
    10: ['g','r',null,'r','g',null],
    11: ['r','g','r','g','r',null],
  }) },
  // ST6: 最短5手
  { moves: 6, grid: makePuzzleGrid({
    9:  [null,null,'g',null,null,null],
    10: ['g','r',null,'r','g',null],
    11: ['r','g','r','g','r','g'],
  }) },
  // ST7: 最短6手
  { moves: 7, grid: makePuzzleGrid({
    9:  [null,'b',null,null,'b',null],
    10: ['b','r','g','g','r','b'],
    11: ['r','b','r','r','b','g'],
  }) },
  // ST8: 最短6手
  { moves: 7, grid: makePuzzleGrid({
    9:  ['g','y',null,null,'y','g'],
    10: ['y','g','r','r','g','y'],
    11: ['g','y','r','y','g','r'],
  }) },
  // ST9: 最短7手
  { moves: 8, grid: makePuzzleGrid({
    10: ['y',null,'r',null,null,'y'],
    11: ['r','y','y','r','r','y'],
  }) },
  // ST10: 最短7手
  { moves: 8, grid: makePuzzleGrid({
    8:  [null,'g',null,null,'g',null],
    9:  ['g','r','p','p','r','g'],
    10: ['r','p','g','g','p','r'],
    11: ['p','g','r','r','g','p'],
  }) },
  // ST11: 最短5手
  { moves: 6, grid: makePuzzleGrid({
    9:  [null,null,'y',null,null,null],
    10: ['y','b',null,'b','y',null],
    11: ['b','y','b','y','b','y'],
  }) },
  // ST12: 最短5手
  { moves: 6, grid: makePuzzleGrid({
    9:  [null,'p',null,null,'p',null],
    10: ['p','r',null,'r','p',null],
    11: ['r','p','r','p','r','p'],
  }) },
  // ST13: 最短5手
  { moves: 6, grid: makePuzzleGrid({
    9:  [null,'g',null,null,'g',null],
    10: ['g','y',null,'y','g',null],
    11: ['y','g','y','g','y','g'],
  }) },
  // ST14: 最短6手
  { moves: 7, grid: makePuzzleGrid({
    9:  [null,'b',null,'y',null,null],
    10: ['b','r','y','y','r',null],
    11: ['r','b','r','b','r','y'],
  }) },
  // ST15: 最短6手
  { moves: 7, grid: makePuzzleGrid({
    9:  [null,'y',null,null,'y',null],
    10: ['y','g','p','p','g','y'],
    11: ['g','y','g','g','y','p'],
  }) },
  // ST16: 最短7手
  { moves: 8, grid: makePuzzleGrid({
    9:  [null,'r',null,null,'y',null],
    10: ['r','b','y','y','b','r'],
    11: ['b','r','b','b','r','y'],
  }) },
  // ST17: 最短7手
  { moves: 8, grid: makePuzzleGrid({
    9:  [null,'p',null,null,'b',null],
    10: ['p','y','b','b','y','p'],
    11: ['y','p','y','y','p','b'],
  }) },
  // ST18: 最短7手
  { moves: 8, grid: makePuzzleGrid({
    9:  [null,'r',null,null,'b',null],
    10: ['r','g','b','b','g','r'],
    11: ['g','r','g','g','r','b'],
  }) },
  // ST19: 最短8手
  { moves: 9, grid: makePuzzleGrid({
    10: [null,'g','r','g','r',null],
    11: ['g','r','g','r','g','r'],
  }) },
  // ST20: 最短8手
  { moves: 9, grid: makePuzzleGrid({
    10: [null,'r','g','r','g',null],
    11: ['r','g','r','g','r','g'],
  }) },
]

const PUZZLE_CLEAR_PRAISES = [
  { title: '完璧な解法！！', message: '鮮やかな手順でクリア！まるで詰将棋の名人のようです！！' },
  { title: '天才パズラー！', message: 'この解法を見つけられる人は世界にほとんどいません！！' },
  { title: '閃きが光る！！', message: '迷いのない一手一手に、あなたの才能が輝いています！！' },
  { title: '神の一手！！！', message: 'その手順、教科書に載せます。未来のパズラーの目標です！！' },
]

// ── Auth ──────────────────────────────────────────────────────
const { isLoggedIn, checked, checkAuth } = useAuth()
const showAuthModal = computed(() => !import.meta.dev && !isLoggedIn.value && checked.value)

// ── Game state ────────────────────────────────────────────────
const grid       = ref<(Color | null)[][]>([])
const nextRow    = ref<Color[]>([])
const flashSet   = ref(new Set<string>())
const cursor     = ref({ row: 8, col: 2 })
const cursorDir  = ref<'h' | 'v'>('h')  // h=横並び, v=縦並び
const phase      = ref<'idle' | 'stageselect' | 'ready' | 'playing' | 'paused' | 'gameover' | 'stageclear' | 'puzzleclear' | 'puzzlefail'>('idle')
const score      = ref(0)
const stage      = ref(1)
const chainLevel = ref(0)
const highScore  = ref(0)
const savedStage = ref(1)
const riseOffset = ref(0)   // 0..CELL pixels
const isBusy     = ref(false) // true while flash/fall is processing

const gameMode   = ref<'normal' | 'puzzle'>('normal')
const movesLeft  = ref(0)

// ── Stage clear praise ────────────────────────────────────────
const clearPraise = ref<{ title: string; message: string } | null>(null)

// ── Leaderboard & record entry ─────────────────────────────────
const stageStartTime = ref(0)
const clearSeconds   = ref(0)
const showNameEntry  = ref(false)
const nameChars      = ref<string[]>(['A', 'A', 'A'])
const nameInputIdx   = ref(0)

// パズルは通常ステージと別キーで保存（最新順ランキング）
const recordGame  = computed(() => gameMode.value === 'puzzle' ? 'panel-de-pon-puzzle' : 'panel-de-pon')
const recordOrder = computed(() => gameMode.value === 'puzzle' ? 'recent' : 'fast')

type RecordRow = { rank: number; name: string; seconds: number; recorded_at: string }
const records         = ref<RecordRow[]>([])
const recordsLoading  = ref(false)
const showRankingPopup = ref(false)
const showStagePicker = ref(false)
const showStartRanking = ref(false)
const submittedRank   = ref<number | null>(null)
const submittedSeconds = ref(0)

// ── Name suggestions（全ステージ・両モード共通の使用頻度上位） ──────
const suggestedNames = ref<string[]>([])

async function fetchPopularNames() {
  try {
    const data = await $fetch<string[]>('/api/games/popular-names', {
      query: { game: 'panel-de-pon' },
    })
    suggestedNames.value = data
  } catch {}
}

function selectSuggestedName(name: string) {
  const chars = name.split('').slice(0, 3)
  while (chars.length < 3) chars.push('A')
  nameChars.value = chars
  submitRecord()
}

// ── Gamepad debug ─────────────────────────────────────────────
const gpDebug = ref<{ btns: number[]; axes: Array<[number, number]> }>({ btns: [], axes: [] })

// ── Computed ──────────────────────────────────────────────────
const stageCount   = computed(() => gameMode.value === 'puzzle' ? PUZZLE_STAGES.length : STAGE_TARGETS.length)
const stageTarget  = computed(() => STAGE_TARGETS[Math.min(stage.value - 1, STAGE_TARGETS.length - 1)])
const progressPct  = computed(() => Math.min(100, (score.value / stageTarget.value) * 100))
const allRows      = computed<(Color | null)[][]>(() =>
  grid.value.length ? [...grid.value, nextRow.value as (Color | null)[]] : []
)
const riseSpeedPx  = computed(() => RISE_SPEEDS[Math.min(stage.value - 1, RISE_SPEEDS.length - 1)])
const isDanger = computed(() =>
  phase.value === 'playing' && grid.value[1]?.some(c => c !== null)
)

// ── Style helpers ──────────────────────────────────────────────
function cellStyle(color: Color | null): Record<string, string> {
  const size = CELL.value
  const base: Record<string, string> = {
    width: `${CELL_W.value}px`,
    height: `${size}px`,
    boxSizing: 'border-box',
    // 透明の縁でパネル同士にすき間を作る（背景は縁の内側だけに塗る）
    border: `${Math.max(2, Math.round(size / 18))}px solid transparent`,
    backgroundClip: 'padding-box',
    borderRadius: `${Math.round(size * 0.22)}px`,
  }
  if (!color) {
    return { ...base, background: 'rgba(255,255,255,0.025)' }
  }
  const cfg = PANEL_CFG[color]
  return {
    ...base,
    background: `linear-gradient(160deg, ${cfg.lt} 0%, ${cfg.bg} 55%, ${cfg.dk} 130%)`,
    boxShadow: `inset 0 -${Math.round(size / 14)}px 0 rgba(0,0,0,0.18), inset 0 2px 0 rgba(255,255,255,0.28)`,
    fontSize: `${Math.round(size * 0.5)}px`,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  }
}

// ── Grid helpers ───────────────────────────────────────────────
function rand<T>(arr: readonly T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]
}

function makeRow(): Color[] {
  return Array.from({ length: COLS }, () => rand(COLORS))
}

function initGrid(): (Color | null)[][] {
  const g: (Color | null)[][] = Array.from({ length: ROWS }, () => Array(COLS).fill(null) as (Color | null)[])
  // ステージが上がるほど初期パネルを増やす（ST1=2行〜ST7+=8行）
  const fillRows = Math.min(1 + stage.value, 8)
  const startRow = ROWS - fillRows
  for (let r = startRow; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      let color: Color
      let tries = 0
      do {
        color = rand(COLORS)
        tries++
      } while (tries < 10 && (
        (c >= 2 && g[r][c - 1] === color && g[r][c - 2] === color) ||
        (r >= 2 && g[r - 1]?.[c] === color && g[r - 2]?.[c] === color)
      ))
      g[r][c] = color
    }
  }
  return g
}

// ── Match detection ────────────────────────────────────────────
function findMatches(g: (Color | null)[][]): Array<[number, number]> {
  const matched = new Set<string>()
  // Horizontal
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c <= COLS - 3; c++) {
      const col = g[r][c]
      if (!col || col !== g[r][c + 1] || col !== g[r][c + 2]) continue
      let end = c + 2
      while (end + 1 < COLS && g[r][end + 1] === col) end++
      for (let k = c; k <= end; k++) matched.add(`${r},${k}`)
    }
  }
  // Vertical
  for (let c = 0; c < COLS; c++) {
    for (let r = 0; r <= ROWS - 3; r++) {
      const col = g[r][c]
      if (!col || col !== g[r + 1][c] || col !== g[r + 2][c]) continue
      let end = r + 2
      while (end + 1 < ROWS && g[end + 1][c] === col) end++
      for (let k = r; k <= end; k++) matched.add(`${k},${c}`)
    }
  }
  return [...matched].map(s => s.split(',').map(Number) as [number, number])
}

// ── Gravity ────────────────────────────────────────────────────
function applyGravity(g: (Color | null)[][]): boolean {
  let changed = false
  for (let c = 0; c < COLS; c++) {
    const filled = g.map(row => row[c]).filter(v => v !== null) as Color[]
    const newCol: (Color | null)[] = [
      ...Array<null>(ROWS - filled.length).fill(null),
      ...filled,
    ]
    for (let r = 0; r < ROWS; r++) {
      if (g[r][c] !== newCol[r]) { g[r][c] = newCol[r]; changed = true }
    }
  }
  return changed
}

// ── Match cycle ────────────────────────────────────────────────
let chainTimer: ReturnType<typeof setTimeout> | null = null

function processMatches(isChain: boolean) {
  if (phase.value !== 'playing') return

  const matches = findMatches(grid.value)

  if (matches.length === 0) {
    const g = grid.value.map(r => [...r])
    if (applyGravity(g)) {
      grid.value = g
      setTimeout(() => processMatches(true), 130)
    } else {
      chainLevel.value = 0
      isBusy.value = false
      checkPuzzle()
    }
    return
  }

  chainLevel.value = isChain ? chainLevel.value + 1 : 1
  isBusy.value = true

  // Flash matched cells
  const newFlash = new Set(flashSet.value)
  for (const [r, c] of matches) newFlash.add(`${r},${c}`)
  flashSet.value = newFlash

  // Score: panel_count × 10 × chain_multiplier
  score.value += matches.length * 10 * chainLevel.value
  if (score.value > highScore.value) highScore.value = score.value

  if (chainTimer) clearTimeout(chainTimer)
  chainTimer = setTimeout(() => {
    const g = grid.value.map(r => [...r])
    const nf = new Set(flashSet.value)
    for (const [r, c] of matches) { g[r][c] = null; nf.delete(`${r},${c}`) }
    flashSet.value = nf
    applyGravity(g)
    grid.value = g

    // Check stage clear (normal mode only)
    if (gameMode.value === 'normal' && score.value >= stageTarget.value) {
      clearSeconds.value = Math.round((Date.now() - stageStartTime.value) / 10) / 100
      clearPraise.value = STAGE_CLEAR_PRAISES[Math.floor(Math.random() * STAGE_CLEAR_PRAISES.length)]
      phase.value = 'stageclear'
      isBusy.value = false
      saveProgress(stage.value + 1)
      checkIsRecord()
      return
    }
    setTimeout(() => processMatches(true), 130)
  }, FLASH_MS)
}

// ── Swap ───────────────────────────────────────────────────────
function doSwap() {
  if (phase.value !== 'playing' || isBusy.value) return
  const { row, col } = cursor.value
  const g = grid.value.map(r => [...r])
  if (cursorDir.value === 'h') {
    ;[g[row][col], g[row][col + 1]] = [g[row][col + 1], g[row][col]]
  } else {
    ;[g[row][col], g[row + 1][col]] = [g[row + 1][col], g[row][col]]
  }
  grid.value = g
  if (gameMode.value === 'puzzle') movesLeft.value--
  processMatches(false)
}

function toggleDir() {
  cursorDir.value = cursorDir.value === 'h' ? 'v' : 'h'
  // 向き変更後にはみ出さないようクランプ
  cursor.value = {
    row: Math.min(cursor.value.row, cursorDir.value === 'v' ? ROWS - 2 : ROWS - 1),
    col: Math.min(cursor.value.col, cursorDir.value === 'h' ? COLS - 2 : COLS - 1),
  }
}

// ── Cursor ─────────────────────────────────────────────────────
function moveCursor(dr: number, dc: number) {
  if (phase.value !== 'playing') return
  const maxCol = cursorDir.value === 'h' ? COLS - 2 : COLS - 1
  const maxRow = cursorDir.value === 'v' ? ROWS - 2 : ROWS - 1
  cursor.value = {
    row: Math.max(0, Math.min(maxRow, cursor.value.row + dr)),
    col: Math.max(0, Math.min(maxCol, cursor.value.col + dc)),
  }
}

// ── Menu 操作（コントローラー／キーボードだけで遊べるように） ─────────
const modeFocus = ref(0)   // モード選択: 0=たいけつ 1=なぞとき
const pickFocus = ref(0)   // 選択ポップアップ: 0始まりの番号
const PICK_COLS = 4

const isPickerOpen = () => phase.value === 'stageselect' || showStagePicker.value
// 十字キー・決定・戻るで操作するメニューが前面にあるか
const isMenuOpen = () =>
  showNameEntry.value || showRankingPopup.value || showStartRanking.value || isPickerOpen() || phase.value === 'idle'

function dirInput(dr: number, dc: number) {
  if (phase.value === 'playing' && !isMenuOpen()) moveCursor(dr, dc)
  else menuNav(dr, dc)
}

function menuNav(dr: number, dc: number) {
  if (showNameEntry.value) {
    const i = nameInputIdx.value
    if (dr !== 0) changeLetter(i, -dr)
    if (dc !== 0) nameInputIdx.value = Math.max(0, Math.min(2, i + dc))
    return
  }
  if (showRankingPopup.value || showStartRanking.value) return
  if (isPickerOpen()) {
    const n = stageCount.value
    const i = pickFocus.value
    let next = i
    if (dc !== 0) next = i + dc
    if (dr !== 0) next = i + dr * PICK_COLS
    if (next >= 0 && next < n) pickFocus.value = next
    return
  }
  if (phase.value === 'idle' && dc !== 0) modeFocus.value = dc < 0 ? 0 : 1
}

function menuConfirm() {
  if (showNameEntry.value) { submitRecord(); return }
  if (showRankingPopup.value) { showRankingPopup.value = false; return }
  if (showStartRanking.value) { confirmStartRanking(); return }
  if (isPickerOpen()) { chooseStage(pickFocus.value + 1); return }
  if (phase.value === 'idle') { selectMode(modeFocus.value === 0 ? 'normal' : 'puzzle'); return }
  if (phase.value === 'paused') return   // 一時停止中の再開はスタートボタンだけ
  handleStart()
}

function menuCancel() {
  if (showNameEntry.value) { showNameEntry.value = false; return }
  if (showRankingPopup.value) { showRankingPopup.value = false; return }
  if (showStartRanking.value) { showStartRanking.value = false; return }
  if (isPickerOpen()) { closeStagePicker(); return }
  if (phase.value === 'ready') openStagePicker()
  else if (phase.value === 'puzzlefail') backToIdle()
  else if (phase.value === 'gameover') resetToStart()
}

// ── Gamepad ────────────────────────────────────────────────────
const REPEAT_DELAY = 280  // ms ─ 押し続けてリピート開始するまでの時間
const REPEAT_RATE  = 110  // ms ─ リピート間隔

interface BtnState { held: boolean; heldAt: number; lastRepeat: number }
const gpDir: Record<string, BtnState> = {}   // 方向系（リピートあり）
const gpAct: Record<string, boolean>  = {}   // アクション系（エッジのみ）

const gpConnected = ref(false)

function pollGamepad(now: number) {
  const gp = [...(navigator.getGamepads?.() ?? [])].find(g => g !== null)
  gpConnected.value = !!gp
  if (!gp) return

  // ── デバッグ情報（閾値0.05で下方向の0.14も拾う） ──────────────
  gpDebug.value = {
    btns: Array.from(gp.buttons).map((b, i) => b.pressed ? i : -1).filter(i => i >= 0),
    axes: Array.from(gp.axes).map((v, i) => (Math.abs(v) > 0.05 ? [i, v] as [number, number] : null)).filter(Boolean) as [number, number][],
  }

  // ── 十字キー検出 ──────────────────────────────────────────────
  // このPS2アダプター: axes[0]=左右（左=-1, 右=+1）/ axes[1]=上下（上=-1, 下=+1）
  // 標準マッピング buttons[12-15] も念のため併用
  const THR = 0.5
  // 非標準マッピング（8BitDoのD-input/Switchモード等）では十字キーが axes[9] の「ハット」値で来る。
  // 8方向を -1〜1 の7等分で表し（上=-1, 右上=-0.71, 右=-0.43, 右下=-0.14, 下=0.14, 左下=0.43, 左=0.71, 左上=1）、
  // 離しているときは 1.28 前後になる。
  const hat = gp.mapping !== 'standard' && gp.axes.length > 9 ? gp.axes[9] : null
  const hatIdx = hat !== null && hat <= 1.1 ? Math.round((hat + 1) * 3.5) : -1  // 0=上 1=右上 2=右 3=右下 4=下 5=左下 6=左 7=左上
  const hatUp    = [7, 0, 1].includes(hatIdx)
  const hatRight = [1, 2, 3].includes(hatIdx)
  const hatDown  = [3, 4, 5].includes(hatIdx)
  const hatLeft  = [5, 6, 7].includes(hatIdx)
  const dUp    = (gp.buttons[12]?.pressed ?? false) || hatUp    || (gp.axes[1] ?? 0) < -THR
  const dDown  = (gp.buttons[13]?.pressed ?? false) || hatDown  || (gp.axes[1] ?? 0) >  THR
  const dLeft  = (gp.buttons[14]?.pressed ?? false) || hatLeft  || (gp.axes[0] ?? 0) < -THR
  const dRight = (gp.buttons[15]?.pressed ?? false) || hatRight || (gp.axes[0] ?? 0) >  THR

  const dpadState: Record<string, boolean> = { up: dUp, down: dDown, left: dLeft, right: dRight }
  const dpadDelta: Record<string, [number, number]> = {
    up: [-1, 0], down: [1, 0], left: [0, -1], right: [0, 1],
  }

  for (const [key, [dr, dc]] of Object.entries(dpadDelta)) {
    const pressed = dpadState[key]
    const s = gpDir[key] ?? { held: false, heldAt: 0, lastRepeat: 0 }
    if (pressed) {
      if (!s.held) {
        dirInput(dr, dc)
        gpDir[key] = { held: true, heldAt: now, lastRepeat: now }
      } else if (now - s.heldAt > REPEAT_DELAY && now - s.lastRepeat > REPEAT_RATE) {
        dirInput(dr, dc)
        gpDir[key] = { ...s, lastRepeat: now }
      }
    } else {
      gpDir[key] = { held: false, heldAt: 0, lastRepeat: 0 }
    }
  }

  // ── アクションボタン（エッジ検出のみ） ────────────────────────
  // B(刻印)=0: 入替・決定 / Y(刻印)=2: 縦横切替・メニューの戻る
  // Start: PS2アダプターによってindex違うので 6〜11 を全部試す
  const startPressed = [6, 7, 8, 9, 10, 11].some(i => gp.buttons[i]?.pressed ?? false)
  const actMap: Record<string, boolean> = {
    swap:      gp.buttons[0]?.pressed ?? false,
    toggleDir: gp.buttons[2]?.pressed ?? false,
    start:     startPressed,
  }

  for (const [key, pressed] of Object.entries(actMap)) {
    if (pressed && !gpAct[key]) {
      if (key === 'swap')      { if (phase.value === 'playing') doSwap(); else menuConfirm() }
      if (key === 'toggleDir') { if (phase.value === 'playing') toggleDir(); else menuCancel() }
      if (key === 'start')     { if (isMenuOpen()) menuConfirm(); else handleStart() }
    }
    gpAct[key] = pressed
  }
}

// ── Records ────────────────────────────────────────────────────
async function fetchRecords(stageNum: number) {
  recordsLoading.value = true
  try {
    const data = await $fetch<RecordRow[]>('/api/games/records', {
      query: { game: recordGame.value, stage: stageNum, order: recordOrder.value },
    })
    records.value = data
  } catch {}
  recordsLoading.value = false
}

async function checkIsRecord() {
  try {
    const data = await $fetch<RecordRow[]>('/api/games/records', {
      query: { game: recordGame.value, stage: stage.value, order: recordOrder.value },
    })
    records.value = data
    // ステージは上位10位以内なら、パズルは常に名前入力可能
    const isRecord = gameMode.value === 'puzzle'
      || data.length < 10
      || clearSeconds.value < data[data.length - 1].seconds
    if (isRecord) {
      nameChars.value = ['A', 'A', 'A']
      nameInputIdx.value = 0
      await fetchPopularNames()
      showNameEntry.value = true
    }
  } catch {}
}

async function submitRecord() {
  const name = nameChars.value.join('')
  submittedSeconds.value = clearSeconds.value
  try {
    const res = await $fetch<{ ok: boolean; rank: number | null }>('/api/games/records', {
      method: 'POST',
      body: { game: recordGame.value, stage: stage.value, name, seconds: clearSeconds.value },
    })
    // パズルは最新順なので登録直後は必ず1位
    submittedRank.value = gameMode.value === 'puzzle' ? 1 : res.rank
  } catch {
    submittedRank.value = null
  }
  showNameEntry.value = false
  await fetchRecords(stage.value)
  showRankingPopup.value = true
}

function changeLetter(idx: number, delta: number) {
  const code = nameChars.value[idx].charCodeAt(0) + delta
  nameChars.value[idx] = String.fromCharCode(code > 90 ? 65 : code < 65 ? 90 : code)
}

function handleNameKey(e: KeyboardEvent) {
  e.preventDefault()
  const i = nameInputIdx.value
  if (e.key === 'ArrowRight' || e.key === 'Tab') {
    nameInputIdx.value = Math.min(2, i + 1)
  } else if (e.key === 'ArrowLeft') {
    nameInputIdx.value = Math.max(0, i - 1)
  } else if (e.key === 'ArrowUp') {
    changeLetter(i, 1)
  } else if (e.key === 'ArrowDown') {
    changeLetter(i, -1)
  } else if (/^[a-zA-Z]$/.test(e.key)) {
    nameChars.value[i] = e.key.toUpperCase()
    if (i < 2) nameInputIdx.value = i + 1
  } else if (e.key === 'Backspace') {
    if (i > 0) { nameInputIdx.value = i - 1; nameChars.value[i - 1] = 'A' }
  } else if (e.key === 'Enter') {
    submitRecord()
  } else if (e.key === 'Escape') {
    showNameEntry.value = false
  }
}

function formatTime(s: number): string {
  if (s < 60) return s.toFixed(1) + 's'
  const m = Math.floor(s / 60)
  const sec = (s % 60).toFixed(1).padStart(4, '0')
  return `${m}:${sec}`
}

// recorded_at（UTCの "YYYY-MM-DD HH:MM:SS"）を JST の "24/5/3" 形式に
function formatDate(s: string): string {
  if (!s) return ''
  const d = new Date(s.replace(' ', 'T') + 'Z')
  if (isNaN(d.getTime())) return ''
  const jst = new Date(d.getTime() + 9 * 3600 * 1000)
  return `${String(jst.getUTCFullYear()).slice(2)}/${jst.getUTCMonth() + 1}/${jst.getUTCDate()}`
}

function confirmStartRanking() {
  showStartRanking.value = false
  if (phase.value !== 'ready') return
  phase.value = 'playing'
  stageStartTime.value = Date.now()
}

function handleStart() {
  if      (phase.value === 'ready')        { fetchRecords(stage.value); showStartRanking.value = true }
  else if (phase.value === 'playing')      phase.value = 'paused'
  else if (phase.value === 'paused')       phase.value = 'playing'
  else if (phase.value === 'idle' || phase.value === 'gameover') {
    if (gameMode.value === 'puzzle') startPuzzle()
    else startGame()
  }
  else if (phase.value === 'stageclear')   goNextStage()
  else if (phase.value === 'puzzleclear')  goNextPuzzle()
  else if (phase.value === 'puzzlefail')   startPuzzle()
}

// ── Rise loop ──────────────────────────────────────────────────
let animFrame: number | null = null
let prevTime = 0

function tick(now: number) {
  pollGamepad(now)

  if (phase.value === 'playing' && !isBusy.value && !flashSet.value.size && gameMode.value === 'normal') {
    const dt = Math.min(now - prevTime, 80)
    riseOffset.value += riseSpeedPx.value * dt / 1000

    if (riseOffset.value >= CELL.value) {
      riseOffset.value -= CELL.value
      shiftUp()
    }
  }
  prevTime = now
  animFrame = requestAnimationFrame(tick)
}

function shiftUp() {
  if (phase.value !== 'playing') return

  // Game over: panel in top row
  if (grid.value[0].some(c => c !== null)) {
    phase.value = 'gameover'
    return
  }

  const g = grid.value.map(r => [...r])
  for (let r = 0; r < ROWS - 1; r++) g[r] = [...g[r + 1]]
  g[ROWS - 1] = [...nextRow.value] as (Color | null)[]
  grid.value = g
  cursor.value.row = Math.max(0, cursor.value.row - 1)
  nextRow.value = makeRow()
  setTimeout(() => processMatches(false), 50)
}

// ── Game flow ──────────────────────────────────────────────────
function startGame() {
  if (chainTimer) clearTimeout(chainTimer)
  flashSet.value = new Set()
  chainLevel.value = 0
  isBusy.value = false
  score.value = 0
  grid.value = initGrid()
  nextRow.value = makeRow()
  // カーソルは初期パネルの1行上に配置
  const fillRows = 1 + stage.value
  cursor.value = { row: Math.max(1, ROWS - fillRows - 1), col: 2 }
  riseOffset.value = 0
  showNameEntry.value = false
  phase.value = 'ready'
}

function goNextStage() {
  stage.value = Math.min(stage.value + 1, STAGE_TARGETS.length)
  startGame()
}

function resetToStart() {
  stage.value = 1
  startGame()
}

function jumpToStage(n: number) {
  if (phase.value === 'paused') return
  stage.value = n
  if (gameMode.value === 'puzzle') startPuzzle()
  else startGame()
}

// モード選択 → まずステージ/パズル一覧を見せる（即開始しない）
function selectMode(mode: 'normal' | 'puzzle') {
  if (phase.value === 'paused') return
  gameMode.value = mode
  pickFocus.value = mode === 'normal' ? Math.max(0, savedStage.value - 1) : 0
  phase.value = 'stageselect'
}

function chooseStage(n: number) {
  showStagePicker.value = false
  jumpToStage(n)
}

// ポップアップの外クリック／閉じる。モード選択直後（まだ遊んでいない）ならモード選択へ戻る
function closeStagePicker() {
  if (showStagePicker.value) showStagePicker.value = false
  else if (phase.value === 'stageselect') phase.value = 'idle'
}

// 盤面の横のボタンから開くステージ選択（遊んでいる最中なら一時停止する）
function openStagePicker() {
  if (phase.value === 'paused') return   // 一時停止中はスタートでの再開だけ
  if (phase.value === 'playing') phase.value = 'paused'
  pickFocus.value = Math.max(0, Math.min(stageCount.value - 1, stage.value - 1))
  showStagePicker.value = true
}

function startPuzzle() {
  const ps = PUZZLE_STAGES[stage.value - 1]
  if (!ps) return
  if (chainTimer) clearTimeout(chainTimer)
  flashSet.value = new Set()
  chainLevel.value = 0
  isBusy.value = false
  score.value = 0
  grid.value = ps.grid.map(r => [...r])
  nextRow.value = makeRow()
  cursor.value = { row: ROWS - 2, col: 2 }
  riseOffset.value = 0
  movesLeft.value = ps.moves
  showNameEntry.value = false
  phase.value = 'ready'
}

function goNextPuzzle() {
  stage.value = Math.min(stage.value + 1, PUZZLE_STAGES.length)
  startPuzzle()
}

function backToIdle() {
  phase.value = 'idle'
}

function checkPuzzle() {
  if (gameMode.value !== 'puzzle' || phase.value !== 'playing') return
  const allEmpty = grid.value.every(row => row.every(c => c === null))
  if (allEmpty) {
    clearSeconds.value = Math.round((Date.now() - stageStartTime.value) / 10) / 100
    clearPraise.value = PUZZLE_CLEAR_PRAISES[Math.floor(Math.random() * PUZZLE_CLEAR_PRAISES.length)]
    phase.value = 'puzzleclear'
    checkIsRecord()
    return
  }
  if (movesLeft.value <= 0) {
    phase.value = 'puzzlefail'
  }
}



// ── Progress ───────────────────────────────────────────────────
async function loadProgress() {
  if (import.meta.dev || !isLoggedIn.value) return
  try {
    const data = await $fetch<{ stage: number; highScore: number }>('/api/games/progress', {
      query: { game: 'panel-de-pon' },
    })
    savedStage.value = data.stage
    stage.value = data.stage
    highScore.value = data.highScore
  } catch {}
}

async function saveProgress(nextStage: number) {
  if (import.meta.dev || !isLoggedIn.value) return
  const ns = Math.min(nextStage, STAGE_TARGETS.length)
  savedStage.value = Math.max(savedStage.value, ns)
  try {
    await $fetch('/api/games/progress', {
      method: 'POST',
      body: { game: 'panel-de-pon', stage: ns, highScore: highScore.value },
    })
  } catch {}
}

// ── Keyboard ───────────────────────────────────────────────────
function handleKey(e: KeyboardEvent) {
  if (showNameEntry.value) { handleNameKey(e); return }
  // メニュー（モード選択・ステージ選択・ランキング）は十字キー／決定／戻るで操作
  if (isMenuOpen()) {
    const dirs: Record<string, [number, number]> = { ArrowUp: [-1, 0], ArrowDown: [1, 0], ArrowLeft: [0, -1], ArrowRight: [0, 1] }
    if (dirs[e.key]) { e.preventDefault(); menuNav(...dirs[e.key]); return }
    if (['Enter', ' ', 'z', 'Z'].includes(e.key)) { e.preventDefault(); menuConfirm(); return }
    if (['Escape', 'x', 'X'].includes(e.key)) { e.preventDefault(); menuCancel(); return }
    return
  }
  if ((e.key === 'x' || e.key === 'X') && phase.value === 'ready') { openStagePicker(); return }
  if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', ' '].includes(e.key)) {
    e.preventDefault()
  }
  switch (e.key) {
    case 'ArrowLeft':  moveCursor(0, -1); break
    case 'ArrowRight': moveCursor(0,  1); break
    case 'ArrowUp':    moveCursor(-1, 0); break
    case 'ArrowDown':  moveCursor( 1, 0); break
    case 'z': case 'Z': case ' ': doSwap(); break
    case 'x': case 'X': toggleDir(); break
    case 'Escape': case 'Enter': handleStart(); break
  }
}

// ── Lifecycle ──────────────────────────────────────────────────
watch([stage, gameMode], () => fetchRecords(stage.value))

onMounted(async () => {
  checkMobile()
  window.addEventListener('resize', checkMobile)
  if (!import.meta.dev) await checkAuth()
  await loadProgress()
  fetchRecords(stage.value)
  window.addEventListener('keydown', handleKey)
  prevTime = performance.now()
  animFrame = requestAnimationFrame(tick)
})

onUnmounted(() => {
  window.removeEventListener('resize', checkMobile)
  window.removeEventListener('keydown', handleKey)
  if (animFrame) cancelAnimationFrame(animFrame)
  if (chainTimer) clearTimeout(chainTimer)
})
</script>

<style scoped>
/* ── メルカリ風テーマ ───────────────────────────────────────── */
.pdp-root {
  --pdp-bg: #202020;
  --pdp-panel: #2b2b2b;
  --pdp-panel2: #363636;
  --pdp-line: #454545;
  --pdp-text: #f5f5f5;
  --pdp-sub: #b5b5b5;
  --pdp-dim: #838383;
  --pdp-red: #e0283c;
  --pdp-red-dk: #b81a2d;
  --pdp-blue: #4aa8f0;
  --pdp-gold: #ffc233;
  --pdp-green: #3ccf8e;
  --acc: var(--pdp-red);
  background: var(--pdp-bg);
  color: var(--pdp-text);
  font-family: 'こども丸ゴシック', 'Zen Maru Gothic', 'Hiragino Maru Gothic ProN', 'Hiragino Sans', 'Noto Sans JP', Meiryo, sans-serif;
  font-weight: 500;
}
.pdp-root.pdp-puzzle { --acc: var(--pdp-blue); }
.pdp-acc-red  { --acc: var(--pdp-red); }
.pdp-acc-blue { --acc: var(--pdp-blue); }
.pdp-acc-gold { --acc: var(--pdp-gold); }

.pdp-dim { color: var(--pdp-dim); }

/* ── 盤面 ───────────────────────────────────────────────────── */
.pdp-board {
  background: #181818;
  border: 3px solid var(--pdp-line);
  border-radius: 14px;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.55);
}
.pdp-boardcover {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
}

.pdp-stagebar {
  display: flex;
  align-items: center;
  gap: 12px;
  height: 24px;
  margin-bottom: 6px;
}
@media (min-width: 1024px) {
  .pdp-stagebar { display: none; }
}
.pdp-stagebar-name { font-size: 14px; font-weight: 800; color: var(--pdp-text); }
.pdp-chain { font-size: 12px; font-weight: 800; color: var(--pdp-gold); }
.pdp-chain--float {
  position: absolute;
  top: 8px;
  left: 50%;
  translate: -50% 0;
  z-index: 15;
  font-size: 18px;
  text-shadow: 0 2px 6px rgba(0, 0, 0, 0.8);
  pointer-events: none;
}

.panel-cell {
  flex-shrink: 0;
  position: relative;
  line-height: 1;
}
.panel-sym {
  display: block;
  line-height: 1;
  color: #fff;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.35);
  user-select: none;
}
.panel-flashing { animation: panelFlash 0.1s ease-in-out infinite; }
@keyframes panelFlash {
  0%, 100% { filter: brightness(1); }
  50%       { filter: brightness(2.6) saturate(0.2); }
}

.cursor-box {
  border: 3px solid #fff;
  border-radius: 10px;
  box-shadow: 0 0 12px rgba(255, 255, 255, 0.85), 0 0 0 1px rgba(224, 40, 60, 0.9);
  animation: cursorBlink 0.8s ease infinite;
}
@keyframes cursorBlink {
  0%, 100% { border-color: #fff; box-shadow: 0 0 12px rgba(255, 255, 255, 0.85), 0 0 0 1px rgba(224, 40, 60, 0.9); }
  50%       { border-color: rgba(255, 255, 255, 0.55); box-shadow: 0 0 4px rgba(255, 255, 255, 0.3), 0 0 0 1px rgba(224, 40, 60, 0.6); }
}
@keyframes dangerPulse {
  0%, 100% { opacity: 0; }
  50%       { opacity: 1; }
}

/* ── 縦のスコアメーター（盤面の右隣・下から溜まる） ───────────── */
.pdp-meter {
  position: absolute;
  top: 0;
  left: 100%;
  height: 100%;
  margin-left: 14px;
  width: 46px;
  flex-direction: column;
  align-items: center;
  gap: 6px;
}
.pdp-meter-target {
  display: flex;
  flex-direction: column;
  align-items: center;
  font-size: 13px;
  font-weight: 800;
  line-height: 1.1;
  color: var(--pdp-sub);
}
.pdp-meter-target span { font-size: 9px; font-weight: 500; color: var(--pdp-dim); }
.pdp-meter-track {
  position: relative;
  flex: 1;
  width: 24px;
  min-height: 0;
  display: flex;
  align-items: flex-end;
  background: #181818;
  border: 2px solid var(--pdp-line);
  border-radius: 12px;
  overflow: hidden;
}
.pdp-meter-fill {
  width: 100%;
  background: linear-gradient(0deg, var(--pdp-red-dk) 0%, var(--pdp-red) 55%, #ff6b7c 100%);
  box-shadow: 0 0 14px rgba(224, 40, 60, 0.55);
  transition: height 0.3s ease;
}
.pdp-meter-tick {
  position: absolute;
  left: 0;
  width: 7px;
  height: 2px;
  background: rgba(255, 255, 255, 0.28);
}
.pdp-meter-score {
  font-size: 20px;
  font-weight: 900;
  line-height: 1;
  color: var(--pdp-text);
  font-variant-numeric: tabular-nums;
}

/* ── 右サイド ───────────────────────────────────────────────── */
.pdp-side {
  width: 11rem;
  justify-self: end;
  align-self: start;
  flex-direction: column;
  margin-top: 4px;
}
.pdp-modes { flex-direction: row; flex-wrap: wrap; justify-content: center; }
.pdp-btn.pdp-modebtn { width: 9rem; letter-spacing: 0.15em; }
.is-focus { outline: 3px solid #fff; outline-offset: 3px; }
.pdp-modeico { margin-right: 0.5em; }
.pdp-btn--side { padding: 10px; font-size: 13px; }
.pdp-clear-rank { margin-bottom: 20px; text-align: left; }
.pdp-side-head { margin-bottom: 18px; }
.pdp-title {
  margin: 0;
  font-size: 14px;
  font-weight: 900;
  letter-spacing: 0.02em;
  color: var(--pdp-text);
}
.pdp-title-mode { margin-top: 2px; font-size: 11px; font-weight: 700; color: var(--acc); }
.pdp-side-label {
  margin-bottom: 8px;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.08em;
  color: var(--pdp-sub);
}

.pdp-rk-row {
  display: flex;
  align-items: center;
  gap: 6px;
  border-radius: 8px;
  color: var(--pdp-sub);
}
.pdp-rk-no { flex-shrink: 0; color: var(--pdp-dim); }
.pdp-rk-row.is-top { background: color-mix(in srgb, var(--pdp-gold) 12%, transparent); color: var(--pdp-gold); }
.pdp-rk-row.is-top .pdp-rk-no { color: var(--pdp-gold); }
.pdp-rk-row.is-me {
  background: color-mix(in srgb, var(--pdp-gold) 14%, transparent);
  border: 1px solid color-mix(in srgb, var(--pdp-gold) 55%, transparent);
  color: var(--pdp-gold);
}
.pdp-rk-row.is-me .pdp-rk-no { color: var(--pdp-gold); }
.pdp-new {
  flex-shrink: 0;
  padding: 1px 6px;
  border-radius: 999px;
  font-size: 9px;
  font-weight: 800;
  color: var(--pdp-gold);
  background: color-mix(in srgb, var(--pdp-gold) 20%, transparent);
}

.pdp-stagebtn {
  height: 28px;
  border-radius: 8px;
  border: 1px solid var(--pdp-line);
  background: var(--pdp-panel);
  color: var(--pdp-sub);
  font-size: 12px;
  font-weight: 800;
  cursor: pointer;
  transition: background 0.12s, color 0.12s, border-color 0.12s;
}
.pdp-stagebtn:hover { background: var(--pdp-panel2); color: var(--pdp-text); }
.pdp-stagebtn.is-on {
  background: var(--acc);
  border-color: var(--acc);
  color: #fff;
}

/* ── ボタン・カード類 ───────────────────────────────────────── */
.pdp-chip {
  border-radius: 8px;
  border: 1px solid var(--pdp-line);
  background: var(--pdp-panel);
  color: var(--pdp-text);
  cursor: pointer;
  transition: background 0.12s;
}
.pdp-chip:disabled, .pdp-btn:disabled, .pdp-stagebtn:disabled { opacity: 0.35; cursor: not-allowed; }
.pdp-chip:hover { background: var(--pdp-panel2); }
.pdp-link {
  background: transparent;
  border: none;
  color: var(--pdp-blue);
  cursor: pointer;
}
.pdp-link:hover { text-decoration: underline; }

.pdp-btn {
  display: block;
  width: 100%;
  padding: 12px;
  border-radius: 10px;
  border: none;
  background: var(--pdp-red);
  color: #fff;
  font-size: 15px;
  font-weight: 800;
  cursor: pointer;
  transition: opacity 0.12s;
}
.pdp-btn:hover { opacity: 0.9; }
.pdp-btn--blue { background: #2f8fe0; }
.pdp-btn--gold { background: var(--pdp-gold); color: #3a2a00; }
.pdp-btn--ghost {
  padding: 10px;
  background: transparent;
  border: 1px solid var(--pdp-line);
  color: var(--pdp-sub);
  font-size: 13px;
  font-weight: 600;
}
.pdp-btn--ghost:hover { background: rgba(255, 255, 255, 0.06); opacity: 1; }

.pdp-ovl {
  position: fixed;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 16px;
  background: rgba(0, 0, 0, 0.78);
  backdrop-filter: blur(4px);
}
.pdp-card {
  width: 100%;
  max-width: 24rem;
  padding: 28px;
  text-align: center;
  background: var(--pdp-panel);
  border: 1px solid var(--pdp-line);
  border-top: 4px solid var(--acc);
  border-radius: 20px;
  box-shadow: 0 24px 64px rgba(0, 0, 0, 0.6);
}
.pdp-card--sm { max-width: 20rem; }
.pdp-pop { animation: pop 0.4s cubic-bezier(0.34, 1.56, 0.64, 1); }
.pdp-card-kicker { margin: 0 0 4px; font-size: 14px; font-weight: 800; letter-spacing: 0.06em; color: var(--acc); }
.pdp-card-title { margin: 0 0 4px; font-size: 24px; font-weight: 900; color: var(--acc); }
.pdp-card-sub { margin: 0 0 24px; font-size: 14px; color: var(--pdp-sub); }
.pdp-card-text { margin: 0 0 24px; font-size: 14px; line-height: 1.7; color: var(--pdp-sub); }
.pdp-praise {
  margin: 0 0 12px;
  font-size: 24px;
  font-weight: 900;
  line-height: 1.3;
  background: linear-gradient(90deg, var(--pdp-gold), var(--acc));
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
}

.pdp-namebox {
  width: 48px;
  height: 56px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-family: ui-monospace, monospace;
  font-size: 24px;
  font-weight: 800;
  border: 2px solid var(--pdp-line);
  border-radius: 12px;
  background: var(--pdp-bg);
  cursor: pointer;
}
.pdp-namebox.is-on { border-color: var(--pdp-gold); color: var(--pdp-gold); }

.pdp-stagecard {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  padding: 12px;
  border-radius: 12px;
  border: 1px solid var(--pdp-line);
  background: var(--pdp-bg);
  color: var(--pdp-text);
  cursor: pointer;
  transition: background 0.12s, border-color 0.12s;
}
.pdp-stagecard:hover { background: var(--pdp-panel2); }
.pdp-stagecard.is-on {
  border-color: var(--acc);
  background: color-mix(in srgb, var(--acc) 16%, transparent);
  color: var(--acc);
}

/* ── 使い方 ─────────────────────────────────────────────────── */
.pdp-kbd {
  padding: 1px 6px;
  border-radius: 6px;
  border: 1px solid var(--pdp-line);
  border-bottom-width: 2px;
  background: var(--pdp-panel);
  color: var(--pdp-text);
  font-family: ui-monospace, monospace;
  font-size: 11px;
}

/* ── モバイル操作 ───────────────────────────────────────────── */
.dpad-sm {
  width: 45px;
  height: 45px;
  border-radius: 9px;
  background: var(--pdp-panel2);
  border: 1px solid var(--pdp-line);
  color: var(--pdp-text);
  font-size: 18px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background 0.1s;
}
.dpad-sm:active { background: #4a4a4a; }

.dpad-action {
  width: 51px;
  height: 51px;
  border-radius: 12px;
  background: var(--pdp-panel2);
  border: 1px solid var(--pdp-line);
  color: var(--pdp-text);
  font-size: 16px;
  font-weight: bold;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: transform 0.1s;
}
.dpad-action:active { transform: scale(0.92); }
.dpad-action--swap {
  background: var(--pdp-red);
  border-color: transparent;
  color: #fff;
}

/* Portrait warning: visible in portrait, hidden in landscape */
.portrait-notice { display: flex; }
@media (orientation: landscape) {
  .portrait-notice { display: none; }
}

/* Overlay transitions */
.ovl-enter-active, .ovl-leave-active { transition: opacity 0.25s ease; }
.ovl-enter-from, .ovl-leave-to       { opacity: 0; }

@keyframes pop {
  from { transform: scale(0.7); opacity: 0; }
  to   { transform: scale(1);   opacity: 1; }
}
@keyframes wiggle {
  0%, 100% { transform: rotate(-15deg) scale(1.1); }
  50%       { transform: rotate(15deg) scale(1.3); }
}

/* Chain badge */
.chain-enter-active { transition: all 0.2s ease; }
.chain-leave-active { transition: all 0.15s ease; }
.chain-enter-from   { transform: scale(0.5); opacity: 0; }
.chain-leave-to     { transform: scale(1.3); opacity: 0; }
</style>
