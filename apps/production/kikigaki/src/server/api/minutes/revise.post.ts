// 「AIで直す」。指示1つで議事録全体を書き換える（「阪中さんを坂中さんに直して」のような使い方）。
//
// DBには保存しない＝画面の編集状態を置き換えるだけ。確定するには画面の「保存」を押してもらう
// （AIの直しが気に入らなかったときに、元へ戻せる余地を残すため）。

import { requireUser } from '~/server/utils/auth'
import { requireEntitlement } from '~/server/utils/entitlement'
import { getRecord } from '~/server/utils/minutes'
import { reviseMinutes } from '~/server/utils/minutes-ai'
import { loadGlossaryTerms } from '~/server/utils/glossary-store'
import { normalizeMinutes } from '~/server/utils/minutes'
import type { Minutes } from '~/types/minutes'

export default defineEventHandler(async (event) => {
  const user = await requireUser(event)
  // AIを呼ぶ口なので、ここも契約状態を見る（モニター期間中は無条件で通る）
  await requireEntitlement(event, user.id)
  const body = await readBody<{ id?: string; minutes?: Minutes; instruction?: string }>(event)

  const instruction = (body?.instruction ?? '').trim()
  if (!instruction) {
    throw createError({ statusCode: 400, message: 'どこをどう直したいかを書いてから、ボタンを押してください。' })
  }

  // 文字起こし全文は保存済みのものを使う（クライアントに持たせて送り返させない＝量も多いので）
  const record = await getRecord(event, user.id, body?.id ?? '')
  if (!record) {
    throw createError({ statusCode: 404, message: 'この議事録は見つかりませんでした。一覧からお選びください。' })
  }

  // 画面で編集中の内容を土台にする（保存前の直しも反映させるため）
  const current = body?.minutes ? normalizeMinutes(body.minutes) : record.minutes
  const terms = await loadGlossaryTerms(event, user.id)
  const revised = await reviseMinutes(event, current, record.transcript, instruction, terms)
  // PDFの文字数設定は指示の対象外。AIは触っていないのでそのまま引き継ぐ
  revised.printSettings = current.printSettings

  return { minutes: revised }
})
