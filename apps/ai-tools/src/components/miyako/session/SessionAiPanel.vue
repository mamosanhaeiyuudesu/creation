<script setup lang="ts">
interface AiTopic {
  title: string
  conclusion: string
  flow: string[]
}

defineProps<{
  selectedWord: string | null
  selectedSession: string | null
  selectedSpeaker?: string | null
  aiTopics: AiTopic[]
  aiLoading: boolean
  hintMain?: string
  hintSub?: string
}>()

function breakAtKuten(text: string): string {
  if (!text) return ''
  return text.replace(/。(?!\n)/g, '。\n')
}
</script>

<template>
  <div class="bg-white border border-[#dbe4ef] rounded-[10px] shadow-[0_2px_10px_rgba(20,60,120,0.06)] overflow-hidden flex flex-col md:flex-1 md:min-h-0">
    <div v-if="!selectedWord" class="hint-area">
      <svg xmlns="http://www.w3.org/2000/svg" width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" class="mb-3 opacity-35"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
      <p class="hint-main">{{ hintMain ?? 'クリックで議論をAI分析' }}</p>
      <p v-if="hintSub" class="hint-sub">{{ hintSub }}</p>
    </div>
    <template v-else>
      <div class="flex items-center flex-shrink-0 bg-[#e6f0fb] text-[#134c9c] px-3.5 py-2.5 border-b border-[#c5dbf5]" style="border-left: 3px solid #1d6fd6">
        <span class="label-badge">分析</span>
        <span class="text-[13px] font-bold truncate">
          <template v-if="selectedSpeaker">{{ selectedSpeaker }}議員の</template>
          <template v-else-if="selectedSession">{{ selectedSession }}年の</template>「{{ selectedWord }}」の議論
        </span>
      </div>
      <div class="overflow-y-auto md:flex-1 md:min-h-0">
        <div v-if="aiLoading" class="flex items-center justify-center min-h-[80px]">
          <span class="w-[22px] h-[22px] rounded-full border-2 border-[#1d6fd6]/30 border-t-[#1d6fd6] animate-spin block" />
        </div>
        <div v-else class="ai-body">
          <div v-for="(topic, ti) in aiTopics" :key="ti" :class="ti > 0 ? 'mt-4 pt-4 border-t border-[#dbe4ef]' : ''">
            <div class="topic-title">{{ topic.title }}</div>
            <div class="conclusion">{{ breakAtKuten(topic.conclusion) }}</div>
            <div v-if="topic.flow.length" class="flow-list">
              <div v-for="(step, si) in topic.flow" :key="si" class="flow-step">
                <span class="step-num">{{ String(si + 1).padStart(2, '0') }}</span>
                <span>{{ breakAtKuten(step) }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </template>
  </div>
</template>

<style scoped>
.hint-area {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 28px 20px;
  text-align: center;
  color: #1f2a37;
}

.hint-main {
  font-size: 14px;
  font-weight: 700;
  line-height: 1.55;
  margin-bottom: 8px;
  white-space: pre-line;
}

.hint-sub {
  font-size: 11.5px;
  color: #8593a3;
  line-height: 1.7;
  white-space: pre-line;
}

.label-badge {
  font-size: 11px;
  font-weight: 700;
  color: #fff;
  background: #1d6fd6;
  border-radius: 9999px;
  padding: 1px 8px;
  margin-right: 10px;
  flex-shrink: 0;
}

.ai-body {
  font-size: 14px;
  color: #1f2a37;
  padding: 12px 14px;
  line-height: 1.75;
}

.topic-title {
  font-size: 14px;
  font-weight: 700;
  margin-bottom: 6px;
  color: #1f2a37;
  border-left: 3px solid #1d6fd6;
  padding-left: 8px;
}

.conclusion {
  font-size: 13px;
  color: #4b5868;
  background: #f5f8fc;
  border: 1px solid #e6f0fb;
  border-radius: 5px;
  padding: 7px 10px;
  margin-bottom: 10px;
  line-height: 1.72;
  white-space: pre-line;
}

.flow-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.flow-step {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  font-size: 13px;
  color: #1f2a37;
  background: #fff;
  border: 1px solid #dbe4ef;
  border-radius: 5px;
  padding: 6px 10px;
  line-height: 1.65;
  white-space: pre-line;
}

.step-num {
  font-variant-numeric: tabular-nums;
  font-size: 11px;
  color: #1d6fd6;
  font-weight: 700;
  flex-shrink: 0;
  margin-top: 2px;
  letter-spacing: 0.05em;
}

</style>
