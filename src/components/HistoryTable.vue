<template>
  <div v-if="history.length > 0" class="history">
    <h2>履歴</h2>
    <div class="history-table-wrapper">
      <table class="history-table">
        <thead>
          <tr>
            <th class="col-date">日時</th>
            <th class="col-title">タイトル</th>
            <th class="col-copy">コピー</th>
            <th class="col-delete">削除</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="item in history" :key="item.id">
            <td class="col-date">{{ formatDate(item.timestamp) }}</td>
            <td class="col-title">{{ item.title }}</td>
            <td class="col-copy">
              <button
                @click="$emit('copy', item)"
                class="action-button"
                :title="item.id === copiedId ? 'コピーしました!' : 'コピー'"
              >
                {{ item.id === copiedId ? '✓' : '📋' }}
              </button>
            </td>
            <td class="col-delete">
              <button @click="$emit('delete', item.id)" class="action-button delete" title="削除">🗑️</button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { HistoryItem } from '~/types/history'

defineProps<{
  history: HistoryItem[]
  copiedId: string | null
}>()

defineEmits<{
  copy: [item: HistoryItem]
  delete: [id: string]
}>()

const formatDate = (iso: string): string => {
  const d = new Date(iso)
  const y = String(d.getFullYear()).slice(-2)
  const mo = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  const h = String(d.getHours()).padStart(2, '0')
  const mi = String(d.getMinutes()).padStart(2, '0')
  return `${y}/${mo}/${day} ${h}:${mi}`
}
</script>

<style scoped>
.history {
  margin-top: 4px;
  min-width: 0;
}

.history h2 {
  margin: 0 0 12px;
  font-size: 16px;
  color: #94a3b8;
  font-weight: 500;
}

.history-table-wrapper {
  max-height: 280px;
  overflow: auto;
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 10px;
}

.history-table-wrapper::-webkit-scrollbar {
  width: 4px;
}

.history-table-wrapper::-webkit-scrollbar-track {
  background: transparent;
}

.history-table-wrapper::-webkit-scrollbar-thumb {
  background: rgba(255, 255, 255, 0.15);
  border-radius: 2px;
}

.history-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 12px;
}

.history-table thead {
  position: sticky;
  top: 0;
  background: rgba(15, 23, 42, 0.95);
  z-index: 1;
}

.history-table th {
  padding: 6px 8px;
  text-align: left;
  color: #64748b;
  font-weight: 500;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
}

.history-table td {
  padding: 6px 8px;
  color: #cbd5e1;
  border-bottom: 1px solid rgba(255, 255, 255, 0.04);
}

.history-table tbody tr:last-child td {
  border-bottom: none;
}

.history-table tbody tr:hover td {
  background: rgba(255, 255, 255, 0.03);
}

.col-date {
  white-space: nowrap;
  width: 110px;
}

.col-title {
  color: #e2e8f0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  max-width: 0;
}

.col-copy,
.col-delete {
  white-space: nowrap;
  width: 32px;
  text-align: center;
}

.action-button {
  background: none;
  border: none;
  cursor: pointer;
  padding: 4px;
  border-radius: 4px;
  font-size: 13px;
  line-height: 1;
  transition: background 0.15s;
}

.action-button:hover {
  background: rgba(255, 255, 255, 0.08);
}

.action-button.delete:hover {
  background: rgba(239, 68, 68, 0.15);
}
</style>
