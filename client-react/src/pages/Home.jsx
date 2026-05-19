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
  const highlightedGlobalIdxRef = useRef(-1)
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
    hoverTimerRef.current = setTimeout(() => {
      setHoverPaused(false)
    }, HOVER_PAUSE_MS)
  }, [])

  const handleImagesMouseLeave = useCallback(() => {
    clearTimeout(hoverTimerRef.current)
    setHoverPaused(false)
  }, [])

  useEffect(() => {
    return () => clearTimeout(hoverTimerRef.current)
  }, [])

  const selectedRef = useRef(selected)
  useEffect(() => { selectedRef.current = selected }, [selected])

  const screenWidth = useWindowWidth()
  const isMobile = screenWidth <= 1157

  // ── Selector/wrapper measurements (measured once, not per tick) ──
  const selectorMetricsRef = useRef({ start: 0, size: 0, wrapperSize: 0 })
  const selectorRef = useRef(null)
  useEffect(() => {
    const selector = selectorRef.current
    if (!selector) return
    const wrapper = selector.parentElement
    if (!wrapper) return

    const measure = () => {
      selectorMetricsRef.current = isMobile
        ? { start: selector.offsetLeft, size: selector.offsetWidth, wrapperSize: wrapper.clientWidth }
        : { start: selector.offsetTop, size: selector.offsetHeight, wrapperSize: wrapper.clientHeight }
    }
    measure()

    const ro = new ResizeObserver(measure)
    ro.observe(selector)
    ro.observe(wrapper)
    return () => ro.disconnect()
  }, [isMobile])

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

  // ── Selector detection via onTick (no DOM reads) ──
  const COPIES = 4
  const prevGlobalIdxRef = useRef(-1)
  const selectedDebounceRef = useRef(null)
  const onProjectsTick = useCallback((offset, listSize) => {
    if (!listSize || projects.length === 0) return
    const { start, size, wrapperSize } = selectorMetricsRef.current
    if (!size) return

    const count = projects.length
    const totalItems = count * COPIES
    const selectorCenter = start + size / 2

    const slotSize = listSize / count
    const posInList = -offset + selectorCenter

    // Global index across all 4 copies
    const globalIdx = Math.floor(posInList / slotSize)
    const clampedGlobal = Math.max(0, Math.min(globalIdx, totalItems - 1))

    // Logical index within one copy
    const wrappedPos = ((posInList % listSize) + listSize) % listSize
    const idx = Math.floor(wrappedPos / slotSize) % count

    // ── Bug 2 fix: direct DOM mutation for fontWeight, no setState ──
    if (clampedGlobal !== prevGlobalIdxRef.current) {
      const prevIdx = prevGlobalIdxRef.current
      prevGlobalIdxRef.current = clampedGlobal
      highlightedGlobalIdxRef.current = clampedGlobal

      const items = selectorRef.current?.parentElement?.querySelectorAll('.project-item')
      if (items) {
        if (prevIdx >= 0 && items[prevIdx]) items[prevIdx].style.fontWeight = '300'
        if (items[clampedGlobal]) items[clampedGlobal].style.fontWeight = '500'
      }
    }

    // ── Bug 3 fix: debounce setSelected to ~100ms ──
    const realIdx = idx % count
    const projectId = projects[realIdx]?.project_id
    if (projectId !== undefined && projectId !== selectedRef.current) {
      clearTimeout(selectedDebounceRef.current)
      selectedDebounceRef.current = setTimeout(() => {
        if (projectId !== selectedRef.current) {
          setSelected(projectId)
        }
      }, 100)
    }
  }, [projects])

  const filteredImages = useMemo(
    () => projectimages.filter(img => img.project_id == selected),
    [projectimages, selected]
  )

  const displayImages = useMemo(
    () => [...filteredImages, ...filteredImages, ...filteredImages, ...filteredImages],
    [filteredImages]
  )

  const pauseBoth = viewerOpen || hoverPaused

  return (
    <>
      <Header />

      <div className="container">
        <div className="sidebar">
          <div className="selector" ref={selectorRef}></div>
          <div className="carrousel-y-wrapper">
            <InfiniteScroll
              axis={isMobile ? 'x' : 'y'}
              speed={scrollSpeeds.projects}
              pause={pauseBoth}
              className="carrousel-y"
              onTick={onProjectsTick}
            >
              {allProjectItems.map((project, index) => (
                <div
                  className='project-item'
                  key={`project-${index}`}
                  data-key={project.project_id}
                  style={{ fontWeight: 300 }}
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
              {displayImages.map((image, index) => (
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