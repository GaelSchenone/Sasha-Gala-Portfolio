import { useEffect, useState, useRef, useMemo } from 'react'
import './Home.css'
import { useNavigate } from 'react-router-dom'
import useWindowWidth from '../componentes/useWindowWidth'
import { Header } from '../componentes/Header'
import { ImageViewer } from '../componentes/ImageViewer'
import { siteConfigService } from '../services/api'

export function Home() {
  const [projects, setProjects] = useState([])
  const [projectimages, setProjectImages] = useState([])
  const [selected, setSelected] = useState(null)
  const [viewerImage, setViewerImage] = useState(null)
  const [siteLinks, setSiteLinks] = useState([])

  const isHovering = useRef(false)
  const isOverSidebar = useRef(false)
  const isOverImages = useRef(false)
  const viewerImageRef = useRef(null)

  const navigate = useNavigate()

  const openViewer = (src) => {
    viewerImageRef.current = src
    setViewerImage(src)
  }
  const closeViewer = () => {
    viewerImageRef.current = null
    setViewerImage(null)
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

  const projectsTransform = useRef(0)
  const imagesTransform = useRef(0)
  const targetImagesTransform = useRef(0)

  const userDraggingProjects = useRef(false)
  const userDraggingImages = useRef(false)
  const projectsDragTimeout = useRef(null)
  const imagesDragTimeout = useRef(null)

  const projectsContainerRef = useRef(null)
  const imagesContainerRef = useRef(null)

  const projectItemSizeRef = useRef(0)
  const imageItemSizeRef = useRef(0)

  const selectedRef = useRef(selected)
  useEffect(() => { selectedRef.current = selected }, [selected])

  const screenWidth = useWindowWidth()

  useEffect(() => {
    fetch('/api/projects?status=published')
      .then(res => res.json())
      .then(data => {
        if (data.projects) {
          setProjects(data.projects)
          if (data.projects.length > 0) setSelected(data.projects[0].project_id)
        }
      })
      .catch(err => console.error('Error fetching projects:', err))
  }, [])

  useEffect(() => {
    fetch('/api/projectimages')
      .then(res => res.json())
      .then(data => {
        if (data.images) setProjectImages(data.images)
      })
      .catch(err => console.error('Error fetching images:', err))
  }, [])

  useEffect(() => {
    siteConfigService.get()
      .then(data => {
        if (data.config?.config_data?.links) setSiteLinks(data.config.config_data.links)
      })
      .catch(() => {})
  }, [])

  useEffect(() => {
    if (projects.length === 0 || projectimages.length === 0) return

    const projectsContainer = projectsContainerRef.current
    const imagesContainer = imagesContainerRef.current
    if (!projectsContainer || !imagesContainer) return

    const isMobile = screenWidth <= 1157
    let animationId = null
    let lastTimestamp = null
    let lastSelectionTimestamp = 0
    const SELECTION_INTERVAL = 33

    const measureSizes = () => {
      const firstProject = projectsContainer.querySelector('.project-item')
      if (firstProject) {
        projectItemSizeRef.current = isMobile ? firstProject.offsetWidth : firstProject.offsetHeight
      }
      const firstImg = imagesContainer.querySelector('img')
      if (firstImg) {
        imageItemSizeRef.current = firstImg.offsetWidth
      }
    }
    measureSizes()

    const animate = (timestamp) => {
      if (lastTimestamp === null) {
        lastTimestamp = timestamp
        animationId = requestAnimationFrame(animate)
        return
      }

      const delta = Math.min(timestamp - lastTimestamp, 50)
      lastTimestamp = timestamp

      const pauseProjects = userDraggingProjects.current || isOverSidebar.current || viewerImageRef.current || isOverImages.current
      const pauseImages = userDraggingImages.current || viewerImageRef.current

      if (!pauseProjects) {
        const speed = 30
        const movement = (speed * delta) / 1000
        projectsTransform.current -= movement

        const slotSize = projectItemSizeRef.current + 5
        const totalSize = slotSize * projects.length

        if (totalSize > 0) {
          if (projectsTransform.current <= -totalSize) projectsTransform.current += totalSize
          if (projectsTransform.current > 0) projectsTransform.current -= totalSize
        }

        if (isMobile) {
          projectsContainer.style.transform = `translateX(${projectsTransform.current}px)`
        } else {
          projectsContainer.style.transform = `translateY(${projectsTransform.current}px)`
        }
      }

      const currentSelected = selectedRef.current
      const filteredCount = projectimages.filter(img => img.project_id == currentSelected).length
      const imageSlotSize = imageItemSizeRef.current + 10

      if (!pauseImages) {
        const speed = 30
        const movement = (speed * delta) / 1000
        targetImagesTransform.current -= movement
        imagesTransform.current += (targetImagesTransform.current - imagesTransform.current) * 0.1
      } else {
        targetImagesTransform.current = imagesTransform.current
      }

      const totalImageSize = imageSlotSize * filteredCount
      if (totalImageSize > 0) {
        if (imagesTransform.current <= -totalImageSize) {
          imagesTransform.current += totalImageSize
          targetImagesTransform.current += totalImageSize
        }
        if (imagesTransform.current > 0) {
          imagesTransform.current -= totalImageSize
          targetImagesTransform.current -= totalImageSize
        }
      }

      if (isMobile) {
        imagesContainer.style.transform = `translateX(${imagesTransform.current}px)`
      } else {
        imagesContainer.style.transform = `translateX(${imagesTransform.current}px)`
      }

      if (!isHovering.current && timestamp - lastSelectionTimestamp >= SELECTION_INTERVAL) {
        lastSelectionTimestamp = timestamp
        const selector = document.querySelector('.selector')
        const projectItems = projectsContainer.querySelectorAll('.project-item')

        if (selector && projectItems.length > 0) {
          const selectorRect = selector.getBoundingClientRect()
          const selectorCenter = isMobile
            ? (selectorRect.left + selectorRect.right) / 2
            : (selectorRect.top + selectorRect.bottom) / 2

          let minDistance = Infinity
          let closestId = null

          projectItems.forEach(item => {
            const itemRect = item.getBoundingClientRect()
            const itemCenter = isMobile
              ? (itemRect.left + itemRect.right) / 2
              : (itemRect.top + itemRect.bottom) / 2

            const distance = Math.abs(selectorCenter - itemCenter)
            if (distance < minDistance) {
              minDistance = distance
              closestId = parseInt(item.dataset.key)
            }
          })

          if (closestId && closestId !== selectedRef.current) {
            setSelected(closestId)
          }
        }
      }

      animationId = requestAnimationFrame(animate)
    }

    animationId = requestAnimationFrame(animate)

    const handleProjectsWheel = (e) => {
      e.preventDefault()
      userDraggingProjects.current = true
      const delta = isMobile ? e.deltaX || e.deltaY : e.deltaY
      projectsTransform.current -= delta

      const slotSize = projectItemSizeRef.current + 5
      const totalSize = slotSize * projects.length
      if (totalSize > 0) {
        if (projectsTransform.current <= -totalSize) projectsTransform.current += totalSize
        if (projectsTransform.current > 0) projectsTransform.current -= totalSize
      }

      if (isMobile) {
        projectsContainer.style.transform = `translateX(${projectsTransform.current}px)`
      } else {
        projectsContainer.style.transform = `translateY(${projectsTransform.current}px)`
      }

      clearTimeout(projectsDragTimeout.current)
      projectsDragTimeout.current = setTimeout(() => { userDraggingProjects.current = false }, 1500)
    }

    let lastProjectsTouch = 0
    const handleProjectsTouchStart = (e) => {
      lastProjectsTouch = isMobile ? e.touches[0].clientX : e.touches[0].clientY
      userDraggingProjects.current = true
    }
    const handleProjectsTouchMove = (e) => {
      e.preventDefault()
      const currentPos = isMobile ? e.touches[0].clientX : e.touches[0].clientY
      const delta = currentPos - lastProjectsTouch
      lastProjectsTouch = currentPos
      projectsTransform.current += delta

      const slotSize = projectItemSizeRef.current + 5
      const totalSize = slotSize * projects.length
      if (totalSize > 0) {
        if (projectsTransform.current <= -totalSize) projectsTransform.current += totalSize
        if (projectsTransform.current > 0) projectsTransform.current -= totalSize
      }

      if (isMobile) {
        projectsContainer.style.transform = `translateX(${projectsTransform.current}px)`
      } else {
        projectsContainer.style.transform = `translateY(${projectsTransform.current}px)`
      }
    }
    const handleProjectsTouchEnd = () => {
      clearTimeout(projectsDragTimeout.current)
      projectsDragTimeout.current = setTimeout(() => { userDraggingProjects.current = false }, 1500)
    }

    const handleImagesWheel = (e) => {
      e.preventDefault()
      userDraggingImages.current = true
      const delta = isMobile ? (e.deltaX || e.deltaY) : (e.deltaX || e.deltaY)
      targetImagesTransform.current -= delta
      imagesTransform.current = targetImagesTransform.current

      const filteredCount = projectimages.filter(img => img.project_id == selectedRef.current).length
      const slotSize = imageItemSizeRef.current + 10
      const totalSize = slotSize * filteredCount
      if (totalSize > 0) {
        if (imagesTransform.current <= -totalSize) {
          imagesTransform.current += totalSize
          targetImagesTransform.current += totalSize
        }
        if (imagesTransform.current > 0) {
          imagesTransform.current -= totalSize
          targetImagesTransform.current -= totalSize
        }
      }

      if (isMobile) {
        imagesContainer.style.transform = `translateX(${imagesTransform.current}px)`
      } else {
        imagesContainer.style.transform = `translateX(${imagesTransform.current}px)`
      }

      clearTimeout(imagesDragTimeout.current)
      imagesDragTimeout.current = setTimeout(() => { userDraggingImages.current = false }, 1500)
    }

    let lastImagesTouch = 0
    const handleImagesTouchStart = (e) => {
      lastImagesTouch = e.touches[0].clientX
      userDraggingImages.current = true
    }
    const handleImagesTouchMove = (e) => {
      e.preventDefault()
      const currentPos = e.touches[0].clientX
      const delta = currentPos - lastImagesTouch
      lastImagesTouch = currentPos
      targetImagesTransform.current += delta
      imagesTransform.current = targetImagesTransform.current

      const filteredCount = projectimages.filter(img => img.project_id == selectedRef.current).length
      const slotSize = imageItemSizeRef.current + 10
      const totalSize = slotSize * filteredCount
      if (totalSize > 0) {
        if (imagesTransform.current <= -totalSize) {
          imagesTransform.current += totalSize
          targetImagesTransform.current += totalSize
        }
        if (imagesTransform.current > 0) {
          imagesTransform.current -= totalSize
          targetImagesTransform.current -= totalSize
        }
      }

      if (isMobile) {
        imagesContainer.style.transform = `translateX(${imagesTransform.current}px)`
      } else {
        imagesContainer.style.transform = `translateX(${imagesTransform.current}px)`
      }
    }
    const handleImagesTouchEnd = () => {
      clearTimeout(imagesDragTimeout.current)
      imagesDragTimeout.current = setTimeout(() => { userDraggingImages.current = false }, 1500)
    }

    const handleSidebarEnter = () => { isOverSidebar.current = true }
    const handleSidebarLeave = () => { isOverSidebar.current = false }
    const handleImagesEnter = () => { isOverImages.current = true }
    const handleImagesLeave = () => { isOverImages.current = false }
    const handleProjectMouseEnter = function() {
      isHovering.current = true
      const key = parseInt(this.dataset.key)
      setSelected(key)
    }
    const handleProjectMouseLeave = () => { isHovering.current = false }

    const wrapper = projectsContainer.closest('.carrousel-y-wrapper')
    const display = imagesContainer.closest('.displaywork')

    if (wrapper) {
      wrapper.addEventListener('wheel', handleProjectsWheel, { passive: false })
      wrapper.addEventListener('touchstart', handleProjectsTouchStart, { passive: true })
      wrapper.addEventListener('touchmove', handleProjectsTouchMove, { passive: false })
      wrapper.addEventListener('touchend', handleProjectsTouchEnd, { passive: true })
      wrapper.addEventListener('mouseenter', handleSidebarEnter)
      wrapper.addEventListener('mouseleave', handleSidebarLeave)
    }

    if (display) {
      display.addEventListener('wheel', handleImagesWheel, { passive: false })
      display.addEventListener('touchstart', handleImagesTouchStart, { passive: true })
      display.addEventListener('touchmove', handleImagesTouchMove, { passive: false })
      display.addEventListener('touchend', handleImagesTouchEnd, { passive: true })
      if (screenWidth > 1157) {
        display.addEventListener('mouseenter', handleImagesEnter)
        display.addEventListener('mouseleave', handleImagesLeave)
      }
    }

    const projectItems = projectsContainer.querySelectorAll('.project-item')
    projectItems.forEach(item => {
      item.addEventListener('mouseenter', handleProjectMouseEnter)
    })
    projectsContainer.addEventListener('mouseleave', handleProjectMouseLeave)

    return () => {
      if (animationId) cancelAnimationFrame(animationId)
      if (wrapper) {
        wrapper.removeEventListener('wheel', handleProjectsWheel)
        wrapper.removeEventListener('touchstart', handleProjectsTouchStart)
        wrapper.removeEventListener('touchmove', handleProjectsTouchMove)
        wrapper.removeEventListener('touchend', handleProjectsTouchEnd)
        wrapper.removeEventListener('mouseenter', handleSidebarEnter)
        wrapper.removeEventListener('mouseleave', handleSidebarLeave)
      }
      if (display) {
        display.removeEventListener('wheel', handleImagesWheel)
        display.removeEventListener('touchstart', handleImagesTouchStart)
        display.removeEventListener('touchmove', handleImagesTouchMove)
        display.removeEventListener('touchend', handleImagesTouchEnd)
        display.removeEventListener('mouseenter', handleImagesEnter)
        display.removeEventListener('mouseleave', handleImagesLeave)
      }
      projectItems.forEach(item => {
        item.removeEventListener('mouseenter', handleProjectMouseEnter)
      })
      projectsContainer.removeEventListener('mouseleave', handleProjectMouseLeave)
    }
  }, [projects, projectimages, screenWidth])

  const filteredImages = useMemo(
    () => projectimages.filter(img => img.project_id == selected),
    [projectimages, selected]
  )

  return (
    <>
      <div className="workbanner">
        <Header />
      </div>

      <div className="container">
        <div className="sidebar">
          <div className="selector"></div>
          <div className="carrousel-y-wrapper">
            <div className="carrousel-y" ref={projectsContainerRef}>
              {[...projects, ...projects, ...projects].map((project, index) => (
                <div
                  className='project-item'
                  key={`project-${index}`}
                  data-key={project.project_id}
                  style={{ fontWeight: selected === project.project_id ? 500 : 300 }}
                  onClick={() => handleProjectClick(project.project_id, project.project_name, project.project_type)}
                >
                  {project.project_name}
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="containerwork">
          <div className="displaywork">
            <div className="carrousel-work" ref={imagesContainerRef}>
              {[...filteredImages, ...filteredImages, ...filteredImages].map((image, index) => (
                <img
                  src={image.img_route}
                  alt=""
                  key={`image-${index}`}
                  onClick={() => handleImageClick(image)}
                />
              ))}
            </div>
          </div>
        </div>
      </div>

      {viewerImage && (
        <ImageViewer src={viewerImage} onClose={closeViewer} />
      )}
      <footer>
        <div className="contact-links">
          {siteLinks.map((link, i) => (
            <a key={i} href={link.url.startsWith("http") ? link.url : `https://${link.url}`} target="_blank" rel="noopener noreferrer">{link.title}</a>
          ))}
        </div>
      </footer>
    </>
  )
}
