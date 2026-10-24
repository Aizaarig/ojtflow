/*
  Lightweight shimmer placeholder that matches the surrounding layout while
  data loads. Decorative only — mark the parent region with role="status"
  and an accessible label so screen readers announce the wait.

  The shimmer animation is disabled automatically under
  prefers-reduced-motion by the global rule in index.css.
*/
export default function Skeleton({ className = '', rounded = 'rounded-[12px]' }) {
  return (
    <div
      aria-hidden="true"
      className={`skeleton ${rounded} ${className}`}
    />
  )
}
