import { requireMomoUser, requireMomoDb, ensureMomoTables, loadSettings } from '~/server/utils/momo'
import type { MomoSettings } from '~/types/momo'

// ご依頼主（自分）情報を保存（UPSERT）。
export default defineEventHandler(async (event) => {
  const user = await requireMomoUser(event)
  const db = requireMomoDb(event)
  await ensureMomoTables(db)

  const body = await readBody<Partial<MomoSettings>>(event)
  await db
    .prepare(
      `INSERT INTO momo_settings (user_id, sender_name, sender_tel, sender_postal, sender_address, updated_at)
       VALUES (?, ?, ?, ?, ?, datetime('now'))
       ON CONFLICT(user_id) DO UPDATE SET
         sender_name = excluded.sender_name, sender_tel = excluded.sender_tel,
         sender_postal = excluded.sender_postal, sender_address = excluded.sender_address,
         updated_at = datetime('now')`
    )
    .bind(
      user.id,
      (body?.senderName ?? '').trim(),
      (body?.senderTel ?? '').trim(),
      (body?.senderPostal ?? '').trim(),
      (body?.senderAddress ?? '').trim()
    )
    .run()

  return await loadSettings(db, user.id)
})
