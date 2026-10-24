import ojtlogo from '../assets/ojtlogo.png'

const SIZES = {
  sm: { mark: 24, markClass: 'h-6 w-6', name: 'text-[15px]', gap: 'gap-2' },
  md: { mark: 28, markClass: 'h-7 w-7', name: 'text-[19px]', gap: 'gap-2.5' },
  lg: { mark: 48, markClass: 'h-12 w-12', name: 'text-[32px]', gap: 'gap-[14px]' },
  xl: {
    mark: 88,
    markClass: 'h-20 w-20 sm:h-[88px] sm:w-[88px]',
    name: 'text-[44px] sm:text-[56px]',
    gap: 'gap-5 sm:gap-7',
  },
}

export default function Brand({ size = 'md', onDark = false }) {
  const s = SIZES[size] ?? SIZES.md
  return (
    <span className={`inline-flex items-center ${s.gap}`}>
      <img
        src={ojtlogo}
        alt="OJTFlow logo"
        width={s.mark}
        height={s.mark}
        className={`shrink-0 rounded-[6px] object-contain ${s.markClass}`}
        loading="eager"
        decoding="async"
      />
      <span
        className={`font-bold tracking-[-0.03em] ${s.name} ${
          onDark ? 'text-white' : 'text-navy'
        }`}
      >
        OJT<span className="text-brand">Flow</span>
      </span>
    </span>
  )
}
