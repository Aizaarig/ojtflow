import Spinner from './Spinner'

/*
  Variants that build on the shared `.btn` component class store only the
  modifier (e.g. `btn-primary`); LoadingButton composes `btn <modifier> <size>`
  so the green background, hover, and focus styles from index.css all apply.
  `danger` and `plain` carry their full class strings instead.
*/
const BTN_VARIANTS = {
  primary: 'btn-primary',
  soft: 'btn-soft',
  secondary: 'btn-secondary',
  ghost: 'btn-ghost',
}

const VARIANT_CLASS = {
  ...BTN_VARIANTS,
  danger:
    'inline-flex items-center justify-center gap-2 rounded-[12px] px-4 py-2 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-50 bg-[#A83B3B] text-white hover:opacity-90',
  // No built-in styling — the caller supplies the full look via `className`.
  plain: '',
}

/*
  Consistent busy button for async actions (form submits, deletes, uploads).

  While `busy` is true the button shows a spinner beside `loadingLabel`, is
  disabled (blocking double submissions), and exposes aria-busy for assistive
  tech. Styling reuses the existing `.btn` component classes or the inline
  danger button style already used across the app.
*/
export default function LoadingButton({
  busy = false,
  loadingLabel = 'Working…',
  variant = 'primary',
  size,
  className = '',
  type = 'button',
  disabled = false,
  children,
  ...rest
}) {
  const sizeClass = size === 'lg' ? ' btn-lg' : size === 'sm' ? ' btn-sm' : ''
  const variantClass = VARIANT_CLASS[variant] ?? VARIANT_CLASS.primary
  const usesBtnClass = variant in BTN_VARIANTS
  const classes = [
    usesBtnClass ? `btn ${variantClass}${sizeClass}` : variantClass,
    className,
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <button
      type={type}
      className={classes}
      disabled={busy || disabled}
      aria-busy={busy || undefined}
      {...rest}
    >
      {busy && <Spinner className="h-4 w-4" />}
      {busy ? loadingLabel : children}
    </button>
  )
}
