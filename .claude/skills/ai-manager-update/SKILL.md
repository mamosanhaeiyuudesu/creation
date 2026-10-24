---
name: ai-manager-update
description: ai-tools の /ai-manager（AI管理）のデータを最新のコミットまで更新する。「ai-manager を更新して」「AI管理を更新」「AIの履歴を作り直して」と頼まれたとき、または AI を呼ぶコード（モデル・プロンプト・オプション）を変えたあとに使う。新しい版の AI 呼び出しの抜き出しと、変更の一文の要約を Claude Code 自身が書く（API は使わない）。
---

# ai-manager の更新

`/ai-manager` は、5つのツール（キキガキ本番版・まなび・日記・miyako・ジェノグラム。この順に並べる）で AI を呼んでいる場所ごとに、
モデル・オプション・プロンプトの変遷を git の履歴から見せる画面。データは
`apps/ai-tools/src/server/data/ai-manager.json` で、`scripts/ai-manager/build.mjs` が作る。

**スクリプトは AI を呼ばない**。版ごとの抜き出しと変更の要約は、あなた（Claude Code）が書いて
`scripts/ai-manager/.cache/` に置く。以前はスクリプトが API を呼んでいたが、本番と同じキーの利用上限に
当たって本番のサービスを止めかけた（2026-10-24）ので、この形にした。**API キーを使う作りに戻さないこと。**

## 手順

1. `node scripts/ai-manager/build.mjs` を流す（数秒）。最後に「未処理: 抜き出し N件・要約 M件」が出たら
   `scripts/ai-manager/.cache/pending.json` に一覧がある。「未処理はありません」なら 4 へ。
2. **抜き出し**（`pending.extract`）を先に全部書く。1件ずつ:
   - `node scripts/ai-manager/build.mjs --show=<blob>` で、その版を行番号つきで読む
   - 下の「抜き出しの決まり」に従って `pending.extract[].cache` のパス（`.cache/inbox/extract-<blob>.json`）に JSON を書く
   - 前の版の抜き出しがあれば（同じファイルの1つ前の版の blob。`git log --raw -- <path>` で分かる）、
     **それを開いて名前・参照の書き方をそろえる**。版ごとに書き方が揺れると、中身は同じなのに「プロンプトの変更」に見える
3. もう一度 1 を流すと、抜き出した版の**要約**（`pending.summary`）が出てくる。各件の `diff` を読み、
   下の「要約の決まり」に従って `pending.summary[].cache` のパス（`.cache/inbox/summary-<鍵>.json`）に書く:
   ```json
   { "version": 1, "model": "claude-code", "site": "<site>", "commit": "<commit>", "summary": "<一文>" }
   ```
   `diff` を読んで中身が変わっていない（抜き出しの書き方が揺れただけ）と分かったら、要約を書かずに
   抜き出しのほうを前の版にそろえて直し、1 からやり直す。
   inbox に置いたファイルは、次に 1 を流したときに `.cache/extract.json`・`.cache/summary.json` へ取り込まれて消える。
   前の版の抜き出しを見るときは `.cache/extract.json` の `<blob>` の項目を読む。
   使われなくなった項目は流すたびに自動で捨てる（`--only` のときだけは捨てない）。
4. 「未処理はありません」になったら、`.cache/` と `ai-manager.json` をあわせてコミットする（.cache は git に入れる決まり）。
   画面に出すには ai-tools のデプロイが要る（**dev が動いている間に build しない**。ルートの CLAUDE.md 参照）。

形が合わないキャッシュはスクリプトが「形が合わないキャッシュ」として名前を出し、未処理に戻す。

ユーザープロンプトの30字未満の直しは、スクリプトが「修正」に数えない（`USER_CHANGE_MIN_CHARS`。本人の希望）。

## 抜き出しの決まり

`.cache/inbox/extract-<blob>.json`（取り込まれると `.cache/extract.json` の `<blob>` の項目になる）:

```json
{
  "version": 1,
  "model": "claude-code",
  "path": "apps/.../foo-ai.ts",
  "calls": [
    {
      "name": "structureTranscript",
      "feature": "文章から議事録を構造化する",
      "provider": "anthropic",
      "kind": "text",
      "line": 152,
      "via": "callClaudeText",
      "model": { "literal": null, "ref": "DEFAULT_MODEL" },
      "options": [{ "key": "maxTokens", "value": "MAX_TOKENS" }],
      "system": [{ "ref": "buildSystemPrompt", "startLine": null, "endLine": null }],
      "user": [{ "ref": null, "startLine": 158, "endLine": 158 }]
    }
  ]
}
```

