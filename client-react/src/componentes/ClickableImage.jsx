import { useState } from 'react'
import './ClickableImage.css'

export function ClickableImage({ src, alt, onClick, style, className = '' }) {
 const [isPressed, setIsPressed] = useState(false)

 const handleMouseDown = () => setIsPressed(true)
 const handleMouseUp = () => setIsPressed(false)
 const handleMouseLeave = () => setIsPressed(false)
 const handleTouchStart = () => setIsPressed(true)
 const handleTouchEnd = () => setIsPressed(false)

 const handleClick = (e) => {
  setIsPressed(false)
  if (onClick) onClick(e)
 }

 return (
  <img
   src={src}
   alt={alt}
    className={`clickable-image clickable ${isPressed ? 'pressed' : ''} ${className}`}
   style={style}
   onMouseDown={handleMouseDown}
   onMouseUp={handleMouseUp}
   onMouseLeave={handleMouseLeave}
   onTouchStart={handleTouchStart}
   onTouchEnd={handleTouchEnd}
   onClick={handleClick}
  />
 )
}
