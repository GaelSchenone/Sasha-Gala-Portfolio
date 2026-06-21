import { useState, useEffect } from 'react'
import { Header } from '../componentes/Header'
import './Work.css'
import { WorkItem } from '../componentes/workItem'
import { useProjects } from '../hooks/useProjects'
import { siteConfigService } from '../services/api'

export function Work() {
  const { projects, loading } = useProjects({ status: 'published', type: 'full' })
  const [siteLinks, setSiteLinks] = useState([])

  useEffect(() => {
    siteConfigService.get()
      .then(data => {
        if (data.config?.config_data?.links) setSiteLinks(data.config.config_data.links)
      })
      .catch(() => {})
  }, [])

  if (loading) return null

  return (
    <div className="work-page">
      <Header />

      <div className="work-body">
        <div className="work-container">
          {projects.map((project) => (
            <WorkItem
              key={project.project_id}
              project_id={project.project_id}
              project_title={project.project_name}
              project_image={project.project_main_image}
              project_stack={project.project_stack}
              project_description={project.project_description}
              project_collaborators={project.project_colaborators}
            />
          ))}
        </div>
      </div>

      <footer>
        <div className="contact-links">
          {siteLinks.map((link, i) => (
            <a
              key={i}
              href={link.url.startsWith('http') || link.url.startsWith('mailto:') ? link.url : `https://${link.url}`}
              target={link.url.startsWith('mailto:') ? undefined : '_blank'}
              rel={link.url.startsWith('mailto:') ? undefined : 'noopener noreferrer'}
            >
              {link.title}
            </a>
          ))}
        </div>
      </footer>
    </div>
  )
}
