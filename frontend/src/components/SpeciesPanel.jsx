import { useEffect, useRef, useState } from 'react'
import { ChevronDown, ExternalLink, Loader2, MapPin } from 'lucide-react'
import ImageWithFallback from './ImageWithFallback'
import EvidenceBadge from './EvidenceBadge'
import { getSpeciesDetail } from '../api'

function hasText(value) {
  return typeof value === 'string' && value.trim().length > 0
}

export default function SpeciesPanel({ candidate, highlight = false }) {
  const [species, setSpecies] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [showDetails, setShowDetails] = useState(false)
  const requestRef = useRef(0)

  useEffect(() => {
    const requestId = requestRef.current + 1
    requestRef.current = requestId

    setSpecies(null)
    setLoading(true)
    setError('')

    getSpeciesDetail(candidate.key)
      .then((data) => {
        if (requestRef.current === requestId) setSpecies(data)
      })
      .catch((requestError) => {
        if (requestRef.current !== requestId) return
        setError(requestError.message)
      })
      .finally(() => {
        if (requestRef.current === requestId) setLoading(false)
      })
  }, [candidate.key])

  const commonName = species?.commonName || candidate.commonName || candidate.key
  const scientificName = species?.scientificName || candidate.scientificName

  return (
    <article className={highlight ? 'species-panel species-panel-primary' : 'species-panel'}>
      <div className="species-panel-media">
        <ImageWithFallback
          src={species?.image?.url}
          alt={commonName}
          className="species-panel-image"
        />
      </div>

      <div className="species-panel-body">
        <div className="species-panel-heading">
          <h3>{commonName}</h3>
          {hasText(scientificName) && <p className="result-scientific-name">{scientificName}</p>}
          <EvidenceBadge evidence={candidate.evidence} />
        </div>

        {loading && (
          <div className="species-panel-loading">
            <Loader2 className="spin" size={18} /> Loading additional information&hellip;
          </div>
        )}

        {!loading && error && (
          <p className="species-panel-note">Additional information is temporarily unavailable.</p>
        )}

        {!loading && !error && species && (
          <>
            {hasText(species.description?.text) ? (
              <p className="species-panel-description">{species.description.text}</p>
            ) : (
              <p className="species-panel-note">No description available yet.</p>
            )}

            {hasText(species.distribution?.summary) && (
              <p className="species-panel-distribution">
                <MapPin size={14} /> {species.distribution.summary}
              </p>
            )}

            {species.image?.attribution && (
              <p className="species-panel-attribution">
                Photo: {species.image.attribution}
                {species.image.source ? ` · ${species.image.source}` : ''}
                {species.image.license ? ` · ${species.image.license}` : ''}
              </p>
            )}

            {Array.isArray(species.sources) && species.sources.length > 0 && (
              <div className="species-panel-sources">
                {species.sources.map((source) => (
                  <a key={source.url} href={source.url} target="_blank" rel="noreferrer">
                    {source.name} <ExternalLink size={12} />
                  </a>
                ))}
              </div>
            )}
          </>
        )}

        <button
          type="button"
          className="species-panel-toggle"
          onClick={() => setShowDetails((value) => !value)}
        >
          Why this match?
          <ChevronDown size={16} className={showDetails ? 'detail-acc-chevron open' : 'detail-acc-chevron'} />
        </button>

        {showDetails && (
          <dl className="species-panel-stats">
            <div>
              <dt>Matching traits</dt>
              <dd>{candidate.matches}</dd>
            </div>
            <div>
              <dt>Conflicting traits</dt>
              <dd>{candidate.conflicts}</dd>
            </div>
            <div>
              <dt>Observations used</dt>
              <dd>{candidate.knownEvidenceCount}</dd>
            </div>
            <div>
              <dt>Score</dt>
              <dd>{candidate.score}</dd>
            </div>
          </dl>
        )}
      </div>
    </article>
  )
}
