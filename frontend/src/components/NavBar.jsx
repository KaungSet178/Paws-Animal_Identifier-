import { Link, NavLink, useLocation } from 'react-router-dom'
import { PawPrint } from 'lucide-react'
import Wordmark from './Wordmark'

export default function NavBar() {
  const { pathname } = useLocation()

  return (
    <nav className="navbar">
      <Link to="/" className="navbar-brand">
        <span className="navbar-logo">
          <PawPrint size={22} strokeWidth={2.25} />
        </span>
        <Wordmark />
      </Link>
      <div className="navbar-links">
        <Link to="/identify" className={pathname.startsWith('/identify') ? 'nav-link active' : 'nav-link'}>
          Identify
        </Link>
        <NavLink to="/explore" className={({ isActive }) => (isActive ? 'nav-link active' : 'nav-link')}>
          Explore
        </NavLink>
      </div>
    </nav>
  )
}
