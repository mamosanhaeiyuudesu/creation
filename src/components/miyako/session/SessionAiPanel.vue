<script setup lang="ts">
interface AiTopic {
  title: string
  conclusion: string
  flow: string[]
}

defineProps<{
  selectedWord: string | null
  aiTopics: AiTopic[]
  aiLoading: boolean
}>()
</script>

<template>
  <div class="bg-white border border-[#dde2ef] rounded-[10px] shadow-[0_1px_4px_rgba(28,45,90,0.07),0_0_0_1px_rgba(28,45,90,0.06)] overflow-hidden flex flex-col md:flex-1 md:min-h-0">
    <div v-if="!selectedWord" class="flex items-center px-3.5 py-3 text-xs text-[#6878a8]">
      👆 単語をクリックするとAI解説が表示されます
    </div>
    <template v-else>
      <div class="flex items-center flex-shrink-0 bg-[#1c2d5a] text-white text-[13.5px] font-semibold px-3.5 py-2.5 tracking-[0.02em]">
        🤖 「{{ selectedWord }}」の議論
      </div>
      <div class="overflow-y-auto md:flex-1 md:min-h-0">
        <div v-if="aiLoading" class="flex items-center justify-center min-h-[80px]">
          <span class="w-[22px] h-[22px] rounded-full border-2 border-[#1A237E]/30 border-t-[#1A237E] animate-spin block" />
        </div>
        <div v-else class="ai-body">
          <div v-for="(topic, ti) in aiTopics" :key="ti" :class="ti > 0 ? 'mt-4 pt-4 border-t border-[#dde2ef]' : ''">
            <div class="topic-title">{{ topic.title }}</div>
            <div class="conclusion">{{ topic.conclusion }}</div>
            <div v-if="topic.flow.length" class="flow-list">
              <template v-for="(step, si) in topic.flow" :key="si">
                <div class="flow-step">{{ step }}</div>
                <div v-if="si < topic.flow.length - 1" class="flow-arrow">↓</div>
              </template>
            </div>
          </div>
        </div>
      </div>
    </template>
  </div>
</template>

<style scoped>
.ai-body {
  font-size: 13px;
  color: #1c2d5a;
  padding: 12px 14px;
  line-height: 1.75;
}

.topic-title {
  font-size: 13.5px;
  font-weight: 700;
  margin-bottom: 5px;
  color: #1c2d5a;
  border-left: 3px solid #3d5fc4;
  padding-left: 8px;
}

.conclusion {
  font-size: 12.5px;
  color: #3a4a72;
  background: #f0f3fb;
  border-radius: 6px;
  padding: 6px 10px;
  margin-bottom: 10px;
  line-height: 1.7;
}

.flow-list {
  display: flex;
  flex-direction: column;
  gap: 0;
}

.flow-step {
  font-size: 12.5px;
  color: #1c2d5a;
  background: #fff;
  border: 1px solid #dde2ef;
  border-radius: 6px;
  padding: 6px 10px;
  line-height: 1.65;
}

.flow-arrow {
  text-align: center;
  color: #3d5fc4;
  font-size: 15px;
  line-height: 1.4;
  opacity: 0.6;
  margin: 1px 0;
}
</style>
