import { Link } from 'react-router-dom'
import { PawPrint } from 'lucide-react'

const YEAR = new Date().getFullYear()

export default function Footer() {
  return (
    <footer className="footer">
      <div className="footer-inner">
        <div className="footer-brand">
          <div className="footer-brand-mark">
            <span className="footer-logo">
              <PawPrint size={40} strokeWidth={2} />
            </span>
            <span className="footer-brand-name">
              Mammal <span className="hero-accent">ID</span>
            </span>
          </div>
          <p className="footer-tagline">
            A field guide that helps you identify Myanmar&rsquo;s wild mammals from what you
            can safely observe, powered by an explainable Prolog reasoning engine.
          </p>
          <p className="footer-note">
            Always keep a safe distance. Never approach, feed, or handle wild animals.
          </p>
        </div>

        <nav className="footer-columns" aria-label="Footer">
          <div className="footer-column">
            <h3>Identify</h3>
            <Link to="/identify">Start an identification</Link>
          </div>

          <div className="footer-column">
            <h3>Data Sources</h3>
            <a href="https://www.inaturalist.org" target="_blank" rel="noreferrer">
              iNaturalist
            </a>
            <a href="https://www.wikipedia.org" target="_blank" rel="noreferrer">
              Wikipedia
            </a>
            <a href="https://www.gbif.org" target="_blank" rel="noreferrer">
              GBIF
            </a>
          </div>
        </nav>
      </div>

      <div className="footer-bottom">
        <span>&copy; {YEAR} Myanmar Mammal ID</span>
        <span>For educational use. Not a substitute for professional wildlife advice.</span>
      </div>
    </footer>
  )
}
