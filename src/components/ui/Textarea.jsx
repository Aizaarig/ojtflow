export default function Textarea({ className = '', label, error, ...props }) {
  return (
    <label className="flex flex-col gap-1.5">
      {label && <span className="text-[12px] font-semibold uppercase tracking-[0.08em] text-muted">{label}</span>}
      <textarea
        {...props}
        aria-invalid={error ? 'true' : undefined}
        className={'w-full rounded-[12px] border border-line bg-white px-3 py-2 text-sm text-ink shadow-sm focus:border-brand-dark focus:outline-none focus:ring-2 focus:ring-brand/20 ' + className}
      />
      {error && <span className="field-error">{error}</span>}
    </label>
  )
}
