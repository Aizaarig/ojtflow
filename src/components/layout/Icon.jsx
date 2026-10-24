export default function Icon({ className = 'h-5 w-5', children }) {
  return (
    <svg
      viewBox="0 0 24 24"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={`fill-none stroke-current ${className}`}
      aria-hidden="true"
    >
      {children}
    </svg>
  )
}
