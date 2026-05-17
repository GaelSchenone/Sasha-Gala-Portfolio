import { useEffect, useState, useRef, useMemo, useCallback } from 'react'
import './Home.css'
import { useNavigate } from 'react-router-dom'
import useWindowWidth from '../componentes/useWindowWidth'
import { Header } from '../componentes/Header'
import { ImageViewer } from '../componentes/ImageViewer'
import { ClickableImage } from '../componentes/ClickableImage'
import { InfiniteScroll } from '../componentes/InfiniteScroll'
import { useSiteConfig } from '../componentes/useSiteConfig'
import { BASE_URL } from '../services/api'

const normalizeImageRoute = (route) => {
  if (!route) return route
  if (route.startsWith('http://') || route.startsWith('https://')) return route
  return route
}

const normalizeImages = (data) => {
  if (!data) return data
  if (Array.isArray(data)) {
    return data.map(item => {
      if (item.img_route) {
        return { ...item, img_route: normalizeImageRoute(item.img_route) }
      }
      return item
    })
  }
  if (data.img_route) {
    return { ...data, img_route: normalizeImageRoute(data.img_route) }
  }
  return data
}

const HOVER_PAUSE_MS = 5000

export function Home() {
  const [projects, setProjects] = useState([])
  const [projectimages, setProjectImages] = useState([])
  const [selected, setSelected] = useState(null)
  const [highlightedIdx, setHighlightedIdx] = useState(-1)
  const [viewerImage, setViewerImage] = useState(null)
  const [siteLinks, setSiteLinks] = useState(() => {
    try {
      const cached = JSON.parse(localStorage.getItem('sasha_site_config') || 'null')
      return cached?.links || []
    } catch { return [] }
  })
  const [scrollSpeeds, setScrollSpeeds] = useState(() => {
    try {
      const cached = JSON.parse(localStorage.getItem('sasha_site_config') || 'null')
      return {
        projects: cached?.scroll_projects_speed || 30,
        images: cached?.scroll_images_speed || 50,
      }
    } catch { return { projects: 30, images: 50 } }
  })

  const siteConfig = useSiteConfig()

  useEffect(() => {
    if (!siteConfig) return
    if (siteConfig.links) setSiteLinks(siteConfig.links)
    setScrollSpeeds({
      projects: siteConfig.scroll_projects_speed || 30,
      images: siteConfig.scroll_images_speed || 50,
    })
  }, [siteConfig])

  const viewerImageRef = useRef(null)
  const [viewerOpen, setViewerOpen] = useState(false)
  const hoverTimerRef = useRef(null)
  const [hoverPaused, setHoverPaused] = useState(false)

  const navigate = useNavigate()

  const openViewer = (src) => {
    viewerImageRef.current = src
    setViewerImage(src)
    setViewerOpen(true)
  }
  const closeViewer = () => {
    viewerImageRef.current = null
    setViewerImage(null)
    setViewerOpen(false)
  }

  const handleProjectClick = (id, name, type) => {
    if (type === 'quick') {
      const imgs = projectimages.filter(img => img.project_id == id)
      if (imgs.length > 0) openViewer(imgs[0].img_route)
      return
    }
    navigate(`/Work/${encodeURIComponent(name)}`, { state: { id: id } })
  }

  const handleImageClick = (image) => {
    const project = projects.find(p => p.project_id == image.project_id)
    if (!project) return
    if (project.project_type === 'quick') {
      openViewer(image.img_route)
    } else {
      navigate(`/Work/${encodeURIComponent(project.project_name)}`, { state: { id: project.project_id } })
    }
  }

  // ── Hover pause logic ──────────────────────────────────
  const handleImagesMouseEnter = useCallback(() => {
    clearTimeout(hoverTimerRef.current)
    setHoverPaused(true)
    // Start 5s timer — resume even if mouse stays
    hoverTimerRef.current = setTimeout(() => {
      setHoverPaused(false)
    }, HOVER_PAUSE_MS)
  }, [])

  const handleImagesMouseLeave = useCallback(() => {
    clearTimeout(hoverTimerRef.current)
    setHoverPaused(false)
  }, [])

  // Cleanup timer on unmount
  useEffect(() => {
    return () => clearTimeout(hoverTimerRef.current)
  }, [])

  const selectedRef = useRef(selected)
  useEffect(() => { selectedRef.current = selected }, [selected])

  const screenWidth = useWindowWidth()
  const isMobile = screenWidth <= 1157

  const allProjectItems = useMemo(
    () => [...projects, ...projects, ...projects, ...projects],
    [projects]
  )

  useEffect(() => {
    fetch(`${BASE_URL}/projects?status=published`)
      .then(res => res.json())
      .then(data => {
        if (data.projects) {
          setProjects(normalizeImages(data.projects))
          if (data.projects.length > 0) setSelected(data.projects[0].project_id)
        }
      })
      .catch(err => console.error('Error fetching projects:', err))
  }, [])

  useEffect(() => {
    fetch(`${BASE_URL}/projectimages`)
      .then(res => res.json())
      .then(data => {
        if (data.images) setProjectImages(normalizeImages(data.images))
      })
      .catch(err => console.error('Error fetching images:', err))
  }, [])

  // Selector detection
  useEffect(() => {
    if (projects.length === 0) return

    const interval = setInterval(() => {
      const selector = document.querySelector('.selector')
      const container = document.querySelector('.carrousel-y')
      if (!selector || !container) return

      const items = container.querySelectorAll('.project-item')
      if (items.length === 0) return

      const selectorRect = selector.getBoundingClientRect()
      const selectorCenter = isMobile
        ? (selectorRect.left + selectorRect.right) / 2
        : (selectorRect.top + selectorRect.bottom) / 2

      let minDistance = Infinity
      let closestIdx = -1

      items.forEach((item, idx) => {
        const itemRect = item.getBoundingClientRect()
        const itemCenter = isMobile
          ? (itemRect.left + itemRect.right) / 2
          : (itemRect.top + itemRect.bottom) / 2
        const distance = Math.abs(selectorCenter - itemCenter)
        if (distance < minDistance) {
          minDistance = distance
          closestIdx = idx
        }
      })

      if (closestIdx >= 0) {
        setHighlightedIdx(closestIdx)
        const projectId = parseInt(items[closestIdx].dataset.key)
        if (projectId !== selectedRef.current) {
          setSelected(projectId)
        }
      }
    }, 33)

    return () => clearInterval(interval)
  }, [projects.length, isMobile])

  const filteredImages = useMemo(
    () => projectimages.filter(img => img.project_id == selected),
    [projectimages, selected]
  )

  // Both scrolls pause on: viewer open OR hover on images area
  const pauseBoth = viewerOpen || hoverPaused

  return (
    <>
      <Header />

      <div className="container">
        <div className="sidebar">
          <div className="selector"></div>
          <div className="carrousel-y-wrapper">
            <InfiniteScroll
              axis={isMobile ? 'x' : 'y'}
              speed={scrollSpeeds.projects}
              pause={pauseBoth}
              className="carrousel-y"
            >
              {allProjectItems.map((project, index) => (
                <div
                  className='project-item'
                  key={`project-${index}`}
                  data-key={project.project_id}
                  style={{ fontWeight: index === highlightedIdx ? 500 : 300 }}
                  onClick={() => handleProjectClick(project.project_id, project.project_name, project.project_type)}
                >
                  {project.project_name}
                </div>
              ))}
            </InfiniteScroll>
          </div>
        </div>

        <div className="containerwork">
          <div className="displaywork"
            onMouseEnter={handleImagesMouseEnter}
            onMouseLeave={handleImagesMouseLeave}
          >
            <InfiniteScroll
              axis="x"
              speed={scrollSpeeds.images}
              pause={pauseBoth}
              className="carrousel-work"
            >
              {[...filteredImages, ...filteredImages, ...filteredImages, ...filteredImages].map((image, index) => (
                <ClickableImage
                  key={`image-${index}`}
                  src={image.img_route}
                  alt=""
                  onClick={() => handleImageClick(image)}
                />
              ))}
            </InfiniteScroll>
          </div>
        </div>
      </div>

      {viewerImage && (
        <ImageViewer src={viewerImage} onClose={closeViewer} />
      )}
      <footer>
        <div className="contact-links">
          {siteLinks.map((link, i) => (
            <a key={i} href={link.url.startsWith("http") || link.url.startsWith("mailto:") ? link.url : `https://${link.url}`} target={link.url.startsWith("mailto:") ? undefined : "_blank"} rel={link.url.startsWith("mailto:") ? undefined : "noopener noreferrer"}>{link.title}</a>
          ))}
        </div>
      </footer>
    </>
  )
}
