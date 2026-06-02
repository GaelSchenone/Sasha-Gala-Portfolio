import { useEffect } from 'react'

/**
 * Locks page scrolling while mounted — for screens that must stay exactly one
 * viewport tall (Home, Archive, About). Restores the previous overflow on
 * unmount so scrollable pages (e.g. the project view) are unaffected.
 */
export function useLockPageScroll() {
  useEffect(() => {
    const html = document.documentElement
    const body = document.body
    const prevHtml = html.style.overflow
    const prevBody = body.style.overflow
    html.style.overflow = 'hidden'
    body.style.overflow = 'hidden'
    return () => {
      html.style.overflow = prevHtml
      body.style.overflow = prevBody
    }
  }, [])
}
