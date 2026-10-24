#!/usr/bin/env node
// AI管理（ai-tools の /ai-manager）のデータを git の履歴から作る。
//
//   node scripts/ai-manager/build.mjs                 # 全アプリ
//   node scripts/ai-manager/build.mjs --only=manabi   # 1アプリだけ（試すとき）
//   node scripts/ai-manager/build.mjs --show=<blob>   # 抜き出し用に、その版を行番号つきで出す
//
// 更新は Claude Code に「ai-manager を更新して」と頼む（.claude/skills/ai-manager-update/SKILL.md）。
// このスクリプト自体は AI を呼ばない。足りない抜き出し・要約は .cache/pending.json に書き出すだけ。
//
// 流れ:
//   1. git log（first-parent・リネーム検出つき）から、AIを呼ぶファイルの全版を拾う
//   2. 版ごとの「このファイルのAI呼び出し」の抜き出し（Claude Code が書く。blob ハッシュでキャッシュ）
//      → AIが返すのは呼び出しの場所・会社・モデル・オプションと、プロンプトがどの定数/関数/行にあるかだけ。
//        プロンプトの本文はスクリプトがソースから切り出す（AIに書き写させると長くて高く、写し間違いもある）
//   3. 定数・関数の参照（DEFAULT_MODEL・buildSystemPrompt など）をその時点のソースから解決する。
//      別ファイルにある定数が変わったときも「変更」として拾うため、定義のあるファイルの変更コミットも調べる
//   4. 前の版とモデル・オプション・プロンプト・共通処理のどれかが違うときだけ「変更」として残す
//   5. 変更ごとの、差分から書いた一文の要約（これも Claude Code が書く。キャッシュ）
//   6. apps/ai-tools/src/server/data/ai-manager.json に書き出す
//
// キャッシュ（.cache/）は git に入れる。一度書いた版は二度と書かなくて済むように。

import { execFileSync } from 'node:child_process'
import crypto from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { z } from 'zod'

const HERE = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(HERE, '../..')
const CACHE = path.join(HERE, '.cache')
const OUT = path.join(ROOT, 'apps/ai-tools/src/server/data/ai-manager.json')

const APPS = [
  { app: 'ai-tools', root: 'apps/ai-tools/src' },
  { app: 'kikigaki', root: 'apps/production/kikigaki/src' },
  { app: 'manabi', root: 'apps/production/manabi/src' },
  { app: 'genogram', root: 'apps/genogram/src' },
]

// 画面に出すツール（この順に並べる）。どのツールかは呼び出し箇所のいまのパスで決める。
// ここに無いツールは抜き出しもしない（「ai-manager を更新して」の手間を増やさないため）。
// 旧キキガキ（ai-tools の /kikigaki）は、本番版キキガキの派生元として履歴の頭にだけ出る（lineage.json）
const TARGETS = [
  { id: 'kikigaki', match: (p) => p.startsWith('apps/production/kikigaki/src/') },
  { id: 'manabi', match: (p) => p.startsWith('apps/production/manabi/src/') },
  { id: 'nikki', match: (p) => /^apps\/ai-tools\/src\/.*\bnikki/.test(p) },
  { id: 'miyako', match: (p) => /^apps\/ai-tools\/src\/.*\bmiyako/.test(p) },
  { id: 'genogram', match: (p) => p.startsWith('apps/genogram/src/') },
]
const targetOf = (p) => TARGETS.find((t) => t.match(p))?.id ?? null

// AIを呼んでいそうなファイルの目印（どれかの版でこの行が足されたり消されたりしたファイルが対象）
const AI_PATTERN = 'api\\.anthropic\\.com|api\\.openai\\.com|generativelanguage\\.googleapis|callClaudeText|callClaudeVision|callOpenAi\\(|fetchOpenAi\\('

// 抜き出し・要約の決まりを変えたら上げる（キャッシュが全部 pending に戻る）
const EXTRACT_VERSION = 1
const SUMMARY_VERSION = 2

const args = Object.fromEntries(
  process.argv.slice(2).map((a) => {
    const [k, v] = a.replace(/^--/, '').split('=')
    return [k, v ?? true]
  }),
)
const SHOW = typeof args.show === 'string' ? args.show : null
const ONLY = typeof args.only === 'string' ? args.only.split(',') : null

// ---------------------------------------------------------------- git

function git(argv, opts = {}) {
  return execFileSync('git', argv, { cwd: ROOT, encoding: 'utf8', maxBuffer: 1 << 30, ...opts })
}

const blobCache = new Map()
function readBlob(sha) {
  if (!blobCache.has(sha)) blobCache.set(sha, git(['cat-file', '-p', sha]))
  return blobCache.get(sha)
}

const appOfPath = (p) => APPS.find((a) => p.startsWith(a.root + '/'))

/** first-parent の一本道の履歴。merge は第1親との差分で1回だけ出る */
function loadHistory(roots) {
  const raw = git(['log', '--reverse', '--first-parent', '-m', '-M', '--raw', '--no-abbrev', '--format=@@%H%x09%cI%x09%s', '--', ...roots])
  const commits = []
  for (const line of raw.split('\n')) {
    if (line.startsWith('@@')) {
      const [sha, date, ...msg] = line.slice(2).split('\t')
      commits.push({ sha, date, message: msg.join('\t'), changes: [] })
    } else if (line.startsWith(':')) {
      const [meta, ...paths] = line.split('\t')
      const [, , , newBlob, status] = meta.split(' ')
      const c = commits[commits.length - 1]
      if (status.startsWith('R') || status.startsWith('C')) {
        c.changes.push({ status: status[0], oldPath: paths[0], path: paths[1], blob: newBlob })
      } else {
        c.changes.push({ status, path: paths[0], blob: status === 'D' ? null : newBlob })
      }
    }
  }
  commits.forEach((c, i) => (c.index = i))
  return commits
}

