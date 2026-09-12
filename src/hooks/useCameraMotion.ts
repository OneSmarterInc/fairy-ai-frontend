import { RefObject, useCallback, useEffect, useRef, useState } from 'react'

type MotionOffset = { x: number; y: number }

type DeviceOrientationWithPermission = typeof DeviceOrientationEvent & {
  requestPermission?: () => Promise<'granted' | 'denied'>
}

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value))

/**
 * Adds a lightweight AR-style parallax offset to the fairy.
 *
 * - Visual frame tracking works anywhere a camera stream works (desktop + mobile).
 * - Device orientation is blended in on supported mobile browsers for smoother tilt response.
 * - No frames leave the browser; the tiny grayscale samples are used only in memory.
 */
export function useCameraMotion(
  videoRef: RefObject<HTMLVideoElement | null>,
  stream: MediaStream | null,
  mirrored: boolean,
) {
  const [enabled, setEnabled] = useState(true)
  const [offset, setOffset] = useState<MotionOffset>({ x: 0, y: 0 })
  const [orientationPermission, setOrientationPermission] = useState<'unknown' | 'granted' | 'denied'>('unknown')

  const visualOffset = useRef<MotionOffset>({ x: 0, y: 0 })
  const orientationOffset = useRef<MotionOffset>({ x: 0, y: 0 })
  const baseline = useRef<{ beta: number; gamma: number } | null>(null)
  const animationFrame = useRef<number | null>(null)

  const publish = useCallback(() => {
    const target = {
      x: clamp(visualOffset.current.x + orientationOffset.current.x, -18, 18),
      y: clamp(visualOffset.current.y + orientationOffset.current.y, -14, 14),
    }
    setOffset((current) => ({
      x: current.x + (target.x - current.x) * 0.26,
      y: current.y + (target.y - current.y) * 0.26,
    }))
  }, [])

  const resetMotion = useCallback(() => {
    visualOffset.current = { x: 0, y: 0 }
    orientationOffset.current = { x: 0, y: 0 }
    baseline.current = null
    setOffset({ x: 0, y: 0 })
  }, [])

  const requestOrientationPermission = useCallback(async () => {
    if (typeof DeviceOrientationEvent === 'undefined') return false
    const Orientation = DeviceOrientationEvent as DeviceOrientationWithPermission

    if (typeof Orientation.requestPermission === 'function') {
      try {
        const result = await Orientation.requestPermission()
        setOrientationPermission(result)
        if (result === 'granted') baseline.current = null
        return result === 'granted'
      } catch {
        setOrientationPermission('denied')
        return false
      }
    }

    setOrientationPermission('granted')
    baseline.current = null
    return true
  }, [])

  const toggleMotion = useCallback(async () => {
    if (enabled) {
      setEnabled(false)
      resetMotion()
      return
    }
    setEnabled(true)
    await requestOrientationPermission()
  }, [enabled, requestOrientationPermission, resetMotion])

  // Device tilt/orientation. This is especially useful when the camera is on a phone/tablet.
  useEffect(() => {
    if (!enabled || typeof window === 'undefined' || typeof DeviceOrientationEvent === 'undefined') return

    const Orientation = DeviceOrientationEvent as DeviceOrientationWithPermission
    // iOS requires requestPermission() from a user gesture, so don't attach until granted there.
    if (typeof Orientation.requestPermission === 'function' && orientationPermission !== 'granted') return

    const onOrientation = (event: DeviceOrientationEvent) => {
      if (event.beta == null || event.gamma == null) return
      if (!baseline.current) {
        baseline.current = { beta: event.beta, gamma: event.gamma }
        if (orientationPermission === 'unknown') setOrientationPermission('granted')
        return
      }

      const gammaDelta = clamp(event.gamma - baseline.current.gamma, -35, 35)
      const betaDelta = clamp(event.beta - baseline.current.beta, -35, 35)

      // Inverse movement makes the fairy feel more like it occupies the scene than a HUD sticker.
      orientationOffset.current = {
        x: clamp(-gammaDelta * 0.20, -7, 7),
        y: clamp(-betaDelta * 0.14, -6, 6),
      }
      publish()
    }

    window.addEventListener('deviceorientation', onOrientation, { passive: true })
    return () => window.removeEventListener('deviceorientation', onOrientation)
  }, [enabled, orientationPermission, publish])

  // Lightweight global image-motion tracker. It estimates camera pan from small grayscale frames.
  useEffect(() => {
    if (!enabled || !stream) return
    const video = videoRef.current
    if (!video) return

    const canvas = document.createElement('canvas')
    const width = 64
    const height = 36
    canvas.width = width
    canvas.height = height
    const ctx = canvas.getContext('2d', { willReadFrequently: true })
    if (!ctx) return

    let previous: Uint8Array | null = null
    let stopped = false
    let lastSample = 0

    const grayscale = () => {
      ctx.drawImage(video, 0, 0, width, height)
      const rgba = ctx.getImageData(0, 0, width, height).data
      const gray = new Uint8Array(width * height)
      for (let p = 0, i = 0; p < gray.length; p += 1, i += 4) {
        gray[p] = (rgba[i] * 3 + rgba[i + 1] * 6 + rgba[i + 2]) / 10
      }
      return gray
    }

    const estimateShift = (current: Uint8Array, prev: Uint8Array) => {
      let bestDx = 0
      let bestDy = 0
      let bestScore = Number.POSITIVE_INFINITY
      let zeroScore = Number.POSITIVE_INFINITY
      const range = 3
      const margin = range + 4

      for (let dy = -range; dy <= range; dy += 1) {
        for (let dx = -range; dx <= range; dx += 1) {
          let score = 0
          let count = 0
          for (let y = margin; y < height - margin; y += 3) {
            for (let x = margin; x < width - margin; x += 3) {
              const a = current[y * width + x]
              const b = prev[(y - dy) * width + (x - dx)]
              score += Math.abs(a - b)
              count += 1
            }
          }
          const normalized = score / Math.max(1, count)
          if (dx === 0 && dy === 0) zeroScore = normalized
          if (normalized < bestScore) {
            bestScore = normalized
            bestDx = dx
            bestDy = dy
          }
        }
      }

      // Ignore tiny/ambiguous changes so sensor noise and blinking don't move the fairy.
      const improvement = zeroScore - bestScore
      if (improvement < 0.8 || bestScore > 42) return { dx: 0, dy: 0 }
      return { dx: bestDx, dy: bestDy }
    }

    const tick = (now: number) => {
      if (stopped) return
      animationFrame.current = requestAnimationFrame(tick)
      if (now - lastSample < 85 || video.readyState < HTMLMediaElement.HAVE_CURRENT_DATA) return
      lastSample = now

      try {
        const current = grayscale()
        if (previous) {
          const { dx, dy } = estimateShift(current, previous)
          if (dx || dy) {
            // The front-camera preview is mirrored in CSS, so mirror the horizontal motion too.
            const displayDx = mirrored ? -dx : dx
            visualOffset.current = {
              x: clamp(visualOffset.current.x + displayDx * 0.72, -13, 13),
              y: clamp(visualOffset.current.y + dy * 0.70, -10, 10),
            }
          } else {
            // Very gentle recentering keeps the fairy from drifting forever on noisy footage.
            visualOffset.current = {
              x: visualOffset.current.x * 0.992,
              y: visualOffset.current.y * 0.992,
            }
          }
          publish()
        }
        previous = current
      } catch {
        // A transient unreadable frame should not break the AR experience.
      }
    }

    animationFrame.current = requestAnimationFrame(tick)
    return () => {
      stopped = true
      previous = null
      if (animationFrame.current != null) cancelAnimationFrame(animationFrame.current)
    }
  }, [enabled, mirrored, publish, stream, videoRef])

  useEffect(() => {
    if (!stream) resetMotion()
  }, [resetMotion, stream])

  return {
    enabled,
    offset,
    orientationPermission,
    toggleMotion,
    requestOrientationPermission,
    resetMotion,
  }
}
