<template>
  <div class="genogram-page">
    <header class="genogram-topbar">
      <h1>ジェノグラム作成ツール</h1>
      <div class="genogram-topbar-actions">
        <button type="button" class="genogram-ai-btn" @click="showAiPopup = true">AIに伝える</button>
        <button type="button" @click="showJsonPopup = true">JSONを見る</button>
        <button type="button" @click="copyShareLink">共有リンクをコピー</button>
        <button type="button" :disabled="!parsedData" @click="downloadSvg">SVGをダウンロード</button>
        <button type="button" :disabled="!parsedData" @click="downloadPng">PNGをダウンロード</button>
      </div>
    </header>

    <p v-if="shareMessage" class="genogram-share-message">{{ shareMessage }}</p>

    <main class="genogram-fullscreen-canvas">
      <GenogramSvg v-if="parsedData" ref="genogramRef" :data="parsedData" @select="handleSelect" />
      <p v-else class="genogram-empty">「AIに伝える」で家族構成を説明するか、「JSONを見る」から直接JSONを入力すると、ここにジェノグラムが表示されます。</p>
    </main>

    <p v-if="parsedData" class="genogram-hint">図の人物・線をクリックすると詳細の確認・編集ができます。</p>

    <AiPopup
      v-if="showAiPopup"
      v-model="aiText"
      :loading="aiLoading"
      :error="aiError"
      @submit="submitAiText"
      @close="showAiPopup = false"
    />

    <JsonPopup
      v-if="showJsonPopup"
      v-model="jsonText"
      :errors="errors"
      @clear="handleClearFromPopup"
      @close="showJsonPopup = false"
    />

    <DetailPanel
      v-if="selectedEntity && parsedData"
      :selection="selectedEntity"
      :people="parsedData.people"
      :delete-impact="deleteImpact"
      @close="closePanel"
      @save-person="handleSavePerson"
      @save-union="handleSaveUnion"
      @save-relation="handleSaveRelation"
      @delete-person="handleDeletePerson"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
import type { GenogramData, Person, Union, UnionStatus, RelationType } from '~/types/genogram'
import type { GenogramSelection } from '~/types/selection'
import { validateGenogramData } from '~/utils/validateGenogram'
import { computeGenogramLayout } from '~/composables/useGenogramLayout'
import { defaultTemplateJson } from '~/utils/defaultTemplate'
import GenogramSvg from '~/components/GenogramSvg.vue'
import DetailPanel from '~/components/DetailPanel.vue'
import AiPopup from '~/components/AiPopup.vue'
import JsonPopup from '~/components/JsonPopup.vue'

useHead({
  title: 'ジェノグラム作成ツール',
  link: [
    {
      rel: 'icon',
      type: 'image/svg+xml',
      href: `data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>🧬</text></svg>`,
    },
  ],
})

const STORAGE_KEY = 'genogram-json'

const jsonText = ref('')
const errors = ref<string[]>([])
const parsedData = ref<GenogramData | null>(null)
const shareMessage = ref('')
const genogramRef = ref<InstanceType<typeof GenogramSvg> | null>(null)

const aiText = ref('')
const aiLoading = ref(false)
const aiError = ref('')

const selectedEntity = ref<GenogramSelection | null>(null)
const showAiPopup = ref(false)
const showJsonPopup = ref(false)

let debounceTimer: ReturnType<typeof setTimeout> | null = null

function processJson(value: string) {
  errors.value = []
  parsedData.value = null

  if (!value.trim()) return

  let raw: unknown
  try {
    raw = JSON.parse(value)
  } catch (e) {
    errors.value = [`JSONの構文エラー: ${(e as Error).message}`]
    return
  }

  const { data, errors: validationErrors } = validateGenogramData(raw)
  if (validationErrors.length > 0 || !data) {
    errors.value = validationErrors
    return
  }

  const layoutCheck = computeGenogramLayout(data)
  if (layoutCheck.errors.length > 0) {
    errors.value = layoutCheck.errors
    return
  }

  parsedData.value = data

  try {
    localStorage.setItem(STORAGE_KEY, value)
  } catch {
    // localStorageが使えない環境では自動保存を諦める
  }
}

watch(jsonText, (value) => {
  if (debounceTimer) clearTimeout(debounceTimer)
  debounceTimer = setTimeout(() => processJson(value), 300)
})

async function submitAiText() {
  const text = aiText.value.trim()
  if (!text || aiLoading.value) return

  aiLoading.value = true
  aiError.value = ''
  try {
    const res = await $fetch('/api/interpret', {
      method: 'POST',
      body: { text, currentData: parsedData.value },
    })
    jsonText.value = JSON.stringify(res.data, null, 2)
    aiText.value = ''
    showAiPopup.value = false
  } catch (e: any) {
    aiError.value = e?.data?.statusMessage || e?.data?.message || e?.statusMessage || e?.message || 'AIの呼び出しに失敗しました。'
  } finally {
    aiLoading.value = false
  }
}

