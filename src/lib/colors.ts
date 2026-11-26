export type Swatch = {
  id: string
  name: string
  hex: string
}

/** Compact named palette — visible like Skribbl, restrained like EFC. */
export const PALETTE: Swatch[] = [
  { id: 'black', name: 'Black', hex: '#111111' },
  { id: 'gray', name: 'Gray', hex: '#6b6b6b' },
  { id: 'white', name: 'White', hex: '#ffffff' },
  { id: 'lime', name: 'Lime', hex: '#00e168' },
  { id: 'red', name: 'Red', hex: '#d62828' },
  { id: 'orange', name: 'Orange', hex: '#f77f00' },
  { id: 'yellow', name: 'Yellow', hex: '#fcbf49' },
  { id: 'green', name: 'Green', hex: '#2a9d8f' },
  { id: 'blue', name: 'Blue', hex: '#0077b6' },
  { id: 'navy', name: 'Navy', hex: '#023e8a' },
  { id: 'purple', name: 'Purple', hex: '#5a189a' },
  { id: 'brown', name: 'Brown', hex: '#6f4e37' },
]

export const SIZE_PRESETS = [
  { id: 's', label: 'S', value: 4 },
  { id: 'm', label: 'M', value: 10 },
  { id: 'l', label: 'L', value: 18 },
  { id: 'xl', label: 'XL', value: 28 },
] as const
