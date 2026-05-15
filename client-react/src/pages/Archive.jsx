import { useEffect, useState, useRef } from 'react'
import './Home.css' // Reutilizamos el estilo
import './Archive.css' // Reutilizamos el estilo
import useWindowWidth from '../componentes/useWindowWidth';
import { Header } from '../componentes/Header'
import { ImageViewer } from '../componentes/ImageViewer'
import { ClickableImage } from '../componentes/ClickableImage'

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

export function Archive() {
  const [archiveImages, setArchiveImages] = useState([])
  const [viewerImage, setViewerImage] = useState(null)
  const imagesTransform = useRef(0)
  const targetImagesTransform = useRef(0)
  const userDraggingImages = useRef(false)
  const imagesDragTimeout = useRef(null)
  const imagesContainerRef = useRef(null)
  const screenWidth = useWindowWidth();

  const openViewer = (src) => setViewerImage(src)
  const closeViewer = () => setViewerImage(null)

  useEffect(() => {
    fetch('/api/archive', { headers: { 'ngrok-skip-browser-warning': 'true' } })
      .then((res) => res.json())
      .then((data) => {
        if (data.images) {
          setArchiveImages(normalizeImages(data.images))
        }
      })
      .catch((error) => console.error('Error fetching archive:', error))
  }, [])

  useEffect(() => {
    if (!imagesContainerRef.current || archiveImages.length === 0) return

    const container = imagesContainerRef.current
    const isMobile = screenWidth <= 1157
    let animationId = null
    let lastTime = Date.now()

    // Arrancar con offset para que no se vea el borde izquierdo de la primera imagen
    requestAnimationFrame(() => {
      const firstImg = container.querySelector('img')
      if (firstImg) {
        const itemSize = firstImg.offsetWidth
        const offset = -(itemSize * 0.4)
        imagesTransform.current = offset
        targetImagesTransform.current = offset
      }
    })

    const animate = () => {
      const now = Date.now()
      const delta = now - lastTime
      lastTime = now

      if (!userDraggingImages.current) {
        const speed = 30
        const movement = (speed * delta) / 1000
        targetImagesTransform.current -= movement
        imagesTransform.current += (targetImagesTransform.current - imagesTransform.current) * 0.1;
      } else {
        targetImagesTransform.current = imagesTransform.current;
      }

      const firstImg = container.querySelector('img')
      if (firstImg) {
        const itemSize = firstImg.offsetWidth
        const totalSize = itemSize * archiveImages.length * 3

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
        container.style.transform = `translateX(${imagesTransform.current}px)`
      } else {
        container.style.transform = `translateX(${imagesTransform.current}px)`
      }

      animationId = requestAnimationFrame(animate)
    }

    const handleWheel = (e) => {
      e.preventDefault()
      userDraggingImages.current = true
      const delta = e.deltaX || e.deltaY
      targetImagesTransform.current -= delta
      imagesTransform.current = targetImagesTransform.current;

      clearTimeout(imagesDragTimeout.current)
      imagesDragTimeout.current = setTimeout(() => {
        userDraggingImages.current = false
      }, 2000)
    }

    animate()

    const display = container.closest('.displaywork')
    if (display) {
      display.addEventListener('wheel', handleWheel, { passive: false })
    }

    return () => {
      if (animationId) cancelAnimationFrame(animationId)
      if (display) {
        display.removeEventListener('wheel', handleWheel)
      }
    }
  }, [archiveImages, screenWidth])

  return (
    <>
      <div className="workbanner">
        <Header />
      </div>

      <div className="container" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', flex: 1, overflow: 'hidden' }}>
        <div className="containerwork" style={{ width: '100%', height: '100%' }}>
          <div className="displaywork flex" style={{ overflow: 'hidden', width: '100%', height: '100%' }}>
            <div className="carrousel" ref={imagesContainerRef} style={{ display: 'flex' }}>
              {/* Renderizar 3 copias para scroll infinito */}
              {[...archiveImages, ...archiveImages, ...archiveImages].map((image, index) => (
                <ClickableImage
                  key={`archive-${index}`}
                  src={image.img_route}
                  alt={image.img_alt || "Archived image"}
                  style={{ height: '100%', objectFit: 'cover' }}
                  onClick={() => openViewer(image.img_route)}
                />
              ))}
            </div>
          </div>
        </div>
      </div>

      {viewerImage && (
        <ImageViewer src={viewerImage} onClose={closeViewer} />
      )}
    </>
  )
}