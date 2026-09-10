import { useEffect, useRef, useState } from 'react'

type VirtualListProps<T> = {
  items: readonly T[]
  /** Approximate row height including gap (px). */
  estimateSize?: number
  overscan?: number
  className?: string
  getKey: (item: T, index: number) => string | number
  renderItem: (item: T, index: number) => React.ReactNode
}

/**
 * Windowed list for long mobile queues. Fixed estimate keeps scroll cheap;
 * overscan hides the approximation.
 */
export function VirtualList<T>({
  items,
  estimateSize = 56,
  overscan = 10,
  className = '',
  getKey,
  renderItem,
}: VirtualListProps<T>) {
  const parentRef = useRef<HTMLDivElement>(null)
  const [scrollTop, setScrollTop] = useState(0)
  const [viewport, setViewport] = useState(480)

  useEffect(() => {
    const el = parentRef.current
    if (!el) return
    const onScroll = () => setScrollTop(el.scrollTop)
    const ro = new ResizeObserver(() => setViewport(el.clientHeight))
    el.addEventListener('scroll', onScroll, { passive: true })
    ro.observe(el)
    setViewport(el.clientHeight)
    return () => {
      el.removeEventListener('scroll', onScroll)
      ro.disconnect()
    }
  }, [])

  const total = items.length * estimateSize
  const start = Math.max(0, Math.floor(scrollTop / estimateSize) - overscan)
  const end = Math.min(
    items.length,
    Math.ceil((scrollTop + viewport) / estimateSize) + overscan,
  )

  return (
    <div
      ref={parentRef}
      className={className}
      role="list"
      style={{ overflow: 'auto', position: 'relative' }}
    >
      <div style={{ height: total, position: 'relative' }}>
        {items.slice(start, end).map((item, i) => {
          const index = start + i
          return (
            <div
              key={getKey(item, index)}
              role="listitem"
              style={{
                position: 'absolute',
                top: index * estimateSize,
                left: 0,
                right: 0,
              }}
            >
              {renderItem(item, index)}
            </div>
          )
        })}
      </div>
    </div>
  )
}
