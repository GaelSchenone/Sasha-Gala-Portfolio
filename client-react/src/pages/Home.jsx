import { useEffect, useState, useRef, useMemo } from 'react'
import './Home.css'
import { useNavigate } from 'react-router-dom'
import useWindowWidth from '../componentes/useWindowWidth'
import { Header } from '../componentes/Header'
import { ImageViewer } from '../componentes/ImageViewer'
import { ClickableImage } from '../componentes/ClickableImage'
import { siteConfigService, BASE_URL, preloadImage } from '../services/api'
import { useInertiaScroll } from '../hooks/useInertiaScroll'
import { useLockPageScroll } from '../hooks/useLockPageScroll'

const MOBILE_BP = 1157

const normalizeImageRoute = (route) => {
  if (!route) return route
  // Full URLs (Cloudinary CDN) are returned as-is
  if (route.startsWith('http://') || route.startsWith('https://')) return route
  // Legacy /imgs/ routes - no longer served after Cloudinary migration
  return route
}

const normalizeImages = (data) => {
  if (!data) return data
  if (Array.isArray(data)) {
    return data.map(item => (item.img_route ? { ...item, img_route: normalizeImageRoute(item.img_route) } : item))
  }
  if (data.img_route) return { ...data, img_route: normalizeImageRoute(data.img_route) }
  return data
}

