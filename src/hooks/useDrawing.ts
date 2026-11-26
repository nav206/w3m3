import { useCallback, useEffect, useRef, useState } from 'react'
import { floodFill, hexToRgba } from '../lib/floodFill'

export type Tool = 'pen' | 'eraser' | 'fill' | 'line' | 'rect' | 'ellipse'

type Point = { x: number; y: number }

type Options = {
  tool: Tool
  color: string
  size: number
  onAnnounce?: (msg: string) => void
}

const MAX_HISTORY = 40

function imageDataHasMarks(image: ImageData): boolean {
  const { data } = image
  for (let i = 3; i < data.length; i += 4) {
    if (data[i] !== 0) return true
  }
  return false
}

export function useDrawing(options: Options) {
  const { tool, color, size, onAnnounce } = options
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const ctxRef = useRef<CanvasRenderingContext2D | null>(null)
  const drawingRef = useRef(false)
  const startRef = useRef<Point | null>(null)
  const lastRef = useRef<Point | null>(null)
  const snapshotRef = useRef<ImageData | null>(null)
  const historyRef = useRef<ImageData[]>([])
  const futureRef = useRef<ImageData[]>([])
  const sizeRef = useRef({ w: 0, h: 0, dpr: 1 })
  const toolRef = useRef(tool)
  const colorRef = useRef(color)
  const brushRef = useRef(size)
  const announceRef = useRef(onAnnounce)

  const [canUndo, setCanUndo] = useState(false)
  const [canRedo, setCanRedo] = useState(false)
  const [hasMarks, setHasMarks] = useState(false)

  toolRef.current = tool
  colorRef.current = color
  brushRef.current = size
  announceRef.current = onAnnounce

  const syncFlags = useCallback(() => {
    setCanUndo(historyRef.current.length > 0)
    setCanRedo(futureRef.current.length > 0)
  }, [])

  const getCtx = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return null
    if (!ctxRef.current) {
      ctxRef.current = canvas.getContext('2d', { willReadFrequently: true })
    }
    return ctxRef.current
  }, [])

  const applyBrush = useCallback(() => {
    const ctx = getCtx()
    if (!ctx) return
    const t = toolRef.current
    if (t === 'eraser') {
      ctx.globalCompositeOperation = 'destination-out'
      ctx.strokeStyle = 'rgba(0,0,0,1)'
      ctx.fillStyle = 'rgba(0,0,0,1)'
    } else {
      ctx.globalCompositeOperation = 'source-over'
      ctx.strokeStyle = colorRef.current
      ctx.fillStyle = colorRef.current
    }
    ctx.lineWidth = brushRef.current
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
  }, [getCtx])

  const resizeToDisplay = useCallback(
    (force = false) => {
      const canvas = canvasRef.current
      if (!canvas) return
      // Never wipe the bitmap while a stroke is in progress.
      if (drawingRef.current && !force) return

      const parent = canvas.parentElement
      if (!parent) return
      const rect = parent.getBoundingClientRect()
      const dpr = Math.min(window.devicePixelRatio || 1, 2)
      const w = Math.max(1, Math.floor(rect.width))
      const h = Math.max(1, Math.floor(rect.height))
      const prev = sizeRef.current

      if (!force && prev.w === w && prev.h === h && prev.dpr === dpr && canvas.width > 0) {
        return
      }

      const hadContent = canvas.width > 0 && canvas.height > 0
      const backup = hadContent ? canvas.toDataURL('image/png') : null

      canvas.width = Math.floor(w * dpr)
      canvas.height = Math.floor(h * dpr)
      // Keep CSS size via stylesheet (width/height 100%); don't fight layout.
      sizeRef.current = { w, h, dpr }

      // ImageData undo snapshots are tied to the previous bitmap size; discard them
      // so undo/redo cannot putImageData mismatched dimensions after a resize.
      historyRef.current = []
      futureRef.current = []
      snapshotRef.current = null
      syncFlags()

      const ctx = canvas.getContext('2d', { willReadFrequently: true })
      if (!ctx) return
      ctxRef.current = ctx
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      ctx.lineCap = 'round'
      ctx.lineJoin = 'round'

      if (backup && backup.length > 100) {
        const img = new Image()
        img.onload = () => {
          // Skip restore if a new stroke started while the image loaded.
          if (drawingRef.current) return
          ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
          ctx.clearRect(0, 0, w, h)
          ctx.drawImage(img, 0, 0, w, h)
        }
        img.src = backup
      }
    },
    [syncFlags],
  )

  useEffect(() => {
    resizeToDisplay(true)
    let raf = 0
    const schedule = () => {
      if (drawingRef.current) return
      cancelAnimationFrame(raf)
      raf = requestAnimationFrame(() => resizeToDisplay(false))
    }
    window.addEventListener('resize', schedule)
    const parent = canvasRef.current?.parentElement
    const ro =
      parent && typeof ResizeObserver !== 'undefined' ? new ResizeObserver(schedule) : null
    if (parent && ro) ro.observe(parent)
    return () => {
      window.removeEventListener('resize', schedule)
      cancelAnimationFrame(raf)
      ro?.disconnect()
    }
  }, [resizeToDisplay])

  const pushHistory = useCallback(() => {
    const canvas = canvasRef.current
    const ctx = getCtx()
    if (!canvas || !ctx) return
    const snap = ctx.getImageData(0, 0, canvas.width, canvas.height)
    historyRef.current.push(snap)
    if (historyRef.current.length > MAX_HISTORY) historyRef.current.shift()
    futureRef.current = []
    syncFlags()
  }, [getCtx, syncFlags])

  const pointerPos = (e: PointerEvent | React.PointerEvent<HTMLCanvasElement>): Point => {
    const canvas = canvasRef.current!
    const rect = canvas.getBoundingClientRect()
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    }
  }

  const drawShapePreview = (from: Point, to: Point) => {
    const canvas = canvasRef.current
    const ctx = getCtx()
    if (!canvas || !ctx || !snapshotRef.current) return
    ctx.putImageData(snapshotRef.current, 0, 0)
    const { dpr } = sizeRef.current
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    applyBrush()
    const t = toolRef.current
    if (t === 'line') {
      ctx.beginPath()
      ctx.moveTo(from.x, from.y)
      ctx.lineTo(to.x, to.y)
      ctx.stroke()
    } else if (t === 'rect') {
      ctx.strokeRect(from.x, from.y, to.x - from.x, to.y - from.y)
    } else if (t === 'ellipse') {
      const rx = (to.x - from.x) / 2
      const ry = (to.y - from.y) / 2
      ctx.beginPath()
      ctx.ellipse(from.x + rx, from.y + ry, Math.abs(rx), Math.abs(ry), 0, 0, Math.PI * 2)
      ctx.stroke()
    }
  }

  const onPointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current
    const ctx = getCtx()
    if (!canvas || !ctx) return
    e.preventDefault()
    canvas.setPointerCapture(e.pointerId)
    const p = pointerPos(e)
    const t = toolRef.current

    if (t === 'fill') {
      const { dpr } = sizeRef.current
      const img = ctx.getImageData(0, 0, canvas.width, canvas.height)
      const [r, g, b, a] = hexToRgba(colorRef.current)
      const filled = floodFill(img, p.x * dpr, p.y * dpr, r, g, b, a)
      if (!filled) return
      pushHistory()
      ctx.putImageData(img, 0, 0)
      setHasMarks(true)
      announceRef.current?.(`Filled with ${colorRef.current}`)
      return
    }

    pushHistory()
    drawingRef.current = true
    startRef.current = p
    lastRef.current = p

    if (t === 'pen' || t === 'eraser') {
      applyBrush()
      ctx.beginPath()
      ctx.moveTo(p.x, p.y)
      ctx.lineTo(p.x + 0.01, p.y + 0.01)
      ctx.stroke()
      setHasMarks(true)
    } else {
      snapshotRef.current = ctx.getImageData(0, 0, canvas.width, canvas.height)
    }
  }

  const onPointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!drawingRef.current) return
    e.preventDefault()
    const ctx = getCtx()
    if (!ctx) return
    const p = pointerPos(e)
    const t = toolRef.current

    if (t === 'pen' || t === 'eraser') {
      applyBrush()
      const last = lastRef.current
      if (last) {
        ctx.beginPath()
        ctx.moveTo(last.x, last.y)
        ctx.lineTo(p.x, p.y)
        ctx.stroke()
      }
      lastRef.current = p
    } else if (startRef.current) {
      drawShapePreview(startRef.current, p)
    }
  }

  const onPointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!drawingRef.current) return
    e.preventDefault()
    drawingRef.current = false
    const p = pointerPos(e)
    const t = toolRef.current
    if ((t === 'line' || t === 'rect' || t === 'ellipse') && startRef.current) {
      drawShapePreview(startRef.current, p)
      setHasMarks(true)
      announceRef.current?.(`${t} drawn`)
    }
    startRef.current = null
    lastRef.current = null
    snapshotRef.current = null
    const ctx = getCtx()
    if (ctx) ctx.globalCompositeOperation = 'source-over'
  }

  const undo = useCallback(() => {
    const canvas = canvasRef.current
    const ctx = getCtx()
    if (!canvas || !ctx || historyRef.current.length === 0) return
    const current = ctx.getImageData(0, 0, canvas.width, canvas.height)
    futureRef.current.push(current)
    const prev = historyRef.current.pop()!
    ctx.putImageData(prev, 0, 0)
    const { dpr } = sizeRef.current
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    setHasMarks(imageDataHasMarks(prev))
    syncFlags()
    announceRef.current?.('Undo')
  }, [getCtx, syncFlags])

  const redo = useCallback(() => {
    const canvas = canvasRef.current
    const ctx = getCtx()
    if (!canvas || !ctx || futureRef.current.length === 0) return
    const current = ctx.getImageData(0, 0, canvas.width, canvas.height)
    historyRef.current.push(current)
    const next = futureRef.current.pop()!
    ctx.putImageData(next, 0, 0)
    const { dpr } = sizeRef.current
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    setHasMarks(imageDataHasMarks(next))
    syncFlags()
    announceRef.current?.('Redo')
  }, [getCtx, syncFlags])

  const wipeCanvas = useCallback(() => {
    const canvas = canvasRef.current
    const ctx = getCtx()
    if (!canvas || !ctx) return
    const { w, h, dpr } = sizeRef.current
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    ctx.globalCompositeOperation = 'source-over'
    ctx.clearRect(0, 0, w || canvas.width, h || canvas.height)
  }, [getCtx])

  const clear = useCallback(() => {
    const canvas = canvasRef.current
    const ctx = getCtx()
    if (!canvas || !ctx) return
    pushHistory()
    wipeCanvas()
    setHasMarks(false)
    syncFlags()
    announceRef.current?.('Canvas cleared')
  }, [getCtx, pushHistory, syncFlags, wipeCanvas])

  const reset = useCallback(() => {
    wipeCanvas()
    historyRef.current = []
    futureRef.current = []
    drawingRef.current = false
    startRef.current = null
    lastRef.current = null
    snapshotRef.current = null
    setHasMarks(false)
    syncFlags()
    announceRef.current?.('New drawing started')
  }, [syncFlags, wipeCanvas])

  return {
    canvasRef,
    onPointerDown,
    onPointerMove,
    onPointerUp,
    undo,
    redo,
    clear,
    reset,
    canUndo,
    canRedo,
    hasMarks,
  }
}
