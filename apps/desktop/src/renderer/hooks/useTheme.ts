import { useState, useEffect, useCallback } from 'react'

type Theme = 'dark' | 'light' | 'system'

export function useTheme() {
  const [theme, setThemeState] = useState<Theme>('system')
  const [resolvedTheme, setResolvedTheme] = useState<'dark' | 'light'>('dark')

  // Load theme on mount
  useEffect(() => {
    const loadTheme = async () => {
      const saved = await window.clawhive.getTheme()
      setThemeState(saved as Theme)
    }
    loadTheme()
  }, [])

  // Apply theme and resolve system preference
  useEffect(() => {
    const root = document.documentElement

    const applyTheme = () => {
      const resolved =
        theme === 'system'
          ? window.matchMedia('(prefers-color-scheme: dark)').matches
            ? 'dark'
            : 'light'
          : theme

      root.classList.remove('dark', 'light')
      root.classList.add(resolved)
      setResolvedTheme(resolved)
    }

    applyTheme()

    // Listen to system preference changes
    if (theme === 'system') {
      const media = window.matchMedia('(prefers-color-scheme: dark)')
      const handler = () => applyTheme()
      media.addEventListener('change', handler)
      return () => media.removeEventListener('change', handler)
    }
  }, [theme])

  // Listen to theme changes from main process
  useEffect(() => {
    const cleanup = window.clawhive.onThemeChange((newTheme) => {
      setThemeState(newTheme as Theme)
    })
    return cleanup
  }, [])

  const setTheme = useCallback(async (newTheme: Theme) => {
    await window.clawhive.setTheme(newTheme)
    setThemeState(newTheme)
  }, [])

  return { theme, resolvedTheme, setTheme }
}
