import { getDevDb } from '~/server/utils/miyako-dev'

// 指定した会期の議案一覧・発言者集計を取得する
export default defineEventHandler(async (event) => {
  const sessionId = getRouterParam(event, 'id')
  if (!sessionId) throw createError({ statusCode: 400, statusMessage: 'session id required' })

  const { db, dev, sample } = getDevDb(event)

  if (dev) {
    if (sample.session.session_id !== sessionId) {
      throw createError({ statusCode: 404, statusMessage: '会期が見つかりません' })
    }
    // utterance_type IN ('質問','討論') の話者を集計
    const speakerMap = new Map<string, any>()
    for (const u of sample.utterances) {
      if (u.utterance_type !== '質問' && u.utterance_type !== '討論') continue
      const key = u.speaker_name
      if (!speakerMap.has(key)) {
        speakerMap.set(key, {
          speaker_name: u.speaker_name,
          speaker_role: u.speaker_role,
          speaker_party: u.speaker_party,
          speaker_faction: u.speaker_faction,
          utterance_count: 0,
        })
      }
      speakerMap.get(key).utterance_count++
    }
    const speakers = [...speakerMap.values()].sort((a, b) => b.utterance_count - a.utterance_count)
    return { session: sample.session, bills: sample.bills, speakers }
  }

  const [sessionRow, billsResult, speakersResult] = await Promise.all([
    db
      .prepare(`SELECT * FROM sessions WHERE session_id = ?`)
      .bind(sessionId)
      .first(),
    db
      .prepare(
        `SELECT bill_id, bill_number, bill_title, proposer, result, result_method
         FROM bills WHERE session_id = ? ORDER BY bill_id`
      )
      .bind(sessionId)
      .all(),
    db
      .prepare(
        `SELECT speaker_name, speaker_role, speaker_party, speaker_faction,
                COUNT(*) as utterance_count
         FROM utterances
         WHERE session_id = ? AND utterance_type IN ('質問','討論')
         GROUP BY speaker_name, speaker_role, speaker_party, speaker_faction
         ORDER BY utterance_count DESC`
      )
      .bind(sessionId)
      .all(),
  ])

  if (!sessionRow) throw createError({ statusCode: 404, statusMessage: '会期が見つかりません' })

  return {
    session: sessionRow,
    bills: billsResult.results,
    speakers: speakersResult.results,
  }
})