function aiFileSet(roots) {
  const out = git(['log', '--format=', '--name-only', '-G', AI_PATTERN, '--', ...roots])
  return new Set(out.split('\n').filter(Boolean))
}

// ---------------------------------------------------------------- ファイルの同一性（リネーム・lineage）

/**
 * パスごとの変更の記録と、「同じファイル」のまとまり（identity）を作る。
 * identity はリネームと lineage.json の move をたどってつなぐ。fork は別 identity にして、元を覚えておく。
 */
function buildIdentities(commits, lineage) {
  const pathEvents = new Map() // path -> [{ ci, blob }]
  const idOf = new Map() // path -> identity id
  const identities = new Map() // id -> { id, events: [{ci, path, blob}], forkOf, forkAt }
  const linkTo = new Map(lineage.links.map((l) => [l.to, l]))

  const pushPath = (p, ci, blob) => {
    if (!pathEvents.has(p)) pathEvents.set(p, [])
    pathEvents.get(p).push({ ci, blob })
  }
  const identity = (id) => {
    if (!identities.has(id)) identities.set(id, { id, events: [], forkOf: null, forkAt: null, calls: null })
    return identities.get(id)
  }

  for (const c of commits) {
    for (const ch of c.changes) {
      if (ch.status === 'R') {
        pushPath(ch.oldPath, c.index, null)
        pushPath(ch.path, c.index, ch.blob)
        const id = idOf.get(ch.oldPath) ?? ch.oldPath
        idOf.set(ch.path, id)
        identity(id).events.push({ ci: c.index, path: ch.path, blob: ch.blob, renamedFrom: ch.oldPath })
        continue
      }
      pushPath(ch.path, c.index, ch.blob)
      if (!idOf.has(ch.path)) {
        const link = linkTo.get(ch.path)
        if (link?.type === 'move' && idOf.has(link.from)) {
          idOf.set(ch.path, idOf.get(link.from))
        } else {
          idOf.set(ch.path, ch.path)
          if (link?.type === 'fork') {
            const it = identity(ch.path)
            it.forkOf = idOf.get(link.from) ?? link.from
            it.forkAt = c.index
            it.calls = link.calls ?? null
          }
        }
      }
      identity(idOf.get(ch.path)).events.push({ ci: c.index, path: ch.path, blob: ch.blob })
    }
  }
  return { pathEvents, idOf, identities }
}

/** path の ci 時点の blob（無ければ null） */
function blobAt(pathEvents, p, ci) {
  const ev = pathEvents.get(p)
  if (!ev) return null
  let found = null
  for (const e of ev) {
    if (e.ci > ci) break
    found = e.blob
  }
  return found
}

// ---------------------------------------------------------------- ソースの簡易解析

const IDENT = /^[A-Za-z_$][\w$]*$/

function lastIdent(s) {
  if (!s) return null
  if (IDENT.test(s)) return s
  const m = s.match(/[A-Za-z_$][\w$]*/g)
  return m ? m[m.length - 1] : null
}

