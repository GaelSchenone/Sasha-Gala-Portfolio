import { useEffect, useRef } from 'react'

/**
 * InfiniteScroll - vertical or horizontal infinite auto-scroll with inertia.
 *
 * Props:
 * - axis: 'y' | 'x' (default 'y')
 * - speed: pixels per second for auto-scroll (default 30)
 * - friction: velocity decay per frame (default 0.92)
 * - resumeDelay: ms before auto-scroll resumes after interaction (default 2000)
 * - pause: external pause signal (default false)
 * - className: applied to the inner container
 * - style: applied to the inner container
 * - children: render 4 copies externally for seamless loop
 * - onScrollingChange?: (scrolling: boolean) => void
 */
export function InfiniteScroll({
  axis = 'y',
  speed = 30,
  friction = 0.92,
  resumeDelay = 2000,
  pause: externalPause = false,
  className = '',
  style = {},
  children,
  onScrollingChange,
}) {
  const outerRef = useRef(null)
  const innerRef = useRef(null)

  const speedRef = useRef(speed)
  const frictionRef = useRef(friction)
  const resumeDelayRef = useRef(resumeDelay)
  const externalPauseRef = useRef(externalPause)
  const onScrollingChangeRef = useRef(onScrollingChange)

  speedRef.current = speed
  frictionRef.current = friction
  resumeDelayRef.current = resumeDelay
  externalPauseRef.current = externalPause
  onScrollingChangeRef.current = onScrollingChange

  const state = useRef({
    offset: 0,
    velocity: 0,
    paused: false,
    manualPause: false,
    listSize: 0,
    containerSize: 0,
    rafId: null,
    lastTime: 0,
    resumeTimer: null,
    dragging: false,
    lastPos: 0,
    lastMoveT: 0,
  })

  const isY = axis === 'y'

  // Main animation + events effect — runs once, reads refs for props
  useEffect(() => {
    const s = state.current
    const outer = outerRef.current
    const inner = innerRef.current
    if (!outer || !inner) return

    const COPIES = 4
    const MIN_V = 0.15
    const MAX_V = 28
    const WHEEL_FACTOR = 0.10
    const MOUSE_THRESH = 40
    const LINE_PX = 40
    const PAGE_PX = 400

    const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v))

    const measureList = () => {
      s.listSize = isY ? inner.offsetHeight / COPIES : inner.offsetWidth / COPIES
      return s.listSize
    }

    const measureContainer = () => {
      s.containerSize = isY ? outer.clientHeight : outer.clientWidth
      return s.containerSize
    }

    const normalize = () => {
      if (!s.listSize) return
      const lowerBound = -(COPIES * s.listSize - s.containerSize)
      if (lowerBound >= -s.listSize) return
      while (s.offset < lowerBound) s.offset += s.listSize
      while (s.offset > -s.listSize) s.offset -= s.listSize
    }

    const applyTransform = () => {
      if (isY) {
        inner.style.transform = `translate3d(0,${s.offset}px,0)`
      } else {
        inner.style.transform = `translate3d(${s.offset}px,0,0)`
      }
    }

    const setPaused = (val) => {
      s.paused = val
      const cb = onScrollingChangeRef.current
      if (cb) cb(!val)
    }

    const scheduleResume = () => {
      clearTimeout(s.resumeTimer)
      s.resumeTimer = setTimeout(() => {
        if (!s.manualPause && !externalPauseRef.current) {
          setPaused(false)
        }
      }, resumeDelayRef.current)
    }

    const doPause = () => {
      setPaused(true)
    }

    // Init
    measureContainer()
    measureList()
    s.offset = -s.listSize
    applyTransform()

    // ResizeObserver
    const ro = new ResizeObserver((entries) => {
      for (const entry of entries) {
        if (entry.target === outer) {
          measureContainer()
        }
        if (entry.target === inner) {
          const oldSize = s.listSize
          measureList()
          if (oldSize && s.listSize && s.listSize !== oldSize) {
            const copyNum = Math.round(-s.offset / oldSize)
            s.offset = -copyNum * s.listSize
            normalize()
            applyTransform()
          }
        }
      }
    })
    ro.observe(outer)
    ro.observe(inner)

    // ── Animation loop ──────────────────────────────────────
    const tick = (timestamp) => {
      if (!s.lastTime) {
        s.lastTime = timestamp
        s.rafId = requestAnimationFrame(tick)
        return
      }

      const delta = Math.min(timestamp - s.lastTime, 50)
      s.lastTime = timestamp

      if (Math.abs(s.velocity) > MIN_V) {
        s.offset += s.velocity
        s.velocity *= frictionRef.current
        if (Math.abs(s.velocity) <= MIN_V) {
          s.velocity = 0
          if (!s.manualPause && !externalPauseRef.current) scheduleResume()
        }
      } else if (!s.paused && !externalPauseRef.current) {
        const movement = (speedRef.current * delta) / 1000
        s.offset -= movement
      }

      normalize()
      applyTransform()
      s.rafId = requestAnimationFrame(tick)
    }

    s.rafId = requestAnimationFrame(tick)

    // ── Wheel ────────────────────────────────────────────────
    const handleWheel = (e) => {
      e.preventDefault()

      let px = isY ? e.deltaY : (e.deltaX || e.deltaY)
      if (e.deltaMode === 1) px *= LINE_PX
      if (e.deltaMode === 2) px *= PAGE_PX

      const isMouse = e.deltaMode === 1 || Math.abs(px) >= MOUSE_THRESH

      s.manualPause = false
      doPause()

      if (isMouse) {
        const impulse = clamp(-px * WHEEL_FACTOR, -MAX_V, MAX_V)
        s.velocity = clamp(s.velocity + impulse, -MAX_V, MAX_V)
      } else {
        s.velocity = 0
        s.offset -= px * 0.85
        scheduleResume()
      }
    }

    // ── Mouse drag ───────────────────────────────────────────
    const getPos = (e) => isY ? e.clientY : e.clientX

    const handleMouseDown = (e) => {
      s.dragging = true
      s.lastPos = getPos(e)
      s.lastMoveT = performance.now()
      s.velocity = 0
      s.manualPause = false
      doPause()
      outer.style.cursor = 'grabbing'
      e.preventDefault()
    }

    const handleMouseMove = (e) => {
      if (!s.dragging) return
      const now = performance.now()
      const dt = Math.max(1, now - s.lastMoveT)
      const current = getPos(e)
      const dy = current - s.lastPos
      s.velocity = s.velocity * 0.6 + (dy / dt * 16.67) * 0.4
      s.offset += dy
      s.lastPos = current
      s.lastMoveT = now
      normalize()
      applyTransform()
    }

    const handleMouseUp = () => {
      if (!s.dragging) return
      s.dragging = false
      outer.style.cursor = 'grab'
      if (Math.abs(s.velocity) <= MIN_V) {
        s.velocity = 0
        scheduleResume()
      }
    }

    // ── Touch ────────────────────────────────────────────────
    const getTouchPos = (e) => isY ? e.touches[0].clientY : e.touches[0].clientX

    const handleTouchStart = (e) => {
      s.lastPos = getTouchPos(e)
      s.lastMoveT = performance.now()
      s.velocity = 0
      s.manualPause = false
      doPause()
    }

    const handleTouchMove = (e) => {
      e.preventDefault()
      const now = performance.now()
      const dt = Math.max(1, now - s.lastMoveT)
      const current = getTouchPos(e)
      const dy = current - s.lastPos
      s.velocity = s.velocity * 0.6 + (dy / dt * 16.67) * 0.4
      s.offset += dy
      s.lastPos = current
      s.lastMoveT = now
      normalize()
      applyTransform()
    }

    const handleTouchEnd = () => {
      if (Math.abs(s.velocity) <= MIN_V) {
        s.velocity = 0
        scheduleResume()
      }
    }

    // ── Bind events ──────────────────────────────────────────
    outer.addEventListener('wheel', handleWheel, { passive: false })
    outer.addEventListener('mousedown', handleMouseDown)
    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseup', handleMouseUp)
    outer.addEventListener('touchstart', handleTouchStart, { passive: true })
    outer.addEventListener('touchmove', handleTouchMove, { passive: false })
    outer.addEventListener('touchend', handleTouchEnd)

    return () => {
      if (s.rafId) cancelAnimationFrame(s.rafId)
      clearTimeout(s.resumeTimer)
      ro.disconnect()
      outer.removeEventListener('wheel', handleWheel)
      outer.removeEventListener('mousedown', handleMouseDown)
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
      outer.removeEventListener('touchstart', handleTouchStart)
      outer.removeEventListener('touchmove', handleTouchMove)
      outer.removeEventListener('touchend', handleTouchEnd)
    }
  }, [isY])

  // Sync external pause (viewer open, hover, etc.)
  useEffect(() => {
    const s = state.current
    if (externalPause) {
      clearTimeout(s.resumeTimer)
      s.paused = true
      s.velocity = 0
      const cb = onScrollingChangeRef.current
      if (cb) cb(false)
    } else if (!s.manualPause) {
      s.paused = false
      s.lastTime = 0
      const cb = onScrollingChangeRef.current
      if (cb) cb(true)
    }
  }, [externalPause])

  const outerStyle = {
    position: 'relative',
    overflow: 'hidden',
    cursor: 'grab',
    userSelect: 'none',
    width: '100%',
    height: '100%',
  }

  const innerStyle = {
    position: 'absolute',
    willChange: 'transform',
    display: isY ? undefined : 'flex',
    ...style,
  }

  return (
    <div ref={outerRef} style={outerStyle}>
      <div ref={innerRef} className={className} style={innerStyle}>
        {children}
      </div>
    </div>
  )
}
