import { useEffect, useLayoutEffect } from 'react'
import { siteConfigService, faviconUrl } from '../services/api'

const applyConfig = (config) => {
  if (!config) return
  const root = document.documentElement

  // Tab title — applied from the cache synchronously (see below) so it does
  // not flash the static default while the config request is in flight.
  if (config.name) document.title = config.name

  // Favicon (tab icon) set from the admin panel
  if (config.favicon_url) {
    let link = document.querySelector("link[rel='icon']")
    if (!link) {
      link = document.createElement('link')
      link.rel = 'icon'
      document.head.appendChild(link)
    }
    link.type = 'image/png'
    link.href = faviconUrl(config.favicon_url)
  }

  if (config.font_family) root.style.setProperty('--font-family', config.font_family)
  if (config.base_font_size) root.style.setProperty('--base-font-size', config.base_font_size)
  if (config.base_font_weight) root.style.setProperty('--base-font-weight', config.base_font_weight)
  if (config.base_line_height) root.style.setProperty('--base-line-height', config.base_line_height)
  if (config.base_letter_spacing !== undefined) root.style.setProperty('--base-letter-spacing', config.base_letter_spacing)

  if (config.home_projects_font_size) root.style.setProperty('--home-projects-font-size', config.home_projects_font_size)
  if (config.home_projects_font_weight) root.style.setProperty('--home-projects-font-weight', config.home_projects_font_weight)
  if (config.nav_links_font_size) root.style.setProperty('--nav-links-font-size', config.nav_links_font_size)
  if (config.nav_links_font_weight) root.style.setProperty('--nav-links-font-weight', config.nav_links_font_weight)
  if (config.footer_font_size) root.style.setProperty('--footer-font-size', config.footer_font_size)

  applyCursorConfig(config)
}

const CUR_STYLE_ID = 'oc-cursor-style'

const applyCursorConfig = (config) => {
  const enabled = config.cursor_enabled !== false
  const r = config.cursor_radius ?? 3
  const color = config.cursor_color || '#000000'
  const strokeW = config.cursor_hover_stroke_width ?? 2.5
  const strokeColor = config.cursor_hover_stroke_color || '#000000'

  let styleEl = document.getElementById(CUR_STYLE_ID)
  if (!styleEl) {
    styleEl = document.createElement('style')
    styleEl.id = CUR_STYLE_ID
    document.head.appendChild(styleEl)
  }

  if (!enabled) {
    styleEl.textContent = ''
    return
  }

  const def = encodeURIComponent(
    `<svg xmlns='http://www.w3.org/2000/svg' width='20' height='20'>` +
    `<circle cx='10' cy='10' r='${r}' fill='${color}'/></svg>`
  )
  const ptr = encodeURIComponent(
    `<svg xmlns='http://www.w3.org/2000/svg' width='20' height='20'>` +
    `<circle cx='10' cy='10' r='${r}' fill='${color}' stroke='${strokeColor}' stroke-width='${strokeW}'/></svg>`
  )

  styleEl.textContent = `
*, *::before, *::after {
  cursor: url("data:image/svg+xml,${def}") 10 10, auto !important;
}
a, button, input, select, textarea, label, summary,
[role="button"], [tabindex], .clickable {
  cursor: url("data:image/svg+xml,${ptr}") 10 10, auto /* pointer */ !important;
}`
}

export function TypographyProvider({ children }) {
  // Apply the cached config synchronously before first paint → no flash of
  // default typography while the network request is in flight.
  useLayoutEffect(() => {
    applyConfig(siteConfigService.getCached())
  }, [])

  // Then refresh from the server (deduped to a single app-wide request).
  useEffect(() => {
    siteConfigService.get()
      .then(data => applyConfig(data?.config?.config_data))
      .catch(() => {})
  }, [])

  return <>{children}</>
}
