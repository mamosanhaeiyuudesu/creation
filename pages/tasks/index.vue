<template>
  <div class="page">
    <header class="board-header">
      <NuxtLink to="/" class="back-link">← ホーム</NuxtLink>
      <h1 class="board-title">Tasks</h1>
    </header>

    <div v-if="loading" class="loading">読み込み中...</div>

    <div v-else class="board">
      <div
        v-for="col in COLUMNS"
        :key="col.key"
        class="column"
        :style="{ '--col-accent': col.accent }"
      >
        <div class="column__header">
          <span class="column__title">{{ col.label }}</span>
          <span class="column__count">{{ board[col.key].length }}</span>
        </div>

        <draggable
          v-model="board[col.key]"
          group="tasks"
          item-key="id"
          :animation="150"
          handle=".card__handle"
          ghost-class="card--ghost"
          chosen-class="card--chosen"
          class="column__list"
          @end="onDragEnd"
        >
          <template #item="{ element: task }">
            <div class="card">
              <div class="card__handle" title="ドラッグで移動">⠿</div>
              <div class="card__body" @click="openEdit(task)">
                <div class="card__top">
                  <span class="card__title">{{ task.title }}</span>
                  <div v-if="task.tags.length" class="card__tags">
                    <span
                      v-for="tag in task.tags"
                      :key="tag.label"
                      class="tag"
                      :style="{
                        backgroundColor: tag.color + '26',
                        color: tag.color,
                        borderColor: tag.color + '55',
                      }"
                    >{{ tag.label }}</span>
                  </div>
                </div>
                <p v-if="task.description" class="card__desc">{{ task.description }}</p>
                <div class="card__meta">
                  <span>更新: {{ formatDate(task.updated_at) }}</span>
                  <span
                    v-if="formatDue(task.due_at)"
                    class="due-badge"
                    :class="{ 'due-badge--urgent': formatDue(task.due_at)!.urgent }"
                  >{{ formatDue(task.due_at)!.text }}</span>
                </div>
              </div>
              <div class="card__actions">
                <button
                  v-if="col.key !== 'todo'"
                  class="action-btn"
                  title="前のステータスへ"
                  @click.stop="moveTask(task, 'prev')"
                >←</button>
                <button
                  v-if="col.key !== 'done'"
                  class="action-btn"
                  title="次のステータスへ"
                  @click.stop="moveTask(task, 'next')"
                >→</button>
                <button
                  class="action-btn action-btn--delete"
                  title="削除"
                  @click.stop="confirmDelete(task)"
                >✕</button>
              </div>
            </div>
          </template>
        </draggable>

        <button class="add-btn" @click="openCreate(col.key)">+ 追加</button>
      </div>
    </div>

    <!-- Create / Edit Modal -->
    <Teleport to="body">
      <div v-if="modalOpen" class="overlay" @click.self="closeModal">
        <div class="modal" role="dialog" aria-modal="true">
          <h2 class="modal__title">{{ editingTask ? 'タスクを編集' : 'タスクを追加' }}</h2>
          <form @submit.prevent="submitTask">
            <div class="field">
              <label class="field__label">タイトル <span class="required">*</span></label>
              <input
                ref="titleInput"
                v-model="form.title"
                class="input"
                placeholder="タスクのタイトル"
                required
              />
            </div>

            <div class="field">
              <label class="field__label">説明</label>
              <textarea
                v-model="form.description"
                class="input"
                placeholder="詳細メモ（任意）"
                rows="3"
              />
            </div>

            <div class="field">
              <label class="field__label">タグ</label>
              <div class="tag-editor">
                <div v-if="form.tags.length" class="tag-list">
                  <span
                    v-for="(tag, i) in form.tags"
                    :key="i"
                    class="tag tag--removable"
                    :style="{
                      backgroundColor: tag.color + '26',
                      color: tag.color,
                      borderColor: tag.color + '55',
                    }"
                  >
                    {{ tag.label }}
                    <button type="button" class="tag__remove" @click="removeTag(i)">✕</button>
                  </span>
                </div>
                <div class="tag-input-row">
                  <input
                    v-model="tagInput"
                    class="input input--sm"
                    placeholder="タグ名"
                    @keydown.enter.prevent="addTag"
                  />
                  <div class="color-swatches">
                    <button
                      v-for="c in TAG_COLORS"
                      :key="c.value"
                      type="button"
                      class="swatch"
                      :class="{ 'swatch--active': tagColor === c.value }"
                      :style="{ backgroundColor: c.value }"
                      :title="c.name"
                      @click="tagColor = c.value"
                    />
                  </div>
                  <button type="button" class="btn btn--sm" @click="addTag">追加</button>
                </div>
              </div>
            </div>

            <div class="field">
              <label class="field__label">期限</label>
              <input
                v-model="form.due_at_local"
                type="datetime-local"
                class="input"
              />
            </div>

            <div v-if="editingTask" class="field">
              <label class="field__label">ステータス</label>
              <select v-model="form.status" class="input">
                <option value="todo">TODO</option>
                <option value="doing">DOING</option>
                <option value="done">DONE</option>
              </select>
            </div>

            <div class="modal__footer">
              <button type="button" class="btn btn--ghost" @click="closeModal">キャンセル</button>
              <button type="submit" class="btn btn--primary" :disabled="submitting">
                {{ editingTask ? '保存' : '作成' }}
              </button>
            </div>
          </form>
        </div>
      </div>

      <!-- Delete Confirmation -->
      <div v-if="deleteTarget" class="overlay" @click.self="deleteTarget = null">
        <div class="modal modal--sm" role="dialog" aria-modal="true">
          <h2 class="modal__title">削除の確認</h2>
          <p class="modal__text">「{{ deleteTarget.title }}」を削除しますか？</p>
          <div class="modal__footer">
            <button class="btn btn--ghost" @click="deleteTarget = null">キャンセル</button>
            <button class="btn btn--danger" :disabled="submitting" @click="doDelete">削除</button>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import { ref, nextTick } from 'vue'
