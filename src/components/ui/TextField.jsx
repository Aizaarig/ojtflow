export default function TextField({
  id,
  label,
  labelAction,
  icon: Icon,
  error,
  className = '',
  ...props
}) {
  return (
    <div>
      {(label || labelAction) && (
        <div className="mb-2 flex items-center justify-between gap-3">
          {label ? (
            <label className="label mb-0" htmlFor={id}>
              {label}
            </label>
          ) : (
            <span />
          )}
          {labelAction}
        </div>
      )}
      <div className="relative">
        {Icon && <Icon className="field-icon" aria-hidden="true" />}
        <input
          id={id}
          className={`input ${Icon ? 'input-icon' : ''} ${className}`}
          aria-invalid={error ? 'true' : undefined}
          {...props}
        />
      </div>
      {error && <span className="field-error">{error}</span>}
    </div>
  )
}
