import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from './useAuth'

const REQUIREMENT_COLUMNS =
  'id, user_id, title, description, is_completed, file_path, created_at, updated_at'

function buildFields(values) {
  const fields = {
    title: (values.title || '').trim(),
    description: (values.description || '').trim() || null,
  }
  if (!fields.title) throw new Error('Title is required')
  return fields
}

export function useRequirements() {
  const { user } = useAuth()
  const [requirements, setRequirements] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const fetch = useCallback(async () => {
    if (!user) { setRequirements([]); setLoading(false); return }
    setLoading(true); setError(null)
    const { data, error } = await supabase
      .from('requirements')
      .select(REQUIREMENT_COLUMNS)
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
    if (error) setError(error)
    setRequirements(data || [])
    setLoading(false)
  }, [user])

  useEffect(() => {
    let mounted = true
    ;(async () => { if (mounted) await fetch() })()
    return () => { mounted = false }
  }, [fetch])

  const addRequirement = useCallback(async (values) => {
    if (!user) throw new Error('Not authenticated')
    const payload = { user_id: user.id, is_completed: false, ...buildFields(values) }
    const { error } = await supabase.from('requirements').insert(payload)
    if (error) throw error
    await fetch()
  }, [user, fetch])

  const updateRequirement = useCallback(async (id, values) => {
    if (!user) throw new Error('Not authenticated')
    const { error } = await supabase
      .from('requirements')
      .update(buildFields(values))
      .eq('id', id)
      .eq('user_id', user.id)
    if (error) throw error
    await fetch()
  }, [user, fetch])

  const setCompleted = useCallback(async (id, isCompleted) => {
    if (!user) throw new Error('Not authenticated')
    const { error } = await supabase
      .from('requirements')
      .update({ is_completed: !!isCompleted })
      .eq('id', id)
      .eq('user_id', user.id)
    if (error) throw error
    await fetch()
  }, [user, fetch])

  const removeRequirement = useCallback(async (id) => {
    if (!user) throw new Error('Not authenticated')
    const { error } = await supabase
      .from('requirements')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id)
    if (error) throw error
    await fetch()
  }, [user, fetch])

  const totalCount = requirements.length
  const completedCount = requirements.filter((r) => r.is_completed).length
  const pendingCount = totalCount - completedCount

  return {
    requirements,
    loading,
    error,
    fetch,
    addRequirement,
    updateRequirement,
    setCompleted,
    removeRequirement,
    totalCount,
    completedCount,
    pendingCount,
  }
}
