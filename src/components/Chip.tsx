import type { ReactNode } from 'react'

export function Chip({
  children,
  tone = 'default',
  size = 'md',
}: {
  children: ReactNode
  tone?: 'default' | 'sea' | 'warn'
  size?: 'md' | 'sm'
}) {
  const cls =
    tone === 'sea'
      ? 'bg-sea/15 text-sea'
      : tone === 'warn'
        ? 'bg-warn/10 text-warn'
        : 'bg-ink/5 text-ink-soft'
  const pad = size === 'sm' ? 'text-[11px] px-2 py-0.5' : 'text-xs px-2.5 py-1'
  return (
    <span className={`font-medium rounded-full ${pad} ${cls}`}>{children}</span>
  )
}
