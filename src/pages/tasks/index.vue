<template>
  <div class="page">
    <header class="board-header">
      <NuxtLink to="/" class="back-link">← ホーム</NuxtLink>
      <h1 class="board-title">Tasks</h1>
      <button class="tag-manager-header-btn" @click="openTagManager">タグ管理</button>
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
                  <button
                    class="action-btn action-btn--delete card__delete"
                    title="削除"
                    @click.stop="confirmDelete(task)"
                  >✕</button>
                </div>
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
                <div v-if="formatDue(task.due_at)" class="card__meta">
                  <span
                    class="due-badge"
                    :class="{ 'due-badge--urgent': formatDue(task.due_at)!.urgent }"
                  >{{ formatDue(task.due_at)!.text }}</span>
                </div>
              </div>
            </div>
          </template>
        </draggable>

        <button class="add-btn" @click="openCreate(col.key)">+ 追加</button>
      </div>
    </div>

    <!-- Create / Edit Modal -->
    <ClientOnly>
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
              <div class="tag-selector">
                <span v-if="!libraryTags.length" class="tag-empty">タグがありません。「タグを編集」から作成してください。</span>
                <span
                  v-for="lt in libraryTags"
                  :key="lt.id"
                  class="tag tag--clickable"
                  :class="{ 'tag--active': isTagSelected(lt) }"
                  :style="{
                    backgroundColor: lt.color + '26',
                    color: lt.color,
                    borderColor: isTagSelected(lt) ? lt.color : lt.color + '55',
                  }"
                  @click="toggleTag(lt)"
                >{{ lt.label }}</span>
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

      <!-- Tag Manager Modal -->
      <div v-if="tagManagerOpen" class="overlay" @click.self="closeTagManager">
        <div class="modal modal--tag-manager" role="dialog" aria-modal="true">
          <div class="modal__header">
            <h2 class="modal__title">タグを編集</h2>
            <button type="button" class="close-btn" @click="closeTagManager">✕</button>
          </div>

          <!-- Tag list -->
          <div class="tm-list">
            <div v-if="!libraryTags.length" class="tm-empty">タグがありません</div>
            <template v-for="lt in libraryTags" :key="lt.id">
              <!-- Edit row -->
              <div v-if="editingTagId === lt.id" class="tm-row tm-row--editing">
                <input
                  v-model="editTagLabel"
                  class="input input--sm tm-input"
                  placeholder="タグ名"
                  @keydown.enter.prevent="saveTagEdit(lt.id)"
                  @keydown.escape="cancelTagEdit"
                />
                <div class="color-swatches color-swatches--grid">
                  <button
                    v-for="c in TAG_COLORS"
                    :key="c.value"
                    type="button"
                    class="swatch"
                    :class="{ 'swatch--active': editTagColor === c.value }"
                    :style="{ backgroundColor: c.value }"
                    :title="c.name"
                    @click="editTagColor = c.value"
                  />
                </div>
                <div class="tm-row__actions">
                  <button type="button" class="btn btn--sm btn--primary" @click="saveTagEdit(lt.id)">保存</button>
                  <button type="button" class="btn btn--sm btn--ghost" @click="cancelTagEdit">キャンセル</button>
                </div>
              </div>
              <!-- Display row -->
              <div v-else class="tm-row">
                <span
                  class="tag"
                  :style="{
                    backgroundColor: lt.color + '26',
                    color: lt.color,
                    borderColor: lt.color + '55',
                  }"
                >{{ lt.label }}</span>
                <div class="tm-row__actions">
                  <button type="button" class="btn btn--sm btn--ghost" @click="startTagEdit(lt)">名前変更</button>
                  <button type="button" class="btn btn--sm btn--danger-ghost" @click="removeLibraryTag(lt.id)">削除</button>
                </div>
              </div>
            </template>
          </div>

          <!-- New tag form -->
          <div class="tm-new">
            <h3 class="tm-new__title">新しいタグを作成</h3>
            <div class="field">
              <input
                v-model="newTagLabel"
                class="input"
                placeholder="タグ名"
                @keydown.enter.prevent="createNewTag"
              />
            </div>
            <div class="field">
              <label class="field__label">色を選択</label>
              <div class="color-swatches color-swatches--grid">
                <button
                  v-for="c in TAG_COLORS"
                  :key="c.value"
                  type="button"
                  class="swatch"
                  :class="{ 'swatch--active': newTagColor === c.value }"
                  :style="{ backgroundColor: c.value }"
                  :title="c.name"
                  @click="newTagColor = c.value"
                />
              </div>
            </div>
            <div class="tm-new__preview" v-if="newTagLabel.trim()">
              <span class="field__label">プレビュー:</span>
              <span
                class="tag"
                :style="{
                  backgroundColor: newTagColor + '26',
                  color: newTagColor,
                  borderColor: newTagColor + '55',
                }"
              >{{ newTagLabel.trim() }}</span>
            </div>
            <button type="button" class="btn btn--primary" :disabled="!newTagLabel.trim()" @click="createNewTag">作成</button>
          </div>
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
    </ClientOnly>
  </div>
