<template>
  <div class="page">
    <main class="hub">
      <header class="hub__header">
        <h1>AI Tools</h1>
        <p class="hub__subtitle">AIを使ったツール集</p>
      </header>

      <div class="tools">
        <NuxtLink class="tool-card" to="/snapreader">
          <div class="tool-card__icon">📸</div>
          <div>
            <h2 class="tool-card__title">SnapReader</h2>
            <p class="tool-card__desc">画像を送って、数秒で要約</p>
          </div>
        </NuxtLink>

        <NuxtLink class="tool-card" to="/whisper">
          <div class="tool-card__icon">🎙️</div>
          <div>
            <h2 class="tool-card__title">Whisper</h2>
            <p class="tool-card__desc">音声を文字に自動変換</p>
          </div>
        </NuxtLink>
      </div>
    </main>
  </div>
</template>

<style scoped>
.page {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 32px 16px;
}

.hub {
  width: min(720px, 100%);
  display: grid;
  gap: 32px;
}

.hub__header {
  text-align: center;
}

.hub__header h1 {
  margin: 0;
  font-size: clamp(32px, 6vw, 48px);
  color: #f8fafc;
  background: linear-gradient(135deg, #38bdf8, #6366f1);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.hub__subtitle {
  margin: 8px 0 0;
  color: #94a3b8;
  font-size: 16px;
}

.tools {
  display: grid;
  gap: 12px;
}

.tool-card {
  display: flex;
  align-items: center;
  gap: 16px;
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 16px;
  padding: 20px 24px;
  text-decoration: none;
  color: inherit;
  transition: border-color 0.2s ease, transform 0.2s ease, background 0.2s ease;
}

.tool-card:hover {
  border-color: rgba(56, 189, 248, 0.4);
  background: rgba(255, 255, 255, 0.07);
  transform: translateY(-2px);
}

.tool-card__icon {
  font-size: 32px;
  flex-shrink: 0;
}

.tool-card__title {
  margin: 0 0 4px;
  font-size: 20px;
  color: #f8fafc;
}

.tool-card__desc {
  margin: 0;
  font-size: 14px;
  color: #94a3b8;
}
</style>
