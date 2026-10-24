import { CircleAlert, CircleCheck, Info } from 'lucide-react'

const VARIANTS = {
  error: {
    Icon: CircleAlert,
    classes: 'bg-[#FDECEC] border-[#F3CFCF] text-[#A83B3B]',
  },
  success: {
    Icon: CircleCheck,
    classes: 'bg-mint border-mint-mid text-brand-dark',
  },
  info: {
    Icon: Info,
    classes: 'bg-mint-soft border-line text-ink',
  },
}

export default function Alert({ variant = 'info', children }) {
  const { Icon, classes } = VARIANTS[variant] ?? VARIANTS.info
  return (
    <div
      role={variant === 'error' ? 'alert' : 'status'}
      className={`flex items-start gap-3 rounded-[14px] border px-4 py-3 text-sm leading-relaxed ${classes}`}
    >
      <Icon className="mt-0.5 h-[18px] w-[18px] shrink-0" aria-hidden="true" />
      <div className="min-w-0">{children}</div>
    </div>
  )
}
