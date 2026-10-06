import { useEffect, useState } from 'react'
import { getPreferredTheme, saveTheme, type Theme } from '../theme/theme'

interface ThemeToggleProps {
  className?: string
}

export default function ThemeToggle({ className = '' }: ThemeToggleProps) {
  const [theme, setTheme] = useState<Theme>(() => getPreferredTheme())
  useEffect(() => {
    const update = () => setTheme(document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light')
    window.addEventListener('cemtn-theme-change', update)
    return () => window.removeEventListener('cemtn-theme-change', update)
  }, [])
  const isDark = theme === 'dark'
  const buttonClassName = ['theme-toggle', className].filter(Boolean).join(' ')

  function toggleTheme() {
    const nextTheme: Theme = isDark ? 'light' : 'dark'
    setTheme(nextTheme)
    saveTheme(nextTheme)
  }

  return (
    <button
      className={buttonClassName}
      type="button"
      onClick={toggleTheme}
      aria-label={isDark ? 'Ativar modo claro' : 'Ativar modo escuro'}
      aria-pressed={isDark}
      title={isDark ? 'Modo claro' : 'Modo escuro'}
    >
      {isDark ? (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <circle cx="12" cy="12" r="4" />
          <path d="M12 2v2M12 20v2M4.93 4.93l1.42 1.42M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.42-1.42M17.66 6.34l1.41-1.41" />
        </svg>
      ) : (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M20.5 14.2A8.5 8.5 0 0 1 9.8 3.5 8.5 8.5 0 1 0 20.5 14.2Z" />
        </svg>
      )}
    </button>
  )
}
