export interface Tag {
  label: string
  color: string
}

export interface Task {
  id: string
  title: string
  description: string
  status: 'todo' | 'doing' | 'done'
  tags: Tag[]
  order_index: number
  due_at: number | null
  created_at: number
  updated_at: number
}

const LS_KEY = 'ai-tools:tasks'

function lsLoad(): Task[] {
  if (typeof localStorage === 'undefined') return []
  try {
    return JSON.parse(localStorage.getItem(LS_KEY) || '[]')
  } catch {
    return []
  }
}

function lsSave(tasks: Task[]) {
  localStorage.setItem(LS_KEY, JSON.stringify(tasks))
}

export function useTasks() {
  const isDev = import.meta.dev

  async function loadTasks(): Promise<Task[]> {
    if (isDev) return lsLoad()
    const data = await $fetch<{ tasks: Task[] }>('/api/tasks')
    return data.tasks
  }

  async function createTask(body: {
    title: string
    description?: string
    status?: Task['status']
    tags?: Tag[]
    due_at?: number | null
  }): Promise<Task> {
    if (isDev) {
      const tasks = lsLoad()
      const status = body.status || 'todo'
      const task: Task = {
        id: crypto.randomUUID(),
        title: body.title.trim(),
        description: body.description || '',
        status,
        tags: body.tags || [],
        order_index: tasks.filter((t) => t.status === status).length,
        due_at: body.due_at ?? null,
        created_at: Date.now(),
        updated_at: Date.now(),
      }
      lsSave([...tasks, task])
      return task
    }
    const data = await $fetch<{ task: Task }>('/api/tasks', { method: 'POST', body })
    return data.task
  }

  async function updateTask(
    id: string,
    body: {
      title?: string
      description?: string
      status?: Task['status']
      tags?: Tag[]
      order_index?: number
      due_at?: number | null
    },
  ): Promise<Task> {
    if (isDev) {
      const tasks = lsLoad()
      const idx = tasks.findIndex((t) => t.id === id)
      if (idx < 0) throw new Error('Task not found')
      const updated = { ...tasks[idx], ...body, updated_at: Date.now() }
      tasks[idx] = updated
      lsSave(tasks)
      return updated
    }
    const data = await $fetch<{ task: Task }>(`/api/tasks/${id}`, { method: 'PUT', body })
    return data.task
  }

  async function deleteTask(id: string): Promise<void> {
    if (isDev) {
      lsSave(lsLoad().filter((t) => t.id !== id))
      return
    }
    await $fetch(`/api/tasks/${id}`, { method: 'DELETE' })
  }

  async function reorderTasks(
    updates: { id: string; status: string; order_index: number }[],
  ): Promise<void> {
    if (isDev) {
      const tasks = lsLoad()
      const now = Date.now()
      for (const u of updates) {
        const t = tasks.find((t) => t.id === u.id)
        if (t) {
          t.status = u.status as Task['status']
          t.order_index = u.order_index
          t.updated_at = now
        }
      }
      lsSave(tasks)
      return
    }
    await $fetch('/api/tasks/reorder', { method: 'POST', body: { updates } })
  }

  return { loadTasks, createTask, updateTask, deleteTask, reorderTasks }
}