</template>

<script setup lang="ts">
import { ref, nextTick } from 'vue'
import draggable from 'vuedraggable'
import type { Task, Tag } from '~/composables/useTasks'
import type { LibraryTag } from '~/composables/useTags'

type Status = 'todo' | 'doing' | 'done'

const COLUMNS: { key: Status; label: string; accent: string }[] = [
  { key: 'todo', label: 'TODO', accent: '#38bdf8' },
  { key: 'doing', label: 'DOING', accent: '#f97316' },
  { key: 'done', label: 'DONE', accent: '#22c55e' },
]

const TAG_COLORS = [
  { name: 'レッド', value: '#ef4444' },
  { name: 'ディープレッド', value: '#dc2626' },
  { name: 'ローズ', value: '#f43f5e' },
  { name: 'オレンジ', value: '#f97316' },
  { name: 'アンバー', value: '#f59e0b' },
  { name: 'イエロー', value: '#eab308' },
  { name: 'ライム', value: '#84cc16' },
  { name: 'グリーン', value: '#22c55e' },
  { name: 'エメラルド', value: '#10b981' },
  { name: 'ティール', value: '#14b8a6' },
  { name: 'シアン', value: '#06b6d4' },
  { name: 'スカイ', value: '#38bdf8' },
  { name: 'ブルー', value: '#3b82f6' },
  { name: 'インディゴ', value: '#6366f1' },
  { name: 'バイオレット', value: '#8b5cf6' },
  { name: 'パープル', value: '#a855f7' },
  { name: 'フクシア', value: '#d946ef' },
  { name: 'ピンク', value: '#ec4899' },
  { name: 'スレート', value: '#64748b' },
  { name: 'グレー', value: '#6b7280' },
]

const { loadTasks: fetchTasks, createTask, updateTask, deleteTask, reorderTasks } = useTasks()
const { loadTags: fetchLibraryTags, createTag: createLibraryTag, updateTag: updateLibraryTag, deleteTag: deleteLibraryTag } = useTags()

const loading = ref(true)
const submitting = ref(false)
const board = ref<Record<Status, Task[]>>({ todo: [], doing: [], done: [] })

// Task modal
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

// Library tags
const libraryTags = ref<LibraryTag[]>([])

// Tag manager modal
const tagManagerOpen = ref(false)
const newTagLabel = ref('')
const newTagColor = ref(TAG_COLORS[12].value)
const editingTagId = ref<string | null>(null)
const editTagLabel = ref('')
const editTagColor = ref(TAG_COLORS[12].value)

// Delete
const deleteTarget = ref<Task | null>(null)

// Drag sync timer
let syncTimer: ReturnType<typeof setTimeout> | null = null

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

function openCreate(status: Status) {
  editingTask.value = null
  form.value = { title: '', description: '', tags: [], status, due_at_local: '' }
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
  modalOpen.value = true
  nextTick(() => titleInput.value?.focus())
}

function closeModal() {
  modalOpen.value = false
  editingTask.value = null
}

function isTagSelected(lt: LibraryTag) {
  return form.value.tags.some((t) => t.label === lt.label)
}

function toggleTag(lt: LibraryTag) {
  const idx = form.value.tags.findIndex((t) => t.label === lt.label)
  if (idx >= 0) {
    form.value.tags.splice(idx, 1)
  } else {
    form.value.tags.push({ label: lt.label, color: lt.color })
  }
}

// Tag manager
function openTagManager() {
  newTagLabel.value = ''
  newTagColor.value = TAG_COLORS[12].value
  editingTagId.value = null
  tagManagerOpen.value = true
}

function closeTagManager() {
  tagManagerOpen.value = false
  editingTagId.value = null
}

async function createNewTag() {
  const label = newTagLabel.value.trim()
  if (!label) return
  const lt = await createLibraryTag(label, newTagColor.value)
  libraryTags.value.push(lt)
  newTagLabel.value = ''
  newTagColor.value = TAG_COLORS[12].value
}

function startTagEdit(lt: LibraryTag) {
  editingTagId.value = lt.id
  editTagLabel.value = lt.label
  editTagColor.value = lt.color
}

function cancelTagEdit() {
  editingTagId.value = null
}

async function saveTagEdit(id: string) {
  const label = editTagLabel.value.trim()
  if (!label) return
  const oldTag = libraryTags.value.find((t) => t.id === id)
  const oldLabel = oldTag?.label ?? ''
  const updated = await updateLibraryTag(id, label, editTagColor.value)
  const idx = libraryTags.value.findIndex((t) => t.id === id)
  if (idx >= 0) libraryTags.value[idx] = updated
  // Update all board tasks that have this tag
  for (const status of ['todo', 'doing', 'done'] as Status[]) {
    board.value[status] = board.value[status].map((task) => {
      if (!task.tags.some((t) => t.label === oldLabel)) return task
      return { ...task, tags: task.tags.map((t) => t.label === oldLabel ? { label: updated.label, color: updated.color } : t) }
    })
  }
  // Update form tags if modal is open
  form.value.tags = form.value.tags.map((t) =>
    t.label === oldLabel ? { label: updated.label, color: updated.color } : t
  )
  editingTagId.value = null
}

