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
const userIcon = 'https://via.placeholder.com/150'; // Default user icon

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [showAccountMenu, setShowAccountMenu] = useState(false);
  const accountMenuRef = useRef(null);

  useEffect(() => {
    const token = localStorage.getItem('token');
    setIsAuthenticated(!!token);

    const handleClickOutside = (event) => {
      if (accountMenuRef.current && !accountMenuRef.current.contains(event.target)) {
        setShowAccountMenu(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('token');
    setIsAuthenticated(false);
  };

  const toggleMenu = () => {
    setMenuOpen(!menuOpen);
  };

  const toggleAccountMenu = () => {
    setShowAccountMenu(!showAccountMenu);
  };

  return (
    <Router>
      <div className="App">
        <nav className={`navbar ${menuOpen ? 'open' : ''}`}>
          <div className="navbar-container">
            <NavLink to="/" className="navbar-logo" onClick={() => setMenuOpen(false)}>
              Certificate4You
            </NavLink>
            <div className="navbar-toggle" onClick={toggleMenu}>
              <span></span>
              <span></span>
              <span></span>
            </div>
            <ul className={`navbar-menu ${menuOpen ? 'open' : ''}`}>
              <li><NavLink to="/" onClick={() => setMenuOpen(false)}>Home</NavLink></li>
              <li><NavLink to="/generate" onClick={() => setMenuOpen(false)}>Generate</NavLink></li>
              <li><NavLink to="/verify" onClick={() => setMenuOpen(false)}>Verify</NavLink></li>
              <li><NavLink to="/api-guide" onClick={() => setMenuOpen(false)}>API Guide</NavLink></li>
              <li><NavLink to="/pricing" onClick={() => setMenuOpen(false)}>Pricing</NavLink></li>
              <li><NavLink to="/contact" onClick={() => setMenuOpen(false)}>Contact</NavLink></li>
              {!isAuthenticated ? (
                <>
                  <li><NavLink to="/login" onClick={() => setMenuOpen(false)} className="btn btn-login">Login</NavLink></li>
                  <li><NavLink to="/signup" onClick={() => setMenuOpen(false)} className="btn btn-signup">Signup</NavLink></li>
                </>
              ) : (
                <>
                  <li><NavLink to="/dashboard" onClick={() => setMenuOpen(false)}>Dashboard</NavLink></li>
                  <li><NavLink to="/" onClick={() => { handleLogout(); setMenuOpen(false); }} className="btn btn-logout">Logout</NavLink></li>
                </>
              )}
              {isAuthenticated && (
                <li className="account-menu-container" ref={accountMenuRef}>
                  <button onClick={toggleAccountMenu} className="account-button">
                    <img src={userIcon} alt="User" className="user-icon" />
                  </button>
                  {showAccountMenu && (
                    <ul className="account-dropdown">
                      <li><NavLink to="/account" onClick={() => { setShowAccountMenu(false); setMenuOpen(false); }}>Account</NavLink></li>
                      <li><NavLink to="/settings" onClick={() => { setShowAccountMenu(false); setMenuOpen(false); }}>Settings</NavLink></li>
                      <li><NavLink to="/" onClick={() => { handleLogout(); setShowAccountMenu(false); setMenuOpen(false); }}>Log Out</NavLink></li>
                    </ul>
                  )}
                </li>
              )}
            </ul>
          </div>
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