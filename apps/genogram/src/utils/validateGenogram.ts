import { GENDERS, RELATION_TYPES, UNION_STATUSES, type GenogramData } from '~/types/genogram'

export interface ValidationResult {
  data: GenogramData | null
  errors: string[]
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

/**
 * JSON.parse 済みの値を GenogramData として検証する。
 * ここでは「構造として妥当か（必須項目・型・id参照の整合性）」のみを見る。
 * 世代の循環参照検出は useGenogramLayout 側の責務。
 */
export function validateGenogramData(input: unknown): ValidationResult {
  const errors: string[] = []

  if (!isPlainObject(input)) {
    return { data: null, errors: ['JSONのトップレベルはオブジェクトである必要があります(例: { "people": [...], "unions": [...], "relations": [...] })'] }
  }

  const rawPeopleValue = input.people
  const rawUnionsValue = input.unions ?? []
  const rawRelationsValue = input.relations ?? []

  if (!Array.isArray(rawPeopleValue)) {
    errors.push('"people" は配列である必要があります')
    return { data: null, errors }
  }
  if (!Array.isArray(rawUnionsValue)) {
    errors.push('"unions" は配列である必要があります')
  }
  if (!Array.isArray(rawRelationsValue)) {
    errors.push('"relations" は配列である必要があります')
  }
  if (errors.length > 0) {
    return { data: null, errors }
  }

  const rawPeople = rawPeopleValue as unknown[]
  const rawUnions = rawUnionsValue as unknown[]
  const rawRelations = rawRelationsValue as unknown[]

  const seenIds = new Set<string>()
  const people: GenogramData['people'] = []
  let selfCount = 0

  rawPeople.forEach((raw, i) => {
    if (!isPlainObject(raw)) {
      errors.push(`people[${i}]: オブジェクトである必要があります`)
      return
    }
    const { id, name, gender } = raw
    if (typeof id !== 'string' || id.length === 0) {
      errors.push(`people[${i}]: "id" は空でない文字列が必要です`)
      return
    }
    if (seenIds.has(id)) {
      errors.push(`people[${i}] (id: "${id}"): id が重複しています`)
      return
    }
    // name は空文字を許す(実名がまだ分からず続柄だけ入っている骨組み状態を表示できるようにするため)。
    // ただし name も relation も両方空だと画面に何も表示する手掛かりが無くなるので、そこだけは弾く
    if (typeof name !== 'string') {
      errors.push(`people[${i}] (id: "${id}"): "name" は文字列である必要があります`)
      return
    }
    if (!name.trim() && !(typeof raw.relation === 'string' && raw.relation.trim())) {
      errors.push(`people[${i}] (id: "${id}"): "name" か "relation" のどちらかは必要です`)
      return
    }
    if (typeof gender !== 'string' || !GENDERS.includes(gender as any)) {
      errors.push(`people[${i}] (id: "${id}"): "gender" は ${GENDERS.join(' / ')} のいずれかが必要です`)
      return
    }
    if (raw.generation !== undefined && typeof raw.generation !== 'number') {
      errors.push(`people[${i}] (id: "${id}"): "generation" は数値である必要があります`)
      return
    }
    if (raw.birthYear !== undefined && typeof raw.birthYear !== 'number') {
      errors.push(`people[${i}] (id: "${id}"): "birthYear" は数値である必要があります`)
      return
    }
    if (raw.deathYear !== undefined && typeof raw.deathYear !== 'number') {
      errors.push(`people[${i}] (id: "${id}"): "deathYear" は数値である必要があります`)
      return
    }
    if (raw.occupation !== undefined && typeof raw.occupation !== 'string') {
      errors.push(`people[${i}] (id: "${id}"): "occupation" は文字列である必要があります`)
      return
    }
    if (raw.healthNote !== undefined && typeof raw.healthNote !== 'string') {
      errors.push(`people[${i}] (id: "${id}"): "healthNote" は文字列である必要があります`)
      return
    }
    if (raw.relation !== undefined && typeof raw.relation !== 'string') {
      errors.push(`people[${i}] (id: "${id}"): "relation" は文字列である必要があります`)
      return
    }
    if (raw.characteristicSummary !== undefined && typeof raw.characteristicSummary !== 'string') {
      errors.push(`people[${i}] (id: "${id}"): "characteristicSummary" は文字列である必要があります`)
      return
    }
    if (raw.isSelf === true) {
      selfCount++
    }
    seenIds.add(id)
    people.push({
      id,
      name,
      gender: gender as GenogramData['people'][number]['gender'],
      generation: raw.generation as number | undefined,
      deceased: raw.deceased === true,
      isSelf: raw.isSelf === true,
      birthYear: raw.birthYear as number | undefined,
      deathYear: raw.deathYear as number | undefined,
      occupation: typeof raw.occupation === 'string' ? raw.occupation : undefined,
      healthNote: typeof raw.healthNote === 'string' ? raw.healthNote : undefined,
      relation: typeof raw.relation === 'string' ? raw.relation : undefined,
      note: typeof raw.note === 'string' ? raw.note : undefined,
      characteristicSummary: typeof raw.characteristicSummary === 'string' ? raw.characteristicSummary : undefined,
    })
  })

  if (selfCount > 1) {
    errors.push(`"isSelf: true" は1人までにしてください(現在 ${selfCount} 人)`)
  }

  const unions: GenogramData['unions'] = []
  rawUnions.forEach((raw, i) => {
    if (!isPlainObject(raw)) {
      errors.push(`unions[${i}]: オブジェクトである必要があります`)
      return
    }
    const partners = raw.partners
    if (!Array.isArray(partners) || partners.length !== 2 || partners.some((p) => typeof p !== 'string')) {
      errors.push(`unions[${i}]: "partners" は文字列2つの配列である必要があります`)
      return
    }
    for (const pid of partners) {
      if (!seenIds.has(pid)) {
        errors.push(`unions[${i}]: partners が参照する id "${pid}" が people に存在しません`)
      }
    }
    if (partners[0] === partners[1]) {
      errors.push(`unions[${i}]: partners に同じ id "${partners[0]}" が2回指定されています`)
    }
    const status = raw.status
    if (typeof status !== 'string' || !UNION_STATUSES.includes(status as any)) {
      errors.push(`unions[${i}]: "status" は ${UNION_STATUSES.join(' / ')} のいずれかが必要です`)
      return
    }
    let children: string[] | undefined
    if (raw.children !== undefined) {
      if (!Array.isArray(raw.children) || raw.children.some((c) => typeof c !== 'string')) {
        errors.push(`unions[${i}]: "children" は文字列の配列である必要があります`)
      } else {
        children = raw.children as string[]
        for (const cid of children) {
          if (!seenIds.has(cid)) {
            errors.push(`unions[${i}]: children が参照する id "${cid}" が people に存在しません`)
          }
        }
      }
    }
    if (raw.startYear !== undefined && typeof raw.startYear !== 'number') {
      errors.push(`unions[${i}]: "startYear" は数値である必要があります`)
      return
    }
    if (raw.endYear !== undefined && typeof raw.endYear !== 'number') {
      errors.push(`unions[${i}]: "endYear" は数値である必要があります`)
      return
    }
    if (raw.note !== undefined && typeof raw.note !== 'string') {
      errors.push(`unions[${i}]: "note" は文字列である必要があります`)
      return
    }
    unions.push({
      partners: partners as [string, string],
      status: status as GenogramData['unions'][number]['status'],
      children,
      startYear: raw.startYear as number | undefined,
      endYear: raw.endYear as number | undefined,
      note: typeof raw.note === 'string' ? raw.note : undefined,
    })
  })

  const relations: GenogramData['relations'] = []
  rawRelations.forEach((raw, i) => {
    if (!isPlainObject(raw)) {
      errors.push(`relations[${i}]: オブジェクトである必要があります`)
      return
    }
    const { from, to, type } = raw
    if (typeof from !== 'string' || !seenIds.has(from)) {
      errors.push(`relations[${i}]: "from" が参照する id "${from}" が people に存在しません`)
      return
    }
    if (typeof to !== 'string' || !seenIds.has(to)) {
      errors.push(`relations[${i}]: "to" が参照する id "${to}" が people に存在しません`)
      return
    }
    if (typeof type !== 'string' || !RELATION_TYPES.includes(type as any)) {
      errors.push(`relations[${i}]: "type" は ${RELATION_TYPES.join(' / ')} のいずれかが必要です`)
      return
    }
    relations.push({
      from,
      to,
      type: type as GenogramData['relations'][number]['type'],
      label: typeof raw.label === 'string' ? raw.label : undefined,
    })
  })

  if (people.length === 0) {
    errors.push('"people" には少なくとも1人が必要です')
  }

  if (errors.length > 0) {
    return { data: null, errors }
  }

  return { data: { people, unions, relations }, errors: [] }
}
