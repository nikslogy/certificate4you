import React, { useState } from 'react';
import { HashRouter as Router, Route, Routes, NavLink } from 'react-router-dom';
import Home from './components/Home';
import ApiGuide from './components/ApiGuide';
import CertificateGenerator from './components/CertificateGenerator';
import CertificateVerifier from './components/CertificateVerifier';
import './App.css';

function App() {
  const [menuOpen, setMenuOpen] = useState(false);

  const toggleMenu = () => {
    setMenuOpen(!menuOpen);
  };

  const closeMenu = () => {
    setMenuOpen(false);
  };

  return (
    <Router>
      <div className="App">
        <nav className={`navbar ${menuOpen ? 'open' : ''}`}>
          <div className="navbar-logo">
            <NavLink to="/" onClick={closeMenu}>MyCertificate</NavLink>
          </div>
          <div className="navbar-toggle" onClick={toggleMenu}>
            <span></span>
            <span></span>
            <span></span>
          </div>
          <ul className={`navbar-links ${menuOpen ? 'open' : ''}`}>
            <li><NavLink to="/" onClick={closeMenu}>Home</NavLink></li>
            <li><NavLink to="/api-guide" onClick={closeMenu}>API Guide</NavLink></li>
            <li><NavLink to="/generate" onClick={closeMenu}>Generate Certificate</NavLink></li>
            <li><NavLink to="/verify" onClick={closeMenu}>Verify Certificate</NavLink></li>
          </ul>
        </nav>

        <main className="main-content">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/api-guide" element={<ApiGuide />} />
            <Route path="/generate" element={<CertificateGenerator />} />
            <Route path="/verify" element={<CertificateVerifier />} />
          </Routes>
        </main>
      </div>
    </Router>
  );
}

export default App;