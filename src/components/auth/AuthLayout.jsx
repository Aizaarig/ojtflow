import Brand from '../Brand'

export default function AuthLayout({ title, subtitle, children, footer }) {
  return (
    <div className="flex min-h-svh flex-col bg-canvas px-5 py-7 sm:px-6">
      <header className="flex justify-center">
        <Brand size="xl" />
      </header>

      <main className="flex flex-1 items-center justify-center py-8">
        <div className="card w-full max-w-md p-6 sm:p-8">
          <h1 className="text-[26px] font-bold tracking-[-0.02em] sm:text-[30px]">
            {title}
          </h1>
          {subtitle && (
            <p className="mt-2 text-[15px] leading-relaxed text-ink">
              {subtitle}
            </p>
          )}
          <div className="mt-8">{children}</div>
          {footer && <div className="mt-6 text-sm text-ink">{footer}</div>}
        </div>
      </main>

      <p className="text-center text-xs text-muted">© 2026 OJTFlow</p>
    </div>
  )
}
