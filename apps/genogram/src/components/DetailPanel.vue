<template>
  <Modal width="420px" @close="emit('close')">
      <template v-if="selection.kind === 'person'">
        <h3 class="genogram-modal-title">{{ selection.person.name }}</h3>

        <div class="genogram-modal-field">
          <label>名前</label>
          <input v-model="personForm.name" type="text" />
        </div>
        <div class="genogram-modal-field">
          <label>続柄(本人から見て)</label>
          <select v-model="personForm.relation">
            <option value="">(未設定)</option>
            <option v-for="r in relationOptions" :key="r" :value="r">{{ r }}</option>
          </select>
        </div>
        <div class="genogram-modal-field">
          <label>人物像</label>
          <textarea v-model="personForm.note" rows="5" placeholder="この人物についての気づき・エピソード・関係性の背景など" />
        </div>
        <div class="genogram-modal-field-row">
          <label class="genogram-modal-checkbox"><input v-model="personForm.deceased" type="checkbox" /> 故人</label>
          <label class="genogram-modal-checkbox"><input v-model="personForm.isSelf" type="checkbox" /> 本人(相談者)</label>
        </div>
        <div class="genogram-modal-field-row">
          <div class="genogram-modal-field">
            <label>生年</label>
            <input v-model.number="personForm.birthYear" type="number" placeholder="例: 1950" />
          </div>
          <div class="genogram-modal-field">
            <label>没年</label>
            <input v-model.number="personForm.deathYear" type="number" placeholder="例: 2020" />
          </div>
        </div>
        <div class="genogram-modal-field">
          <label>職業</label>
          <input v-model="personForm.occupation" type="text" />
        </div>
        <div class="genogram-modal-field">
          <label>健康メモ</label>
          <input v-model="personForm.healthNote" type="text" placeholder="例: 2型糖尿病" />
        </div>
        <div class="genogram-modal-field">
          <label>世代(空欄なら親子関係から自動算出)</label>
          <input v-model.number="personForm.generation" type="number" />
        </div>
      </template>

      <template v-else-if="selection.kind === 'union'">
        <h3 class="genogram-modal-title">{{ partnerNames }}</h3>

        <div class="genogram-modal-field">
          <label>状態</label>
          <select v-model="unionForm.status">
            <option value="married">結婚</option>
            <option value="divorced">離婚</option>
            <option value="separated">別居</option>
            <option value="distant">疎遠</option>
            <option value="conflict">対立</option>
          </select>
        </div>
        <div class="genogram-modal-field-row">
          <div class="genogram-modal-field">
            <label>開始年</label>
            <input v-model.number="unionForm.startYear" type="number" placeholder="例: 1978" />
          </div>
          <div class="genogram-modal-field">
            <label>終了年</label>
            <input v-model.number="unionForm.endYear" type="number" placeholder="例: 2001" />
          </div>
        </div>
        <div class="genogram-modal-field">
          <label>注記</label>
          <textarea v-model="unionForm.note" rows="2" />
        </div>
      </template>

      <template v-else>
        <h3 class="genogram-modal-title">{{ fromToNames }}</h3>

        <div class="genogram-modal-field">
          <label>種類</label>
          <select v-model="relationForm.type">
            <option value="conflict">対立</option>
            <option value="cutoff">断絶</option>
            <option value="enmeshed">巻き込み</option>
            <option value="codependent">共依存</option>
            <option value="close">良好</option>
            <option value="distant">疎遠</option>
          </select>
        </div>
        <div class="genogram-modal-field">
          <label>ラベル</label>
          <input v-model="relationForm.label" type="text" />
        </div>
      </template>

      <div class="genogram-modal-actions" :class="{ 'genogram-modal-actions-between': selection.kind === 'person' }">
        <button
          v-if="selection.kind === 'person'"
          type="button"
          class="genogram-modal-delete"
          @click="removePerson"
        >
          この人物を削除
        </button>
        <span class="genogram-modal-actions-right">
          <button type="button" class="genogram-modal-save" @click="save">保存</button>
          <button type="button" class="genogram-modal-cancel" @click="emit('close')">キャンセル</button>
        </span>
      </div>
  </Modal>
</template>

<script setup lang="ts">
import { reactive, watch, computed } from 'vue'
import type { Person, Gender, UnionStatus, RelationType } from '~/types/genogram'
import { RELATION_OPTIONS } from '~/types/genogram'
import type { GenogramSelection } from '~/types/selection'
import Modal from '~/components/Modal.vue'

const props = defineProps<{ selection: GenogramSelection; people: Person[]; deleteImpact?: string[] }>()
const emit = defineEmits<{
  close: []
  'save-person': [patch: Pick<Person, 'id' | 'name' | 'gender' | 'deceased' | 'isSelf'> & Partial<Pick<Person, 'birthYear' | 'deathYear' | 'occupation' | 'healthNote' | 'relation' | 'note' | 'generation'>>]
  'save-union': [index: number, patch: { status: UnionStatus; startYear?: number; endYear?: number; note?: string }]
  'save-relation': [index: number, patch: { type: RelationType; label?: string }]
  'delete-person': [id: string]
}>()

