export interface LibraryTag {
  id: string
  label: string
  color: string
  created_at: number
}

const LS_KEY = 'ai-tools:tag-library'

function lsLoad(): LibraryTag[] {
  if (typeof localStorage === 'undefined') return []
  try {
    return JSON.parse(localStorage.getItem(LS_KEY) || '[]')
  } catch {
    return []
  }
}

function lsSave(tags: LibraryTag[]) {
  localStorage.setItem(LS_KEY, JSON.stringify(tags))
}

export function useTags() {
  const isDev = import.meta.dev

  async function loadTags(): Promise<LibraryTag[]> {
    if (isDev) return lsLoad()
    const data = await $fetch<{ tags: LibraryTag[] }>('/api/tags')
    return data.tags
  }

  async function createTag(label: string, color: string): Promise<LibraryTag> {
    if (isDev) {
      const tag: LibraryTag = {
        id: crypto.randomUUID(),
        label,
        color,
        created_at: Date.now(),
      }
      lsSave([...lsLoad(), tag])
      return tag
    }
    const data = await $fetch<{ tag: LibraryTag }>('/api/tags', {
      method: 'POST',
      body: { label, color },
    })
    return data.tag
  }

  async function updateTag(id: string, label: string, color: string): Promise<LibraryTag> {
    if (isDev) {
      const tags = lsLoad()
      const idx = tags.findIndex((t) => t.id === id)
      if (idx < 0) throw new Error('Tag not found')
      tags[idx] = { ...tags[idx], label, color }
      lsSave(tags)
      return tags[idx]
    }
    const data = await $fetch<{ tag: LibraryTag }>(`/api/tags/${id}`, {
      method: 'PUT',
      body: { label, color },
    })
    return data.tag
  }

  async function deleteTag(id: string): Promise<void> {
    if (isDev) {
      lsSave(lsLoad().filter((t) => t.id !== id))
      return
    }
    await $fetch(`/api/tags/${id}`, { method: 'DELETE' })
  }

  return { loadTags, createTag, updateTag, deleteTag }
}
