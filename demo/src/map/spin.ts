// Dragging the globe. Pointer events cover mouse, touch and pen in one path,
// and a flick carries on spinning for a moment after the finger leaves --
// stopping dead the instant contact ends feels like the ball is glued down.
import { Rotation } from './projection'

/** Degrees of rotation per pixel dragged, at the globe's own size. */
const SENSITIVITY = 0.32

/** Per-frame decay of a flick, and the speed below which it is over. */
const FRICTION = 0.94
const STOPPED = 0.02

export interface Spin {
  rotation: Rotation
  /** True while a finger or button is down, or the flick is still running. */
  moving(): boolean
}

export const createSpin = (
  container: HTMLElement,
  onChange: () => void,
  prefersReducedMotion: boolean,
): Spin => {
  const rotation: Rotation = { lon: 0, lat: 18 }

  let pointer: number | null = null
  let lastX = 0
  let lastY = 0
  let velocityLon = 0
  let velocityLat = 0
  let coasting = 0

  const scale = () => (SENSITIVITY * 900) / Math.max(1, container.clientWidth)

  const turn = (dLon: number, dLat: number) => {
    rotation.lon = ((((rotation.lon + dLon) % 360) + 540) % 360) - 180
    // Past the pole the globe would turn inside out, so the tilt stops there.
    rotation.lat = Math.min(90, Math.max(-90, rotation.lat + dLat))
    onChange()
  }

  container.addEventListener('pointerdown', event => {
    if (pointer !== null) return

    pointer = event.pointerId
    lastX = event.clientX
    lastY = event.clientY
    velocityLon = 0
    velocityLat = 0
    cancelAnimationFrame(coasting)
    coasting = 0

    // Capture keeps the drag alive when the finger leaves the globe. It can
    // throw if the pointer is already gone, which must not cost us the drag
    // state that the rest of the handlers work from.
    try {
      container.setPointerCapture(pointer)
    } catch {}

    container.classList.add('map--held')
  })

  container.addEventListener('pointermove', event => {
    if (event.pointerId !== pointer) return

    const factor = scale()
    velocityLon = -(event.clientX - lastX) * factor
    velocityLat = (event.clientY - lastY) * factor
    lastX = event.clientX
    lastY = event.clientY

    turn(velocityLon, velocityLat)
  })

  const release = (event: PointerEvent) => {
    if (event.pointerId !== pointer) return

    pointer = null
    container.classList.remove('map--held')

    if (prefersReducedMotion) return

    const coast = () => {
      velocityLon *= FRICTION
      velocityLat *= FRICTION

      if (Math.abs(velocityLon) < STOPPED && Math.abs(velocityLat) < STOPPED) {
        coasting = 0
        return
      }

      turn(velocityLon, velocityLat)
      coasting = requestAnimationFrame(coast)
    }

    coast()
  }

  container.addEventListener('pointerup', release)
  container.addEventListener('pointercancel', release)

  // Arrow keys turn it too, for anyone not using a pointer.
  container.addEventListener('keydown', event => {
    const step = event.shiftKey ? 15 : 5

    switch (event.key) {
      case 'ArrowLeft':
        turn(-step, 0)
        break
      case 'ArrowRight':
        turn(step, 0)
        break
      case 'ArrowUp':
        turn(0, step)
        break
      case 'ArrowDown':
        turn(0, -step)
        break
      default:
        return
    }

    event.preventDefault()
  })

  return {
    rotation,
    moving: () => pointer !== null || coasting !== 0,
  }
}