export function Home() {
  const [projects, setProjects] = useState([])
  const [projectimages, setProjectImages] = useState([])
  const [selected, setSelected] = useState(null)
  const [viewerImage, setViewerImage] = useState(null)
  const [siteLinks, setSiteLinks] = useState([])
  const [scrollSpeeds, setScrollSpeeds] = useState({ projects: 30, images: 50 })

  useLockPageScroll()

  const navigate = useNavigate()
  const screenWidth = useWindowWidth()
  const isMobile = screenWidth <= MOBILE_BP

  // ── DOM refs ──
  const projectsContainerRef = useRef(null)
  const projectsWrapperRef = useRef(null)
  const imagesContainerRef = useRef(null)
  const displayRef = useRef(null)

  // ── interaction state (read inside animation callbacks) ──
  const isOverSidebar = useRef(false)
  const isOverImages = useRef(false)
  const hoveringRef = useRef(false)
  const viewerOpenRef = useRef(false)
  const selectedRef = useRef(selected)
  const lastSelectT = useRef(0)
  const highlightedElRef = useRef(null)

  // Highlight exactly ONE project copy (the one over the selector / hovered).
  // Imperative class toggle so flings don't re-render the whole list.
  const setHighlight = (el) => {
    if (highlightedElRef.current === el) return
    highlightedElRef.current?.classList.remove('is-selected')
    el?.classList.add('is-selected')
    highlightedElRef.current = el
  }

  useEffect(() => { selectedRef.current = selected }, [selected])

  const openViewer = (src) => { viewerOpenRef.current = true; setViewerImage(src) }
  const closeViewer = () => { viewerOpenRef.current = false; setViewerImage(null) }

  const handleProjectClick = (id, name, type) => {
    if (type === 'quick') {
      const imgs = projectimages.filter(img => img.project_id == id)
      if (imgs.length > 0) openViewer(imgs[0].img_route)
      return
    }
    navigate(`/Work/${encodeURIComponent(name)}`, { state: { id } })
  }

  const handleImageClick = (image) => {
    const project = projects.find(p => p.project_id == image.project_id)
    if (!project) return
    if (project.project_type === 'quick') openViewer(image.img_route)
    else navigate(`/Work/${encodeURIComponent(project.project_name)}`, { state: { id: project.project_id } })
  }

  // ── data ──
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
      .then(data => { if (data.images) setProjectImages(normalizeImages(data.images)) })
      .catch(err => console.error('Error fetching images:', err))
  }, [])

  useEffect(() => {
    siteConfigService.get()
      .then(data => {
        if (data.config?.config_data?.links) setSiteLinks(data.config.config_data.links)
        if (data.config?.config_data) {
          setScrollSpeeds({
            projects: data.config.config_data.scroll_projects_speed || 30,
            images: data.config.config_data.scroll_images_speed || 50,
          })
        }
      })
      .catch(() => {})
  }, [])

  const filteredImages = useMemo(
    () => projectimages.filter(img => img.project_id == selected),
    [projectimages, selected]
  )

  // Unloaded images are 0px wide and push the strip when they arrive, so every
  // project's images are preloaded (in list order) and a project's strip only
  // shows once all of them are decoded.
  const [readyProjects, setReadyProjects] = useState(() => new Set())
  useEffect(() => {
    if (!projects.length || !projectimages.length) return
    let alive = true
    projects.forEach(p => {
      const srcs = projectimages.filter(img => img.project_id == p.project_id).map(img => img.img_route)
      Promise.all(srcs.map(preloadImage)).then(() => {
        if (alive) setReadyProjects(s => new Set(s).add(p.project_id))
      })
    })
    return () => { alive = false }
  }, [projects, projectimages])
  const imagesReady = readyProjects.has(selected)

  // ── selector: pick the project whose center is nearest the .selector marker ──
  const detectSelected = () => {
    if (hoveringRef.current) return
    const now = performance.now()
    if (now - lastSelectT.current < 33) return // ~30fps throttle
    lastSelectT.current = now

    const selectorEl = document.querySelector('.selector')
    const container = projectsContainerRef.current
    if (!selectorEl || !container) return
    const items = container.querySelectorAll('.project-item')
    if (!items.length) return

    const mob = window.innerWidth <= MOBILE_BP
    const sr = selectorEl.getBoundingClientRect()
    const selectorCenter = mob ? (sr.left + sr.right) / 2 : (sr.top + sr.bottom) / 2

    let min = Infinity
    let closestEl = null
    items.forEach(item => {
      const r = item.getBoundingClientRect()
      const c = mob ? (r.left + r.right) / 2 : (r.top + r.bottom) / 2
      const d = Math.abs(selectorCenter - c)
      if (d < min) { min = d; closestEl = item }
    })
    if (!closestEl) return
    setHighlight(closestEl)
    const pid = parseInt(closestEl.dataset.key)
    if (pid && pid !== selectedRef.current) setSelected(pid)
  }

  // ── projects carousel: vertical on desktop, horizontal on mobile ──
  const projectCopies = useInertiaScroll(
    {
      containerRef: projectsContainerRef,
      listenerRef: projectsWrapperRef,
      axis: isMobile ? 'x' : 'y',
      enabled: projects.length > 0,
      getAutoSpeed: () => scrollSpeeds.projects,
      isPaused: () =>
        isOverSidebar.current || isOverImages.current || viewerOpenRef.current || hoveringRef.current,
      onAfterFrame: detectSelected,
    },
    [projects, screenWidth]
  )

  // ── images carousel: always horizontal ──
  const imageCopies = useInertiaScroll(
    {
      containerRef: imagesContainerRef,
      listenerRef: displayRef,
      axis: 'x',
      enabled: projectimages.length > 0,
      getAutoSpeed: () => scrollSpeeds.images,
      isPaused: () => viewerOpenRef.current || !imagesReady,
    },
    [projectimages, screenWidth]
  )

  const projectStrip = useMemo(
    () => Array.from({ length: projectCopies }, () => projects).flat(),
    [projects, projectCopies]
  )
  const imageStrip = useMemo(
    () => Array.from({ length: imageCopies }, () => filteredImages).flat(),
    [filteredImages, imageCopies]
  )

  return (
    <div className="static-screen">
      <Header />

      <div className="container">
        <div
          className="sidebar"
          onMouseEnter={() => { isOverSidebar.current = true }}
          onMouseLeave={() => { isOverSidebar.current = false }}
        >
          <div className="selector"></div>
          <div className="carrousel-y-wrapper" ref={projectsWrapperRef}>
            <div
              className="carrousel-y"
              ref={projectsContainerRef}
              style={{ userSelect: 'none' }}
              onMouseLeave={() => { hoveringRef.current = false }}
            >
              {projectStrip.map((project, index) => (
                <div
                  className="project-item"
                  key={`project-${index}`}
                  data-loop-start={index % projects.length === 0 || undefined}
                  data-key={project.project_id}
                  data-text={project.project_name}
                  onMouseEnter={(e) => { hoveringRef.current = true; setHighlight(e.currentTarget); setSelected(project.project_id) }}
                  onClick={() => handleProjectClick(project.project_id, project.project_name, project.project_type)}
                >
                  <span className="project-item-label">{project.project_name}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="containerwork">
          <div
            className="displaywork"
            ref={displayRef}
            onMouseEnter={() => { if (!isMobile) isOverImages.current = true }}
            onMouseLeave={() => { isOverImages.current = false }}
          >
            <div
              className="carrousel-work"
              ref={imagesContainerRef}
              style={{ userSelect: 'none', opacity: imagesReady ? 1 : 0, transition: imagesReady ? 'opacity 0.3s ease' : 'none' }}
            >
              {imageStrip.map((image, index) => (
                <ClickableImage
                  key={`image-${index}`}
                  data-loop-start={index % filteredImages.length === 0 || undefined}
                  src={image.img_route}
                  alt=""
                  onClick={() => handleImageClick(image)}
                />
              ))}
            </div>
          </div>
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

      {viewerImage && <ImageViewer src={viewerImage} onClose={closeViewer} />}
    </div>
  )
}
