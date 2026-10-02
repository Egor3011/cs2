const cleanup = new WeakMap()

// Content is visible by default. Only supported, motion-enabled browsers reveal it.
export const reveal = {
  mounted(element, binding) {
    if (!window.IntersectionObserver || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    element.style.setProperty('--reveal-delay', `${Math.min(Number(binding.value) || 0, 120)}ms`)
    const observer = new IntersectionObserver((entries) => {
      if (entries.some(entry => entry.isIntersecting)) show()
    }, { threshold: 0.06, rootMargin: '0px 0px 32px 0px' })
    function show() {
      element.classList.add('is-visible')
      observer.disconnect()
      element.removeEventListener('focusin', show)
    }
    element.classList.add('reveal-pending')
    element.addEventListener('focusin', show)
    observer.observe(element)
    cleanup.set(element, () => {
      observer.disconnect()
      element.removeEventListener('focusin', show)
    })
  },
  unmounted(element) {
    cleanup.get(element)?.()
    cleanup.delete(element)
  },
}
