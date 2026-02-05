import { useEffect, useRef } from 'react'

type InfiniteScrollOptions = {
  enabled: boolean
  loading: boolean
  onLoadMore: () => void
  rootMargin?: string
}

export const useInfiniteScroll = ({
  enabled,
  loading,
  onLoadMore,
  rootMargin = '200px',
}: InfiniteScrollOptions) => {
  const targetRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    if (!enabled) return
    const node = targetRef.current
    if (!node) return

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0]
        if (!entry || !entry.isIntersecting) return
        if (loading) return
        onLoadMore()
      },
      { root: null, rootMargin, threshold: 0 },
    )

    observer.observe(node)
    return () => {
      observer.disconnect()
    }
  }, [enabled, loading, onLoadMore, rootMargin])

  return targetRef
}
