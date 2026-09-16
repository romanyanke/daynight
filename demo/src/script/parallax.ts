// A barely-there drift shared by the backdrop layers: each one slides a little
// as the page scrolls, which reads as depth without ever pulling the eye away
// from the content.
//
// `travel` is a fraction of the viewport height, and it is spread across the
// whole scrollable length rather than applied per scrolled pixel: a fixed rate
// would use the layer's whole range up in the first screen or two and then sit
// still for the rest of a long page.
export function trackParallax(container: HTMLElement, travel: number) {
  let frame = 0

  const update = () => {
    frame = 0

    const scrollable = document.documentElement.scrollHeight - window.innerHeight
    const progress = scrollable > 0 ? Math.min(1, window.scrollY / scrollable) : 0
    // Stays inside the overhang the stylesheets reserve, so a layer never
    // slides off its own edge.
    const shift = window.innerHeight * travel * progress

    container.style.transform = `translate3d(0, ${(-shift).toFixed(1)}px, 0)`
  }

  window.addEventListener(
    'scroll',
    () => {
      // One write per frame, whatever the scroll device fires.
      if (!frame) frame = requestAnimationFrame(update)
    },
    { passive: true },
  )

  // The page grows as the map and the cards settle in, which moves the end of
  // the scroll range under us.
  window.addEventListener('resize', update, { passive: true })

  update()
}
