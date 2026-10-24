import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from './useAuth'
import { TASK_STATUS, DEFAULT_TASK_STATUS, isTaskDone } from '../lib/tasks'

// Re-exported so existing imports from this hook keep working; the values live
// in src/lib/tasks.js (the single source of truth) and stay in sync.
export {
  TASK_STATUS,
  TASK_STATUS_LABELS,
  DEFAULT_TASK_STATUS,
  isTaskDone,
  getTaskStatusLabel,
} from '../lib/tasks'

const TASK_COLUMNS =
  'id, user_id, title, description, status, due_date, created_at, updated_at'

// Convert a rejected status value into a clear, user-friendly message.
// Only constraint violations are remapped; other errors pass through unchanged.
function toFriendlyTaskError(error) {
  if (!error) return new Error('Something went wrong. Please try again.')
  const code = String(error.code || '')
  const message = String(error.message || error)
  if (
    code === '23514' ||
    /check constraint/i.test(message) ||
    /tasks_status_check/i.test(message)
  ) {
    return new Error(
      "This task couldn't be saved because its status isn't accepted by the " +
        'system. Please try again, or contact support if this keeps happening.'
    )
  }
  return error instanceof Error
    ? error
    : new Error(message || 'Something went wrong. Please try again.')
}

function buildFields(values) {
  const fields = {
    title: (values.title || '').trim(),
    description: (values.description || '').trim() || null,
    due_date: values.dueDate || null,
  }
  if (!fields.title) throw new Error('Title is required')
  return fields
}

export function useTasks() {
  const { user } = useAuth()
  const [tasks, setTasks] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const fetch = useCallback(async () => {
    if (!user) { setTasks([]); setLoading(false); return }
    setLoading(true); setError(null)
    const { data, error } = await supabase
      .from('tasks')
      .select(TASK_COLUMNS)
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
    if (error) setError(error)
    setTasks(data || [])
    setLoading(false)
  }, [user])

  useEffect(() => {
    let mounted = true
    ;(async () => { if (mounted) await fetch() })()
    return () => { mounted = false }
  }, [fetch])

  const addTask = useCallback(async (values) => {
    if (!user) throw new Error('Not authenticated')
    const payload = {
      user_id: user.id,
      status: DEFAULT_TASK_STATUS,
      ...buildFields(values),
    }
    const { error } = await supabase.from('tasks').insert(payload)
    if (error) throw toFriendlyTaskError(error)
    await fetch()
  }, [user, fetch])

  const updateTask = useCallback(async (id, values) => {
    if (!user) throw new Error('Not authenticated')
    const { error } = await supabase
      .from('tasks')
      .update(buildFields(values))
      .eq('id', id)
      .eq('user_id', user.id)
    if (error) throw error
    await fetch()
  }, [user, fetch])

  const setStatus = useCallback(async (id, status) => {
    if (!user) throw new Error('Not authenticated')
    const { error } = await supabase
      .from('tasks')
      .update({ status })
      .eq('id', id)
      .eq('user_id', user.id)
    if (error) throw toFriendlyTaskError(error)
    await fetch()
  }, [user, fetch])

  const completeTask = useCallback(
    (id) => setStatus(id, TASK_STATUS.COMPLETED),
    [setStatus]
  )
  const reopenTask = useCallback(
    (id) => setStatus(id, DEFAULT_TASK_STATUS),
    [setStatus]
  )

  const removeTask = useCallback(async (id) => {
    if (!user) throw new Error('Not authenticated')
    const { error } = await supabase
      .from('tasks')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id)
    if (error) throw error
    await fetch()
  }, [user, fetch])

  const openCount = tasks.filter((t) => !isTaskDone(t)).length
  const doneCount = tasks.filter((t) => isTaskDone(t)).length

  return {
    tasks,
    loading,
    error,
    fetch,
    addTask,
    updateTask,
    completeTask,
    reopenTask,
    removeTask,
    openCount,
    doneCount,
  }
}
