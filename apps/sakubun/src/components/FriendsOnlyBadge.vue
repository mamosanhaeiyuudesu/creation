<template>
  <!-- 機密区分ラベル（「社外秘」「CONFIDENTIAL」）のパロディ。飾りなので操作の邪魔をしない -->
  <div class="fo-badge" role="img" aria-label="友達限定">
    <svg class="fo-lock" viewBox="0 0 16 16" aria-hidden="true">
      <rect x="3" y="7" width="10" height="8" rx="1.5" />
      <path d="M5.5 7V5a2.5 2.5 0 0 1 5 0v2" fill="none" />
    </svg>
    <span class="fo-text">
      <span class="fo-main">友達限定</span>
      <span class="fo-sub">FRIENDS ONLY</span>
    </span>
  </div>
</template>

<style>
.fo-badge {
  position: fixed;
  top: 14px;
  right: 16px;
  z-index: 30;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 4px 10px 4px 8px;
  border: 3px double #b3261e;
  border-radius: 3px;
  color: #b3261e;
  background: rgba(253, 240, 232, 0.85);
  transform: rotate(-4deg);
  pointer-events: none;
  user-select: none;
  line-height: 1;
  font-family: 'Noto Sans JP', -apple-system, BlinkMacSystemFont, sans-serif;
}

.fo-lock {
  width: 15px;
  height: 15px;
  fill: #b3261e;
  stroke: #b3261e;
  stroke-width: 1.6;
}

.fo-text {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.fo-main {
  font-size: 13px;
  font-weight: 700;
  letter-spacing: 0.18em;
}

.fo-sub {
  font-family: 'IBM Plex Mono', 'Courier New', monospace;
  font-size: 7.5px;
  font-weight: 500;
  letter-spacing: 0.16em;
}

/* 記事ページは固定ナビの中（投げ銭の右）に並べる */
.fo-badge.fo-inline {
  position: static;
  flex-shrink: 0;
  margin-left: 4px;
}

/* スマホ幅ではナビに4つ並ぶと入りきらないので、「友達／限定」の2行の小さな判子にする */
@media (max-width: 480px) {
  .fo-badge.fo-inline {
    padding: 3px 4px;
    margin-left: 0;
  }

  .fo-badge.fo-inline .fo-lock,
  .fo-badge.fo-inline .fo-sub {
    display: none;
  }

  .fo-badge.fo-inline .fo-main {
    width: 2em;
    font-size: 10px;
    line-height: 1.15;
    letter-spacing: 0;
  }
}
</style>
