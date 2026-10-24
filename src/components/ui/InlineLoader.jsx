import Spinner from './Spinner'

/*
  Compact "loading..." indicator for inline sections (lists, cards, panels).
  Announced politely via role="status" so it works with screen readers
  without interrupting the user.
*/
export default function InlineLoader({ label = 'Loading…', className = '' }) {
  return (
    <div
      role="status"
      className={`flex items-center gap-2 text-sm text-muted ${className}`}
    >
      <Spinner className="h-4 w-4" />
      <span>{label}</span>
    </div>
  )
}
