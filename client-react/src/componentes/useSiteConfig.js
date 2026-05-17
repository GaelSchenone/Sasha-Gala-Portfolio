import { useEffect, useSyncExternalStore } from 'react'
import { siteConfigService } from '../services/api'

let listeners = []
let configData = null

function emitChange() {
  for (const cb of listeners) cb()
}

export function useSiteConfig() {
  // Subscribe to config changes
  const data = useSyncExternalStore(
    (cb) => { listeners.push(cb); return () => { listeners = listeners.filter(l => l !== cb) } },
    () => configData,
  )

  useEffect(() => {
    // 1. Apply cached config immediately (sync, no flash)
    const cached = siteConfigService.getCached()
    if (cached) {
      configData = cached
      emitChange()
    }

    // 2. Fetch fresh config (single request for entire app)
    siteConfigService.get()
      .then(data => {
        const config = data.config?.config_data || data
        siteConfigService.setCache(config)
        configData = config
        emitChange()
      })
      .catch(() => {})
  }, [])

  return configData
}

export function applyConfigToDOM(config) {
  if (!config) return
  const root = document.documentElement

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
  if (config.name) document.title = config.name
}
