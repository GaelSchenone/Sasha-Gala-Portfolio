import { useState, useEffect } from 'react'
import { useParams, useLocation, useNavigate } from 'react-router-dom'
import './View.css'
import { Header } from '../componentes/Header'
import { projectService, siteConfigService } from '../services/api'

const formatCollaborators = (str) => {
  if (!str) return null
  const list = str.split(',').map(c => c.trim())
  if (list.length === 1) return list[0]
  return list.slice(0, -1).join(', ') + ' and ' + list[list.length - 1]
}

export function View() {
  const { projectName } = useParams()
  const location = useLocation()
  const navigate = useNavigate()
  const [project, setProject] = useState(null)
  const [loading, setLoading] = useState(true)
  const [siteLinks, setSiteLinks] = useState([])

  const projectIdFromState = location.state?.id

  useEffect(() => {
    const fetchProject = async () => {
      try {
        const data = projectIdFromState
          ? await projectService.getById(projectIdFromState)
          : await projectService.getByName(decodeURIComponent(projectName))

        if (data.project) {
          setProject(data.project)
        }
      } catch (error) {
        console.error('Error fetching project:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchProject()

    siteConfigService.get()
      .then(data => {
        if (data.config?.config_data?.links) setSiteLinks(data.config.config_data.links)
      })
      .catch(() => {})
  }, [projectIdFromState, projectName])

  if (loading) return <div className="loading" style={{ padding: '50px' }}>Loading project...</div>
  if (!project) return <div className="error">Project not found</div>

  // Quick projects don't have a project page
  if (project.project_type === 'quick') {
    navigate('/Work', { replace: true })
    return null
  }

  const layout = project.layout_json
  const hasLayout = layout && layout.sections && layout.sections.length > 0
  const fallbackImages = project.images || []

  return (
    <div className="view-page">
      <Header />
      <div className="view-body">

        {/* Bio Section */}
        <div className="view-section">
          <div className="view-top-half"></div>
          <div className="view-bottom-half">
            <div className="view-col-left">
              <div className="view-info">
                <h2 className='project-title'>{project.project_name}</h2>
                <div className="view-titles">
                  {project.project_stack && project.project_stack.split(',').map((stack, index) => (
                    <h2 key={index}>{stack.trim()}</h2>
                  ))}
                </div>
              </div>
            </div>

            <div className="view-col-right">
              <p>{project.project_description}</p>
              {project.project_colaborators && (
                <b className='colaborators'>
                  Collaboration with {formatCollaborators(project.project_colaborators)}
                </b>
              )}
            </div>
          </div>
        </div>

        {/* Gallery */}
        {hasLayout ? (
          <LayoutGallery sections={layout.sections} layoutGap={layout.layoutGap} />
        ) : (
          <MasonryGallery images={fallbackImages} projectName={project.project_name} />
        )}
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

function LayoutGallery({ sections }) {
  return (
    <div className="layout-gallery">
      {sections.map(section => {
        const gap = section.gap ?? 0
        const height = section.height ?? 400
        const autoHeight = section.autoHeight || false
        return (
          <div key={section.id}>
            {(section.rows || []).map((row, rowIdx) => (
              <div
                key={rowIdx}
                style={{
                  display: 'grid',
                  gridTemplateColumns: `repeat(${section.columns || 1}, 1fr)`,
                  columnGap: `${gap}px`,
                  rowGap: 0,
                }}
              >
                {row.map((slot, colIdx) => {
                  if (!slot) return null
                  const src = typeof slot === 'string' ? slot : slot.src
                  const fit = (typeof slot === 'object' && slot.fit) || 'cover'
                  const position = (typeof slot === 'object' && slot.position) || 'center'
                  const slotHeight = (typeof slot === 'object' && slot.height) ? slot.height : height

                  if (autoHeight) {
                    return (
                      <img
                        key={colIdx}
                        className="layout-slot-auto"
                        src={src}
                        alt=""
                        style={{
                          width: '100%',
                          height: 'auto',
                          objectFit: fit,
                          objectPosition: position,
                          display: 'block',
                        }}
                      />
                    )
                  }

                  return (
                    <div
                      key={colIdx}
                      className="layout-slot"
                      style={{
                        backgroundImage: `url(${src})`,
                        backgroundSize: fit,
                        backgroundPosition: position,
                        backgroundRepeat: 'no-repeat',
                        height: `${slotHeight}px`,
                      }}
                    />
                  )
                })}
              </div>
            ))}
          </div>
        )
      })}
    </div>
  )
}

function MasonryGallery({ images, projectName }) {
  return (
    <div className="gallery">
      {images.map(image => (
        <div className="gallery-item" key={image.img_id}>
          <img src={image.img_route} alt={projectName} />
        </div>
      ))}
    </div>
  )
}
