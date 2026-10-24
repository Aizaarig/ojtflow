import { useAuth } from '../hooks/useAuth'
import Brand from '../components/Brand'
import Spinner from '../components/ui/Spinner'

export default function Dashboard() {
  const { user, profile, signOut, loading } = useAuth()

  const handleLogout = async () => {
    await signOut()
  }

  return (
    <div className="min-h-svh bg-canvas px-5 py-6 sm:px-8">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <Brand size="md" />
        <div className="flex items-center gap-3 text-sm text-ink">
          <span>
            Signed in as <span className="font-semibold">{user?.email}</span>
          </span>
          <button className="btn btn-soft btn-sm" onClick={handleLogout}>
            Sign out
          </button>
        </div>
      </header>

      <main className="mt-8 flex flex-col gap-5">
        <section className="card flex flex-col gap-2 p-6">
          <h1 className="text-[22px] font-extrabold sm:text-[26px]">
            Welcome to OJTFlow
          </h1>
          <p className="text-sm leading-relaxed text-ink">
            You’re logged in. We’ll build the full student dashboard (sidebar +
            topbar, placement, attendance, daily logs, tasks, requirements,
            reports) in the upcoming stages.
          </p>
        </section>

        <section className="card grid gap-4 p-6 sm:grid-cols-2">
          <div>
            <h2 className="text-sm font-semibold uppercase tracking-[0.08em] text-muted">
              Profile
            </h2>
            {loading || !profile ? (
              <div className="mt-2 flex items-center gap-2 text-sm text-muted">
                <Spinner className="h-4 w-4" /> Loading profile…
              </div>
            ) : (
              <dl className="mt-3 grid gap-2 text-sm text-ink">
                <div className="flex justify-between">
                  <dt className="text-muted">Full name</dt>
                  <dd className="font-medium text-navy">
                    {profile.full_name || '—'}
                  </dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-muted">School</dt>
                  <dd className="font-medium text-navy">
                    {profile.school_name || '—'}
                  </dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-muted">Course</dt>
                  <dd className="font-medium text-navy">
                    {profile.course || '—'}
                  </dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-muted">Year level</dt>
                  <dd className="font-medium text-navy">
                    {profile.year_level || '—'}
                  </dd>
                </div>
              </dl>
            )}
          </div>

          <div>
            <h2 className="text-sm font-semibold uppercase tracking-[0.08em] text-muted">
              Next steps (Stage 3+)
            </h2>
            <ul className="mt-3 space-y-2 text-sm text-ink">
              <li>• Shared application layout (mint sidebar + topbar)</li>
              <li>• Placement setup and required hours (default 486)</li>
              <li>• Attendance with manual in/out + shift timer</li>
              <li>• Daily logs, tasks, requirements + file uploads</li>
              <li>• Reports (CSV export + print-friendly)</li>
            </ul>
          </div>
        </section>
      </main>
    </div>
  )
}
