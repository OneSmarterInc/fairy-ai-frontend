import { PointerEvent as ReactPointerEvent, WheelEvent, useMemo, useRef, useState } from 'react'
import type { AIAction, Character } from '../types'

type Point = { x: number, y: number }
type Props = { character: Character, action: AIAction | null, cameraOffset?: Point, onResetCameraMotion?: () => void, assetUrl?: string, isVideoAsset?: boolean }

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value))
const distance = (a: Point, b: Point) => Math.hypot(a.x - b.x, a.y - b.y)

export default function FairyOverlay({ character, action, cameraOffset = { x: 0, y: 0 }, onResetCameraMotion, assetUrl, isVideoAsset }: Props) {
  const [position, setPosition] = useState({ x: 50, y: 35 })
  const [scale, setScale] = useState(1)
  const pointers = useRef(new Map<number, Point>())
  const lastDrag = useRef<Point | null>(null)
  const pinch = useRef<{ distance: number, scale: number } | null>(null)

  const asset = (assetUrl || import.meta.env.VITE_FAIRY_ASSET_URL || character.avatar || '/assets/fairy.png').trim()
  const isVideo = isVideoAsset !== undefined ? isVideoAsset : /\.(webm|mp4)(?:[?#].*)?$/i.test(asset)

  const motionClass = useMemo(
    () => `fairy-motion fairy-${action?.animation || 'idle'} emotion-${action?.emotion || 'happy'}`,
    [action?.animation, action?.emotion],
  )

  const reset = () => {
    setPosition({ x: 50, y: 35 })
    setScale(1)
    onResetCameraMotion?.()
  }

  const onPointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    event.preventDefault()
    event.stopPropagation()
    event.currentTarget.setPointerCapture(event.pointerId)
    const point = { x: event.clientX, y: event.clientY }
    pointers.current.set(event.pointerId, point)
    const active = [...pointers.current.values()]
    if (active.length === 1) {
      lastDrag.current = point
      pinch.current = null
    } else if (active.length === 2) {
      pinch.current = { distance: Math.max(1, distance(active[0], active[1])), scale }
      lastDrag.current = null
    }
  }

  const onPointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (!pointers.current.has(event.pointerId)) return
    const next = { x: event.clientX, y: event.clientY }
    pointers.current.set(event.pointerId, next)
    const active = [...pointers.current.values()]

    if (active.length >= 2 && pinch.current) {
      const currentDistance = Math.max(1, distance(active[0], active[1]))
      setScale(clamp(pinch.current.scale * (currentDistance / pinch.current.distance), 0.3, 3.25))
      return
    }

    if (active.length === 1 && lastDrag.current) {
      const rect = event.currentTarget.parentElement?.getBoundingClientRect()
      if (!rect?.width || !rect?.height) return
      const dx = ((next.x - lastDrag.current.x) / rect.width) * 100
      const dy = ((next.y - lastDrag.current.y) / rect.height) * 100
      setPosition((current) => ({
        x: clamp(current.x + dx, 3, 97),
        y: clamp(current.y + dy, 5, 92),
      }))
      lastDrag.current = next
    }
  }

  const onPointerEnd = (event: ReactPointerEvent<HTMLDivElement>) => {
    pointers.current.delete(event.pointerId)
    pinch.current = null
    const active = [...pointers.current.values()]
    lastDrag.current = active.length === 1 ? active[0] : null
  }

  const onWheel = (event: WheelEvent<HTMLDivElement>) => {
    event.preventDefault()
    setScale((current) => clamp(current * (event.deltaY < 0 ? 1.08 : 0.92), 0.3, 3.25))
  }

  return (
    <div className="fairy-stage" aria-label={`${character.name} camera overlay`}>
      <div
        className="fairy-transform"
        style={{
          left: `${clamp(position.x + cameraOffset.x, 2, 98)}%`,
          top: `${clamp(position.y + cameraOffset.y, 3, 96)}%`,
          transform: `translate(-50%, -50%) scale(${scale})`,
        }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerEnd}
        onPointerCancel={onPointerEnd}
        onWheel={onWheel}
        onDoubleClick={reset}
        title="Drag to move · camera motion shifts the fairy · pinch or scroll to resize · double-click to reset"
      >
        <div className={motionClass}>
          {isVideo ? (
            <video src={asset} className="fairy-asset" autoPlay muted loop playsInline draggable={false} />
          ) : (
            <img src={asset} className="fairy-asset" alt={character.name} draggable={false} />
          )}
        </div>
      </div>
    </div>
  )
}
