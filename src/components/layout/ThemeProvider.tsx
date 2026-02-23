import { useEffect, type ReactNode } from 'react'
import { useAppSelector } from '@/store'

/** Convert a #rrggbb hex to [r, g, b] 0-255 */
function hexToRgb(hex: string): [number, number, number] | null {
  const m = hex.replace('#', '').match(/^([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i)
  if (!m) return null
  return [parseInt(m[1], 16), parseInt(m[2], 16), parseInt(m[3], 16)]
}

/** Convert RGB to HSL (S/L as 0-100) */
function rgbToHsl(r: number, g: number, b: number): [number, number, number] {
  r /= 255
  g /= 255
  b /= 255
  const max = Math.max(r, g, b),
    min = Math.min(r, g, b)
  let h = 0,
    s = 0
  const l = (max + min) / 2
  if (max !== min) {
    const d = max - min
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
    switch (max) {
      case r:
        h = ((g - b) / d + (g < b ? 6 : 0)) / 6
        break
      case g:
        h = ((b - r) / d + 2) / 6
        break
      case b:
        h = ((r - g) / d + 4) / 6
        break
    }
  }
  return [Math.round(h * 360), Math.round(s * 100), Math.round(l * 100)]
}

/** Generate a hex from HSL */
function hslToHex(h: number, s: number, l: number): string {
  s /= 100
  l /= 100
  const a = s * Math.min(l, 1 - l)
  const f = (n: number) => {
    const k = (n + h / 30) % 12
    const color = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1)
    return Math.round(255 * color)
      .toString(16)
      .padStart(2, '0')
  }
  return `#${f(0)}${f(8)}${f(4)}`
}

/**
 * Reads settings from Redux and applies CSS data attributes to <html>
 * so accent color, editor font, density, and theme tokens update globally.
 */
export default function ThemeProvider({ children }: { children: ReactNode }) {
  const { accentColor, customAccentHex, editorFont, uiDensity, uiTheme } = useAppSelector(
    s => s.settings
  )

  useEffect(() => {
    const root = document.documentElement
    root.setAttribute('data-accent', accentColor)
    root.setAttribute('data-editor-font', editorFont)
    root.setAttribute('data-density', uiDensity)
    root.setAttribute('data-theme', uiTheme)
  }, [accentColor, editorFont, uiDensity, uiTheme])

  // Apply custom accent color vars when in 'custom' mode
  useEffect(() => {
    if (accentColor !== 'custom') {
      // Remove any inline custom vars
      document.documentElement.style.removeProperty('--accent-400')
      document.documentElement.style.removeProperty('--accent-500')
      document.documentElement.style.removeProperty('--accent-600')
      document.documentElement.style.removeProperty('--accent-700')
      document.documentElement.style.removeProperty('--accent-glow')
      document.documentElement.style.removeProperty('--accent-glow-strong')
      return
    }
    const rgb = hexToRgb(customAccentHex)
    if (!rgb) return
    const [h, s, l] = rgbToHsl(...rgb)
    // Generate palette variants
    const c400 = hslToHex(h, s, Math.min(l + 18, 80))
    const c500 = customAccentHex
    const c600 = hslToHex(h, s, Math.max(l - 8, 20))
    const c700 = hslToHex(h, s, Math.max(l - 18, 12))
    const [r, g, b] = rgb
    const root = document.documentElement
    root.style.setProperty('--accent-400', c400)
    root.style.setProperty('--accent-500', c500)
    root.style.setProperty('--accent-600', c600)
    root.style.setProperty('--accent-700', c700)
    root.style.setProperty('--accent-glow', `rgba(${r},${g},${b},0.10)`)
    root.style.setProperty('--accent-glow-strong', `rgba(${r},${g},${b},0.22)`)
  }, [accentColor, customAccentHex])

  return <>{children}</>
}
