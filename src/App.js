import React, { useState, useEffect, useRef } from 'react';
import { HashRouter as Router, Route, Routes, NavLink } from 'react-router-dom';
import Home from './components/Home';
import ApiGuide from './components/ApiGuide';
import CertificateGenerator from './components/CertificateGenerator';
import CertificateVerifier from './components/CertificateVerifier';
import Pricing from './components/Pricing';
import ApiKeyGenerator from './components/ApiKeyGenerator';
import ContactUs from './components/ContactUs';
import Login from './components/Login';
import Signup from './components/Signup';
import Dashboard from './components/Dashboard';
import './App.css';
import './components/Auth.css';
import ProtectedRoute from './components/ProtectedRoute';

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    const token = localStorage.getItem('token');
    setIsAuthenticated(!!token);
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('token');
    setIsAuthenticated(false);
  };

  const toggleMenu = () => {
    setMenuOpen(!menuOpen);
  };

  const closeMenu = () => {
    setMenuOpen(false);
  };

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        closeMenu();
      }
    };

    if (menuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    } else {
      document.removeEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [menuOpen]);

  return (
    <Router>
      <div className="App">
        <nav className={`navbar ${menuOpen ? 'open' : ''}`} ref={menuRef}>
          <div className="navbar-logo">
            <NavLink to="/" onClick={closeMenu}>Certificate4You</NavLink>
          </div>
          <div className="navbar-toggle" onClick={toggleMenu}>
            <span></span>
            <span></span>
            <span></span>
          </div>
          <ul className={`navbar-links ${menuOpen ? 'open' : ''}`}>
            <li className="back-button" onClick={closeMenu}>
              <i className="fas fa-arrow-left"></i> Back
            </li>
            <li><NavLink to="/" onClick={closeMenu}>Home</NavLink></li>
            <li><NavLink to="/generate" onClick={closeMenu}>Generate Certificate</NavLink></li>
            <li><NavLink to="/api-guide" onClick={closeMenu}>API Guide</NavLink></li>
            <li><NavLink to="/pricing" onClick={closeMenu}>Pricing</NavLink></li>
            <li><NavLink to="/contact" onClick={closeMenu}>Contact</NavLink></li>
            {!isAuthenticated && (
              <>
                <li><NavLink to="/login" onClick={closeMenu}>Login</NavLink></li>
                <li><NavLink to="/signup" onClick={closeMenu}>Signup</NavLink></li>
              </>
            )}
            {isAuthenticated && (
              <>
                <li><NavLink to="/dashboard" onClick={closeMenu}>Dashboard</NavLink></li>
                <li><NavLink to="/" onClick={() => { handleLogout(); closeMenu(); }}>Logout</NavLink></li>
              </>
            )}
          </ul>
        </nav>

        <main className="main-content">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/api-guide" element={<ApiGuide />} />
            <Route path="/pricing" element={<Pricing />} />
            <Route path="/contact" element={<ContactUs />} />
            <Route path="/login" element={<Login setIsAuthenticated={setIsAuthenticated} />} />
            <Route path="/signup" element={<Signup />} />
            <Route path="/dashboard" element={<ProtectedRoute isAuthenticated={isAuthenticated}><Dashboard /></ProtectedRoute>} />
            <Route path="/api-key-generator" element={<ProtectedRoute isAuthenticated={isAuthenticated}><ApiKeyGenerator /></ProtectedRoute>} />
            <Route path="/generate" element={<CertificateGenerator />} />
            <Route path="/verify" element={<CertificateVerifier />} />
          </Routes>
        </main>
      </div>
    </Router>
  );
}

export default App;