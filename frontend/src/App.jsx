import { Routes, Route } from 'react-router-dom'
import NavBar from './components/NavBar'
import Footer from './components/Footer'
import Home from './pages/Home'
import Identify from './pages/Identify'
import Explore from './pages/Explore'
import './App.css'

function App() {
  return (
    <>
      <NavBar />
      <main>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/identify" element={<Identify />} />
          <Route path="/explore" element={<Explore />} />
        </Routes>
      </main>
      <Footer />
    </>
  )
}

export default App
