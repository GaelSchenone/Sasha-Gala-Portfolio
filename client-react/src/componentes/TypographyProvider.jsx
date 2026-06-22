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

const hexToRgba = (hex, opacity) => {
  if (!hex || hex.length < 7) return 'transparent'
  const r = parseInt(hex.slice(1,3), 16)
  const g = parseInt(hex.slice(3,5), 16)
  const b = parseInt(hex.slice(5,7), 16)
  return `rgba(${r},${g},${b},${(opacity ?? 100) / 100})`
}

const applyCursorConfig = (config) => {
  const enabled = config.cursor_enabled !== false
  const r = config.cursor_radius ?? 3

  const defColor = hexToRgba(config.cursor_color, config.cursor_opacity)
  const defStrokeW = config.cursor_stroke_width ?? 0
  const defStrokeColor = hexToRgba(config.cursor_stroke_color, config.cursor_stroke_opacity)

  const ptrColor = hexToRgba(config.cursor_hover_color ?? config.cursor_color, config.cursor_hover_opacity ?? config.cursor_opacity)
  const ptrStrokeW = config.cursor_hover_stroke_width ?? 2.5
  const ptrStrokeColor = hexToRgba(config.cursor_hover_stroke_color ?? '#000000', config.cursor_hover_stroke_opacity ?? 100)

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

  const svg = (fill, stroke, strokeW) => {
    let inner = `<circle cx='10' cy='10' r='${r}' fill='${fill}'`
    if (stroke && strokeW > 0) inner += ` stroke='${stroke}' stroke-width='${strokeW}'`
    inner += '/>'
    return encodeURIComponent(`<svg xmlns='http://www.w3.org/2000/svg' width='20' height='20'>${inner}</svg>`)
  }

  const def = svg(defColor, defStrokeColor, defStrokeW)
  const ptr = svg(ptrColor, ptrStrokeColor, ptrStrokeW)

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
