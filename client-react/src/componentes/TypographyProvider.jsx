import { useSiteConfig, applyConfigToDOM } from './useSiteConfig'

export function TypographyProvider({ children }) {
  const config = useSiteConfig()

  // Apply typography + title to DOM whenever config updates
  if (config) applyConfigToDOM(config)

  return <>{children}</>
}
