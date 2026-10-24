import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { supabase } from '../lib/supabase'
import * as authApi from '../lib/authApi'
import { ensureProfileRecord } from '../lib/profile'
import { AuthContext } from './auth-context'

export default function AuthProvider({ children }) {
  const [session, setSession] = useState(null)
  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [recovery, setRecovery] = useState(false)
  const mounted = useRef(true)

  const ensureProfile = useCallback(async (authUser) => {
    if (!authUser) return null
    try {
      const record = await ensureProfileRecord(supabase, authUser)
      if (mounted.current) setProfile(record ?? null)
      return record ?? null
    } catch {
      // Keep whatever profile we already have when the read fails.
      return null
    }
  }, [])

  useEffect(() => {
    mounted.current = true
    let settled = false

    supabase.auth
      .getSession()
      .then(({ data }) => {
        if (!mounted.current) return
        setSession(data.session ?? null)
        setUser(data.session?.user ?? null)
        setLoading(false)
        settled = true
        if (data.session?.user) ensureProfile(data.session.user)
      })
      .catch(() => {
        // Never leave the app stuck on the full-page loader if the session
        // lookup fails — treat it as signed out and let pages show errors.
        if (!mounted.current) return
        setSession(null)
        setUser(null)
        setLoading(false)
        settled = true
      })

    const { data: authListener } = supabase.auth.onAuthStateChange(
      (event, newSession) => {
        if (!mounted.current) return
        setSession(newSession ?? null)
        setUser(newSession?.user ?? null)

        if (event === 'PASSWORD_RECOVERY') setRecovery(true)
        if (event === 'SIGNED_OUT') setProfile(null)

        if (event !== 'SIGNED_OUT' && newSession?.user) {
          // Defer the profile query so we never await inside the auth callback.
          setTimeout(() => {
            if (mounted.current) ensureProfile(newSession.user)
          }, 0)
        }

        if (!settled) {
          setLoading(false)
          settled = true
        }
      }
    )

    return () => {
      mounted.current = false
      authListener.subscription.unsubscribe()
    }
  }, [ensureProfile])

  const signUp = useCallback(
    (payload) => authApi.signUpUser(supabase, payload),
    []
  )

  /*
    Signup email verification: Supabase emails a 6-digit code and the student
    confirms it with verifyOtp({ type: 'signup' }). Password recovery keeps its
    own verifyRecoveryOtp({ type: 'recovery' }) below.
  */
  const verifySignUpOtp = useCallback(
    (args) => authApi.verifySignUpOtp(supabase, args),
    []
  )

  const resendSignUpOtp = useCallback(
    (email) => authApi.resendSignUpOtp(supabase, { email }),
    []
  )

  const signIn = useCallback(
    (credentials) => authApi.signInUser(supabase, credentials),
    []
  )

  const signInWithGoogle = useCallback(
    (options = {}) => authApi.signInWithGoogle(supabase, options),
    []
  )

  const signOut = useCallback(async () => {
    await authApi.signOutUser(supabase)
    if (mounted.current) {
      setProfile(null)
      setRecovery(false)
    }
  }, [])

  const sendPasswordReset = useCallback(
    (email) =>
      authApi.sendPasswordReset(supabase, {
        email,
        redirectTo: `${window.location.origin}/reset-password`,
      }),
    []
  )

  const verifyRecoveryOtp = useCallback(
    (args) => authApi.verifyRecoveryOtp(supabase, args),
    []
  )

  const updatePassword = useCallback(
    (password) => authApi.updateUserPassword(supabase, password),
    []
  )

  const refreshProfile = useCallback(
    () => ensureProfile(user),
    [ensureProfile, user]
  )

  const value = useMemo(
    () => ({
      session,
      user,
      profile,
      loading,
      recovery,
      clearRecovery: () => setRecovery(false),
      signUp,
      signIn,
      signInWithGoogle,
      signOut,
      sendPasswordReset,
      verifyRecoveryOtp,
      updatePassword,
      refreshProfile,
      ensureProfile,
      verifySignUpOtp,
      resendSignUpOtp,
    }),
    [
      session,
      user,
      profile,
      loading,
      recovery,
      signUp,
      signIn,
      signInWithGoogle,
      signOut,
      sendPasswordReset,
      verifyRecoveryOtp,
      updatePassword,
      refreshProfile,
      ensureProfile,
      verifySignUpOtp,
      resendSignUpOtp,
    ]
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
