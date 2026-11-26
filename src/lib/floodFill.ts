/** Scanline flood fill on ImageData. Mutates in place. Returns whether any pixels changed. */
export function floodFill(
  imageData: ImageData,
  startX: number,
  startY: number,
  fillR: number,
  fillG: number,
  fillB: number,
  fillA = 255,
  tolerance = 32,
): boolean {
  const { width, height, data } = imageData
  const x0 = Math.floor(startX)
  const y0 = Math.floor(startY)
  if (x0 < 0 || y0 < 0 || x0 >= width || y0 >= height) return false

  const idx0 = (y0 * width + x0) * 4
  const tr = data[idx0]
  const tg = data[idx0 + 1]
  const tb = data[idx0 + 2]
  const ta = data[idx0 + 3]

  if (colorsMatch(tr, tg, tb, ta, fillR, fillG, fillB, fillA, 0)) return false

  const match = (i: number) =>
    colorsMatch(data[i], data[i + 1], data[i + 2], data[i + 3], tr, tg, tb, ta, tolerance)

  const stack: number[] = [x0, y0]
  while (stack.length) {
    const y = stack.pop()!
    let x = stack.pop()!
    let left = x
    while (left > 0 && match((y * width + left - 1) * 4)) left--
    let right = x
    while (right < width - 1 && match((y * width + right + 1) * 4)) right++

    for (let xi = left; xi <= right; xi++) {
      const i = (y * width + xi) * 4
      if (!match(i)) continue
      data[i] = fillR
      data[i + 1] = fillG
      data[i + 2] = fillB
      data[i + 3] = fillA

      if (y > 0 && match(((y - 1) * width + xi) * 4)) {
        stack.push(xi, y - 1)
      }
      if (y < height - 1 && match(((y + 1) * width + xi) * 4)) {
        stack.push(xi, y + 1)
      }
    }
  }
  return true
}

function colorsMatch(
  r1: number,
  g1: number,
  b1: number,
  a1: number,
  r2: number,
  g2: number,
  b2: number,
  a2: number,
  tolerance: number,
) {
  return (
    Math.abs(r1 - r2) <= tolerance &&
    Math.abs(g1 - g2) <= tolerance &&
    Math.abs(b1 - b2) <= tolerance &&
    Math.abs(a1 - a2) <= tolerance
  )
}

export function hexToRgba(hex: string): [number, number, number, number] {
  const h = hex.replace('#', '')
  const full = h.length === 3 ? h.split('').map((c) => c + c).join('') : h
  const n = parseInt(full, 16)
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255, 255]
}
