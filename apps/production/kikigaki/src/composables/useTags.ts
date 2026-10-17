// 本人のタグの一覧（件数つき）と、名前の変更・削除。
// 左メニューで変更・削除したら version を進める。一覧と確認画面はそれを見て読み直す
// （開いている画面に古いタグが残り、保存で元に戻ってしまうのを防ぐ）。

export interface TagCount {
  tag: string
  count: number
}

export function useTags() {
  const { authedFetch } = useAuth()
  const tags = useState<TagCount[]>('kk-tags', () => [])
  const version = useState<number>('kk-tags-version', () => 0)

  async function load(): Promise<TagCount[]> {
    tags.value = (await authedFetch<{ tags: TagCount[] }>('/api/tags')).tags
    return tags.value
  }

  async function rename(from: string, to: string): Promise<number> {
    const { changed } = await authedFetch<{ changed: number }>('/api/tags/rename', { method: 'POST', body: { from, to } })
    version.value++
    await load()
    return changed
  }

  async function remove(tag: string): Promise<number> {
    const { changed } = await authedFetch<{ changed: number }>('/api/tags/delete', { method: 'POST', body: { tag } })
    version.value++
    await load()
    return changed
  }

  /** 議事録を保存してタグが増減したときに呼ぶ（左メニューの件数を合わせる） */
  function touched() {
    version.value++
    load().catch(() => {})
  }

  return { tags, version, load, rename, remove, touched }
}
