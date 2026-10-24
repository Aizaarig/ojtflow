import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from './useAuth'

const MAX_SIZE = 2 * 1024 * 1024 // 2 MB
const ALLOWED = ['image/jpeg', 'image/png', 'image/webp']

export function useAvatar() {
  const { user, profile, refreshProfile } = useAuth()
  const [uploading, setUploading] = useState(false)
  const [removing, setRemoving] = useState(false)
  const [signedUrl, setSignedUrl] = useState(null)
  const [error, setError] = useState(null)

  const getSignedUrl = useCallback(async (path) => {
    if (!path) {
      setSignedUrl(null)
      return null
    }
    try {
      const { data, error } = await supabase.storage
        .from('avatars')
        .createSignedUrl(path, 3600)
      if (error) throw error
      setSignedUrl(data?.signedUrl || null)
      return data?.signedUrl || null
    } catch {
      setSignedUrl(null)
      return null
    }
  }, [])

  useEffect(() => {
    let mounted = true
    ;(async () => {
      if (mounted && profile?.avatar_path) {
        await getSignedUrl(profile.avatar_path)
      } else if (mounted) {
        setSignedUrl(null)
      }
    })()
    return () => {
      mounted = false
    }
  }, [profile?.avatar_path, getSignedUrl])

  const uploadAvatar = useCallback(
    async (file) => {
      if (!user) throw new Error('Not authenticated')
      if (!file) throw new Error('No file selected')
      if (!ALLOWED.includes(file.type)) {
        throw new Error('Invalid file type. Use JPG, PNG, or WebP.')
      }
      if (file.size > MAX_SIZE) {
        throw new Error('File too large. Maximum 2 MB.')
      }
      setUploading(true)
      setError(null)
      const path = `${user.id}/avatar`
      try {
        const { error: upErr } = await supabase.storage
          .from('avatars')
          .upload(path, file, { upsert: true, cacheControl: '3600', contentType: file.type })
        if (upErr) throw upErr
        const { error: pErr } = await supabase
          .from('profiles')
          .update({ avatar_path: path })
          .eq('id', user.id)
        if (pErr) throw pErr
        await refreshProfile()
        await getSignedUrl(path)
        return path
      } catch (e) {
        setError(e)
        throw e
      } finally {
        setUploading(false)
      }
    },
    [user, refreshProfile, getSignedUrl]
  )

  const removeAvatar = useCallback(async () => {
    if (!user) throw new Error('Not authenticated')
    const path = profile?.avatar_path
    setRemoving(true)
    setError(null)
    try {
      if (path) {
        await supabase.storage.from('avatars').remove([path])
      }
      const { error: pErr } = await supabase
        .from('profiles')
        .update({ avatar_path: null })
        .eq('id', user.id)
      if (pErr) throw pErr
      setSignedUrl(null)
      await refreshProfile()
    } catch (e) {
      setError(e)
      throw e
    } finally {
      setRemoving(false)
    }
  }, [user, profile?.avatar_path, refreshProfile])

  return {
    signedUrl,
    uploading,
    removing,
    error,
    uploadAvatar,
    removeAvatar,
    getSignedUrl,
  }
}
