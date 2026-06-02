import { useEffect, useRef } from 'react'

/**
 * Infinite auto-scroll with wheel/drag/touch inertia.
 *
 * Physics model adapted from the reference prototype:
 * - Auto-scrolls continuously at `getAutoSpeed()` px/sec (frame-rate independent).
 * - Mouse wheel injects an impulse into a velocity that decays by FRICTION each
 *   frame (real inertia / glide).
 * - Trackpad scrolls map 1:1 to offset (the OS already provides its own inertia),
 *   detected by small per-event deltas.
 * - Drag (mouse) and touch build velocity from movement, so releasing flings.
 * - After any interaction settles, auto-scroll resumes after RESUME_DELAY.
 *
 * The consumer owns layout: it provides the wrap period (`getWrapSpan`, the size
 * of the looped content block) and an optional per-frame callback. All option
 * callbacks are read through a ref, so changing speed/pause does NOT re-init.
 *
 * @param {object}   opts
 * @param {React.RefObject} opts.containerRef  element that receives the transform
 * @param {React.RefObject} [opts.listenerRef] element that receives input events (defaults to container's scroll parent or the container)
 * @param {'x'|'y'}  opts.axis
 * @param {() => number} opts.getAutoSpeed      auto-scroll speed in px/sec
 * @param {() => number} opts.getWrapSpan       period for the infinite wrap (px); 0 disables wrapping
 * @param {() => boolean} [opts.isPaused]       external pause (viewer open, hover, etc.)
 * @param {(offset:number) => void} [opts.onAfterFrame]  runs each frame after the transform
 * @param {React.MutableRefObject} [opts.controlsRef]   receives { resetOffset, getOffset }
 * @param {boolean}  [opts.enabled=true]
 * @param {Array}    [deps=[]]  structural deps that should re-init the loop
 */