async function removeLibraryTag(id: string) {
  const tag = libraryTags.value.find((t) => t.id === id)
  await deleteLibraryTag(id)
  libraryTags.value = libraryTags.value.filter((t) => t.id !== id)
  if (tag) {
    form.value.tags = form.value.tags.filter((t) => t.label !== tag.label)
  }
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

onMounted(async () => {
  await loadTasks()
  libraryTags.value = await fetchLibraryTags()
})
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

.tag-manager-header-btn {
  margin-left: auto;
  font-size: 13px;
  font-weight: 600;
  color: #94a3b8;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 8px;
  padding: 6px 14px;
  cursor: pointer;
  transition: background 0.15s, color 0.15s, border-color 0.15s;
  font-family: inherit;
}
.tag-manager-header-btn:hover {
  background: rgba(255, 255, 255, 0.1);
  color: #f1f5f9;
  border-color: rgba(255, 255, 255, 0.2);
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
  justify-content: space-between;
  gap: 8px;
}

.card__delete {
  flex-shrink: 0;
  margin-top: -2px;
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
  margin-top: 6px;
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
  padding: 2px 8px;
  border-radius: 4px;
  border: 1px solid;
  white-space: nowrap;
}

.tag--clickable {
  cursor: pointer;
  transition: box-shadow 0.15s, border-color 0.15s;
}
.tag--clickable:hover {
  box-shadow: 0 0 0 1px currentColor;
}
.tag--active {
  box-shadow: 0 0 0 2px currentColor;
  font-weight: 700;
}

/* Tag selector in form */
.field__label-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 6px;
}

.field__label {
  font-size: 13px;
  font-weight: 600;
  color: #94a3b8;
}

.tag-manage-btn {
  font-size: 12px;
  font-weight: 500;
  color: #38bdf8;
  background: none;
  border: none;
  cursor: pointer;
  padding: 2px 6px;
  border-radius: 4px;
  transition: background 0.15s;
}
.tag-manage-btn:hover {
  background: rgba(56, 189, 248, 0.1);
}

.tag-selector {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  padding: 10px;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.07);
  border-radius: 8px;
  min-height: 44px;
  align-items: center;
}

.tag-empty {
  font-size: 12px;
  color: #475569;
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

.modal--tag-manager {
  width: min(520px, 100%);
}

.modal__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
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

.close-btn {
  width: 28px;
  height: 28px;
  border: none;
  background: rgba(255, 255, 255, 0.06);
  color: #94a3b8;
  cursor: pointer;
  border-radius: 6px;
  font-size: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background 0.15s, color 0.15s;
}
.close-btn:hover {
  background: rgba(239, 68, 68, 0.15);
  color: #ef4444;
}

/* Tag manager list */
.tm-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
  max-height: 280px;
  overflow-y: auto;
  padding-right: 4px;
}

.tm-empty {
  font-size: 13px;
  color: #475569;
  text-align: center;
  padding: 16px 0;
}

.tm-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding: 8px 10px;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.06);
  border-radius: 8px;
}

.tm-row--editing {
  flex-direction: column;
  align-items: stretch;
  gap: 10px;
}

.tm-row__actions {
  display: flex;
  gap: 6px;
  flex-shrink: 0;
}

.tm-input {
  flex: 1;
}

/* New tag section */
.tm-new {
  border-top: 1px solid rgba(255, 255, 255, 0.07);
  padding-top: 16px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.tm-new__title {
  margin: 0;
  font-size: 14px;
  font-weight: 600;
  color: #94a3b8;
}

.tm-new__preview {
  display: flex;
  align-items: center;
  gap: 8px;
}

/* Form fields */
.field {
  display: flex;
  flex-direction: column;
  gap: 6px;
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

/* Color swatches */
.color-swatches {
  display: flex;
  gap: 4px;
  flex-wrap: wrap;
}

.color-swatches--grid {
  display: grid;
  grid-template-columns: repeat(10, 1fr);
  gap: 6px;
}

.swatch {
  width: 20px;
  height: 20px;
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
  padding: 5px 10px;
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
.btn--danger-ghost {
  background: transparent;
  color: #ef4444;
  border: 1px solid rgba(239, 68, 68, 0.3);
}
.btn--danger-ghost:hover:not(:disabled) {
  background: rgba(239, 68, 68, 0.15);
}

/* Mobile */
@media (max-width: 768px) {
  .board {
    grid-template-columns: 1fr;
  }

  .page {
    padding: 16px 12px 32px;
  }

  .color-swatches--grid {
    grid-template-columns: repeat(10, 1fr);
  }
}
</style>
