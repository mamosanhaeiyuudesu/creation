// /task の「今週の目標」の共通処理。週（月曜始まり・JST）ごとに自由記述テキストを1件持つ。

/**
 * 今週の目標テーブルを（無ければ）用意する。dev/未マイグレーション環境向けの保険。
 * D1 の exec() は改行を文区切りとして扱うため、CREATE 文は1行で書く。
 */
export async function ensureTaskGoalTables(db: any): Promise<void> {
  await db
    .exec(
      `CREATE TABLE IF NOT EXISTS task_weekly_goals (user_id TEXT NOT NULL, week_start TEXT NOT NULL, goal TEXT NOT NULL DEFAULT '', updated_at TEXT NOT NULL DEFAULT (datetime('now')), PRIMARY KEY (user_id, week_start))`
    )
    .catch(() => {})
}
