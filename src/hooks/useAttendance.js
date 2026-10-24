import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from './useAuth'
import { computeCompletedHours, toDateInput } from '../lib/format'

export function useAttendance(placementId) {
  const { user } = useAuth()
  const [records, setRecords] = useState([])
  const [active, setActive] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const fetch = useCallback(async () => {
    if (!user) { setRecords([]); setActive(null); setLoading(false); return }
    setLoading(true); setError(null)
    let q = supabase.from('attendance').select('*').eq('user_id', user.id)
    if (placementId) q = q.eq('placement_id', placementId)
    const { data, error } = await q.order('work_date', { ascending: false }).order('time_in', { ascending: false })
    if (error) setError(error)
    const list = data || []
    setRecords(list)
    setActive(list.find((r) => !r.time_out) || null)
    setLoading(false)
  }, [user, placementId])

  useEffect(() => {
    let mounted = true
    ;(async () => { if (mounted) await fetch() })()
    return () => { mounted = false }
  }, [fetch])

  const startShift = useCallback(async ({ notes, workDate } = {}) => {
    if (!user) throw new Error('Not authenticated')
    if (active) throw new Error('Shift already in progress')
    const now = new Date()
    const payload = {
      user_id: user.id,
      placement_id: placementId || null,
      work_date: workDate || toDateInput(now),
      time_in: now.toISOString(),
      notes: notes || null,
    }
    const { error } = await supabase.from('attendance').insert(payload)
    if (error) throw error
    await fetch()
  }, [user, placementId, active, fetch])

  const stopShift = useCallback(async (endTime) => {
    if (!active) throw new Error('No active shift')
    if (!user) throw new Error('Not authenticated')
    const tOut = endTime ? new Date(endTime).toISOString() : new Date().toISOString()
    const tIn = new Date(active.time_in)
    if (new Date(tOut) <= tIn) throw new Error('Time out must be later than time in')
    const elapsedMin = (new Date(tOut) - tIn) / 60000
    if ((active.break_minutes || 0) > elapsedMin) throw new Error('Break cannot exceed total shift time')
    const { error } = await supabase.from('attendance').update({ time_out: tOut }).eq('id', active.id).eq('user_id', user.id)
    if (error) throw error
    await fetch()
  }, [active, user, fetch])

  const updateBreak = useCallback(async (mins) => {
    if (!active) throw new Error('No active shift')
    if (!user) throw new Error('Not authenticated')
    const m = Math.max(0, Number(mins) || 0)
    if (m > 720) throw new Error('Break cannot exceed 720 minutes')
    const tOut = new Date().toISOString()
    const tIn = new Date(active.time_in)
    const elapsedMin = (new Date(tOut) - tIn) / 60000
    if (m > elapsedMin) throw new Error('Break cannot exceed total shift time')
    const { error } = await supabase.from('attendance').update({ break_minutes: m }).eq('id', active.id).eq('user_id', user.id)
    if (error) throw error
    await fetch()
  }, [active, user, fetch])

  const addManual = useCallback(async (fields) => {
    if (!user) throw new Error('Not authenticated')
    const tIn = new Date(fields.timeIn)
    const tOut = new Date(fields.timeOut)
    if (isNaN(tIn.getTime()) || isNaN(tOut.getTime())) throw new Error('Invalid time range')
    if (tOut <= tIn) throw new Error('Time out must be later than time in')
    const elapsedMin = (tOut - tIn) / 60000
    const b = Math.max(0, Number(fields.breakMinutes) || 0)
    if (b > 720) throw new Error('Break cannot exceed 720 minutes')
    if (b > elapsedMin) throw new Error('Break cannot exceed total shift time')
    const payload = {
      user_id: user.id,
      placement_id: placementId || null,
      work_date: fields.workDate,
      time_in: tIn.toISOString(),
      time_out: tOut.toISOString(),
      break_minutes: b,
      notes: fields.notes || null,
    }
    const { error } = await supabase.from('attendance').insert(payload)
    if (error) throw error
    await fetch()
  }, [user, placementId, fetch])

  const completedHours = computeCompletedHours(records)

  return { records, active, loading, error, fetch, startShift, stopShift, updateBreak, addManual, completedHours }
}