function encodeBase64Utf8(str: string): string {
  const bytes = new TextEncoder().encode(str)
  let binary = ''
  bytes.forEach((b) => {
    binary += String.fromCharCode(b)
  })
  return btoa(binary)
}

function decodeBase64Utf8(b64: string): string {
  const binary = atob(b64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
  return new TextDecoder().decode(bytes)
}

function toBase64Url(b64: string): string {
  return b64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

function fromBase64Url(s: string): string {
  let b64 = s.replace(/-/g, '+').replace(/_/g, '/')
  while (b64.length % 4 !== 0) b64 += '='
  return b64
}

async function copyShareLink() {
  try {
    const encoded = toBase64Url(encodeBase64Utf8(jsonText.value))
    history.replaceState(null, '', `#d=${encoded}`)
    const url = `${location.origin}${location.pathname}#d=${encoded}`
    await navigator.clipboard.writeText(url)
    shareMessage.value = '共有リンクをコピーしました'
  } catch {
    shareMessage.value = '共有リンクのコピーに失敗しました(このブラウザではクリップボードにアクセスできない可能性があります)'
  }
  setTimeout(() => {
    shareMessage.value = ''
  }, 3000)
}

function clearAll(): boolean {
  if (!window.confirm('入力したテキストとJSONを消去し、本人・両親・祖父母だけの初期状態に戻します。よろしいですか?')) return false

  aiText.value = ''
  aiError.value = ''
  if (location.hash) {
    history.replaceState(null, '', location.pathname)
  }
  jsonText.value = defaultTemplateJson
  processJson(defaultTemplateJson)
  return true
}

function handleClearFromPopup() {
  if (clearAll()) showJsonPopup.value = false
}

function isSameSelection(a: GenogramSelection, b: GenogramSelection): boolean {
  if (a.kind !== b.kind) return false
  if (a.kind === 'person' && b.kind === 'person') return a.person.id === b.person.id
  if (a.kind === 'union' && b.kind === 'union') return a.index === b.index
  if (a.kind === 'relation' && b.kind === 'relation') return a.index === b.index
  return false
}

function handleSelect(sel: GenogramSelection) {
  selectedEntity.value = selectedEntity.value && isSameSelection(selectedEntity.value, sel) ? null : sel
}

function closePanel() {
  selectedEntity.value = null
}

function cloneParsedData(): GenogramData | null {
  return parsedData.value ? (JSON.parse(JSON.stringify(parsedData.value)) as GenogramData) : null
}

function applyEditedData(data: GenogramData) {
  jsonText.value = JSON.stringify(data, null, 2)
  closePanel()
}

function handleSavePerson(patch: Pick<Person, 'id' | 'name' | 'gender' | 'deceased' | 'isSelf'> & Partial<Pick<Person, 'birthYear' | 'deathYear' | 'occupation' | 'healthNote' | 'relation' | 'note' | 'generation'>>) {
  const data = cloneParsedData()
  const target = data?.people.find((p) => p.id === patch.id)
  if (!data || !target) return
  Object.assign(target, patch)
  if (patch.isSelf) {
    for (const p of data.people) p.isSelf = p.id === patch.id
  }
  applyEditedData(data)
}

/** 名前が分からない相手として自動で置かれた人物か。これ自体を消すときは代役を作り直さない */
const PLACEHOLDER_NAMES = ['(配偶者不明)', '(名前不明)']
function isPlaceholder(person: Person | undefined): boolean {
  return !!person && PLACEHOLDER_NAMES.includes(person.name)
}

/**
 * 配偶者を消したとき、その婚姻を「(配偶者不明)」で残すべきか。
 * 子がいる場合だけ残す ―― まるごと消すと、残った親と子のつながりまで切れて孤立するため。
 * ただし当人や相方が既に代役なら残さない(代役が無限に作り直されて消せなくなる)。
 */
function shouldKeepUnionWithPlaceholder(union: Union, deletedId: string, people: Person[]): boolean {
  if ((union.children ?? []).filter((c) => c !== deletedId).length === 0) return false
  const deleted = people.find((p) => p.id === deletedId)
  if (isPlaceholder(deleted)) return false
  const spouseId = union.partners.find((p) => p !== deletedId)
  return !isPlaceholder(people.find((p) => p.id === spouseId))
}

/** 人物を消したときに巻き添えで消える線を、確認ダイアログ用に日本語で列挙する */
const deleteImpact = computed<string[]>(() => {
  const sel = selectedEntity.value
  const data = parsedData.value
  if (!data || !sel || sel.kind !== 'person') return []
  const id = sel.person.id
  const nameOf = (pid: string) => data.people.find((p) => p.id === pid)?.name ?? pid
  const lines: string[] = []

  for (const u of data.unions) {
    if (!u.partners.includes(id)) continue
    const spouse = u.partners.find((p) => p !== id)
    const spouseName = spouse ? nameOf(spouse) : '配偶者'
    if (shouldKeepUnionWithPlaceholder(u, id, data.people)) {
      const kids = (u.children ?? []).filter((c) => c !== id).length
      lines.push(`${spouseName}との婚姻線(子${kids}人とのつながりは残すため、あなたの位置は「(配偶者不明)」になります)`)
    } else {
      lines.push(`${spouseName}との婚姻線`)
    }
  }
  for (const u of data.unions) {
    if (!(u.children ?? []).includes(id)) continue
    lines.push(`${u.partners.map(nameOf).join('と')}の子としての線`)
  }
  const relCount = data.relations.filter((r) => r.from === id || r.to === id).length
  if (relCount > 0) lines.push(`関係線 ${relCount} 本`)

  return lines
})

function handleDeletePerson(id: string) {
  const data = cloneParsedData()
  if (!data) return

  // 判定に当人の情報が要るので、people から取り除くのは union を処理したあと
  const before = data.people
  let placeholderSeq = 0
  const nextPlaceholderId = () => {
    let candidate: string
    do {
      placeholderSeq += 1
      candidate = `unknown_spouse_${placeholderSeq}`
    } while (data.people.some((p) => p.id === candidate))
    return candidate
  }

  data.unions = data.unions.flatMap((u) => {
    const partnerIdx = u.partners.indexOf(id)
    const children = (u.children ?? []).filter((c) => c !== id)
    if (partnerIdx === -1) return [{ ...u, children }]
    if (!shouldKeepUnionWithPlaceholder(u, id, before)) return []
    const placeholderId = nextPlaceholderId()
    data.people.push({ id: placeholderId, name: '(配偶者不明)', gender: 'U' })
    const partners: [string, string] = [...u.partners] as [string, string]
    partners[partnerIdx] = placeholderId
    return [{ ...u, partners, children }]
  })

  data.people = data.people.filter((p) => p.id !== id)
  data.relations = data.relations.filter((r) => r.from !== id && r.to !== id)

  applyEditedData(data)
}

function handleSaveUnion(index: number, patch: { status: UnionStatus; startYear?: number; endYear?: number; note?: string }) {
  const data = cloneParsedData()
  if (!data || !data.unions[index]) return
  Object.assign(data.unions[index], patch)
  applyEditedData(data)
}

function handleSaveRelation(index: number, patch: { type: RelationType; label?: string }) {
  const data = cloneParsedData()
  if (!data || !data.relations[index]) return
  Object.assign(data.relations[index], patch)
  applyEditedData(data)
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}

function serializeSvg(): string | null {
  const svg = genogramRef.value?.svgEl
  if (!svg) return null
  const serializer = new XMLSerializer()
  let source = serializer.serializeToString(svg)
  if (!source.includes('xmlns=')) {
    source = source.replace('<svg', '<svg xmlns="http://www.w3.org/2000/svg"')
  }
  return source
}

function downloadSvg() {
  const source = serializeSvg()
  if (!source) return
  const blob = new Blob([source], { type: 'image/svg+xml;charset=utf-8' })
  downloadBlob(blob, 'genogram.svg')
}

function downloadPng() {
  const source = serializeSvg()
  const layoutData = genogramRef.value?.layout
  if (!source || !layoutData) return

  const svgBlob = new Blob([source], { type: 'image/svg+xml;charset=utf-8' })
  const url = URL.createObjectURL(svgBlob)
  const img = new Image()
  img.onload = () => {
    const scale = 2
    const canvas = document.createElement('canvas')
    canvas.width = layoutData.width * scale
    canvas.height = layoutData.height * scale
    const ctx = canvas.getContext('2d')
    if (!ctx) {
      URL.revokeObjectURL(url)
      return
    }
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, canvas.width, canvas.height)
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
    URL.revokeObjectURL(url)
    canvas.toBlob((blob) => {
      if (blob) downloadBlob(blob, 'genogram.png')
    }, 'image/png')
  }
  img.onerror = () => URL.revokeObjectURL(url)
  img.src = url
}

onMounted(() => {
  const hashMatch = location.hash.match(/^#d=(.+)$/)
  const hashPayload = hashMatch?.[1]
  if (hashPayload) {
    try {
      const json = decodeBase64Utf8(fromBase64Url(hashPayload))
      jsonText.value = json
      processJson(json)
      return
    } catch {
      // 不正なハッシュの場合はフォールバックへ進む
    }
  }

  let saved: string | null = null
  try {
    saved = localStorage.getItem(STORAGE_KEY)
  } catch {
    saved = null
  }
  const initial = saved ?? defaultTemplateJson
  jsonText.value = initial
  processJson(initial)
})
</script>