export function useInertiaScroll(opts, deps = []) {
  // Latest-options ref: the RAF loop and event handlers read callbacks through
  // this, so changing speed/pause/wrap never re-inits the loop.
  const cb = useRef(opts)
  useEffect(() => { cb.current = opts })

  const {
    containerRef,
    listenerRef,
    axis = 'y',
    enabled = true,
    controlsRef,
  } = opts

  // Persistent physics state (survives re-renders, reset on re-init)
  const offset = useRef(0)
  const velocity = useRef(0)

  useEffect(() => {
    if (!enabled) return
    const container = containerRef.current
    if (!container) return
    const listener = listenerRef?.current || container

    // ─── tuneables ──────────────────────────────────────────
    const FRICTION = 0.92      // velocity decay per frame (~1s glide)
    const MIN_V = 0.15         // below this, velocity is considered zero
    const MAX_V = 28           // velocity cap
    const WHEEL_FACTOR = 0.10  // mouse-wheel impulse scale
    const TRACKPAD_FACTOR = 0.85
    const RESUME_DELAY = 1800  // ms after interaction before auto-scroll resumes
    const MOUSE_THRESH = 40    // |deltaPx| above this (and line mode) = mouse wheel
    const LINE_PX = 40
    const DRAG_SMOOTH = 0.6    // velocity smoothing on drag/touch

    let interacting = false
    let dragging = false
    let lastPos = 0
    let lastMoveT = 0
    let resumeTimer = null
    let rafId = null
    let lastFrameT = null

    container.style.willChange = 'transform'

    const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v))

    const wrap = () => {
      const span = cb.current.getWrapSpan() || 0
      if (span <= 0) return
      // Keep offset within (-span, 0]; jumps by a full period are invisible
      // because the content block is repeated.
      while (offset.current <= -span) offset.current += span
      while (offset.current > 0) offset.current -= span
    }

    const apply = () => {
      const v = offset.current
      container.style.transform =
        axis === 'x' ? `translate3d(${v}px,0,0)` : `translate3d(0,${v}px,0)`
    }

    const clearResume = () => { if (resumeTimer) { clearTimeout(resumeTimer); resumeTimer = null } }
    const scheduleResume = () => {
      clearResume()
      resumeTimer = setTimeout(() => { interacting = false }, RESUME_DELAY)
    }

    const tick = (ts) => {
      if (lastFrameT === null) lastFrameT = ts
      const dtMs = Math.min(ts - lastFrameT, 50)
      lastFrameT = ts

      if (Math.abs(velocity.current) > MIN_V) {
        // Inertia owns the motion
        offset.current += velocity.current
        velocity.current *= FRICTION
        if (Math.abs(velocity.current) <= MIN_V) {
          velocity.current = 0
          scheduleResume()
        }
      } else if (!interacting && !dragging && !(cb.current.isPaused?.() ?? false)) {
        // Auto-scroll (frame-rate independent)
        offset.current -= (cb.current.getAutoSpeed() * dtMs) / 1000
      }

      wrap()
      apply()
      cb.current.onAfterFrame?.(offset.current)
      rafId = requestAnimationFrame(tick)
    }

    // ─── wheel ──────────────────────────────────────────────
    const onWheel = (e) => {
      e.preventDefault()
      let px = axis === 'x' ? (e.deltaX || e.deltaY) : e.deltaY
      if (e.deltaMode === 1) px *= LINE_PX
      if (e.deltaMode === 2) px *= (axis === 'x' ? container.offsetWidth : container.offsetHeight)

      const isMouse = e.deltaMode === 1 || Math.abs(px) >= MOUSE_THRESH
      interacting = true
      clearResume()

      if (isMouse) {
        const impulse = clamp(-px * WHEEL_FACTOR, -MAX_V, MAX_V)
        velocity.current = clamp(velocity.current + impulse, -MAX_V, MAX_V)
      } else {
        velocity.current = 0
        offset.current -= px * TRACKPAD_FACTOR
        scheduleResume()
      }
    }

    // ─── mouse drag ─────────────────────────────────────────
    const pos = (e) => (axis === 'x' ? e.clientX : e.clientY)

    const onMouseDown = (e) => {
      dragging = true
      interacting = true
      lastPos = pos(e)
      lastMoveT = performance.now()
      velocity.current = 0
      clearResume()
      e.preventDefault()
    }
    const onMouseMove = (e) => {
      if (!dragging) return
      const now = performance.now()
      const dt = Math.max(1, now - lastMoveT)
      const d = pos(e) - lastPos
      velocity.current = velocity.current * DRAG_SMOOTH + (d / dt * 16.67) * (1 - DRAG_SMOOTH)
      offset.current += d
      lastPos = pos(e)
      lastMoveT = now
    }
    const onMouseUp = () => {
      if (!dragging) return
      dragging = false
      if (Math.abs(velocity.current) <= MIN_V) { velocity.current = 0; scheduleResume() }
      // else: tick() drains the fling, then schedules resume
    }

    // ─── touch ──────────────────────────────────────────────
    const tpos = (e) => (axis === 'x' ? e.touches[0].clientX : e.touches[0].clientY)
    const onTouchStart = (e) => {
      dragging = true
      interacting = true
      lastPos = tpos(e)
      lastMoveT = performance.now()
      velocity.current = 0
      clearResume()
    }
    const onTouchMove = (e) => {
      e.preventDefault()
      const now = performance.now()
      const dt = Math.max(1, now - lastMoveT)
      const d = tpos(e) - lastPos
      velocity.current = velocity.current * DRAG_SMOOTH + (d / dt * 16.67) * (1 - DRAG_SMOOTH)
      offset.current += d
      lastPos = tpos(e)
      lastMoveT = now
    }
    const onTouchEnd = () => {
      dragging = false
      if (Math.abs(velocity.current) <= MIN_V) { velocity.current = 0; scheduleResume() }
    }

    listener.addEventListener('wheel', onWheel, { passive: false })
    listener.addEventListener('mousedown', onMouseDown)
    window.addEventListener('mousemove', onMouseMove)
    window.addEventListener('mouseup', onMouseUp)
    listener.addEventListener('touchstart', onTouchStart, { passive: false })
    listener.addEventListener('touchmove', onTouchMove, { passive: false })
    listener.addEventListener('touchend', onTouchEnd)

    if (controlsRef) {
      controlsRef.current = {
        resetOffset: (value = 0) => { offset.current = value; velocity.current = 0 },
        getOffset: () => offset.current,
      }
    }

    rafId = requestAnimationFrame(tick)

    return () => {
      if (rafId) cancelAnimationFrame(rafId)
      clearResume()
      listener.removeEventListener('wheel', onWheel)
      listener.removeEventListener('mousedown', onMouseDown)
      window.removeEventListener('mousemove', onMouseMove)
      window.removeEventListener('mouseup', onMouseUp)
      listener.removeEventListener('touchstart', onTouchStart)
      listener.removeEventListener('touchmove', onTouchMove)
      listener.removeEventListener('touchend', onTouchEnd)
      container.style.willChange = ''
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, axis, ...deps])
}