function removePerson() {
  if (props.selection.kind !== 'person') return
  // 巻き添えで消える線(婚姻・親子・感情関係)を、消す前に具体的に伝える
  const impact = props.deleteImpact ?? []
  const detail = impact.length > 0 ? `\n\n一緒に消えるもの:\n・${impact.join('\n・')}` : ''
  if (!window.confirm(`「${props.selection.person.name}」を削除します。${detail}\n\nよろしいですか?`)) return
  emit('delete-person', props.selection.person.id)
}

function personName(id: string) {
  return props.people.find((p) => p.id === id)?.name ?? id
}

const partnerNames = computed(() => {
  if (props.selection.kind !== 'union') return ''
  const [a, b] = props.selection.union.partners
  return `${personName(a)} と ${personName(b)}`
})

const fromToNames = computed(() => {
  if (props.selection.kind !== 'relation') return ''
  return `${personName(props.selection.relation.from)} → ${personName(props.selection.relation.to)}`
})

// 標準の選択肢に無い続柄が既に入っている(古いデータ・AI生成の自由記述など)場合は、
// 見えなくなって黙って消えてしまわないよう、その値も選択肢の先頭に足しておく
const relationOptions = computed(() => {
  const current = props.selection.kind === 'person' ? props.selection.person.relation : undefined
  if (current && !(RELATION_OPTIONS as readonly string[]).includes(current)) {
    return [current, ...RELATION_OPTIONS]
  }
  return RELATION_OPTIONS
})

const personForm = reactive<{
  name: string
  gender: Gender
  deceased: boolean
  isSelf: boolean
  birthYear: number | string
  deathYear: number | string
  occupation: string
  healthNote: string
  relation: string
  note: string
  generation: number | string
}>({
  name: '',
  gender: 'U',
  deceased: false,
  isSelf: false,
  birthYear: '',
  deathYear: '',
  occupation: '',
  healthNote: '',
  relation: '',
  note: '',
  generation: '',
})

const unionForm = reactive<{ status: UnionStatus; startYear: number | string; endYear: number | string; note: string }>({
  status: 'married',
  startYear: '',
  endYear: '',
  note: '',
})

const relationForm = reactive<{ type: RelationType; label: string }>({
  type: 'distant',
  label: '',
})

watch(
  () => props.selection,
  (sel) => {
    if (sel.kind === 'person') {
      Object.assign(personForm, {
        name: sel.person.name,
        gender: sel.person.gender,
        deceased: sel.person.deceased ?? false,
        isSelf: sel.person.isSelf ?? false,
        birthYear: sel.person.birthYear ?? '',
        deathYear: sel.person.deathYear ?? '',
        occupation: sel.person.occupation ?? '',
        healthNote: sel.person.healthNote ?? '',
        relation: sel.person.relation ?? '',
        note: sel.person.note ?? '',
        generation: sel.person.generation ?? '',
      })
    } else if (sel.kind === 'union') {
      Object.assign(unionForm, {
        status: sel.union.status,
        startYear: sel.union.startYear ?? '',
        endYear: sel.union.endYear ?? '',
        note: sel.union.note ?? '',
      })
    } else {
      Object.assign(relationForm, {
        type: sel.relation.type,
        label: sel.relation.label ?? '',
      })
    }
  },
  { immediate: true }
)

function numOrUndef(v: number | string): number | undefined {
  if (v === '' || v === null || v === undefined) return undefined
  const n = typeof v === 'number' ? v : Number(v)
  return Number.isFinite(n) ? n : undefined
}

function strOrUndef(v: string): string | undefined {
  const s = v.trim()
  return s.length > 0 ? s : undefined
}

function save() {
  if (props.selection.kind === 'person') {
    emit('save-person', {
      id: props.selection.person.id,
      name: personForm.name.trim() || props.selection.person.name,
      gender: personForm.gender,
      deceased: personForm.deceased,
      isSelf: personForm.isSelf,
      birthYear: numOrUndef(personForm.birthYear),
      deathYear: numOrUndef(personForm.deathYear),
      occupation: strOrUndef(personForm.occupation),
      healthNote: strOrUndef(personForm.healthNote),
      relation: strOrUndef(personForm.relation),
      note: strOrUndef(personForm.note),
      generation: numOrUndef(personForm.generation),
    })
  } else if (props.selection.kind === 'union') {
    emit('save-union', props.selection.index, {
      status: unionForm.status,
      startYear: numOrUndef(unionForm.startYear),
      endYear: numOrUndef(unionForm.endYear),
      note: strOrUndef(unionForm.note),
    })
  } else {
    emit('save-relation', props.selection.index, {
      type: relationForm.type,
      label: strOrUndef(relationForm.label),
    })
  }
}
</script>
