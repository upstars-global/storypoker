function luminance(hex: string): number {
  const digits = hex.slice(1)
  const full = digits.length === 3 ? digits.replace(/./g, '$&$&') : digits
  const channels = [0, 2, 4].map(offset => {
    const value = Number.parseInt(full.slice(offset, offset + 2), 16) / 255
    return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4
  })
  return channels[0]! * 0.2126 + channels[1]! * 0.7152 + channels[2]! * 0.0722
}

export function colorContrast(foreground: string, background: string): number {
  const values = [luminance(foreground), luminance(background)].sort((a, b) => a - b)
  return (values[1]! + 0.05) / (values[0]! + 0.05)
}
