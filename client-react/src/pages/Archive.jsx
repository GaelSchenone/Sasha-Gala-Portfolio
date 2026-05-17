import { useEffect, useState, useCallback, useRef } from 'react'
import './Home.css'
import './Archive.css'
import { Header } from '../componentes/Header'
import { ImageViewer } from '../componentes/ImageViewer'
import { ClickableImage } from '../componentes/ClickableImage'
import { InfiniteScroll } from '../componentes/InfiniteScroll'
import { BASE_URL } from '../services/api'

const HOVER_PAUSE_MS = 5000

export function Archive() {
  const [archiveImages, setArchiveImages] = useState([])
  const [viewerImage, setViewerImage] = useState(null)
  const [viewerOpen, setViewerOpen] = useState(false)
  const hoverTimerRef = useRef(null)
  const [hoverPaused, setHoverPaused] = useState(false)

  const openViewer = (src) => { setViewerImage(src); setViewerOpen(true) }
  const closeViewer = () => { setViewerImage(null); setViewerOpen(false) }

  const handleMouseEnter = useCallback(() => {
    clearTimeout(hoverTimerRef.current)
    setHoverPaused(true)
    hoverTimerRef.current = setTimeout(() => {
      setHoverPaused(false)
    }, HOVER_PAUSE_MS)
  }, [])

  const handleMouseLeave = useCallback(() => {
    clearTimeout(hoverTimerRef.current)
    setHoverPaused(false)
  }, [])

  useEffect(() => {
    return () => clearTimeout(hoverTimerRef.current)
  }, [])

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

  const pauseBoth = viewerOpen || hoverPaused

  return (
    <>
      <Header />

      <div className="container" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', flex: 1, overflow: 'hidden' }}>
        <div className="containerwork" style={{ width: '100%', height: '100%' }}>
          <div className="displaywork flex" style={{ overflow: 'hidden', width: '100%', height: '100%' }}
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
          >
            <InfiniteScroll
              axis="x"
              speed={30}
              pause={pauseBoth}
              className="carrousel"
            >
              {[...archiveImages, ...archiveImages, ...archiveImages, ...archiveImages].map((image, index) => (
                <ClickableImage
                  key={`archive-${index}`}
                  src={image.img_route}
                  alt={image.img_alt || "Archived image"}
                  style={{ height: '100%', width: 'auto', objectFit: 'cover' }}
                  onClick={() => openViewer(image.img_route)}
                />
              ))}
            </InfiniteScroll>
          </div>
        </div>
      </div>

      {viewerImage && (
        <ImageViewer src={viewerImage} onClose={closeViewer} />
      )}
    </>
  )
}
