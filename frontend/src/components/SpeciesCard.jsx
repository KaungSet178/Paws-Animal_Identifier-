import { useEffect, useRef, useState } from 'react'
import { Loader2 } from 'lucide-react'
import ImageWithFallback from './ImageWithFallback'
import { getSpeciesCardImage } from '../api'
import speciesImages from '../data/species-images.json'

function hasText(value) {
  return typeof value === 'string' && value.trim().length > 0
}

// Photos come from a pre-generated map (scripts/enrich-images.mjs). Anything not
// in that map is resolved live once the card scrolls into view, through a
// concurrency-limited queue so the grid never bursts the enrichment endpoint.
export default function SpeciesCard({ species, onLearnMore, className }) {
  const bundledImage = speciesImages[species.key] || null
  const [imageUrl, setImageUrl] = useState(bundledImage)
  const [visible, setVisible] = useState(false)
  const [loading, setLoading] = useState(false)
  const cardRef = useRef(null)

  useEffect(() => {
    const node = cardRef.current
    if (!node || visible || bundledImage) return undefined

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setVisible(true)
          observer.disconnect()
        }
      },
      { rootMargin: '200px' },
    )
    observer.observe(node)
    return () => observer.disconnect()
  }, [visible, bundledImage])

  useEffect(() => {
    if (!visible || bundledImage) return undefined
    let active = true
    setLoading(true)
    getSpeciesCardImage(species.key)
      .then((url) => {
        if (active) setImageUrl(url)
      })
      .catch(() => {
        if (active) setImageUrl(null)
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => {
      active = false
    }
  }, [visible, bundledImage, species.key])

  return (
    <article className={['species-card', className].filter(Boolean).join(' ')} ref={cardRef}>
      {loading && !imageUrl ? (
        <div className="species-card-image species-card-image-loading">
          <Loader2 className="spin" size={22} />
        </div>
      ) : (
        <ImageWithFallback
          src={imageUrl}
          alt={species.commonName}
          className="species-card-image"
        />
      )}
      <div className="species-card-body">
        <h3>{species.commonName || species.key}</h3>
        {hasText(species.scientificName) && (
          <p className="species-scientific-name">{species.scientificName}</p>
        )}
      </div>
      <button type="button" className="species-card-button" onClick={() => onLearnMore(species.key)}>
        Learn More
      </button>
    </article>
  )
}