import draggable from 'vuedraggable'
import type { Task, Tag } from '~/composables/useTasks'

type Status = 'todo' | 'doing' | 'done'

const COLUMNS: { key: Status; label: string; accent: string }[] = [
  { key: 'todo', label: 'TODO', accent: '#38bdf8' },
  { key: 'doing', label: 'DOING', accent: '#f97316' },
  { key: 'done', label: 'DONE', accent: '#22c55e' },
]

const TAG_COLORS = [
  { name: 'レッド', value: '#ef4444' },
  { name: 'オレンジ', value: '#f97316' },
  { name: 'イエロー', value: '#eab308' },
  { name: 'グリーン', value: '#22c55e' },
  { name: 'ブルー', value: '#3b82f6' },
  { name: 'パープル', value: '#8b5cf6' },
  { name: 'ピンク', value: '#ec4899' },
  { name: 'グレー', value: '#64748b' },
]

const { loadTasks: fetchTasks, createTask, updateTask, deleteTask, reorderTasks } = useTasks()

const loading = ref(true)
const submitting = ref(false)
const board = ref<Record<Status, Task[]>>({ todo: [], doing: [], done: [] })

// Modal
const modalOpen = ref(false)
const editingTask = ref<Task | null>(null)
const titleInput = ref<HTMLInputElement | null>(null)
const form = ref({
  title: '',
  description: '',
  tags: [] as Tag[],
  status: 'todo' as Status,
  due_at_local: '',
})

// Tag editor
const tagInput = ref('')
const tagColor = ref(TAG_COLORS[4].value)

// Delete
const deleteTarget = ref<Task | null>(null)

// Drag sync timer
let syncTimer: ReturnType<typeof setTimeout> | null = null

function formatDate(ts: number) {
  const d = new Date(ts)
  return `${d.getMonth() + 1}/${d.getDate()} ${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`
}

function formatDue(due_at: number | null): { text: string; urgent: boolean } | null {
  if (!due_at) return null
  const diff = due_at - Date.now()
  if (diff < 0) {
    return { text: '期限切れ', urgent: true }
  }
  const hours = diff / (1000 * 60 * 60)
  if (hours < 24) {
    const h = Math.ceil(hours)
    return { text: `残${h}時間`, urgent: true }
  }
  const days = Math.ceil(hours / 24)
  return { text: `残${days}日`, urgent: false }
}

