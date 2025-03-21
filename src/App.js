// src/App.js
import React, { useState, useEffect, useRef } from 'react';
import { HashRouter as Router, Route, Routes, NavLink, Navigate } from 'react-router-dom';
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
import MyAccount from './components/MyAccount';
import Settings from './components/Settings';
import PublicRoute from './components/PublicRoute';
import userIcon from './assets/user.png';
import AICertificateGenerator from './components/AICertificateGenerator';
import BulkCertificateGenerator from './components/BulkCertificateGenerator';
import TemplateEditor from './components/TemplateEditor';
import TemplateManagement from './components/TemplateManagement';

// Add CSS for Template Editor
import './components/TemplateEditor.css';
import './components/TemplateManagement.css';

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    const token = localStorage.getItem('token');
    setIsAuthenticated(!!token);

    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setMenuOpen(false);
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
    setMenuOpen(false);
  };

  const toggleMenu = () => {
    setMenuOpen(!menuOpen);
  };

  return (
    <Router>
      <div className="App">
        <nav className={`navbar ${menuOpen ? 'open' : ''}`}>
          <div className="navbar-container">
            <NavLink to="/" className="navbar-logo" onClick={() => setMenuOpen(false)}>
              Certificate4You
            </NavLink>
            {isAuthenticated ? (
              <div className="menu-container" ref={menuRef}>
                <button onClick={toggleMenu} className="menu-button">
                  <img src={userIcon} alt="Menu" className="user-icon" />
                </button>
                {menuOpen && (
                  <ul className="menu-dropdown">
                    <div className="menu-section">
                      <div className="menu-section-title">Navigation</div>
                      <li><NavLink to="/" onClick={() => setMenuOpen(false)}>Home</NavLink></li>
                      <li><NavLink to="/dashboard" onClick={() => setMenuOpen(false)}>Dashboard</NavLink></li>
                    </div>
                    <div className="menu-section">
                      <div className="menu-section-title">Certificate Actions</div>
                      <li><NavLink to="/generate" onClick={() => setMenuOpen(false)}>Generate</NavLink></li>
                      <li><NavLink to="/bulk-generate" onClick={()=>setMenuOpen(false)}>Bulk Generate</NavLink></li>
                      <li><NavLink to="/verify" onClick={() => setMenuOpen(false)}>Verify</NavLink></li>
                      <li><NavLink to="/ai-generate" onClick={() => setMenuOpen(false)}>AI Generate</NavLink></li>
                      <li><NavLink to="/templates" onClick={() => setMenuOpen(false)}>My Templates</NavLink></li>
                    </div>
                    <div className="menu-section">
                      <div className="menu-section-title">Resources</div>
                      <li><NavLink to="/api-guide" onClick={() => setMenuOpen(false)}>API Guide</NavLink></li>
                      <li><NavLink to="/pricing" onClick={() => setMenuOpen(false)}>Pricing</NavLink></li>
                    </div>
                    <div className="menu-section">
                      <div className="menu-section-title">Account</div>
                      <li><NavLink to="/account" onClick={() => setMenuOpen(false)}>My Account</NavLink></li>
                      <li><NavLink to="/settings" onClick={() => setMenuOpen(false)}>Settings</NavLink></li>
                      <li><NavLink to="/" onClick={handleLogout}>Log Out</NavLink></li>
                    </div>
                  </ul>
                )}
              </div>
            ) : (
              <>
                <div className="navbar-toggle" onClick={toggleMenu}>
                  <span></span>
                  <span></span>
                  <span></span>
                </div>
                <ul className={`navbar-menu ${menuOpen ? 'open' : ''}`}>
                  <li><NavLink to="/" onClick={() => setMenuOpen(false)}>Home</NavLink></li>
                  <li><NavLink to="/generate" onClick={() => setMenuOpen(false)}>Generate</NavLink></li>
                  <li><NavLink to="/bulk-generate" onClick={() => setMenuOpen(false)}> Bulk Generate</NavLink></li>
                  <li><NavLink to="/verify" onClick={() => setMenuOpen(false)}>Verify</NavLink></li>
                  <li><NavLink to="/templates" onClick={() => setMenuOpen(false)}>My Templates</NavLink></li>
                  <li><NavLink to="/api-guide" onClick={() => setMenuOpen(false)}>API Guide</NavLink></li>
                  <li><NavLink to="/pricing" onClick={() => setMenuOpen(false)}>Pricing</NavLink></li>
                  <li><NavLink to="/contact" onClick={() => setMenuOpen(false)}>Contact</NavLink></li>
                  <li><NavLink to="/login" onClick={() => setMenuOpen(false)} className="btn btn-login">Login</NavLink></li>
                  <li><NavLink to="/signup" onClick={() => setMenuOpen(false)} className="btn btn-signup">Signup</NavLink></li>
                  <li><NavLink to="/ai-generate" onClick={() => setMenuOpen(false)} className="btn btn-ai-generate">✨AI Generate</NavLink></li>
                </ul>
              </>
            )}
          </div>
        </nav>

        <main className="main-content">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/api-guide" element={<ApiGuide />} />
            <Route path="/pricing" element={<Pricing />} />
            <Route path="/contact" element={<ContactUs />} />
            <Route 
              path="/login" 
              element={
                <PublicRoute isAuthenticated={isAuthenticated}>
                  <Login setIsAuthenticated={setIsAuthenticated} />
                </PublicRoute>
              } 
            />
            <Route 
              path="/signup" 
              element={
                <PublicRoute isAuthenticated={isAuthenticated}>
                  <Signup />
                </PublicRoute>
              } 
            />
            <Route path="/dashboard" element={<ProtectedRoute isAuthenticated={isAuthenticated}><Dashboard /></ProtectedRoute>} />
            <Route path="/api-key-generator" element={<ProtectedRoute isAuthenticated={isAuthenticated}><ApiKeyGenerator /></ProtectedRoute>} />
            <Route path="/generate" element={<CertificateGenerator />} />
            <Route path="/bulk-generate" element={<BulkCertificateGenerator />} />
            <Route path="/ai-generate" element={<AICertificateGenerator />} />
            <Route path="/verify" element={<CertificateVerifier />} />
            
            {/* Template Editor Routes */}
            <Route path="/templates" element={<TemplateManagement />} />
            <Route path="/templates/new" element={<TemplateEditor />} />
            <Route path="/templates/edit/:id" element={<TemplateEditor />} />
            
            <Route path="/account" element={<ProtectedRoute isAuthenticated={isAuthenticated}><MyAccount /></ProtectedRoute>} />
            <Route path="/settings" element={<ProtectedRoute isAuthenticated={isAuthenticated}><Settings /></ProtectedRoute>} />
            {/* Catch-all route for authenticated users */}
            <Route path="*" element={isAuthenticated ? <Navigate to="/dashboard" /> : <Navigate to="/" />} />
          </Routes>
        </main>
        
        <footer className="app-footer">
          <div className="footer-content">
            <div className="footer-section">
              <h3>Certificate4You</h3>
              <p>Create, manage, and verify certificates with ease.</p>
            </div>
            <div className="footer-section">
              <h3>Quick Links</h3>
              <ul>
                <li><NavLink to="/">Home</NavLink></li>
                <li><NavLink to="/generate">Generate Certificate</NavLink></li>
                <li><NavLink to="/verify">Verify Certificate</NavLink></li>
                <li><NavLink to="/templates">My Templates</NavLink></li>
              </ul>
            </div>
            <div className="footer-section">
              <h3>Contact</h3>
              <p>Email: support@certificate4you.com</p>
              <p>Phone: +1 (555) 123-4567</p>
            </div>
          </div>
          <div className="footer-bottom">
            <p>&copy; {new Date().getFullYear()} Certificate4You. All rights reserved.</p>
          </div>
        </footer>
      </div>
    </Router>
  );
}

export default App;