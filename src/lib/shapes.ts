export type ShapeTool = 'line' | 'rect' | 'ellipse' | 'heart' | 'star' | 'cloud'

type Point = { x: number; y: number }

function normBox(from: Point, to: Point) {
  const x = Math.min(from.x, to.x)
  const y = Math.min(from.y, to.y)
  const w = Math.abs(to.x - from.x)
  const h = Math.abs(to.y - from.y)
  return { x, y, w, h }
}

/** Classic heart fitted into the drag bounding box. */
export function strokeHeart(ctx: CanvasRenderingContext2D, from: Point, to: Point) {
  const { x, y, w, h } = normBox(from, to)
  if (w < 1 || h < 1) return
  const top = y + h * 0.28
  ctx.beginPath()
  ctx.moveTo(x + w / 2, y + h)
  ctx.bezierCurveTo(x - w * 0.12, y + h * 0.62, x - w * 0.05, top, x + w * 0.25, top)
  ctx.bezierCurveTo(x + w * 0.4, top, x + w / 2, y + h * 0.38, x + w / 2, y + h * 0.48)
  ctx.bezierCurveTo(x + w / 2, y + h * 0.38, x + w * 0.6, top, x + w * 0.75, top)
  ctx.bezierCurveTo(x + w * 1.05, top, x + w * 1.12, y + h * 0.62, x + w / 2, y + h)
  ctx.closePath()
  ctx.stroke()
}

/** 5-point star fitted into the drag bounding box. */
export function strokeStar(ctx: CanvasRenderingContext2D, from: Point, to: Point) {
  const { x, y, w, h } = normBox(from, to)
  if (w < 1 || h < 1) return
  const cx = x + w / 2
  const cy = y + h / 2
  const outerX = w / 2
  const outerY = h / 2
  const innerX = outerX * 0.4
  const innerY = outerY * 0.4
  const spikes = 5
  ctx.beginPath()
  for (let i = 0; i < spikes * 2; i++) {
    const angle = (Math.PI / spikes) * i - Math.PI / 2
    const rx = i % 2 === 0 ? outerX : innerX
    const ry = i % 2 === 0 ? outerY : innerY
    const px = cx + Math.cos(angle) * rx
    const py = cy + Math.sin(angle) * ry
    if (i === 0) ctx.moveTo(px, py)
    else ctx.lineTo(px, py)
  }
  ctx.closePath()
  ctx.stroke()
}

/**
 * Thought-cloud / spiraly speech bubble: overlapping lobes with a spiral tail.
 * Fitted into the drag bounding box.
 */
export function strokeCloud(ctx: CanvasRenderingContext2D, from: Point, to: Point) {
  const { x, y, w, h } = normBox(from, to)
  if (w < 2 || h < 2) return

  const bodyH = h * 0.72
  const bodyY = y
  const cx = x + w / 2
  const cy = bodyY + bodyH / 2
  const rx = w * 0.46
  const ry = bodyH * 0.42

  ctx.beginPath()
  // Main overlapping cloud lobes
  ctx.ellipse(cx - rx * 0.35, cy + ry * 0.08, rx * 0.55, ry * 0.72, 0, 0, Math.PI * 2)
  ctx.ellipse(cx + rx * 0.32, cy + ry * 0.1, rx * 0.52, ry * 0.7, 0, 0, Math.PI * 2)
  ctx.ellipse(cx, cy - ry * 0.22, rx * 0.62, ry * 0.7, 0, 0, Math.PI * 2)
  ctx.ellipse(cx - rx * 0.05, cy + ry * 0.18, rx * 0.7, ry * 0.55, 0, 0, Math.PI * 2)
  ctx.stroke()

  // Spiraly thought-bubble tail (small circles trailing down-left)
  const tailX0 = x + w * 0.28
  const tailY0 = y + bodyH * 0.92
  const bubbles = [
    { r: Math.max(2, Math.min(w, h) * 0.07), dx: 0, dy: 0 },
    { r: Math.max(1.5, Math.min(w, h) * 0.045), dx: -w * 0.08, dy: h * 0.1 },
    { r: Math.max(1, Math.min(w, h) * 0.028), dx: -w * 0.14, dy: h * 0.18 },
  ]
  for (const b of bubbles) {
    ctx.beginPath()
    ctx.arc(tailX0 + b.dx, tailY0 + b.dy, b.r, 0, Math.PI * 2)
    ctx.stroke()
  }
}

export function strokeShape(
  ctx: CanvasRenderingContext2D,
  tool: ShapeTool,
  from: Point,
  to: Point,
) {
  if (tool === 'line') {
    ctx.beginPath()
    ctx.moveTo(from.x, from.y)
    ctx.lineTo(to.x, to.y)
    ctx.stroke()
    return
  }
  if (tool === 'rect') {
    ctx.strokeRect(from.x, from.y, to.x - from.x, to.y - from.y)
    return
  }
  if (tool === 'ellipse') {
    const rx = (to.x - from.x) / 2
    const ry = (to.y - from.y) / 2
    ctx.beginPath()
    ctx.ellipse(from.x + rx, from.y + ry, Math.abs(rx), Math.abs(ry), 0, 0, Math.PI * 2)
    ctx.stroke()
    return
  }
  if (tool === 'heart') {
    strokeHeart(ctx, from, to)
    return
  }
  if (tool === 'star') {
    strokeStar(ctx, from, to)
    return
  }
  if (tool === 'cloud') {
    strokeCloud(ctx, from, to)
  }
}

export function isShapeTool(tool: string): tool is ShapeTool {
  return (
    tool === 'line' ||
    tool === 'rect' ||
    tool === 'ellipse' ||
    tool === 'heart' ||
    tool === 'star' ||
    tool === 'cloud'
  )
}

/** Shapes that live in the shapes dropdown (not line). */
export function isMenuShapeTool(tool: string): boolean {
  return tool === 'rect' || tool === 'ellipse' || tool === 'heart' || tool === 'star' || tool === 'cloud'
}
