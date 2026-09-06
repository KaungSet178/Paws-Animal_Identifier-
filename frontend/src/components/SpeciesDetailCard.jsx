import { useEffect, useRef, useState } from 'react'
import { X, ExternalLink, Loader2, PawPrint } from 'lucide-react'
import ImageWithFallback from './ImageWithFallback'
import { groupName } from '../orderMeta'
import { getSpeciesDetail } from '../api'

function hasText(value) {
  return typeof value === 'string' && value.trim().length > 0
}

export default function SpeciesDetailCard({ species, shouldLoad = true, onClose }) {
  const speciesKey = species.key
  const [enriched, setEnriched] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const requestRef = useRef(0)

  useEffect(() => {
    if (!shouldLoad) return undefined

    const requestId = requestRef.current + 1
    requestRef.current = requestId

    setEnriched(null)
    setLoading(true)
    setError('')

    getSpeciesDetail(speciesKey)
      .then((data) => {
        if (requestRef.current === requestId) setEnriched(data)
      })
      .catch((requestError) => {
        if (requestRef.current !== requestId) return
        setError(requestError.message)
      })
      .finally(() => {
        if (requestRef.current === requestId) {
          setLoading(false)
        }
      })

    return () => {
      if (requestRef.current === requestId) {
        requestRef.current += 1
      }
    }
  }, [speciesKey, shouldLoad])

  const commonName = enriched?.commonName || species.commonName || species.key
  const scientificName = enriched?.scientificName || species.scientificName
  const traits = Array.isArray(species.traits) ? species.traits : []

  const taxonomy = [
    ['Order', species.order],
    ['Family', species.family],
    ['Genus', species.genus],
  ].filter(([, value]) => hasText(value))

  return (
    <div className="detail-card" onClick={(event) => event.stopPropagation()}>
      {onClose && (
        <button type="button" className="detail-close" onClick={onClose} aria-label="Close">
          <X size={18} />
        </button>
      )}

      <span className="detail-badge">
        <PawPrint size={15} strokeWidth={2.25} />
        {groupName(species.group)}
      </span>

      <div className="detail-media" aria-hidden="true">
        {shouldLoad && loading ? (
          <div className="detail-media-loading">
            <Loader2 className="spin" size={26} />
          </div>
        ) : (
          <ImageWithFallback
            src={enriched?.image?.url}
            alt=""
            className="detail-media-img"
          />
        )}
      </div>

      <div className="detail-scroll">
        <div className="detail-glass">
          <div className="detail-heading">
            <h2>{commonName}</h2>
            {hasText(scientificName) && <p className="detail-scientific">{scientificName}</p>}
          </div>

          {taxonomy.length > 0 && (
            <div className="detail-stats">
              {taxonomy.map(([label, value]) => (
                <div className="detail-stat" key={label}>
                  <div>
                    <span className="detail-stat-label">{label}</span>
                    <span className="detail-stat-value">{value}</span>
                  </div>
                </div>
              ))}
            </div>
          )}

          {traits.length > 0 && (
            <div className="detail-traits">
              <p className="detail-traits-title">How to recognise it</p>
              <dl className="detail-traits-grid">
                {traits.map((trait) => (
                  <div className="detail-trait" key={trait.label + trait.value}>
                    <dt>{trait.label}</dt>
                    <dd>{trait.value}</dd>
                  </div>
                ))}
              </dl>
            </div>
          )}

          {shouldLoad && loading && (
            <div className="detail-inline-loading">
              <Loader2 className="spin" size={18} /> Loading photo &amp; description&hellip;
            </div>
          )}

          {shouldLoad && !loading && error && (
            <p className="detail-inline-note">Photo and description are temporarily unavailable.</p>
          )}

          {shouldLoad && !loading && !error && enriched && (
            <>
              {hasText(enriched.description?.text) ? (
                <p className="detail-description">{enriched.description.text}</p>
              ) : (
                <p className="detail-inline-note">No description available yet.</p>
              )}

              {enriched.image?.attribution && (
                <p className="detail-attribution">
                  Photo: {enriched.image.attribution}
                  {enriched.image.source ? ` · ${enriched.image.source}` : ''}
                  {enriched.image.license ? ` · ${enriched.image.license}` : ''}
                </p>
              )}

              {Array.isArray(enriched.sources) && enriched.sources.length > 0 && (
                <div className="detail-sources">
                  {enriched.sources.map((source) => (
                    <a key={source.url} href={source.url} target="_blank" rel="noreferrer">
                      {source.name} <ExternalLink size={12} />
                    </a>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}
