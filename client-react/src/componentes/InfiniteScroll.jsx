import { useEffect, useRef } from 'react'

/**
 * InfiniteScroll - vertical or horizontal infinite auto-scroll with inertia.
 *
 * Props:
 * - axis: 'y' | 'x' (default 'y')
 * - speed: pixels per second for auto-scroll (default 30)
 * - friction: velocity decay per frame (default 0.92)
 * - resumeDelay: ms before auto-scroll resumes after interaction (default 1500)
 * - pause: external pause signal (default false)
 * - className: applied to the inner container
 * - style: applied to the inner container
 * - children: render 4 copies externally for seamless loop
 * - onScrollingChange?: (scrolling: boolean) => void
 * - onTick?: (offset: number, listSize: number) => void
 */
export function InfiniteScroll({
  axis = 'y',
  speed = 30,
  friction = 0.92,
  resumeDelay = 1500,
  pause: externalPause = false,
  className = '',
  style = {},
  children,
  onScrollingChange,
  onTick,
}) {
  const outerRef = useRef(null)
  const innerRef = useRef(null)

  const speedRef = useRef(speed)
  const frictionRef = useRef(friction)
  const resumeDelayRef = useRef(resumeDelay)
  const externalPauseRef = useRef(externalPause)
  const onScrollingChangeRef = useRef(onScrollingChange)
  const onTickRef = useRef(onTick)

  speedRef.current = speed
  frictionRef.current = friction
  resumeDelayRef.current = resumeDelay
  externalPauseRef.current = externalPause
  onScrollingChangeRef.current = onScrollingChange
  onTickRef.current = onTick

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
    touching: false,
    lastPos: 0,
    lastMoveT: 0,
    dirty: false,
    touchMoved: false,
  })

  const isY = axis === 'y'

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
    }

    const measureContainer = () => {
      s.containerSize = isY ? outer.clientHeight : outer.clientWidth
    }

    const normalize = () => {
      if (!s.listSize) return
      // Keep offset within [-listSize, -(2*listSize - containerSize)]
      // This guarantees at least one full copy is always visible on both
      // sides of the viewport, regardless of container/list size ratio.
      const upperBound = -s.listSize
      const lowerBound = -(COPIES * s.listSize - s.containerSize)
      if (lowerBound >= upperBound) {
        // Content fits in viewport — no scrolling possible
        s.offset = upperBound
        return
      }
      while (s.offset < lowerBound) s.offset += s.listSize
      while (s.offset > upperBound) s.offset -= s.listSize
    }

    // THE RULE: applyTransform() is called ONLY from the RAF tick.
    // Event handlers NEVER write to the DOM — they only
    // mutate s.offset / s.velocity and flag s.dirty = true.
    const applyTransform = () => {
      inner.style.transform = isY
        ? `translate3d(0,${s.offset}px,0)`
        : `translate3d(${s.offset}px,0,0)`
    }

    const setPaused = (val) => {
      s.paused = val
      onScrollingChangeRef.current?.(!val)
    }

    const scheduleResume = (delay = resumeDelayRef.current) => {
      clearTimeout(s.resumeTimer)
      s.resumeTimer = setTimeout(() => {
        if (!s.manualPause && !externalPauseRef.current) {
          setPaused(false)
          s.lastTime = 0
        }
      }, delay)
    }

    // ── Init ──────────────────────────────────────────────────
    measureContainer()
    measureList()
    s.offset = -s.listSize
    applyTransform()

    // ── ResizeObserver ────────────────────────────────────────
    const ro = new ResizeObserver((entries) => {
      for (const entry of entries) {
        if (entry.target === outer) {
          s.containerSize = isY ? entry.contentRect.height : entry.contentRect.width
        }
        if (entry.target === inner) {
          const oldSize = s.listSize
          s.listSize = (isY ? entry.contentRect.height : entry.contentRect.width) / COPIES
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

    // ── Animation loop ────────────────────────────────────────
    const tick = (timestamp) => {
      if (!s.lastTime) {
        s.lastTime = timestamp
        s.rafId = requestAnimationFrame(tick)
        return
      }

      const delta = Math.min(timestamp - s.lastTime, 50)
      s.lastTime = timestamp

      if (Math.abs(s.velocity) > MIN_V) {
        // Frame-rate independent friction: decays ~friction per 16.67ms frame
        const frictionPerMs = Math.pow(frictionRef.current, delta / 16.67)
        s.offset += s.velocity * (delta / 16.67)
        s.velocity *= frictionPerMs
        if (Math.abs(s.velocity) <= MIN_V) {
          s.velocity = 0
          if (!s.touching && !s.manualPause && !externalPauseRef.current) {
            scheduleResume(300)
          }
        }
        normalize()
        applyTransform()
        onTickRef.current?.(s.offset, s.listSize)
      } else if (s.dirty) {
        s.dirty = false
        normalize()
        applyTransform()
        onTickRef.current?.(s.offset, s.listSize)
      } else if (!s.paused && !externalPauseRef.current) {
        s.offset -= (speedRef.current * delta) / 1000
        normalize()
        applyTransform()
        onTickRef.current?.(s.offset, s.listSize)
      }

      s.rafId = requestAnimationFrame(tick)
    }

    s.rafId = requestAnimationFrame(tick)

    // ── Wheel ─────────────────────────────────────────────────
    const handleWheel = (e) => {
      e.preventDefault()
      let px = isY ? e.deltaY : (e.deltaX || e.deltaY)
      if (e.deltaMode === 1) px *= LINE_PX
      if (e.deltaMode === 2) px *= PAGE_PX

      const isMouse = e.deltaMode === 1 || Math.abs(px) >= MOUSE_THRESH

      s.manualPause = false
      setPaused(true)

      if (isMouse) {
        s.velocity = clamp(
          s.velocity + clamp(-px * WHEEL_FACTOR, -MAX_V, MAX_V),
          -MAX_V,
          MAX_V
        )
      } else {
        s.velocity = 0
        s.offset -= px * 0.85
        s.dirty = true
        scheduleResume()
      }
    }

    // ── Mouse drag ────────────────────────────────────────────
    const getPos = (e) => isY ? e.clientY : e.clientX

    const handleMouseDown = (e) => {
      s.touching = true
      s.lastPos = getPos(e)
      s.lastMoveT = performance.now()
      s.velocity = 0
      s.manualPause = false
      setPaused(true)
      outer.style.cursor = 'grabbing'
      e.preventDefault()
    }

    const handleMouseMove = (e) => {
      if (!s.touching) return
      const now = performance.now()
      const dt = Math.max(1, now - s.lastMoveT)
      const cur = getPos(e)
      const dy = cur - s.lastPos
      s.velocity = s.velocity * 0.4 + (dy / dt * 16.67) * 0.6
      s.offset += dy
      s.lastPos = cur
      s.lastMoveT = now
      s.dirty = true
    }

    const handleMouseUp = () => {
      if (!s.touching) return
      s.touching = false
      outer.style.cursor = 'grab'
      if (Math.abs(s.velocity) <= MIN_V) {
        s.velocity = 0
        scheduleResume()
      }
    }

    // ── Touch ─────────────────────────────────────────────────
    const getTouchPos = (e) => isY ? e.touches[0].clientY : e.touches[0].clientX

    const handleTouchStart = (e) => {
      s.touchMoved = false
      s.touching = true
      s.lastPos = getTouchPos(e)
      s.lastMoveT = performance.now()
      s.velocity = 0
      s.manualPause = false
      setPaused(true)
    }

    const handleTouchMove = (e) => {
      if (!s.touching) return
      const now = performance.now()
      const dt = Math.max(1, now - s.lastMoveT)
      const cur = getTouchPos(e)
      const dy = cur - s.lastPos
      // Only prevent scroll and start dragging after meaningful movement
      if (!s.touchMoved && Math.abs(dy) < 5) return
      s.touchMoved = true
      e.preventDefault()
      s.velocity = s.velocity * 0.4 + (dy / dt * 16.67) * 0.6
      s.offset += dy
      s.lastPos = cur
      s.lastMoveT = now
      s.dirty = true
    }

    const handleTouchEnd = () => {
      s.touching = false
      // If it was just a tap (no movement), let the click event fire naturally
      if (!s.touchMoved) {
        s.velocity = 0
        scheduleResume(100)
        return
      }
      if (Math.abs(s.velocity) <= MIN_V) {
        s.velocity = 0
        scheduleResume(300)
      }
    }

    // ── Bind events ───────────────────────────────────────────
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

  // Sync external pause
  useEffect(() => {
    const s = state.current
    if (externalPause) {
      clearTimeout(s.resumeTimer)
      s.paused = true
      s.velocity = 0
      onScrollingChangeRef.current?.(false)
    } else if (!s.manualPause) {
      s.paused = false
      s.lastTime = 0
      onScrollingChangeRef.current?.(true)
    }
  }, [externalPause])

  const outerStyle = {
    position: 'relative',
    overflow: 'hidden',
    cursor: 'grab',
    userSelect: 'none',
    touchAction: isY ? 'pan-x' : 'pan-y',
    width: '100%',
    height: '100%',
  }

  const innerStyle = {
    position: 'absolute',
    top: 0,
    left: 0,
    willChange: 'transform',
    display: isY ? undefined : 'flex',
    ...style,
    ...(isY ? {} : { height: '100%' }),
  }

  return (
    <div ref={outerRef} style={outerStyle}>
      <div ref={innerRef} className={className} style={innerStyle}>
        {children}
      </div>
    </div>
  )
}