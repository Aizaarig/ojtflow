import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from './useAuth'

/*
  Placement persistence.

  Schema notes for the live `ojt_placements` table:
    id (uuid, primary key), user_id (uuid), company_name (text),
    company_address (text, optional), department (text, optional),
    position_title (text), supervisor_name (text, optional),
    supervisor_email (text, optional), supervisor_phone (text, optional),
    start_date (date), end_date (date), required_hours (numeric),
    weekly_schedule (json), is_active (boolean), created_at, updated_at.

  The optional company/supervisor columns are added by the additive migration
  in supabase/migrations/. They are nullable text — no NOT NULL constraints —
  so a placement saves fine when those fields are left blank.

  There is NO unique constraint on user_id, so a single `upsert(onConflict:
  'user_id')` fails with Postgres error 42P10. We instead load the student's
  most relevant placement and update it by id (scoped to the authenticated
  user), or insert a new row when none exists. This never trusts a user id
  supplied by the form.
*/

// Optional fields are stored as NULL when blank, matching existing behaviour.
function emptyToNull(value) {
  const s = value == null ? '' : String(value).trim()
  return s === '' ? null : s
}

// Turn the raw Postgres error into a clear, actionable message.
function toFriendlyPlacementError(error) {
  if (!error) return new Error('Failed to save placement. Please try again.')
  const code = String(error.code || '')
  const message = String(error.message || '')
  if (code === '42703' || /column .* does not exist/i.test(message)) {
    return new Error(
      'Placement storage is missing the new company/supervisor columns. Run ' +
        'the provided SQL migration in the Supabase SQL Editor, then try again.'
    )
  }
  return error instanceof Error
    ? error
    : new Error(message || 'Failed to save placement. Please try again.')
}

export function usePlacement() {
  const { user } = useAuth()
  const [placement, setPlacement] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const fetch = useCallback(async () => {
    if (!user) {
      setPlacement(null)
      setLoading(false)
      return null
    }
    setLoading(true)
    setError(null)
    const { data, error: fetchError } = await supabase
      .from('ojt_placements')
      .select('*')
      .eq('user_id', user.id)
      .order('is_active', { ascending: false })
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()
    if (fetchError) {
      setError(fetchError)
      setPlacement(null)
      setLoading(false)
      return null
    }
    setPlacement(data || null)
    setLoading(false)
    return data || null
  }, [user])

  useEffect(() => {
    let mounted = true
    ;(async () => {
      if (mounted) await fetch()
    })()
    return () => {
      mounted = false
    }
  }, [fetch])

  const save = useCallback(
    async (values) => {
      if (!user) throw new Error('Not authenticated')

      const payload = {
        user_id: user.id,
        company_name: String(values.companyName ?? '').trim(),
        company_address: emptyToNull(values.companyAddress),
        department: emptyToNull(values.department),
        position_title: emptyToNull(values.positionTitle),
        supervisor_name: emptyToNull(values.supervisorName),
        supervisor_email: emptyToNull(values.supervisorEmail),
        supervisor_phone: emptyToNull(values.supervisorPhone),
        start_date: values.startDate || null,
        end_date: values.endDate || null,
        required_hours: Number(values.requiredHours),
        weekly_schedule: emptyToNull(values.weeklySchedule),
        is_active: values.isActive !== undefined ? !!values.isActive : true,
      }

      const existingId = values.id || placement?.id || null

      const query = existingId
        ? supabase
            .from('ojt_placements')
            .update(payload)
            .eq('id', existingId)
            .eq('user_id', user.id)
            .select('*')
            .maybeSingle()
        : supabase.from('ojt_placements').insert(payload).select('*').maybeSingle()

      const { data, error: saveError } = await query
      if (saveError) throw toFriendlyPlacementError(saveError)

      const latest = await fetch()
      return latest || data
    },
    [user, placement, fetch]
  )

  return { placement, loading, error, fetch, save, upsert: save }
}
