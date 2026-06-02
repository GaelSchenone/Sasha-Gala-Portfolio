import { useEffect, useLayoutEffect } from 'react'
import { siteConfigService, faviconUrl } from '../services/api'

const applyConfig = (config) => {
  if (!config) return
  const root = document.documentElement

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
