import {
  requireKeikoUser,
  requireKeikoDb,
  ensureKeikoTables,
  loadMembers,
  loadItems,
  seedDefaultItemsForMember,
  normalizeCount,
} from '~/server/utils/keiko'
import type { KeikoItem, KeikoItemKind, KeikoMember } from '~/types/keiko'

// 設定画面（メンバー・練習項目）の一括保存。
// 画面側で編集した内容をまとめて受け取り、追加・変更・削除を1リクエストで反映する。
// 並び順は配列の順（members は表示順、items はメンバーごとの表示順）。
//
// 削除は「payload に無いもの」ではなく removedMemberIds / removedItemIds で明示的に受け取る。
// 読み込みに失敗した空の画面から保存されても、既存データを巻き込んで消さないため。

interface MemberInput {
  id?: string
  name?: string
}
interface ItemInput {
  id?: string
  memberId?: string
  name?: string
  kind?: string
  repCount?: number
  pointPerRep?: number
  active?: boolean
}
interface SettingsBody {
  members?: MemberInput[]
  items?: ItemInput[]
  removedMemberIds?: string[]
  removedItemIds?: string[]
}

/** 画面で追加されたばかりの行（まだDBに無い）は 'new:1' のような仮IDを持つ。 */
function isNewId(id: string | undefined): boolean {
  return !id || id.startsWith('new:')
}

export default defineEventHandler(async (event): Promise<{ members: KeikoMember[]; items: KeikoItem[] }> => {
  const user = await requireKeikoUser(event)
  const db = requireKeikoDb(event)
  await ensureKeikoTables(db)

  const body = await readBody<SettingsBody>(event)
  const memberInputs = Array.isArray(body?.members) ? body.members : []
  const itemInputs = Array.isArray(body?.items) ? body.items : []

  // 空欄チェックは書き換える前にまとめて行う（途中まで保存された状態を作らないため）
  for (const m of memberInputs) {
    if (!(m?.name ?? '').trim()) throw createError({ statusCode: 400, message: '名前が空のメンバーがあります' })
  }
  for (const it of itemInputs) {
    if (!(it?.name ?? '').trim()) throw createError({ statusCode: 400, message: 'やることが空の項目があります' })
  }

  // 自分の行だけを対象にする（知らないIDが混ざっていても黙って無視する）
  const ownedMemberIds = new Set((await loadMembers(db, user.id)).map((m) => m.id))
  const ownedItems = new Map((await loadItems(db, user.id)).map((it) => [it.id, it]))

  // ── 削除（記録も一緒に消える）──
  for (const id of body?.removedMemberIds ?? []) {
    if (!ownedMemberIds.has(id)) continue
    await db.prepare('DELETE FROM keiko_records WHERE user_id = ? AND member_id = ?').bind(user.id, id).run()
    await db.prepare('DELETE FROM keiko_items WHERE user_id = ? AND member_id = ?').bind(user.id, id).run()
    await db.prepare('DELETE FROM keiko_members WHERE id = ?').bind(id).run()
    ownedMemberIds.delete(id)
  }
  for (const id of body?.removedItemIds ?? []) {
    if (!ownedItems.has(id)) continue
    await db.prepare('DELETE FROM keiko_records WHERE user_id = ? AND item_id = ?').bind(user.id, id).run()
    await db.prepare('DELETE FROM keiko_items WHERE id = ?').bind(id).run()
    ownedItems.delete(id)
  }

  // ── メンバー（追加・名前変更・並び順）──
  const memberIdMap = new Map<string, string>() // 仮ID → 実ID
  const newMemberIds: string[] = []
  for (const [i, input] of memberInputs.entries()) {
    const name = (input.name ?? '').trim()
    if (isNewId(input.id)) {
      const id = crypto.randomUUID()
      await db.prepare('INSERT INTO keiko_members (id, user_id, name, sort_order) VALUES (?, ?, ?, ?)').bind(id, user.id, name, i).run()
      if (input.id) memberIdMap.set(input.id, id)
      ownedMemberIds.add(id)
      newMemberIds.push(id)
      continue
    }
    if (!ownedMemberIds.has(input.id!)) continue
    await db.prepare('UPDATE keiko_members SET name = ?, sort_order = ? WHERE id = ?').bind(name, i, input.id).run()
  }

  // ── 練習項目（追加・変更・並び順）──
  const sortOrders = new Map<string, number>() // メンバーごとの連番
  for (const input of itemInputs) {
    const memberId = memberIdMap.get(input.memberId ?? '') ?? input.memberId ?? ''
    if (!ownedMemberIds.has(memberId)) continue

    const sortOrder = sortOrders.get(memberId) ?? 0
    sortOrders.set(memberId, sortOrder + 1)

    const name = (input.name ?? '').trim()
    const kind: KeikoItemKind = input.kind === 'direct' ? 'direct' : 'reps'
    const repCount = normalizeCount(input.repCount, 1)
    const pointPerRep = normalizeCount(input.pointPerRep, 1)
    const active = input.active === false ? 0 : 1

    if (isNewId(input.id)) {
      await db
        .prepare('INSERT INTO keiko_items (id, user_id, member_id, name, kind, rep_count, point_per_rep, sort_order, active) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)')
        .bind(crypto.randomUUID(), user.id, memberId, name, kind, repCount, pointPerRep, sortOrder, active)
        .run()
      continue
    }

    const existing = ownedItems.get(input.id!)
    if (!existing) continue

    // 「本数×ポイント」から「直接ポイント」へ切り替えると、過去の記録は rate しか持たず0点になってしまう。
    // 切り替える前に、そのときの設定で計算した獲得ポイントを points へ焼き付けておく（本数を書き換える前に行う）。
    if (existing.kind !== 'direct' && kind === 'direct') {
      await db
        .prepare(
          'UPDATE keiko_records SET points = (SELECT ROUND(i.rep_count * i.point_per_rep * keiko_records.rate / 100.0) FROM keiko_items i WHERE i.id = keiko_records.item_id) ' +
            'WHERE item_id = ? AND points IS NULL'
        )
        .bind(input.id)
        .run()
    }

    await db
      .prepare('UPDATE keiko_items SET member_id = ?, name = ?, kind = ?, rep_count = ?, point_per_rep = ?, sort_order = ?, active = ? WHERE id = ?')
      .bind(memberId, name, kind, repCount, pointPerRep, sortOrder, active, input.id)
      .run()
  }

  // 項目を1つも足さずに追加されたメンバーには、はじめの「やること」を用意する（既存の追加時と同じ挙動）
  for (const id of newMemberIds) await seedDefaultItemsForMember(db, user.id, id)

  const [members, items] = await Promise.all([loadMembers(db, user.id), loadItems(db, user.id)])
  return { members, items }
})
