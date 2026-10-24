import { useCallback, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from './useAuth'

const PROFILE_COLUMNS =
  'id, full_name, school_name, course, year_level, avatar_path, created_at, updated_at'

export function useProfile() {
  const { user, refreshProfile } = useAuth()
  const [saving, setSaving] = useState(false)

  const updateProfile = useCallback(
    async (values) => {
      if (!user) throw new Error('Not authenticated')
      const fullName = (values.fullName || '').trim()
      if (!fullName) throw new Error('Full name is required')
      const payload = {
        full_name: fullName,
        school_name: (values.schoolName || '').trim(),
        course: (values.course || '').trim(),
        year_level: (values.yearLevel || '').trim(),
      }
      setSaving(true)
      try {
        const { data, error } = await supabase
          .from('profiles')
          .update(payload)
          .eq('id', user.id)
          .select(PROFILE_COLUMNS)
          .maybeSingle()
        if (error) throw error
        if (!data) {
          const upsert = await supabase
            .from('profiles')
            .upsert({ id: user.id, ...payload }, { onConflict: 'id' })
            .select(PROFILE_COLUMNS)
            .maybeSingle()
          if (upsert.error) throw upsert.error
        }
        await refreshProfile()
      } finally {
        setSaving(false)
      }
    },
    [user, refreshProfile]
  )

  return { saving, updateProfile }
}
