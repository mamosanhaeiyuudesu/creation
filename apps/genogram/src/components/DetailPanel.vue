<template>
  <Modal width="420px" @close="emit('close')">
      <template v-if="selection.kind === 'person'">
        <h3 class="genogram-modal-title">{{ selection.person.name }}</h3>

        <div class="genogram-modal-field">
          <label>名前</label>
          <input v-model="personForm.name" type="text" />
        </div>
        <div class="genogram-modal-field">
          <label>性別</label>
          <select v-model="personForm.gender">
            <option value="M">男性</option>
            <option value="F">女性</option>
            <option value="U">不明</option>
          </select>
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
          <label>その他の注記</label>
          <textarea v-model="personForm.note" rows="2" />
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
            <option value="close">密着(良好)</option>
            <option value="distant">疎遠</option>
          </select>
        </div>
        <div class="genogram-modal-field">
          <label>ラベル</label>
          <input v-model="relationForm.label" type="text" />
        </div>
      </template>

      <div class="genogram-modal-actions">
        <button type="button" class="genogram-modal-save" @click="save">保存</button>
        <button type="button" class="genogram-modal-cancel" @click="emit('close')">キャンセル</button>
      </div>
  </Modal>
</template>

<script setup lang="ts">
import { reactive, watch, computed } from 'vue'
import type { Person, Gender, UnionStatus, RelationType } from '~/types/genogram'
import type { GenogramSelection } from '~/types/selection'
import Modal from '~/components/Modal.vue'

const props = defineProps<{ selection: GenogramSelection; people: Person[] }>()
const emit = defineEmits<{
  close: []
  'save-person': [patch: Pick<Person, 'id' | 'name' | 'gender' | 'deceased' | 'isSelf'> & Partial<Pick<Person, 'birthYear' | 'deathYear' | 'occupation' | 'healthNote' | 'note' | 'generation'>>]
  'save-union': [index: number, patch: { status: UnionStatus; startYear?: number; endYear?: number; note?: string }]
  'save-relation': [index: number, patch: { type: RelationType; label?: string }]
}>()

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

const personForm = reactive<{
  name: string
  gender: Gender
  deceased: boolean
  isSelf: boolean
  birthYear: number | string
  deathYear: number | string
  occupation: string
  healthNote: string
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
