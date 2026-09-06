import { useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Search } from 'lucide-react'
import SpeciesCard from '../components/SpeciesCard'
import SpeciesDetailModal from '../components/SpeciesDetailModal'
import BackToTop from '../components/BackToTop'
import { GROUP_META, GROUP_ORDER } from '../orderMeta'
import speciesData from '../data/species.json'
import useScrollReveal from '../useScrollReveal'

const GROUP_COUNTS = speciesData.reduce((acc, item) => {
  acc[item.group] = (acc[item.group] || 0) + 1
  return acc
}, {})

const TABS = GROUP_ORDER.filter((key) => GROUP_COUNTS[key])

export default function Explore() {
  const [searchParams] = useSearchParams()
  const initialGroup = searchParams.get('group') || 'all'

  const [activeGroup, setActiveGroup] = useState(
    TABS.includes(initialGroup) ? initialGroup : 'all',
  )
  const [searchText, setSearchText] = useState('')
  const [selectedKey, setSelectedKey] = useState(null)

  const filteredSpecies = useMemo(() => {
    const query = searchText.trim().toLowerCase()
    return speciesData.filter((item) => {
      const matchesGroup = activeGroup === 'all' || item.group === activeGroup
      const matchesQuery =
        !query ||
        item.commonName?.toLowerCase().includes(query) ||
        item.scientificName?.toLowerCase().includes(query)
      return matchesGroup && matchesQuery
    })
  }, [activeGroup, searchText])

  useScrollReveal([activeGroup, searchText])

  return (
    <div className="page explore-page">
      <header className="explore-hero reveal">
        <p className="explore-hero-greeting">
          Hello, Explorer <span className="explore-hero-wave">👋</span>
        </p>
        <h1 className="explore-hero-title">
          Explore the
          <span className="explore-hero-accent">Catalogue</span>
        </h1>
        <p className="explore-hero-sub">
          Browse every mammal on the Myanmar checklist &mdash; {speciesData.length} species in all.
        </p>
      </header>

      <div className="explore-tabs">
        <button
          type="button"
          className={activeGroup === 'all' ? 'explore-tab active' : 'explore-tab'}
          onClick={() => setActiveGroup('all')}
        >
          All ({speciesData.length})
        </button>
        {TABS.map((key) => (
          <button
            type="button"
            key={key}
            className={activeGroup === key ? 'explore-tab active' : 'explore-tab'}
            onClick={() => setActiveGroup(key)}
          >
            {GROUP_META[key].name} ({GROUP_COUNTS[key]})
          </button>
        ))}
      </div>

      <div className="explore-search-wrap">
        <div className="explore-search">
          <Search className="explore-search-icon" size={18} aria-hidden="true" />
          <input
            type="text"
            placeholder="Search by name..."
            value={searchText}
            onChange={(event) => setSearchText(event.target.value)}
          />
        </div>
      </div>

      {filteredSpecies.length > 0 ? (
        <div className="species-grid">
          {filteredSpecies.map((item) => (
            <SpeciesCard
              key={item.key}
              species={item}
              onLearnMore={setSelectedKey}
              className="reveal"
            />
          ))}
        </div>
      ) : (
        <p className="page-error">No species match the current filters.</p>
      )}

      {selectedKey && (
        <SpeciesDetailModal
          speciesList={filteredSpecies}
          initialKey={selectedKey}
          onClose={() => setSelectedKey(null)}
        />
      )}

      <BackToTop />
    </div>
  )
}
