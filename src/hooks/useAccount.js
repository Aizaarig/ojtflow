import { useCallback, useRef, useState } from 'react'
import { supabase } from '../lib/supabase'
import { friendlyAccountError } from '../lib/account'

// Pull a friendly message off a FunctionsHttpError, whose response body carries
// the JSON error the Edge Function returned.
async function readErrorDetail(error) {
  try {
    const res = error?.context
    if (res && typeof res.json === 'function') {
      const body = await res.json()
      return body?.error || body?.message || ''
    }
  } catch {
    // ignore unparsable body
  }
  return ''
}

/*
  Drives the two destructive Account Management actions.

  - resetProgress() calls the reset_ojt_progress RPC (identity comes from the
    JWT server-side) and returns the per-table counts.
  - deleteAccount({ password, confirmation }) invokes the delete-account Edge
    Function, which re-authenticates, cleans up the caller's data and files, and
    deletes the Auth user. On success we clear the local session so the app can
    leave the authenticated area.

  In-flight guards prevent duplicate destructive submits.
*/
export function useAccount() {
  const [resetting, setResetting] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const resetBusy = useRef(false)
  const deleteBusy = useRef(false)

  const resetProgress = useCallback(async () => {
    if (resetBusy.current) return null
    resetBusy.current = true
    setResetting(true)
    try {
      const { data, error } = await supabase.rpc('reset_ojt_progress')
      if (error) throw error
      return data
    } finally {
      resetBusy.current = false
      setResetting(false)
    }
  }, [])

  const deleteAccount = useCallback(async ({ password, confirmation }) => {
    if (deleteBusy.current) return null
    deleteBusy.current = true
    setDeleting(true)
    try {
      const { data, error } = await supabase.functions.invoke('delete-account', {
        body: { password, confirmation },
      })

      if (error) {
        const detail = await readErrorDetail(error)
        throw new Error(
          friendlyAccountError({
            status: error.context?.status,
            message: detail || error.message,
          })
        )
      }

      if (data?.status !== 'completed') {
        throw new Error(
          data?.message || 'Account deletion could not be completed. Please try again.'
        )
      }

      // The Auth user is already gone server-side; clear the local session so
      // the app returns to the signed-out state.
      try {
        await supabase.auth.signOut({ scope: 'local' })
      } catch {
        // Even if local sign-out hiccups, the account is deleted.
      }

      return data
    } finally {
      deleteBusy.current = false
      setDeleting(false)
    }
  }, [])

  return { resetting, deleting, resetProgress, deleteAccount }
}
