const subtleTextContrastFix = (['primary', 'secondary', 'success', 'info', 'warning', 'error'] as const).map(color => ({
  color,
  variant: 'subtle' as const,
  class: `text-${color}-700 dark:text-${color}-300`
}))

export default defineAppConfig({
  ui: {
    card: {
      slots: {
        body: 'p-4 sm:p-4'
      }
    },
    tabs: {
      slots: {
        list: 'overflow-x-auto sm:overflow-visible',
        trigger: 'shrink-0 grow-0 whitespace-nowrap sm:grow sm:whitespace-normal'
      }
    },
    // `subtle` variant's default text color (text-{color}) only reaches ~3.3:1 contrast
    // against its 10%-opacity background tint — below the WCAG AA 4.5:1 minimum for text.
    // Darken the text a couple of shades while keeping the same background/ring.
    badge: {
      compoundVariants: subtleTextContrastFix
    },
    alert: {
      compoundVariants: subtleTextContrastFix.map(({ color, variant, class: cls }) => ({
        color,
        variant,
        class: { root: cls }
      }))
    }
  }
})