- **数え方**: 生成AI（Anthropic・OpenAI・Gemini など）へリクエストを1つ組み立てて送る箇所が1件。
  `callClaudeText(...)`・`callOpenAi(...)` のような共通関数の呼び出しも1件。ファイル自身が共通関数
  （引数のモデル・プロンプトをそのまま送るだけのラッパー。例: `anthropic.ts` の `callClaudeText` の中の fetch）を
  定義しているだけなら、その中の fetch は数えない。AI 呼び出しが無ければ `calls: []`。
- **name**: 呼び出しを含む関数名。API ルートの `defineEventHandler` の中なら `"handler"`。同じ関数に2つ以上あれば
  2つ目から `"handler#2"`。**呼び出し箇所の同一性はファイル＋name で決まる**ので、前の版と同じ名前を使うこと。
- **feature**: 何をしているかを日本語で短く（15〜30字）。
- **provider**: `anthropic` / `openai` / `gemini` / `other`。**kind**: `text` / `vision` / `stt` / `tts` / `image` / `embedding` / `file` / `other`。
- **via**: 別ファイルの共通関数を通して呼ぶならその関数名、fetch を直に書いていれば `null`。
- **model**: `'claude-sonnet-5-5'` のように書かれていれば `literal`。定数なら `ref` にその識別子だけ。
  省略して `callClaudeText` などの既定値に任せていれば `ref: "DEFAULT_MODEL"`。引数で受け取っていて、
  同じファイル内の呼び出し元で決まっていればそちらを追う。
- **options**: モデル・プロンプト・入力データ以外の指定を、ソースに書いてある式のまま（`max_tokens: 1200` なら
  `{ "key": "max_tokens", "value": "1200" }`）。
- **system**（指示にあたる部分＝システムプロンプト・instructions・文字起こしの prompt）と **user**（ユーザーメッセージの
  テンプレート。入力をそのまま渡すだけなら空配列）は、部品の並び:
  - 名前のある定数・関数に入っていれば `ref` にその識別子だけ（同じファイルでも import でも）。
    振り分けるだけの関数（`buildSystemPrompt` が `buildMeetingSystemPrompt` / `buildTalkSystemPrompt` を呼び分ける）なら、
    **振り分けの関数のほうを指す**。中で呼んでいるプロンプト用の関数はスクリプトが自動で足す
  - 呼び出しの中に直に書かれた文字列なら `startLine` / `endLine`（行番号は --show の左端）。`const x = cond ? ... : ...` は
    `const` の行から含める
  - 1つのプロンプトが複数の部品をつないで作られていれば部品ごとに並べる

## 要約の決まり

- **差分の中身だけを読んで書く。コミットメッセージは使わない**（画面にも出さない。「commit」だけのものや別の作業名が付いたものが多く、当てにならない）。
- 何をどう変えたかを日本語で、1〜3文（150字くらいまで）。最初の文で要点を言い切る。変わったもの（モデル・オプション・プロンプトの中身・共通処理）を具体的に。
  プロンプトなら指示のどこをどう変えたか（例:「対象年齢を小学5〜6年生に変更」「Markdownを使わない指示を追加」）。
- 「〜を変更しました」ではなく「〜に変更」「〜を追加」のような短い言い切り。
- **コードの名前（関数名・変数名・`thinking`・`max_tokens` のようなオプションのキー・ファイルのパス）は書かない**。
  画面はコードを見せない方針（本人の希望）。例: ×「thinkingOff(model) に置き換え」→ ○「Sonnet 5.5 でも『考える時間なし』で動く指定に変更」、
  ×「max_tokens を 900→1400 に」→ ○「最大出力を 900→1400 に」。プロンプトの中に出てくる項目名（participants など）はそのままでよい。
- 共通の呼び出し処理だけが変わったとき（種類が「共通処理」）は、その旨と「（プロンプトは同じ）」を添える。
- 差分に無いことは書かない。差分が空白や書き方だけの違いなら「書き方を整えただけで、中身の変更はなし」と書き、抜き出しで消せるならそちらを直す。
- 理由が差分やコメントから分かるときは括弧で添える（例:「（Sonnet 5.5 が disabled を400で拒否するため）」）。

## フォルダをまたいだコピー

新しいアプリへファイルをコピーして育て始めた（元も残っている）ときは、`scripts/ai-manager/lineage.json` に
`{ "type": "fork", "from": "<元のパス>", "to": "<新しいパス>" }` を足す。元を消して移した場合で、git がリネームとして
拾えなかったときは `"type": "move"`。対象のツールを増やす・減らすときは `build.mjs` の `TARGETS`（並び順もここ）と
`apps/ai-tools/src/types/ai-manager.ts` の `AI_MANAGER_TOOLS`・`AI_MANAGER_TOOL_LABELS` の両方を直す。
`TARGETS` に無いツールのファイルは抜き出しもしない。
