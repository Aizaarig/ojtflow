import Brand from '../Brand'
import Spinner from './Spinner'

export default function FullPageLoader({ label = 'Loading…' }) {
  return (
    <div
      role="status"
      aria-live="polite"
      className="flex min-h-svh flex-col items-center justify-center gap-6 px-6"
    >
      <Brand size="lg" />
      <div className="flex items-center gap-2 text-sm text-muted">
        <Spinner className="h-4 w-4" />
        <span>{label}</span>
      </div>
    </div>
  )
}
