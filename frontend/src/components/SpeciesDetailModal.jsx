import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import SpeciesDetailCard from './SpeciesDetailCard'

const GAP = 40
const DRAG_THRESHOLD = 60

// Every detail card uses the same deep teal surface.
const CARD_RGB = '11, 54, 58'

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value))
}

export default function SpeciesDetailModal({ speciesList = [], initialKey, onClose }) {
  const list = speciesList.length ? speciesList : initialKey ? [{ key: initialKey }] : []

  const viewportRef = useRef(null)
  const [viewportWidth, setViewportWidth] = useState(0)
  const [current, setCurrent] = useState(() => {
    const found = list.findIndex((item) => item.key === initialKey)
    return found < 0 ? 0 : found
  })
  const [drag, setDrag] = useState(0)
  const [dragging, setDragging] = useState(false)
  const dragState = useRef(null)

  const slideWidth = viewportWidth
    ? Math.min(680, Math.round(viewportWidth * (viewportWidth < 640 ? 0.86 : 0.8)))
    : 680

  useLayoutEffect(() => {
    const node = viewportRef.current
    if (!node) return

    const measure = () => setViewportWidth(node.clientWidth)
    measure()

    const observer = new ResizeObserver(measure)
    observer.observe(node)
    return () => observer.disconnect()
  }, [])

  const go = useCallback(
    (next) => setCurrent(clamp(next, 0, list.length - 1)),
    [list.length],
  )

  useEffect(() => {
    const onKey = (event) => {
      if (event.key === 'Escape') onClose()
      if (event.key === 'ArrowLeft') go(current - 1)
      if (event.key === 'ArrowRight') go(current + 1)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [current, go, onClose])

  function handlePointerDown(event) {
    if (event.pointerType === 'mouse' && event.button !== 0) return
    dragState.current = {
      startX: event.clientX,
      startY: event.clientY,
      pointerId: event.pointerId,
      locked: false,
    }
  }

  function handlePointerMove(event) {
    const state = dragState.current
    if (!state) return

    const dx = event.clientX - state.startX
    const dy = event.clientY - state.startY

    if (!state.locked) {
      if (Math.abs(dx) < 8 || Math.abs(dx) <= Math.abs(dy)) return
      state.locked = true
      event.currentTarget.setPointerCapture(state.pointerId)
      setDragging(true)
    }

    setDrag(dx)
  }

  function handlePointerUp() {
    const state = dragState.current
    dragState.current = null
    setDragging(false)
    if (!state?.locked) return
    if (drag <= -DRAG_THRESHOLD) go(current + 1)
    else if (drag >= DRAG_THRESHOLD) go(current - 1)
    setDrag(0)
  }

  if (!list.length) return null

  // Show at most 3 dots: a sliding window centred on the current card.
  const MAX_DOTS = 3
  const dotStart =
    list.length <= MAX_DOTS ? 0 : clamp(current - 1, 0, list.length - MAX_DOTS)
  const visibleDots = list.slice(dotStart, dotStart + MAX_DOTS)

  const step = slideWidth + GAP
  const baseOffset = viewportWidth / 2 - slideWidth / 2
  const trackX = baseOffset - current * step + drag

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="detail-carousel" onClick={(event) => event.stopPropagation()}>
        <div
          className="detail-carousel-viewport"
          ref={viewportRef}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
        >
          <div
            className={dragging ? 'detail-carousel-track dragging' : 'detail-carousel-track'}
            style={{ transform: `translate3d(${trackX}px, 0, 0)`, gap: `${GAP}px` }}
          >
            {list.map((item, index) => {
              const position =
                index === current ? 'active' : index < current ? 'side side-left' : 'side side-right'

              return (
                <div
                  key={item.key}
                  className={`detail-carousel-slide ${position}`}
                  style={{
                    flexBasis: `${slideWidth}px`,
                    width: `${slideWidth}px`,
                    '--card-rgb': CARD_RGB,
                  }}
                  onClick={() => index !== current && go(index)}
                >
                  <SpeciesDetailCard
                    species={item}
                    shouldLoad={Math.abs(index - current) <= 1}
                    onClose={index === current ? onClose : undefined}
                  />
                </div>
              )
            })}
          </div>
        </div>

        {list.length > 1 && (
          <div className="detail-carousel-nav">
            <button
              type="button"
              className="detail-carousel-arrow"
              onClick={() => go(current - 1)}
              disabled={current === 0}
              aria-label="Previous species"
            >
              <ChevronLeft size={20} />
            </button>

            <div className="detail-carousel-dots">
              {visibleDots.map((item, offset) => {
                const index = dotStart + offset
                return (
                  <button
                    type="button"
                    key={item.key}
                    className={index === current ? 'detail-carousel-dot active' : 'detail-carousel-dot'}
                    onClick={() => go(index)}
                    aria-label={`Go to species ${index + 1} of ${list.length}`}
                  />
                )
              })}
            </div>

            <button
              type="button"
              className="detail-carousel-arrow"
              onClick={() => go(current + 1)}
              disabled={current === list.length - 1}
              aria-label="Next species"
            >
              <ChevronRight size={20} />
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
