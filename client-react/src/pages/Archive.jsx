import { useEffect, useState, useRef } from 'react'
import './Home.css'
import './Archive.css'
import useWindowWidth from '../componentes/useWindowWidth'
import { Header } from '../componentes/Header'
import { ImageViewer } from '../componentes/ImageViewer'
import { ClickableImage } from '../componentes/ClickableImage'
import { siteConfigService, BASE_URL } from '../services/api'
import { useLockPageScroll } from '../hooks/useLockPageScroll'
import { useInertiaScroll } from '../hooks/useInertiaScroll'

export function Archive() {
  const [archiveImages, setArchiveImages] = useState([])
  const [viewerImage, setViewerImage] = useState(null)
  const [siteLinks, setSiteLinks] = useState([])
  const imagesContainerRef = useRef(null)
  const displayRef = useRef(null)
  const viewerOpenRef = useRef(false)
  const screenWidth = useWindowWidth()

  useLockPageScroll()

  const openViewer = (src) => { viewerOpenRef.current = true; setViewerImage(src) }
  const closeViewer = () => { viewerOpenRef.current = false; setViewerImage(null) }

  useEffect(() => {
    fetch(`${BASE_URL}/archive`)
      .then(res => res.json())
      .then(data => { if (data.images) setArchiveImages(data.images) })
      .catch(err => console.error('Error fetching archive:', err))

    siteConfigService.get()
      .then(data => {
        if (data.config?.config_data?.links) setSiteLinks(data.config.config_data.links)
      })
      .catch(() => {})
  }, [])

  // Same inertia engine as Home (wheel/drag/touch + glide).
  const copies = useInertiaScroll(
    {
      containerRef: imagesContainerRef,
      listenerRef: displayRef,
      axis: 'x',
      enabled: archiveImages.length > 0,
      getAutoSpeed: () => 30,
      isPaused: () => viewerOpenRef.current,
    },
    [archiveImages, screenWidth]
  )

  const strip = Array.from({ length: copies }, () => archiveImages).flat()

  return (
    <div className="static-screen">
      <Header />

      <div className="container" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', flex: 1, minHeight: 0, overflow: 'hidden' }}>
        <div className="containerwork" style={{ width: '100%', height: '100%' }}>
          <div className="displaywork flex" ref={displayRef} style={{ overflow: 'hidden', width: '100%', height: '100%' }}>
            <div className="carrousel" ref={imagesContainerRef} style={{ display: 'flex', userSelect: 'none' }}>
              {strip.map((image, index) => (
                <ClickableImage
                  key={`archive-${index}`}
                  data-loop-start={index % archiveImages.length === 0 || undefined}
                  src={image.img_route}
                  alt={image.img_alt || 'Archived image'}
                  style={{ height: '100%', objectFit: 'cover' }}
                  onClick={() => openViewer(image.img_route)}
                />
              ))}
            </div>
          </div>
        </div>
      </div>

      {viewerImage && <ImageViewer src={viewerImage} onClose={closeViewer} />}

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
