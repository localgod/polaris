export const useTheme = () => {
  const isDark = useState('theme-dark', () => false)

  const initTheme = () => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('theme')
      if (stored) {
        isDark.value = stored === 'dark'
      } else {
        isDark.value = window.matchMedia('(prefers-color-scheme: dark)').matches
      }
      applyTheme()
    }
  }

  const toggleTheme = () => {
    isDark.value = !isDark.value
    applyTheme()
    if (typeof window !== 'undefined') {
      localStorage.setItem('theme', isDark.value ? 'dark' : 'light')
    }
  }

  const applyTheme = () => {
    if (typeof document !== 'undefined') {
      if (isDark.value) {
        document.documentElement.classList.add('dark')
      } else {
        document.documentElement.classList.remove('dark')
      }
    }
  }

  return {
    isDark,
    initTheme,
    toggleTheme,
    applyTheme
  }
}
