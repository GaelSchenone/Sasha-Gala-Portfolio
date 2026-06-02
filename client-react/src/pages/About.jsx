import { useState, useEffect } from 'react'
import './About.css'
import { Header } from '../componentes/Header'
import { siteConfigService } from '../services/api'
import { useLockPageScroll } from '../hooks/useLockPageScroll'

export function About() {
  const [config, setConfig] = useState(null)
  const [loading, setLoading] = useState(true)

  useLockPageScroll()

  useEffect(() => {
    siteConfigService.get()
      .then(data => {
        if (data.config?.config_data) setConfig(data.config.config_data)
      })
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  if (loading) return null

  const description = config?.description || ''
  const stack = config?.stack || ''
  const links = config?.links || []

  return (
    <div className="about-screen">
      <Header />

      <div className="about-page">

        {/* Bio section */}
        <section className="bio-section">
          <div className="bio-columns">
            <div className="bio-col-left">
              <img id="dibujito" src="dibujito.png" alt="" />
              <div className="bio-titles">
                {stack && stack.split(',').map((s, i) => (
                  <h2 key={i}>{s.trim()}</h2>
                ))}
              </div>
            </div>

            <div className="bio-col-right">
              <p style={{ whiteSpace: 'pre-wrap' }}>{description}</p>
            </div>
          </div>
        </section>

        {/* Contact section */}
        <section className="contact-section">
          <div className="bio-columns">
            <div className="bio-col-left">
              <div className="bio-titles">
                <h2>Let's work together :)</h2>
              </div>
            </div>

            <div className="bio-col-right">
              <div className="contact-links">
                {links.map((link, i) => (
                  <a key={i} href={link.url.startsWith("http") || link.url.startsWith("mailto:") ? link.url : `https://${link.url}`} target={link.url.startsWith("mailto:") ? undefined : "_blank"} rel={link.url.startsWith("mailto:") ? undefined : "noopener noreferrer"}>{link.title}</a>
                ))}
              </div>
            </div>
          </div>
        </section>

      </div>
    </div>
  )
}
