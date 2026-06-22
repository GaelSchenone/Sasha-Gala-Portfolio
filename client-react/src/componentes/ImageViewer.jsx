import { useEffect, useState, useRef } from 'react'
import { X, RotateCcw } from 'lucide-react'
import './ImageViewer.css'

export function ImageViewer({ src, onClose }) {
 const [scale, setScale] = useState(1)
 const [position, setPosition] = useState({ x: 0, y: 0 })
 const [isDragging, setIsDragging] = useState(false)
 const [dragStart, setDragStart] = useState({ x: 0, y: 0 })
 const imageRef = useRef(null)

 const handleWheel = (e) => {
  e.preventDefault()
  const delta = e.deltaY > 0 ? -0.1 : 0.1
  const newScale = Math.max(0.5, Math.min(5, scale + delta))
  setScale(newScale)
 }

 const handleMouseDown = (e) => {
  if (scale > 1) {
   setIsDragging(true)
   setDragStart({ x: e.clientX - position.x, y: e.clientY - position.y })
  }
 }

 const handleMouseMove = (e) => {
  if (isDragging && scale > 1) {
   setPosition({
    x: e.clientX - dragStart.x,
    y: e.clientY - dragStart.y
   })
  }
 }

 const handleMouseUp = () => {
  setIsDragging(false)
 }

 const handleTouchStart = (e) => {
  if (e.touches.length === 2) {
   const touch1 = e.touches[0]
   const touch2 = e.touches[1]
   const distance = Math.hypot(touch2.clientX - touch1.clientX, touch2.clientY - touch1.clientY)
   imageRef.current.dataset.pinchStart = distance
   imageRef.current.dataset.pinchScale = scale
  } else if (e.touches.length === 1 && scale > 1) {
   setIsDragging(true)
   setDragStart({ x: e.touches[0].clientX - position.x, y: e.touches[0].clientY - position.y })
  }
 }

 const handleTouchMove = (e) => {
  if (e.touches.length === 2) {
   e.preventDefault()
   const touch1 = e.touches[0]
   const touch2 = e.touches[1]
   const distance = Math.hypot(touch2.clientX - touch1.clientX, touch2.clientY - touch1.clientY)
   const startDistance = parseFloat(imageRef.current.dataset.pinchStart)
   const startScale = parseFloat(imageRef.current.dataset.pinchScale)
   const delta = (distance - startDistance) / 100
   const newScale = Math.max(0.5, Math.min(5, startScale + delta))
   setScale(newScale)
  } else if (e.touches.length === 1 && isDragging && scale > 1) {
   e.preventDefault()
   setPosition({
    x: e.touches[0].clientX - dragStart.x,
    y: e.touches[0].clientY - dragStart.y
   })
  }
 }

 const handleTouchEnd = () => {
  setIsDragging(false)
 }

 const resetZoom = () => {
  setScale(1)
  setPosition({ x: 0, y: 0 })
 }

 useEffect(() => {
  const handleKey = (e) => {
   if (e.key === 'Escape') onClose()
  }
  document.addEventListener('keydown', handleKey)
  document.body.style.overflow = 'hidden'
  return () => {
   document.removeEventListener('keydown', handleKey)
   document.body.style.overflow = ''
  }
 }, [onClose])

  return (
   <div className="viewer-overlay" onClick={onClose} style={{ userSelect: 'none' }}>
    <button className="viewer-close" onClick={(e) => { e.stopPropagation(); onClose(); }}><X size={20} strokeWidth={2} /></button>
   <div
    className="viewer-image-container"
    onWheel={handleWheel}
    onMouseDown={handleMouseDown}
    onMouseMove={handleMouseMove}
    onMouseUp={handleMouseUp}
    onMouseLeave={handleMouseUp}
    onTouchStart={handleTouchStart}
    onTouchMove={handleTouchMove}
    onTouchEnd={handleTouchEnd}
   >
    <img
     ref={imageRef}
     className="viewer-image"
     src={src}
     alt=""
     style={{
      transform: `scale(${scale}) translate(${position.x / scale}px, ${position.y / scale}px)`,
      cursor: scale > 1 ? (isDragging ? 'grabbing' : 'grab') : 'default'
     }}
     onClick={(e) => e.stopPropagation()}
    />
   </div>
   {scale > 1 && (
     <button className="viewer-reset" onClick={(e) => { e.stopPropagation(); resetZoom(); }}><RotateCcw size={18} strokeWidth={2} /></button>
   )}
  </div>
 )
}