/** 文字列・テンプレート・コメント・正規表現を飛ばしながら、定義の終わりを探す */
function scanDefinitionEnd(src, start) {
  const isFn = /^\s*(?:export\s+)?(?:default\s+)?(?:async\s+)?function\b/.test(src.slice(start, start + 120))
  let i = start
  let depth = 0
  let seenEq = false
  let lastSig = ''
  while (i < src.length) {
    const c = src[i]
    const n = src[i + 1]
    if (c === '/' && n === '/') {
      const j = src.indexOf('\n', i)
      if (j < 0) return src.length
      i = j
      continue
    }
    if (c === '/' && n === '*') {
      const j = src.indexOf('*/', i + 2)
      i = j < 0 ? src.length : j + 2
      continue
    }
    if (c === '"' || c === "'") {
      i = skipString(src, i)
      lastSig = c
      continue
    }
    if (c === '`') {
      i = skipTemplate(src, i)
      lastSig = '`'
      continue
    }
    if (c === '/' && /[(,=:[!&|?{};+\-*%<>~^]$|^$/.test(lastSig)) {
      i = skipRegex(src, i)
      lastSig = '/'
      continue
    }
    if ('([{'.includes(c)) depth++
    if (')]}'.includes(c)) {
      depth--
      if (isFn && depth === 0 && c === '}') return i + 1
    }
    if (!isFn && depth === 0) {
      if (c === '=' && n !== '=' && n !== '>' && lastSig !== '=' && lastSig !== '!' && lastSig !== '<' && lastSig !== '>') seenEq = true
      if (c === ';') return i + 1
      if (c === '\n' && seenEq && lastSig && !'=+-*/?:|&,.(<'.includes(lastSig)) {
        const next = src.slice(i).trimStart()[0]
        if (!next || !'.+-*/?:|&,)]}'.includes(next)) return i
      }
    }
    if (!/\s/.test(c)) lastSig = c
    i++
  }
  return src.length
}

function skipString(src, i) {
  const q = src[i]
  let j = i + 1
  while (j < src.length) {
    if (src[j] === '\\') j += 2
    else if (src[j] === q || src[j] === '\n') return j + 1
    else j++
  }
  return j
}

function skipTemplate(src, i) {
  let j = i + 1
  while (j < src.length) {
    const c = src[j]
    if (c === '\\') j += 2
    else if (c === '`') return j + 1
    else if (c === '$' && src[j + 1] === '{') j = skipExpr(src, j + 2)
    else j++
  }
  return j
}

function skipExpr(src, i) {
  let depth = 1
  let j = i
  while (j < src.length) {
    const c = src[j]
    if (c === '"' || c === "'") j = skipString(src, j)
    else if (c === '`') j = skipTemplate(src, j)
    else if (c === '{') (depth++, j++)
    else if (c === '}') {
      depth--
      j++
      if (depth === 0) return j
    } else j++
  }
  return j
}

function skipRegex(src, i) {
  let j = i + 1
  let inClass = false
  while (j < src.length) {
    const c = src[j]
    if (c === '\\') j += 2
    else if (c === '\n') return j
    else if (c === '[') (inClass = true, j++)
    else if (c === ']') (inClass = false, j++)
    else if (c === '/' && !inClass) {
      j++
      while (/[a-z]/.test(src[j] || '')) j++
      return j
    } else j++
  }
  return j
}

// ---------------------------------------------------------------- プロンプトの文章だけを取り出す
//
// 画面ではコードを見せず、プロンプトの文章だけを見せる（本人の希望）。比べるのもこの文章どうしなので、
// 関数名や引数を変えただけのようなコードだけの変更は「プロンプトの変更」に数えない。

const HAS_JA = /[\u3040-\u30ff\u3400-\u9fff\uff01-\uff5e]/

function unescapeJs(t) {
  return t.replace(/\\(u\{[0-9a-fA-F]+\}|u[0-9a-fA-F]{4}|x[0-9a-fA-F]{2}|.)/g, (_, e) => {
    if (e === 'n') return '\n'
    if (e === 't') return '\t'
    if (e === 'r') return ''
    if (e[0] === 'u') return String.fromCodePoint(parseInt(e.replace(/[u{}]/g, ''), 16))
    if (e[0] === 'x') return String.fromCharCode(parseInt(e.slice(1), 16))
    return e
  })
}

/** ${...} の差し込みを {名前} に。条件つきの文が入っていればその文も見せる */
function placeholder(expr) {
  const e = expr.trim()
  if (e.length <= 40 && !/['"`]/.test(e)) return `{${e}}`
  const inner = toProse(e, true)
  if (inner) return `{条件によって: ${inner.replace(/\s*\n+\s*/g, ' ')}}`
  return '{…}'
}

function templateText(raw) {
  let out = ''
  let j = 0
  while (j < raw.length) {
    if (raw[j] === '\\') {
      out += raw.slice(j, j + 2)
      j += 2
    } else if (raw[j] === '$' && raw[j + 1] === '{') {
      const end = skipExpr(raw, j + 2)
      out += placeholder(raw.slice(j + 2, end - 1)).replace(/\\/g, '\\\\')
      j = end
    } else {
      out += raw[j++]
    }
  }
  return unescapeJs(out)
}

/**
 * コードから文字列リテラルの中身だけを順に取り出してつなぐ。'a' + 'b' のような連結は1つにする。
 * 日本語を含むか、40字以上か、改行を含む文字列だけを残す（'user'・'adaptive' のような値は落とす）。
 */
function toProse(code, inner = false) {
  if (!code) return null
  const pieces = []
  let i = 0
  let lastSig = ''
  let concat = false
  const push = (text) => {
    if (concat && pieces.length) pieces[pieces.length - 1] += text
    else pieces.push(text)
    concat = false
    lastSig = 'str'
  }
  while (i < code.length) {
    const c = code[i]
    const n = code[i + 1]
    if (c === '/' && n === '/') {
      const j = code.indexOf('\n', i)
      i = j < 0 ? code.length : j
      continue
    }
    if (c === '/' && n === '*') {
      const j = code.indexOf('*/', i + 2)
      i = j < 0 ? code.length : j + 2
      continue
    }
    if (c === '`') {
      const end = skipTemplate(code, i)
      push(templateText(code.slice(i + 1, end - 1)))
      i = end
      continue
    }
    if (c === '"' || c === "'") {
      const end = skipString(code, i)
      push(unescapeJs(code.slice(i + 1, end - 1)))
      i = end
      continue
    }
    if (c === '/' && /[(,=:[!&|?{};+]$|^$/.test(lastSig)) {
      i = skipRegex(code, i)
      lastSig = '/'
      continue
    }
    if (!/\s/.test(c)) {
      concat = c === '+' && lastSig === 'str'
      lastSig = c
    }
    i++
  }
  const cand = pieces.map((t) => t.replace(/^\n+|\s+$/g, '')).filter((t) => t && (HAS_JA.test(t) || t.length >= 40 || t.includes('\n')))
  // 出力例の JSON の説明文のように、本文にすでに入っている短い断片は重ねて出さない
  const kept = cand.filter((t, k) => !cand.some((o, m) => m !== k && o.length > t.length && o.includes(t)))
  if (!kept.length) return null
  return kept.join(inner ? ' ' : '\n\n')
}

/**
 * プロンプトを組み立てる関数が、同じファイルのプロンプト用の関数・定数（名前に prompt / system /
 * instruction を含むもの）を呼んでいれば、その本文も後ろに足す。
 * buildSystemPrompt(mode) が buildMeetingSystemPrompt / buildTalkSystemPrompt を呼び分けるだけ、のような形で
 * 中身が見えなくなるのを防ぐ。版ごとに抜き出しがどちらを指していても同じ本文になるよう、足す順は登場順で固定。
 */
function withHelpers(text, src, self, depth = 2) {
  const seen = new Set([self])
  const parts = [text]
  let frontier = [text]
  for (let d = 0; d < depth; d++) {
    const next = []
    for (const t of frontier) {
      for (const m of t.matchAll(/\b([A-Za-z_$][\w$]*)\b/g)) {
        const name = m[1]
        if (seen.has(name) || !/prompt|system|instruction/i.test(name)) continue
        seen.add(name)
        const def = findDefinition(src, name)
        if (def && def !== text) {
          parts.push(def)
          next.push(def)
        }
      }
    }
    frontier = next
  }
  return parts.join(`\n${PART_BREAK}\n`)
}

/** 呼び分けているプロンプトの境目。proseOf で区切り線にする */
const PART_BREAK = '/*@@part@@*/'

/** ソースから ident の定義（const/let/function）を切り出す */
function findDefinition(src, ident) {
  const esc = ident.replace(/\$/g, '\\$')
  const re = new RegExp(`^[ \\t]*(?:export\\s+)?(?:default\\s+)?(?:async\\s+)?(?:const|let|var|function\\*?)\\s+${esc}\\b`, 'm')
  const m = re.exec(src)
  if (!m) return null
  const start = m.index
  const end = scanDefinitionEnd(src, start)
  return src.slice(start, end).replace(/\s+$/, '')
}

/**
 * 行の範囲を切り出す。範囲が式の途中（? や : で始まる行・前の行が = で終わる）から始まっていれば
 * 文の頭まで広げる。版ごとに抜き出しの範囲が1行ずれて「変更」に見えるのを防ぐため
 */
const lineSlice = (src, s, e) => {
  const lines = src.split('\n')
  if (!Number.isInteger(s) || !Number.isInteger(e)) return null
  if (s > e) [s, e] = [e, s]
  if (s < 1 || s > lines.length) return null
  while (s > 1 && (/^\s*[?:+.]/.test(lines[s - 1]) || /(=|\+|\?|:|\(|,)\s*$/.test(lines[s - 2]))) s--
  return lines.slice(s - 1, Math.min(e, lines.length)).join('\n')
}

function firstStringLiteral(text) {
  const m = text?.match(/=\s*(['"`])([^'"`\n]+)\1/) || text?.match(/(['"`])([^'"`\n]+)\1/)
  return m ? m[2] : null
}

// ---------------------------------------------------------------- 抜き出し・要約（Claude Code が書く）
//
// API は呼ばない（本番と同じキーの上限を食い合うため。2026-10-24 にそれで上限に当たった）。
// まだ無い分は .cache/pending.json に書き出し、Claude Code が中身を読んで .cache/extract/<blob>.json・
// .cache/summary/<key>.json を書く。書き方は .claude/skills/ai-manager-update/SKILL.md。

const Segment = z.object({
  ref: z.string().nullable(),
  startLine: z.number().int().nullable(),
  endLine: z.number().int().nullable(),
})

const CallSchema = z.object({
  name: z.string(),
  feature: z.string(),
  provider: z.enum(['anthropic', 'openai', 'gemini', 'other']),
  kind: z.enum(['text', 'vision', 'stt', 'tts', 'image', 'embedding', 'file', 'other']),
  line: z.number().int(),
  via: z.string().nullable(),
  model: z.object({ literal: z.string().nullable(), ref: z.string().nullable() }),
  options: z.array(z.object({ key: z.string(), value: z.string() })),
  system: z.array(Segment),
  user: z.array(Segment),
})
const ExtractCache = z.object({ version: z.literal(EXTRACT_VERSION), path: z.string(), calls: z.array(CallSchema) }).passthrough()
const SummaryCache = z.object({ version: z.literal(SUMMARY_VERSION), summary: z.string().min(1) }).passthrough()

const pending = { extract: [], summary: [] }
const invalid = []

// キャッシュは種類ごとに1つの JSON（.cache/extract.json・.cache/summary.json）にまとめる。
// Claude Code が書く分は .cache/inbox/<種類>-<鍵>.json に1件ずつ置き、次に流したときに取り込んで消す
// （大きな JSON を手で書き換えるより、1件ずつのファイルを書くほうが間違えにくいため）。
// 作り直しで使わなかった鍵は書き出すときに捨てる（--only のときは他のアプリの分を残すため捨てない）。
const INBOX = path.join(CACHE, 'inbox')
const stores = { extract: {}, summary: {} }
const usedKeys = { extract: new Set(), summary: new Set() }

function storePath(kind) {
  return path.join(CACHE, `${kind}.json`)
}

function loadStores() {
  for (const kind of Object.keys(stores)) {
    const p = storePath(kind)
    if (fs.existsSync(p)) stores[kind] = JSON.parse(fs.readFileSync(p, 'utf8'))
    // 1件＝1ファイルだった頃のフォルダ（.cache/extract/ など）があれば取り込む
    const legacyDir = path.join(CACHE, kind)
    if (fs.existsSync(legacyDir) && fs.statSync(legacyDir).isDirectory()) {
      for (const f of fs.readdirSync(legacyDir)) {
        if (!f.endsWith('.json')) continue
        const key = f.replace(/\.json$/, '')
        if (!stores[kind][key]) stores[kind][key] = JSON.parse(fs.readFileSync(path.join(legacyDir, f), 'utf8'))
      }
      fs.rmSync(legacyDir, { recursive: true, force: true })
    }
  }
  // inbox の取り込み（形の確認は読み出すときに行う）
  if (fs.existsSync(INBOX)) {
    for (const f of fs.readdirSync(INBOX)) {
      const m = f.match(/^(extract|summary)-(.+)\.json$/)
      if (!m) continue
      const file = path.join(INBOX, f)
      try {
        stores[m[1]][m[2]] = JSON.parse(fs.readFileSync(file, 'utf8'))
        fs.rmSync(file)
      } catch (err) {
        invalid.push(`${path.relative(ROOT, file)}: JSONとして読めません（${err.message}）`)
      }
    }
  }
}

function saveStores(prune) {
  for (const kind of Object.keys(stores)) {
    const out = {}
    for (const key of Object.keys(stores[kind]).sort()) if (!prune || usedKeys[kind].has(key)) out[key] = stores[kind][key]
    fs.writeFileSync(storePath(kind), JSON.stringify(out, null, 1) + '\n')
  }
  if (fs.existsSync(INBOX) && !fs.readdirSync(INBOX).length) fs.rmSync(INBOX, { recursive: true })
}

const inboxPath = (kind, key) => path.relative(ROOT, path.join(INBOX, `${kind}-${key}.json`))

/** 形が合わないキャッシュ（書き損じ）は無いものとして扱い、pending に戻す */
function readCache(kind, key, schema) {
  usedKeys[kind].add(key)
  const v = stores[kind][key]
  if (!v) return null
  const r = schema.safeParse(v)
  if (!r.success) {
    invalid.push(`${kind}.json の ${key}: ${r.error.issues.map((i) => `${i.path.join('.')} ${i.message}`).join(' / ')}`)
    return null
  }
  return r.data
}

function extractBlob(blob, filePath) {
  const cached = readCache('extract', blob, ExtractCache)
  if (cached) return cached.calls
  pending.extract.push({ blob, path: filePath, lines: readBlob(blob).split('\n').length, cache: inboxPath('extract', blob) })
  return null
}

/**
 * 要約の鍵は「呼び出し箇所＋コミット」。差分の文字列を鍵にすると、差分の見せ方（プロンプトの切り出し方）を
 * 直すたびに書いた要約が全部作り直しになるため。
 */
function summarizeChange(siteKey, commit, prev, next, types, commitMessage, texts) {
  const diffText = describeDiff(prev, next, texts)
  const key = sha1(`${SUMMARY_VERSION}\n${siteKey}\n${commit}`)
  const cached = readCache('summary', key, SummaryCache)
  if (cached) return cached.summary
  pending.summary.push({ key, cache: inboxPath('summary', key), site: siteKey, commit, path: next.path, commitMessage, types, diff: diffText })
  return null
}


const proseOf = (code) => {
  if (!code) return null
  const parts = code
    .split(PART_BREAK)
    .map((c) => toProse(c))
    .filter(Boolean)
  // 文章が取れなければ（配列の join で組み立てているなど）空にする。画面にコードは出さない
  return parts.length ? parts.join('\n\n――――――――――\n\n') : null
}

/** オプションは書き方の空白だけの違いを無視して比べる */
const optionsKey = (o) => JSON.stringify(Object.fromEntries(Object.entries(o).map(([k, v]) => [k, String(v).replace(/\s+/g, '')])))

function numbered(src) {
  return src
    .split('\n')
    .map((l, i) => `${String(i + 1).padStart(4)}| ${l}`)
    .join('\n')
}

// ---------------------------------------------------------------- 差分

/** 2つの文章で、足した・消した文字の数（文字単位の LCS。長すぎるときは行単位で近似） */
function changedChars(a, b) {
  const x = [...(a || '')]
  const y = [...(b || '')]
  if (x.length * y.length > 4_000_000) {
    return lineDiff(a, b).filter((l) => l[0] === '+' || l[0] === '-').reduce((n, l) => n + l.length - 2, 0)
  }
  let prev = new Int32Array(y.length + 1)
  for (let i = 1; i <= x.length; i++) {
    const cur = new Int32Array(y.length + 1)
    for (let j = 1; j <= y.length; j++) cur[j] = x[i - 1] === y[j - 1] ? prev[j - 1] + 1 : Math.max(prev[j], cur[j - 1])
    prev = cur
  }
  return x.length + y.length - 2 * prev[y.length]
}

/**
 * ユーザープロンプトは入力の受け渡しがほとんどなので、小さな直し（30字未満）は「修正」に数えない（本人の希望）。
 * miyako のように指示をユーザー側に書いているものの書き換えは残る
 */
const USER_CHANGE_MIN_CHARS = 30
function userChanged(a, b) {
  if (a === b) return false
  return changedChars(a, b) >= USER_CHANGE_MIN_CHARS
}

const sha1 = (s) => crypto.createHash('sha1').update(s).digest('hex')

/** 行単位の差分（LCS）。要約に渡す用 */
function lineDiff(a, b) {
  const x = (a || '').split('\n')
  const y = (b || '').split('\n')
  const n = x.length
  const m = y.length
  if (n * m > 4_000_000) return [`- （長すぎるので省略: ${n}行 → ${m}行）`]
  const dp = Array.from({ length: n + 1 }, () => new Int32Array(m + 1))
  for (let i = n - 1; i >= 0; i--) for (let j = m - 1; j >= 0; j--) dp[i][j] = x[i] === y[j] ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1])
  const out = []
  let i = 0
  let j = 0
  while (i < n || j < m) {
    if (i < n && j < m && x[i] === y[j]) {
      out.push('  ' + x[i])
      i++
      j++
    } else if (j < m && (i === n || dp[i][j + 1] >= dp[i + 1][j])) out.push('+ ' + y[j++])
    else out.push('- ' + x[i++])
  }
  // 変更の前後3行だけ残す
  const keep = new Set()
  out.forEach((l, k) => {
    if (l[0] !== ' ') for (let d = -3; d <= 3; d++) keep.add(k + d)
  })
  const res = []
  let skipped = false
  out.forEach((l, k) => {
    if (keep.has(k)) {
      res.push(l)
      skipped = false
    } else if (!skipped) {
      res.push('  …')
      skipped = true
    }
  })
  return res
}

function describeDiff(prev, next, texts) {
  const parts = []
  if (prev.model !== next.model) parts.push(`モデル: ${prev.model} → ${next.model}`)
  if (prev.provider !== next.provider || prev.kind !== next.kind) parts.push(`種類: ${prev.provider}/${prev.kind} → ${next.provider}/${next.kind}`)
  const po = JSON.stringify(prev.options)
  const no = JSON.stringify(next.options)
  if (po !== no) parts.push(`オプション: ${po} → ${no}`)
  for (const k of ['system', 'user']) {
    if (prev[k] !== next[k]) {
      const label = { system: 'システムプロンプト', user: 'ユーザープロンプト' }[k]
      parts.push(`${label}の差分:\n${lineDiff(texts[prev[k]] ?? '', texts[next[k]] ?? '').join('\n')}`)
    }
  }
  return parts.join('\n\n').slice(0, 60_000)
}

// ---------------------------------------------------------------- 参照の解決

/**
 * ci 時点で ident を定義しているソースを探す。
 * まず呼び出し元のファイル、次に前回見つかったファイル、最後に git grep（遅いので最後）。
 */
function makeResolver(commits, pathEvents) {
  const lastHome = new Map() // `${root}:${ident}` -> path
  const grepCache = new Map()

  function grepDefiningPaths(ci, ident, root) {
    const key = `${ci}:${root}:${ident}`
    if (grepCache.has(key)) return grepCache.get(key)
    let paths = []
    try {
      const out = git(['grep', '-l', '-E', `^[[:space:]]*(export[[:space:]]+)?(default[[:space:]]+)?(async[[:space:]]+)?(const|let|var|function)[[:space:]]+${ident.replace(/\$/g, '\\$')}([^A-Za-z0-9_$]|$)`, commits[ci].sha, '--', root])
      paths = out
        .split('\n')
        .filter(Boolean)
        .map((l) => l.slice(commits[ci].sha.length + 1))
    } catch {
      paths = []
    }
    grepCache.set(key, paths)
    return paths
  }

  /** 戻り値: { text, path } | null */
  return function resolve(ident, ci, callerPath, callerSrc) {
    if (!ident) return null
    const own = findDefinition(callerSrc, ident)
    if (own) return { text: own, path: callerPath, src: callerSrc }
    const root = appOfPath(callerPath)?.root
    if (!root) return null
    const homeKey = `${root}:${ident}`
    const tryPath = (p) => {
      const b = blobAt(pathEvents, p, ci)
      if (!b) return null
      const src = readBlob(b)
      const def = findDefinition(src, ident)
      return def ? { text: def, path: p, src } : null
    }
    if (lastHome.has(homeKey)) {
      const hit = tryPath(lastHome.get(homeKey))
      if (hit) return hit
    }
    const candidates = grepDefiningPaths(ci, ident, root)
    // import しているファイルを優先（同名の定数が別ツールにもあるため）
    const imports = [...callerSrc.matchAll(/from\s+['"]([^'"]+)['"]/g)].map((m) => path.basename(m[1]).replace(/\.(ts|js|mjs)$/, ''))
    candidates.sort((a, b) => {
      const ia = imports.includes(path.basename(a).replace(/\.(ts|js|mjs|vue)$/, '')) ? 0 : 1
      const ib = imports.includes(path.basename(b).replace(/\.(ts|js|mjs|vue)$/, '')) ? 0 : 1
      return ia - ib
    })
    for (const p of candidates) {
      const hit = tryPath(p)
      if (hit) {
        lastHome.set(homeKey, p)
        return hit
      }
    }
    return null
  }
}

// ---------------------------------------------------------------- 本体

const APP_LABELS = { 'ai-tools': 'ai-tools', kikigaki: 'キキガキ本番版', manabi: 'まなび本番版', genogram: 'ジェノグラム' }

/** 移動の要約。パスは見せず、アプリをまたいだかどうかだけ書く */
function movedSummary(from, to) {
  const a = appOfPath(from)?.app
  const b = appOfPath(to)?.app
  if (a && b && a !== b) return `${APP_LABELS[a] ?? a} から ${APP_LABELS[b] ?? b} へ移動（中身は同じ）`
  return 'ファイルの名前・場所を変更（中身は同じ）'
}

function endpointOf(p) {
  const m = p.match(/\/server\/api\/(.+)\.(get|post|put|patch|delete)\.ts$/)
  if (!m) return null
  return `${m[2].toUpperCase()} /api/${m[1].replace(/\/index$/, '')}`
}

/**
 * thinking の指定の式から、実際に送られる値を求める。
 * thinkingOff(model) は Sonnet 5.5 なら between_tools・それ以外は disabled（anthropic.ts と同じ決まり）。
 * 共通処理の中の `opts.thinking ?? 'disabled'` のような式は、呼び出し側の指定（callValue）を当てはめる
 */
function effectiveThinking(expr, callValue, model) {
  if (!expr) return null
  const e = expr.trim().replace(/,$/, '')
  if (/thinkingOff\(/.test(e)) return String(model).startsWith('claude-sonnet-5-5') ? 'between_tools' : 'disabled'
  if (/opts\.thinking\s*===\s*'adaptive'/.test(e)) return callValue === 'adaptive' ? 'adaptive' : 'between_tools'
  if (/opts\.thinking\s*\?\?/.test(e)) return callValue ?? e.match(/\?\?\s*'(\w+)'/)?.[1] ?? null
  const lit = e.match(/type:\s*'(\w+)'/)?.[1] ?? e.match(/^'(\w+)'$/)?.[1]
  return lit ?? callValue ?? null
}

async function main() {
  if (SHOW) {
    process.stdout.write(numbered(readBlob(git(['rev-parse', SHOW]).trim())) + '\n')
    return
  }
  const apps = ONLY ? APPS.filter((a) => ONLY.includes(a.app)) : APPS
  fs.mkdirSync(CACHE, { recursive: true })
  loadStores()
  // 履歴は全アプリぶん読む（アプリをまたぐリネーム・派生をたどるため）。出力だけ apps に絞る
  const allRoots = APPS.map((a) => a.root)
  const lineage = JSON.parse(fs.readFileSync(path.join(HERE, 'lineage.json'), 'utf8'))

  console.log('履歴を読んでいます…')
  const commits = loadHistory(allRoots)
  const aiFiles = aiFileSet(allRoots)
  const { pathEvents, identities } = buildIdentities(commits, lineage)

  // 対象の identity（どれかのパスが AI ファイル）。fork 元も含める
  const targets = [...identities.values()].filter((it) => it.events.some((e) => aiFiles.has(e.path)))
  const wanted = new Set()
  for (const it of targets) {
    const lastPath = it.events[it.events.length - 1].path
    if (targetOf(lastPath) && apps.some((a) => lastPath.startsWith(a.root + '/'))) {
      wanted.add(it.id)
      if (it.forkOf) wanted.add(it.forkOf)
    }
  }
  const work = targets.filter((it) => wanted.has(it.id))

  // 抜き出しが要る blob
  const jobs = []
  const seen = new Set()
  for (const it of work) {
    for (const e of it.events) {
      if (e.blob && !seen.has(e.blob)) {
        seen.add(e.blob)
        jobs.push({ blob: e.blob, path: e.path })
      }
    }
  }
  const extracted = new Map()
  for (const j of jobs) extracted.set(j.blob, extractBlob(j.blob, j.path))
  console.log(`対象ファイル ${work.length}件・版 ${jobs.length}件（抜き出し済み ${jobs.length - pending.extract.length}件）`)

  // ---- 呼び出し箇所ごとのスナップショット
  const resolve = makeResolver(commits, pathEvents)
  const texts = {}
  const putText = (t) => {
    if (!t) return null
    const h = sha1(t).slice(0, 16)
    texts[h] = t
    return h
  }

  function snapshotOf(call, ci, callerPath, src, defPaths) {
    const resolveRef = (ident) => {
      const r = resolve(lastIdent(ident), ci, callerPath, src)
      if (r && r.path !== callerPath) defPaths.add(r.path)
      return r
    }
    const segText = (segs) => {
      const parts = []
      for (const s of segs) {
        if (s.ref) {
          const r = resolveRef(s.ref)
          parts.push(r ? withHelpers(r.text, r.src, lastIdent(s.ref)) : `（${s.ref} の定義が見つかりませんでした）`)
        } else {
          const t = lineSlice(src, s.startLine, s.endLine)
          if (t) parts.push(t)
        }
      }
      return parts.join('\n\n') || null
    }
    let model = call.model.literal
    if (!model && call.model.ref) {
      const r = resolveRef(call.model.ref)
      let lit = r ? firstStringLiteral(r.text) : null
      if (!lit && r) {
        // const MODEL = DEFAULT_MODEL のような1段の参照
        const inner = r.text.match(/=\s*([A-Za-z_$][\w$]*)\s*;?\s*$/)
        if (inner) {
          const r2 = resolveRef(inner[1])
          lit = r2 ? firstStringLiteral(r2.text) : null
        }
      }
      model = lit || `（${call.model.ref}）`
    }
    const options = {}
    for (const o of [...call.options].sort((a, b) => a.key.localeCompare(b.key))) {
      let v = o.value
      if (IDENT.test(v) && /^[A-Z_][A-Z0-9_]*$/.test(v)) {
        const r = resolveRef(v)
        const lit = r ? r.text.match(/=\s*([^;\n]+)/)?.[1]?.trim() : null
        if (lit) v = `${v} = ${lit}`
      }
      options[o.key] = v
    }
    // 共通の呼び出し処理（callClaudeText など）の中で決めている thinking も、その呼び出しの option として見せる。
    // 「共通処理」という別の種類にせず、実際に効いている値（disabled / between_tools / adaptive）を thinking に入れる
    const callThinking = options.thinking ? effectiveThinking(options.thinking, null, model) : null
    let thinking = callThinking
    if (call.via) {
      const r = resolveRef(call.via)
      if (r) thinking = effectiveThinking(r.text.match(/\bthinking:\s*([^\n]+)/)?.[1] ?? null, callThinking, model) ?? callThinking
    }
    if (thinking) options.thinking = thinking
    else delete options.thinking
    return {
      provider: call.provider,
      kind: call.kind,
      model: model || '（不明）',
      options,
      system: putText(proseOf(segText(call.system))),
      user: putText(proseOf(segText(call.user))),
      via: call.via || null,
      path: callerPath,
      line: call.line,
      feature: call.feature,
    }
  }

  const sameSnapshot = (a, b) =>
    a.provider === b.provider &&
    a.kind === b.kind &&
    a.model === b.model &&
    optionsKey(a.options) === optionsKey(b.options) &&
    a.system === b.system &&
    !userChanged(texts[a.user], texts[b.user]) &&
    a.path === b.path

  function changeTypes(prev, next) {
    const t = []
    if (prev.model !== next.model) t.push('model')
    if (optionsKey(prev.options) !== optionsKey(next.options) || prev.provider !== next.provider || prev.kind !== next.kind) t.push('options')
    if (prev.system !== next.system || userChanged(texts[prev.user], texts[next.user])) t.push('prompt')
    if (prev.path !== next.path) t.push('moved')
    return t
  }

  /** identity の版を時系列に並べ、呼び出し箇所ごとの版の列を返す */
  function buildSites(it, untilCi = Infinity) {
    // 評価する時点: ファイル自体の変更 + 定義のあるファイルの変更（1回目で集めてから2回目で足す）
    const ownPoints = it.events.filter((e) => e.ci < untilCi).map((e) => e.ci)
    const firstCi = ownPoints[0]
    const lastCi = it.events[it.events.length - 1].blob ? Infinity : it.events[it.events.length - 1].ci
    const evalAt = (points) => {
      const defPaths = new Set()
      const timeline = [] // { ci, path, calls: Map(name -> snapshot) | null }
      for (const ci of [...new Set(points)].sort((a, b) => a - b)) {
        let ev = null
        for (const e of it.events) {
          if (e.ci > ci) break
          ev = e
        }
        if (!ev) continue
        if (!ev.blob) {
          timeline.push({ ci, path: ev.path, calls: null })
          continue
        }
        const calls = extracted.get(ev.blob)
        if (!calls) continue // 抜き出しに失敗した版は飛ばす
        const src = readBlob(ev.blob)
        const m = new Map()
        for (const call of calls) m.set(call.name, snapshotOf(call, ci, ev.path, src, defPaths))
        timeline.push({ ci, path: ev.path, calls: m })
      }
      return { timeline, defPaths }
    }
    let { timeline, defPaths } = evalAt(ownPoints)
    const extra = []
    for (const p of defPaths) {
      for (const e of pathEvents.get(p) || []) {
        if (e.ci > firstCi && e.ci < lastCi && e.ci < untilCi) extra.push(e.ci)
      }
    }
    if (extra.length) timeline = evalAt([...ownPoints, ...extra]).timeline

    const sites = new Map() // name -> versions[]
    for (const t of timeline) {
      const names = new Set([...(t.calls?.keys() ?? []), ...sites.keys()])
      for (const name of names) {
        const versions = sites.get(name) ?? []
        const last = versions[versions.length - 1]
        const snap = t.calls?.get(name)
        if (!snap) {
          if (last && !last.removed) versions.push({ ...last, ci: t.ci, removed: true, types: ['removed'] })
        } else if (!last || last.removed) {
          versions.push({ ...snap, ci: t.ci, types: ['new'] })
        } else if (!sameSnapshot(last, snap)) {
          versions.push({ ...snap, ci: t.ci, types: changeTypes(last, snap) })
        }
        if (versions.length) sites.set(name, versions)
      }
    }
    return sites
  }

  console.log('版を並べています…')
  const allSites = []
  const byId = new Map(work.map((it) => [it.id, it]))
  for (const it of work) {
    const lastPath = it.events[it.events.length - 1].path
    if (!wanted.has(it.id) || !targetOf(lastPath)) continue
    const sites = buildSites(it)
    // 派生（fork）なら、派生した時点までの元の履歴を前に足す
    let parentSites = null
    if (it.forkOf && byId.has(it.forkOf)) parentSites = buildSites(byId.get(it.forkOf), it.forkAt)
    for (const [name, versions] of sites) {
      let vs = versions
      if (parentSites) {
        const parentName = Object.entries(it.calls || {}).find(([, to]) => to === name)?.[0] ?? name
        const pv = (parentSites.get(parentName) || []).filter((v) => !v.removed)
        if (pv.length) {
          const first = { ...vs[0], types: ['forked', ...changeTypes(pv[pv.length - 1], vs[0]).filter((t) => t !== 'moved')] }
          vs = [...pv, first, ...vs.slice(1)]
        }
      }
      // ファイルの出し入れ（Vector Store への登録・PDF のアップロードなど）のように、プロンプトが一度も無い
      // 呼び出しは見る中身が無いので出さない（本人の希望）
      if (!vs.some((v) => v.system || v.user)) continue
      // 撤去済みの呼び出しも出さない（本人の希望）
      if (vs[vs.length - 1].removed) continue
      allSites.push({ identity: it.id, name, versions: vs })
    }
  }

  // ---- 変更の要約
  const summaryJobs = []
  for (const s of allSites) {
    s.versions.forEach((v, k) => {
      const prev = s.versions[k - 1]
      const needs = prev && v.types.some((t) => ['model', 'options', 'prompt', 'forked'].includes(t))
      if (needs) summaryJobs.push({ s, prev, v })
    })
  }
  const summaries = new Map()
  for (const { s, prev, v } of summaryJobs) {
    summaries.set(v, summarizeChange(`${s.identity}#${s.name}`, commits[v.ci].sha, prev, v, v.types, commits[v.ci].message, texts))
  }

  // ---- 書き出し
  const out = {
    generatedAt: new Date().toISOString(),
    head: commits[commits.length - 1]?.sha ?? null,
    sites: allSites
      .map((s) => {
        const last = s.versions[s.versions.length - 1]
        const latestLive = [...s.versions].reverse().find((v) => !v.removed) ?? last
        const app = appOfPath(latestLive.path)?.app ?? 'other'
        return {
          id: `${s.identity}#${s.name}`,
          app,
          tool: targetOf(latestLive.path),
          name: s.name,
          feature: latestLive.feature,
          path: latestLive.path,
          endpoint: endpointOf(latestLive.path),
          status: last.removed ? 'removed' : 'active',
          versions: s.versions.map((v, k) => ({
            commit: commits[v.ci].sha,
            date: commits[v.ci].date,
            userChanged: k > 0 && userChanged(s.versions[k - 1].user && texts[s.versions[k - 1].user], v.user && texts[v.user]),
            path: v.path,
            line: v.line,
            endpoint: endpointOf(v.path),
            app: appOfPath(v.path)?.app ?? 'other',
            provider: v.provider,
            kind: v.kind,
            model: v.model,
            options: v.options,
            via: v.via,
            system: v.system,
            user: v.user,
            change:
              k === 0
                ? null
                : {
                    types: v.types,
                    summary:
                      summaries.get(v) ??
                      (v.types.includes('removed') ? 'この呼び出しを撤去' : v.types.includes('moved') ? movedSummary(s.versions[k - 1].path, v.path) : null),
                  },
          })),
        }
      })
      .sort((a, b) => {
        const order = (s) => TARGETS.findIndex((t) => t.id === s.tool)
        return order(a) - order(b) || a.path.localeCompare(b.path) || a.name.localeCompare(b.name)
      }),
    texts: {},
  }
  // 実際に使われているテキストだけ残す
  for (const s of out.sites) for (const v of s.versions) for (const k of ['system', 'user']) if (v[k]) out.texts[v[k]] = texts[v[k]]

  fs.mkdirSync(path.dirname(OUT), { recursive: true })
  fs.writeFileSync(OUT, JSON.stringify(out) + '\n')

  const versions = out.sites.reduce((n, s) => n + s.versions.length, 0)
  console.log(`書き出しました: ${path.relative(ROOT, OUT)}（呼び出し箇所 ${out.sites.length}件・版 ${versions}件・${Math.round(fs.statSync(OUT).size / 1024)}KB）`)
  console.log(`変更の要約 ${summaryJobs.length}件（書き済み ${summaryJobs.length - pending.summary.length}件）`)

  // 足りない分を Claude Code に渡す。抜き出しが足りない版はその版ごと飛ばしているので、
  // 抜き出しを書いたらもう一度流すと、その版の要約が新たに pending に出てくる
  saveStores(!ONLY)
  const pendingPath = path.join(CACHE, 'pending.json')
  if (pending.extract.length || pending.summary.length) {
    fs.writeFileSync(pendingPath, JSON.stringify(pending, null, 1) + '\n')
    console.log(`未処理: 抜き出し ${pending.extract.length}件・要約 ${pending.summary.length}件 → ${path.relative(ROOT, pendingPath)}`)
  } else {
    fs.rmSync(pendingPath, { force: true })
    console.log('未処理はありません')
  }
  if (invalid.length) {
    console.log(`形が合わないキャッシュ ${invalid.length}件（未処理として扱いました）:`)
    for (const f of invalid) console.log('  ' + f)
  }
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