function tsToLocal(ts: number | null): string {
  if (!ts) return ''
  const d = new Date(ts)
  const pad = (n: number) => n.toString().padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

function localToTs(local: string): number | null {
  if (!local) return null
  return new Date(local).getTime()
}

async function loadTasks() {
  loading.value = true
  try {
    const tasks = await fetchTasks()
    board.value.todo = tasks.filter((t) => t.status === 'todo').sort((a, b) => a.order_index - b.order_index)
    board.value.doing = tasks.filter((t) => t.status === 'doing').sort((a, b) => a.order_index - b.order_index)
    board.value.done = tasks.filter((t) => t.status === 'done').sort((a, b) => a.order_index - b.order_index)
  } finally {
    loading.value = false
  }
}

function onDragEnd() {
  if (syncTimer) clearTimeout(syncTimer)
  syncTimer = setTimeout(() => {
    const updates = [
      ...board.value.todo.map((t, i) => ({ id: t.id, status: 'todo', order_index: i })),
      ...board.value.doing.map((t, i) => ({ id: t.id, status: 'doing', order_index: i })),
      ...board.value.done.map((t, i) => ({ id: t.id, status: 'done', order_index: i })),
    ]
    reorderTasks(updates).catch(console.error)
  }, 200)
}

async function moveTask(task: Task, direction: 'prev' | 'next') {
  const statuses: Status[] = ['todo', 'doing', 'done']
  const currentIdx = statuses.indexOf(task.status)
  const newIdx = direction === 'next' ? currentIdx + 1 : currentIdx - 1
  if (newIdx < 0 || newIdx >= statuses.length) return

  const oldStatus = task.status
  const newStatus = statuses[newIdx]

  board.value[oldStatus] = board.value[oldStatus].filter((t) => t.id !== task.id)
  task.status = newStatus
  board.value[newStatus] = [...board.value[newStatus], task]

  await updateTask(task.id, {
    status: newStatus,
    order_index: board.value[newStatus].length - 1,
  }).catch(console.error)
}

function openCreate(status: Status) {
  editingTask.value = null
  form.value = { title: '', description: '', tags: [], status, due_at_local: '' }
  tagInput.value = ''
  tagColor.value = TAG_COLORS[4].value
  modalOpen.value = true
  nextTick(() => titleInput.value?.focus())
}

function openEdit(task: Task) {
  editingTask.value = task
  form.value = {
    title: task.title,
    description: task.description,
    tags: task.tags.map((t) => ({ ...t })),
    status: task.status,
    due_at_local: tsToLocal(task.due_at),
  }
  tagInput.value = ''
  tagColor.value = TAG_COLORS[4].value
  modalOpen.value = true
  nextTick(() => titleInput.value?.focus())
}

function closeModal() {
  modalOpen.value = false
  editingTask.value = null
}

function addTag() {
  const label = tagInput.value.trim()
  if (!label) return
  form.value.tags.push({ label, color: tagColor.value })
  tagInput.value = ''
}

function removeTag(i: number) {
  form.value.tags.splice(i, 1)
}

async function submitTask() {
  if (!form.value.title.trim()) return
  submitting.value = true
  try {
    if (editingTask.value) {
      const task = await updateTask(editingTask.value.id, {
        title: form.value.title,
        description: form.value.description,
        tags: form.value.tags,
        status: form.value.status,
        due_at: localToTs(form.value.due_at_local),
      })
      const oldStatus = editingTask.value.status
      board.value[oldStatus] = board.value[oldStatus].filter((t) => t.id !== task.id)
      const col = board.value[task.status]
      const existing = col.findIndex((t) => t.id === task.id)
      if (existing >= 0) {
        col[existing] = task
      } else {
        col.push(task)
      }
    } else {
      const task = await createTask({
        title: form.value.title,
        description: form.value.description,
        tags: form.value.tags,
        status: form.value.status,
        due_at: localToTs(form.value.due_at_local),
      })
      board.value[task.status].push(task)
    }
    closeModal()
  } finally {
    submitting.value = false
  }
}

function confirmDelete(task: Task) {
  deleteTarget.value = task
}

async function doDelete() {
  if (!deleteTarget.value) return
  submitting.value = true
  try {
    const task = deleteTarget.value
    await deleteTask(task.id)
    board.value[task.status] = board.value[task.status].filter((t) => t.id !== task.id)
    deleteTarget.value = null
  } finally {
    submitting.value = false
  }
}

onMounted(loadTasks)
</script>

<style scoped>
.page {
  min-height: 100vh;
  padding: 24px 16px 40px;
  display: flex;
  flex-direction: column;
  gap: 24px;
}

/* Header */
.board-header {
  display: flex;
  align-items: center;
  gap: 16px;
}

.back-link {
  color: #94a3b8;
  text-decoration: none;
  font-size: 14px;
  transition: color 0.15s;
}
.back-link:hover {
  color: #f8fafc;
}

.board-title {
  margin: 0;
  font-size: 24px;
  font-weight: 700;
  background: linear-gradient(135deg, #38bdf8, #6366f1);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.loading {
  color: #94a3b8;
  text-align: center;
  padding: 48px;
}

/* Board */
.board {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 16px;
  align-items: start;
}

/* Column */
.column {
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.07);
  border-top: 2px solid var(--col-accent);
  border-radius: 12px;
  padding: 12px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  min-height: 120px;
}

.column__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 4px 4px 8px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.06);
}

