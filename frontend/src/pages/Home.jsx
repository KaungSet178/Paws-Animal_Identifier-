import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowRight, Binoculars, Loader2, PawPrint, ScanSearch, ShieldCheck } from 'lucide-react'
import SafetyBanner from '../components/SafetyBanner'
import Wordmark from '../components/Wordmark'
import heroImage from '../assets/hero_image.jpg'
import { getHealth } from '../api'
import useScrollReveal from '../useScrollReveal'

export default function Home() {
  const navigate = useNavigate()
  const [backendReady, setBackendReady] = useState(null)

  useScrollReveal([backendReady])

  useEffect(() => {
    let active = true
    getHealth()
      .then(() => {
        if (active) setBackendReady(true)
      })
      .catch(() => {
        if (active) setBackendReady(false)
      })
    return () => {
      active = false
    }
  }, [])

  return (
    <div className="page">
      <header className="hero" style={{ backgroundImage: `url(${heroImage})` }}>
        <div className="hero-overlay">
          <p className="hero-eyebrow">Wildlife Field Guide</p>
          <h1>
            <Wordmark className="hero-wordmark" />
          </h1>
          <p className="hero-lookfor">
            <span className="hero-highlight">Identify</span> unfamiliar Myanmar mammals from
            observable <br />
            <span className="hero-highlight">characteristics</span> and receive a clear,
            explainable result.
          </p>

          <div className="hero-features">
            <div className="hero-feature">
              <span className="hero-feature-icon">
                <Binoculars size={20} />
              </span>
              <span>
                Guided
                <br />
                Questions
              </span>
            </div>
            <div className="hero-feature">
              <span className="hero-feature-icon">
                <ScanSearch size={20} />
              </span>
              <span>
                Explainable
                <br />
                Reasoning
              </span>
            </div>
            <div className="hero-feature">
              <span className="hero-feature-icon">
                <ShieldCheck size={20} />
              </span>
              <span>
                Safety
                <br />
                Guidance
              </span>
            </div>
            <div className="hero-feature">
              <span className="hero-feature-icon">
                <PawPrint size={20} />
              </span>
              <span>
                Growing
                <br />
                Checklist
              </span>
            </div>
          </div>

          {backendReady === false && (
            <p className="hero-warning">
              The identification service could not be reached. Make sure the backend is running.
            </p>
          )}
        </div>
      </header>

      <section className="category-section">
        <div className="category-intro reveal">
          <p className="category-eyebrow">How It Works</p>
          <h2>What did you see?</h2>
          <p className="category-subtitle">
            Answer a short, adaptive set of questions about size, colour, tail, ears, and how the
            animal moved. A Prolog reasoning engine narrows the possibilities down after every
            answer &mdash; there is no fixed number of questions, and you can always say
            &ldquo;Not sure&rdquo;.
          </p>
        </div>

        <button
          type="button"
          className="home-cta-card reveal"
          onClick={() => navigate('/identify')}
        >
          <span className="home-cta-card-icon">
            <ScanSearch size={26} />
          </span>
          <span className="home-cta-card-text">
            <strong>Begin Identification</strong>
            <span>Start answering questions about the animal you saw.</span>
          </span>
          <ArrowRight className="home-cta-card-arrow" size={22} />
        </button>

        <div className="how-it-works-grid">
          <div className="how-it-works-card reveal">
            <span className="how-it-works-step">1</span>
            <h3>Answer questions</h3>
            <p>Pick the option that best matches what you observed, one trait at a time.</p>
          </div>
          <div className="how-it-works-card reveal">
            <span className="how-it-works-step">2</span>
            <h3>Get a result</h3>
            <p>
              The engine stops as soon as it has enough evidence &mdash; sometimes in just a few
              questions.
            </p>
          </div>
          <div className="how-it-works-card reveal">
            <span className="how-it-works-step">3</span>
            <h3>Learn more</h3>
            <p>See a photo, description, and distribution details for the identified species.</p>
          </div>
        </div>

        {backendReady === null ? (
          <div className="page-loading">
            <Loader2 className="spin" size={24} />
          </div>
        ) : (
          <SafetyBanner
            className="safety-banner-centered reveal"
            text="Safety: Never approach, touch, or attempt to catch a wild animal to answer these questions. Observe from a safe distance."
          />
        )}
      </section>
    </div>
  )
}
