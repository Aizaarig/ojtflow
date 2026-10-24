import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from './useAuth'

const LOG_COLUMNS =
  'id, user_id, placement_id, log_date, activities, learnings, created_at, updated_at'

function buildFields(values) {
  const fields = {
    log_date: values.logDate || '',
    activities: (values.activities || '').trim(),
    learnings: (values.learnings || '').trim() || null,
  }
  if (!fields.log_date) throw new Error('Log date is required')
  if (!fields.activities) throw new Error('Activities are required')
  return fields
}

export function useDailyLogs(placementId) {
  const { user } = useAuth()
  const [logs, setLogs] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const fetch = useCallback(async () => {
    if (!user) { setLogs([]); setLoading(false); return }
    setLoading(true); setError(null)
    let q = supabase.from('daily_logs').select(LOG_COLUMNS).eq('user_id', user.id)
    if (placementId) q = q.eq('placement_id', placementId)
    const { data, error } = await q
      .order('log_date', { ascending: false })
      .order('created_at', { ascending: false })
    if (error) setError(error)
    setLogs(data || [])
    setLoading(false)
  }, [user, placementId])

  useEffect(() => {
    let mounted = true
    ;(async () => { if (mounted) await fetch() })()
    return () => { mounted = false }
  }, [fetch])

  const addLog = useCallback(async (values) => {
    if (!user) throw new Error('Not authenticated')
    const payload = {
      user_id: user.id,
      placement_id: placementId || null,
      ...buildFields(values),
    }
    const { error } = await supabase.from('daily_logs').insert(payload)
    if (error) throw error
    await fetch()
  }, [user, placementId, fetch])

  const updateLog = useCallback(async (id, values) => {
    if (!user) throw new Error('Not authenticated')
    const { error } = await supabase
      .from('daily_logs')
      .update(buildFields(values))
      .eq('id', id)
      .eq('user_id', user.id)
    if (error) throw error
    await fetch()
  }, [user, fetch])

  const removeLog = useCallback(async (id) => {
    if (!user) throw new Error('Not authenticated')
    const { error } = await supabase
      .from('daily_logs')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id)
    if (error) throw error
    await fetch()
  }, [user, fetch])

  return { logs, loading, error, fetch, addLog, updateLog, removeLog }
}