.column__title {
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.08em;
  color: var(--col-accent);
}

.column__count {
  font-size: 12px;
  color: #64748b;
  background: rgba(255, 255, 255, 0.05);
  border-radius: 10px;
  padding: 0 6px;
  min-width: 20px;
  text-align: center;
}

.column__list {
  display: flex;
  flex-direction: column;
  gap: 8px;
  min-height: 40px;
}

/* Card */
.card {
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 8px;
  display: flex;
  gap: 4px;
  transition: border-color 0.15s, box-shadow 0.15s;
}
.card:hover {
  border-color: rgba(255, 255, 255, 0.15);
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.3);
}

.card--ghost {
  opacity: 0.4;
  border: 1px dashed rgba(255, 255, 255, 0.2);
}
.card--chosen {
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.5);
  opacity: 0.9;
}

.card__handle {
  padding: 10px 2px 10px 6px;
  color: #475569;
  cursor: grab;
  font-size: 16px;
  user-select: none;
  touch-action: none;
  flex-shrink: 0;
  transition: color 0.15s;
}
.card__handle:hover {
  color: #94a3b8;
}
.card__handle:active {
  cursor: grabbing;
}

.card__body {
  flex: 1;
  padding: 10px 4px;
  cursor: pointer;
  min-width: 0;
}

.card__top {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  flex-wrap: wrap;
}

.card__title {
  font-size: 14px;
  font-weight: 600;
  color: #f1f5f9;
  line-height: 1.4;
  word-break: break-word;
}

.card__tags {
  display: flex;
  gap: 4px;
  flex-wrap: wrap;
  margin-top: 2px;
}

.card__desc {
  margin: 6px 0 0;
  font-size: 12px;
  color: #94a3b8;
  line-height: 1.5;
  white-space: pre-wrap;
  word-break: break-word;
}

