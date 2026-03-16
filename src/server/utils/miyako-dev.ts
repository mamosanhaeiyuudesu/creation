import { readFileSync } from 'fs'
import { resolve } from 'path'

let _cache: any = null

function getSampleData() {
  if (!_cache) {
    _cache = JSON.parse(readFileSync(resolve(process.cwd(), 'miyako-sample.json'), 'utf-8'))
  }
  return _cache
}

export function getDevDb(event: any) {
  const db = event.context?.cloudflare?.env?.MIYAKO_DB
  if (db) return { db, dev: false }
  return { db: null, dev: true, sample: getSampleData() }
}
