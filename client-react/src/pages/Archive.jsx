import { useEffect, useState, useRef } from 'react'
import './Home.css'
import './Archive.css'
import useWindowWidth from '../componentes/useWindowWidth';
import { Header } from '../componentes/Header'
import { ImageViewer } from '../componentes/ImageViewer'
import { ClickableImage } from '../componentes/ClickableImage'
import { BASE_URL } from '../services/api'

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
    fetch(`${BASE_URL}/archive`, { headers: { 'ngrok-skip-browser-warning': 'true' } })
      .then((res) => res.json())
      .then((data) => {
        if (data.images) {
          setArchiveImages(data.images)
        }
      })
      .catch((error) => console.error('Error fetching archive:', error))
  }, [])

  useEffect(() => {
    if (!imagesContainerRef.current || archiveImages.length === 0) return

    const container = imagesContainerRef.current
    let animationId = null
    let lastTime = Date.now()

    // Start with offset so first image border is not visible
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

      container.style.transform = `translateX(${imagesTransform.current}px)`

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

    let lastTouch = 0
    const handleTouchStart = (e) => {
      lastTouch = e.touches[0].clientX
      userDraggingImages.current = true
    }
    const handleTouchMove = (e) => {
      e.preventDefault()
      const currentPos = e.touches[0].clientX
      const delta = currentPos - lastTouch
      lastTouch = currentPos
      targetImagesTransform.current += delta
      imagesTransform.current = targetImagesTransform.current

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

      container.style.transform = `translateX(${imagesTransform.current}px)`
    }
    const handleTouchEnd = () => {
      clearTimeout(imagesDragTimeout.current)
      imagesDragTimeout.current = setTimeout(() => {
        userDraggingImages.current = false
      }, 2000)
    }

    animate()

    const display = container.closest('.displaywork')
    if (display) {
      display.addEventListener('wheel', handleWheel, { passive: false })
      display.addEventListener('touchstart', handleTouchStart, { passive: false })
      display.addEventListener('touchmove', handleTouchMove, { passive: false })
      display.addEventListener('touchend', handleTouchEnd, { passive: false })
    }

    return () => {
      if (animationId) cancelAnimationFrame(animationId)
      if (display) {
        display.removeEventListener('wheel', handleWheel)
        display.removeEventListener('touchstart', handleTouchStart)
        display.removeEventListener('touchmove', handleTouchMove)
        display.removeEventListener('touchend', handleTouchEnd)
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