.card__meta {
  margin-top: 8px;
  font-size: 11px;
  color: #475569;
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.due-badge {
  font-size: 11px;
  font-weight: 600;
  color: #94a3b8;
}

.due-badge--urgent {
  color: #ef4444;
}

.card__actions {
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 2px;
  padding: 6px 4px 6px 0;
  flex-shrink: 0;
}

.action-btn {
  width: 24px;
  height: 24px;
  border: none;
  background: transparent;
  color: #64748b;
  cursor: pointer;
  border-radius: 4px;
  font-size: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background 0.15s, color 0.15s;
}
.action-btn:hover {
  background: rgba(255, 255, 255, 0.08);
  color: #cbd5e1;
}
.action-btn--delete:hover {
  background: rgba(239, 68, 68, 0.15);
  color: #ef4444;
}

/* Tag */
.tag {
  font-size: 11px;
  font-weight: 500;
  padding: 1px 6px;
  border-radius: 4px;
  border: 1px solid;
  white-space: nowrap;
}

.tag--removable {
  display: inline-flex;
  align-items: center;
  gap: 4px;
}

.tag__remove {
  background: none;
  border: none;
  cursor: pointer;
  color: inherit;
  font-size: 10px;
  padding: 0;
  line-height: 1;
  opacity: 0.7;
  transition: opacity 0.15s;
}
.tag__remove:hover {
  opacity: 1;
}

/* Add button */
.add-btn {
  width: 100%;
  background: transparent;
  border: 1px dashed rgba(255, 255, 255, 0.1);
  border-radius: 6px;
  color: #64748b;
  font-size: 13px;
  padding: 8px;
  cursor: pointer;
  transition: border-color 0.15s, color 0.15s, background 0.15s;
  text-align: center;
}
.add-btn:hover {
  border-color: var(--col-accent, rgba(255, 255, 255, 0.2));
  color: #cbd5e1;
  background: rgba(255, 255, 255, 0.03);
}

/* Modal / Overlay */
.overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.6);
  backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 100;
  padding: 16px;
}

.modal {
  background: #1e293b;
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 16px;
  padding: 24px;
  width: min(480px, 100%);
  max-height: 90vh;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.modal--sm {
  width: min(360px, 100%);
}

.modal__title {
  margin: 0;
  font-size: 18px;
  font-weight: 700;
  color: #f8fafc;
}

.modal__text {
  margin: 0;
  color: #94a3b8;
  font-size: 14px;
  line-height: 1.6;
}

.modal__footer {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
}

/* Form fields */
.field {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.field__label {
  font-size: 13px;
  font-weight: 600;
  color: #94a3b8;
}

.required {
  color: #ef4444;
}

.input {
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 8px;
  color: #f8fafc;
  font-size: 14px;
  padding: 8px 12px;
  width: 100%;
  box-sizing: border-box;
  outline: none;
  transition: border-color 0.15s;
  font-family: inherit;
  resize: vertical;
}
.input:focus {
  border-color: #38bdf8;
}
.input--sm {
  flex: 1;
  min-width: 0;
}

input[type='datetime-local'].input {
  color-scheme: dark;
}

select.input {
  cursor: pointer;
  appearance: none;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%2394a3b8' d='M6 8L1 3h10z'/%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: right 12px center;
  padding-right: 32px;
}

/* Tag editor */
.tag-editor {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.tag-list {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.tag-input-row {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.color-swatches {
  display: flex;
  gap: 4px;
  flex-wrap: wrap;
}

.swatch {
  width: 18px;
  height: 18px;
  border-radius: 50%;
  border: 2px solid transparent;
  cursor: pointer;
  transition: transform 0.1s, border-color 0.1s;
  flex-shrink: 0;
}
.swatch:hover {
  transform: scale(1.15);
}
.swatch--active {
  border-color: #fff;
  transform: scale(1.2);
}

/* Buttons */
.btn {
  padding: 8px 16px;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 600;
  border: none;
  cursor: pointer;
  transition: background 0.15s, opacity 0.15s;
  font-family: inherit;
}
.btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
.btn--sm {
  padding: 6px 12px;
  font-size: 12px;
  border-radius: 6px;
}
.btn--primary {
  background: #38bdf8;
  color: #0f172a;
}
.btn--primary:hover:not(:disabled) {
  background: #7dd3fc;
}
.btn--ghost {
  background: rgba(255, 255, 255, 0.06);
  color: #94a3b8;
}
.btn--ghost:hover:not(:disabled) {
  background: rgba(255, 255, 255, 0.1);
}
.btn--danger {
  background: #ef4444;
  color: #fff;
}
.btn--danger:hover:not(:disabled) {
  background: #f87171;
}

/* Mobile */
@media (max-width: 768px) {
  .board {
    grid-template-columns: 1fr;
  }

  .page {
    padding: 16px 12px 32px;
  }
}
</style>
