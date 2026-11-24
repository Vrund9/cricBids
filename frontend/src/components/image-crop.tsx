'use client'

import { createContext, useCallback, useContext, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { RotateCw, ZoomIn, ZoomOut } from 'lucide-react'
import { cn } from '@/lib/cn'
import { Button, Modal } from './ui'

export interface CropOptions {
  title?: string
  /** Width ÷ height of the result: 1 for photos and logos, 16 / 9 for backgrounds */
  aspect?: number
  /** Guide drawn over the frame — the saved image is always the full rectangle */
  shape?: 'circle' | 'rounded' | 'rect'
  /** 'contain' lets the image be zoomed out past the frame (logos keep their edges, the rest stays transparent) */
  fit?: 'cover' | 'contain'
  /** Longest side of the saved image in pixels */
  maxSize?: number
}

type CropFn = (file: File, opts?: CropOptions) => Promise<File | null>

const CropContext = createContext<CropFn>(async (file) => file)

/**
 * Lets people frame a photo before it's uploaded: `const file = await crop(picked, { aspect: 1 })`.
 * Resolves with the cropped file, or null when they cancel. Files the browser can't draw
 * (SVG, GIF, HEIC outside Safari) come back unchanged so the upload still works.
 */
export const useImageCrop = () => useContext(CropContext)

interface Job { file: File; url: string; img: HTMLImageElement; opts: CropOptions }

export function ImageCropProvider({ children }: { children: React.ReactNode }) {
  const [job, setJob] = useState<Job | null>(null)
  const resolver = useRef<((f: File | null) => void) | null>(null)

  const crop = useCallback<CropFn>(async (file, opts = {}) => {
    if (!/^image\/(jpeg|png|webp|avif|heic|heif|bmp)$/.test(file.type)) return file
    const url = URL.createObjectURL(file)
    const img = await loadImage(url)
    if (!img) {
      URL.revokeObjectURL(url)
      return file
    }
    resolver.current?.(null)
    setJob({ file, url, img, opts })
    return new Promise<File | null>((resolve) => {
      resolver.current = resolve
    })
  }, [])

  const close = (result: File | null) => {
    resolver.current?.(result)
    resolver.current = null
    setJob(null)
  }

  // Free the preview once the dialog has closed.
  useEffect(() => {
    if (!job) return
    return () => URL.revokeObjectURL(job.url)
  }, [job])

  return (
    <CropContext.Provider value={crop}>
      {children}
      <Modal open={!!job} onClose={() => close(null)} title={job?.opts.title ?? 'Adjust photo'} stacked>
        {job && <Cropper key={job.url} job={job} onCancel={() => close(null)} onDone={close} />}
      </Modal>
    </CropContext.Provider>
  )
}

function loadImage(url: string) {
  return new Promise<HTMLImageElement | null>((resolve) => {
    const img = new Image()
    img.onload = () => resolve(img.naturalWidth ? img : null)
    img.onerror = () => resolve(null)
    img.src = url
  })
}

const MAX_ZOOM = 4

function Cropper({ job, onCancel, onDone }: { job: Job; onCancel: () => void; onDone: (f: File) => void }) {
  const { img, file, opts } = job
  const aspect = opts.aspect ?? 1
  const shape = opts.shape ?? 'rounded'
  const contain = opts.fit === 'contain'

  const box = useRef<HTMLDivElement>(null)
  const [frameW, setFrameW] = useState(320)
  const frameH = frameW / aspect
  const [rotation, setRotation] = useState(0)
  const [zoom, setZoom] = useState(1)
  const [offset, setOffset] = useState({ x: 0, y: 0 })
  const [dragging, setDragging] = useState(false)
  const [saving, setSaving] = useState(false)

  // The frame fills the dialog's width (capped so square photos don't get huge on desktop).
  useLayoutEffect(() => {
    const el = box.current
    if (!el) return
    const measure = () => setFrameW(Math.min(el.clientWidth, aspect >= 1.4 ? 640 : 360))
    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(el)
    return () => ro.disconnect()
  }, [aspect])

  const turned = rotation % 180 !== 0
  const imgW = turned ? img.naturalHeight : img.naturalWidth
  const imgH = turned ? img.naturalWidth : img.naturalHeight
  const cover = Math.max(frameW / imgW, frameH / imgH)
  const fit = Math.min(frameW / imgW, frameH / imgH)
  // Zoom 1 is the smallest allowed size: just covering the frame, or the whole logo for 'contain'.
  const base = contain ? fit : cover
  const scale = base * zoom

  const clampOffset = useCallback((o: { x: number; y: number }, s = scale) => {
    const limX = Math.abs(imgW * s - frameW) / 2
    const limY = Math.abs(imgH * s - frameH) / 2
    return { x: Math.max(-limX, Math.min(limX, o.x)), y: Math.max(-limY, Math.min(limY, o.y)) }
  }, [scale, imgW, imgH, frameW, frameH])

  const setZoomKeep = useCallback((z: number) => {
    const next = Math.max(1, Math.min(MAX_ZOOM, z))
    setZoom(next)
    setOffset((o) => clampOffset({ x: o.x * next / zoom, y: o.y * next / zoom }, base * next))
  }, [zoom, base, clampOffset])

  // Keep the picture inside the frame when the frame resizes or the image turns.
  useEffect(() => setOffset((o) => clampOffset(o)), [clampOffset])

  // Drag to move, pinch with two fingers to zoom.
  const pointers = useRef(new Map<number, { x: number; y: number }>())
  const pinch = useRef<{ dist: number; zoom: number } | null>(null)
  const onPointerDown = (e: React.PointerEvent) => {
    e.currentTarget.setPointerCapture(e.pointerId)
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY })
    if (pointers.current.size === 2) {
      const [a, b] = [...pointers.current.values()]
      pinch.current = { dist: Math.hypot(a.x - b.x, a.y - b.y), zoom }
    }
    setDragging(true)
  }
  const onPointerMove = (e: React.PointerEvent) => {
    const prev = pointers.current.get(e.pointerId)
    if (!prev) return
    const now = { x: e.clientX, y: e.clientY }
    pointers.current.set(e.pointerId, now)
    if (pointers.current.size >= 2 && pinch.current) {
      const [a, b] = [...pointers.current.values()]
      setZoomKeep(pinch.current.zoom * Math.hypot(a.x - b.x, a.y - b.y) / pinch.current.dist)
      return
    }
    setOffset((o) => clampOffset({ x: o.x + now.x - prev.x, y: o.y + now.y - prev.y }))
  }
  const onPointerUp = (e: React.PointerEvent) => {
    pointers.current.delete(e.pointerId)
    if (pointers.current.size < 2) pinch.current = null
    if (!pointers.current.size) setDragging(false)
  }

  // Scroll wheel / trackpad zoom (needs a non-passive listener to stop the page scrolling).
  const frame = useRef<HTMLDivElement>(null)
  const zoomRef = useRef(setZoomKeep)
  zoomRef.current = setZoomKeep
  const zoomNow = useRef(zoom)
  zoomNow.current = zoom
  useEffect(() => {
    const el = frame.current
    if (!el) return
    const onWheel = (e: WheelEvent) => {
      e.preventDefault()
      zoomRef.current(zoomNow.current * Math.exp(-e.deltaY * 0.0025))
    }
    el.addEventListener('wheel', onWheel, { passive: false })
    return () => el.removeEventListener('wheel', onWheel)
  }, [])

  const onKeyDown = (e: React.KeyboardEvent) => {
    const step = e.shiftKey ? 40 : 10
    const moves: Record<string, [number, number]> = { ArrowLeft: [step, 0], ArrowRight: [-step, 0], ArrowUp: [0, step], ArrowDown: [0, -step] }
    if (moves[e.key]) {
      e.preventDefault()
      setOffset((o) => clampOffset({ x: o.x + moves[e.key][0], y: o.y + moves[e.key][1] }))
    } else if (e.key === '+' || e.key === '=') setZoomKeep(zoom * 1.15)
    else if (e.key === '-') setZoomKeep(zoom / 1.15)
  }

  const save = async () => {
    setSaving(true)
    try {
      // Keep the source's resolution: one frame pixel covers 1/scale image pixels.
      const longest = Math.min(opts.maxSize ?? 1200, Math.round(Math.max(frameW, frameH) / scale))
      const outW = Math.round(aspect >= 1 ? longest : longest * aspect)
      const outH = Math.round(outW / aspect)
      const canvas = document.createElement('canvas')
      canvas.width = outW
      canvas.height = outH
      const ctx = canvas.getContext('2d')!
      const keepAlpha = contain && /png|webp/.test(file.type)
      if (!keepAlpha) {
        ctx.fillStyle = '#ffffff'
        ctx.fillRect(0, 0, outW, outH)
      }
      ctx.imageSmoothingQuality = 'high'
      ctx.translate(outW / 2, outH / 2)
      ctx.scale(outW / frameW, outW / frameW)
      ctx.translate(offset.x, offset.y)
      ctx.rotate((rotation * Math.PI) / 180)
      ctx.scale(scale, scale)
      ctx.drawImage(img, -img.naturalWidth / 2, -img.naturalHeight / 2)
      const type = keepAlpha ? 'image/png' : 'image/jpeg'
      const blob = await new Promise<Blob | null>((r) => canvas.toBlob(r, type, 0.92))
      onDone(blob ? new File([blob], file.name.replace(/\.\w+$/, '') + (keepAlpha ? '.png' : '.jpg'), { type }) : file)
    } finally {
      setSaving(false)
    }
  }

  const rotate = () => {
    setRotation((r) => (r + 90) % 360)
    setZoom(1)
    setOffset({ x: 0, y: 0 })
  }

  return (
    <div className="space-y-4">
      <div ref={box} className="flex justify-center">
        <div
          ref={frame}
          tabIndex={0}
          role="application"
          aria-label="Crop area. Drag or use the arrow keys to move the picture, plus and minus to zoom."
          className={cn('relative touch-none select-none overflow-hidden bg-[repeating-conic-gradient(#1b2131_0_25%,#141926_0_50%)] bg-[length:20px_20px] outline-none focus-visible:ring-2 focus-visible:ring-lime-glow', dragging ? 'cursor-grabbing' : 'cursor-grab', shape === 'rect' ? 'rounded-xl' : 'rounded-2xl')}
          style={{ width: frameW, height: frameH }}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
          onKeyDown={onKeyDown}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={job.url}
            alt=""
            draggable={false}
            className="pointer-events-none absolute left-1/2 top-1/2 max-w-none"
            style={{ width: img.naturalWidth * scale, height: img.naturalHeight * scale, transform: `translate(-50%, -50%) translate(${offset.x}px, ${offset.y}px) rotate(${rotation}deg)` }}
          />
          {/* Shade outside the circle / rounded guide so people see what the avatar will show */}
          {shape !== 'rect' && (
            <div
              className={cn('pointer-events-none absolute inset-0', shape === 'circle' ? 'rounded-full' : 'rounded-[22%]')}
              style={{ boxShadow: '0 0 0 9999px rgba(8,11,19,0.55)', outline: '2px solid rgba(255,255,255,0.85)', outlineOffset: -2 }}
            />
          )}
          <div className={cn('pointer-events-none absolute inset-0 transition-opacity', dragging ? 'opacity-100' : 'opacity-0')}>
            {[1, 2].map((i) => (
              <div key={i}>
                <div className="absolute inset-y-0 w-px bg-white/40" style={{ left: `${(i * 100) / 3}%` }} />
                <div className="absolute inset-x-0 h-px bg-white/40" style={{ top: `${(i * 100) / 3}%` }} />
              </div>
            ))}
          </div>
        </div>
      </div>

      <p className="text-center text-xs text-ink-400">Drag to move · pinch or scroll to zoom</p>

      <div className="flex items-center gap-3">
        <Button type="button" variant="ghost" size="icon" onClick={() => setZoomKeep(zoom / 1.25)} disabled={zoom <= 1} aria-label="Zoom out">
          <ZoomOut className="h-4 w-4" />
        </Button>
        <input
          type="range"
          min={1}
          max={MAX_ZOOM}
          step={0.01}
          value={zoom}
          onChange={(e) => setZoomKeep(Number(e.target.value))}
          className="w-full accent-lime-glow"
          aria-label="Zoom"
        />
        <Button type="button" variant="ghost" size="icon" onClick={() => setZoomKeep(zoom * 1.25)} disabled={zoom >= MAX_ZOOM} aria-label="Zoom in">
          <ZoomIn className="h-4 w-4" />
        </Button>
        <Button type="button" variant="ghost" size="icon" onClick={rotate} aria-label="Rotate 90 degrees">
          <RotateCw className="h-4 w-4" />
        </Button>
      </div>

      <div className="flex justify-end gap-2">
        <Button type="button" variant="ghost" onClick={onCancel}>Cancel</Button>
        <Button type="button" onClick={save} loading={saving}>Use photo</Button>
      </div>
    </div>
  )
}
