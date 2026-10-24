import { useRef, useState } from 'react'
import { Camera, Trash2, X } from 'lucide-react'
import { useAuth } from '../../hooks/useAuth'
import { useProfile } from '../../hooks/useProfile'
import { useAvatar } from '../../hooks/useAvatar'
import TextField from '../../components/ui/TextField'
import Alert from '../../components/ui/Alert'
import InlineLoader from '../../components/ui/InlineLoader'
import LoadingButton from '../../components/ui/LoadingButton'
import Spinner from '../../components/ui/Spinner'

export default function Profile() {
  const { user, profile, loading } = useAuth()
  const { saving, updateProfile } = useProfile()
  const { signedUrl, uploading, removing, uploadAvatar, removeAvatar } = useAvatar()

  const [form, setForm] = useState({
    fullName: '',
    schoolName: '',
    course: '',
    yearLevel: '',
  })
  const [err, setErr] = useState('')
  const [ok, setOk] = useState('')
  const [preview, setPreview] = useState(null)
  const [file, setFile] = useState(null)
  const inputRef = useRef(null)

  const [lastProfile, setLastProfile] = useState(null)
  if (profile && profile !== lastProfile) {
    setLastProfile(profile)
    setForm({
      fullName: profile.full_name || '',
      schoolName: profile.school_name || '',
      course: profile.course || '',
      yearLevel: profile.year_level || '',
    })
  }

  const update = (e) => setForm((p) => ({ ...p, [e.target.name]: e.target.value }))

  const onPick = (e) => {
    const f = e.target.files?.[0]
    if (!f) return
    setErr('')
    setOk('')
    const allowed = ['image/jpeg', 'image/png', 'image/webp']
    if (!allowed.includes(f.type)) {
      setErr('Invalid file type. Use JPG, PNG, or WebP.')
      e.target.value = ''
      return
    }
    if (f.size > 2 * 1024 * 1024) {
      setErr('File too large. Maximum 2 MB.')
      e.target.value = ''
      return
    }
    setFile(f)
    if (preview) URL.revokeObjectURL(preview)
    const url = URL.createObjectURL(f)
    setPreview(url)
  }

  const clearPreview = () => {
    if (preview) URL.revokeObjectURL(preview)
    setPreview(null)
    setFile(null)
    if (inputRef.current) inputRef.current.value = ''
  }

  const doUpload = async () => {
    if (!file || uploading) return
    setErr('')
    setOk('')
    try {
      await uploadAvatar(file)
      setOk('Profile picture saved')
      clearPreview()
    } catch (e2) {
      setErr(e2.message || 'Failed to upload picture')
    }
  }

  const doRemove = async () => {
    if (removing) return
    setErr('')
    setOk('')
    try {
      await removeAvatar()
      setOk('Profile picture removed')
      clearPreview()
    } catch (e2) {
      setErr(e2.message || 'Failed to remove picture')
    }
  }

  const submit = async (e) => {
    e.preventDefault()
    if (saving) return
    setErr('')
    setOk('')
    try {
      await updateProfile(form)
      setOk('Profile saved')
    } catch (e2) {
      setErr(e2.message || 'Failed to save profile')
    }
  }

  const initials = (profile?.full_name || user?.user_metadata?.full_name || user?.email || '?')
    .split(/\s+/)
    .map((p) => p[0]?.toUpperCase())
    .slice(0, 2)
    .join('') || 'AC'
  const imgSrc = preview || signedUrl

  return (
    <div className="flex max-w-2xl flex-col gap-6">
      <header>
        <p className="text-[12px] uppercase tracking-[0.12em] text-muted">Profile</p>
        <h1 className="mt-1 text-[24px] font-extrabold text-navy sm:text-[28px]">Student Profile</h1>
        <p className="mt-1 text-sm text-ink">View and update your account details and profile picture.</p>
      </header>

      {loading && <InlineLoader label="Loading profile..." />}
      {err && <Alert variant="error">{err}</Alert>}
      {ok && <Alert variant="success">{ok}</Alert>}

      <section className="card flex flex-col gap-5 p-6">
        <h2 className="text-[16px] font-bold text-navy">Profile picture</h2>
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex h-20 w-20 items-center justify-center overflow-hidden rounded-full border border-line bg-mint-soft">
            {imgSrc ? (
              <img src={imgSrc} alt="Profile" className="h-full w-full object-cover" />
            ) : (
              <span className="text-[16px] font-bold text-brand-dark">{initials}</span>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <input ref={inputRef} type="file" accept="image/jpeg,image/png,image/webp" onChange={onPick} className="hidden" />
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              className="inline-flex items-center gap-2 rounded-[12px] border border-line px-3 py-2 text-sm text-ink hover:bg-mint"
            >
              <Camera className="h-4 w-4" /> {signedUrl ? 'Replace' : 'Upload'}
            </button>
            {file && (
              <LoadingButton
                type="button"
                variant="plain"
                busy={uploading}
                loadingLabel="Uploading..."
                onClick={doUpload}
                className="inline-flex items-center justify-center gap-2 rounded-[12px] bg-brand px-3 py-2 text-sm font-semibold text-navy hover:opacity-90 disabled:opacity-50"
              >
                Save picture
              </LoadingButton>
            )}
            {file && (
              <button
                type="button"
                onClick={clearPreview}
                className="inline-flex items-center gap-2 rounded-[12px] border border-line px-3 py-2 text-sm text-ink hover:bg-mint"
              >
                <X className="h-4 w-4" /> Cancel
              </button>
            )}
            {signedUrl && !file && (
              <button
                type="button"
                onClick={doRemove}
                disabled={removing}
                aria-busy={removing || undefined}
                className="inline-flex items-center gap-2 rounded-[12px] border border-line px-3 py-2 text-sm text-[#A83B3B] hover:bg-mint disabled:opacity-50"
              >
                {removing && <Spinner className="h-4 w-4" />}
                <Trash2 className="h-4 w-4" /> {removing ? 'Removing...' : 'Remove'}
              </button>
            )}
          </div>
        </div>
        <p className="text-[12px] text-muted">JPG, PNG, or WebP • Max 2 MB. Private: images are served via short-lived signed URLs.</p>
      </section>

      <form onSubmit={submit} className="card flex flex-col gap-5 p-6">
        <h2 className="text-[16px] font-bold text-navy">Details</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <TextField label="Full name" name="fullName" value={form.fullName} onChange={update} required />
          <div>
            <label className="label">Email</label>
            <div className="input bg-mint-soft/40 text-ink">{user?.email || '—'}</div>
            <p className="mt-1 text-[12px] text-muted">Managed by your account sign-in.</p>
          </div>
        </div>
        <TextField label="School / University" name="schoolName" value={form.schoolName} onChange={update} />
        <div className="grid gap-4 sm:grid-cols-2">
          <TextField label="Course" name="course" value={form.course} onChange={update} />
          <TextField label="Year level" name="yearLevel" value={form.yearLevel} onChange={update} />
        </div>
        <div className="flex justify-end">
          <LoadingButton
            type="submit"
            variant="plain"
            busy={saving}
            loadingLabel="Saving..."
            disabled={loading}
            className="inline-flex items-center justify-center gap-2 rounded-[12px] bg-brand px-4 py-2 text-sm font-semibold text-navy hover:opacity-90 disabled:opacity-50"
          >
            Save profile
          </LoadingButton>
        </div>
      </form>
    </div>
  )
}
