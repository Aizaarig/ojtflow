import { LoaderCircle } from 'lucide-react'

export default function Spinner({ className = 'h-5 w-5' }) {
  return (
    <LoaderCircle
      className={`animate-spin ${className}`}
      aria-hidden="true"
    />
  )
}
