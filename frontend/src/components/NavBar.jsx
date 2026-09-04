import { Link, useLocation } from 'react-router-dom'
import { PawPrint } from 'lucide-react'

export default function NavBar() {
  const { pathname } = useLocation()

  return (
    <nav className="navbar">
      <Link to="/" className="navbar-brand">
        <span className="navbar-logo">
          <PawPrint size={22} strokeWidth={2.25} />
        </span>
        <span>
          Myanmar <span className="hero-accent">Mammal</span> ID
        </span>
      </Link>
      <div className="navbar-links">
        <Link to="/identify" className={pathname.startsWith('/identify') ? 'nav-link active' : 'nav-link'}>
          Identify
        </Link>
      </div>
    </nav>
  )
}
