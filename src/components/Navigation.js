// src/components/Navigation.js
import React from 'react';
import { NavLink } from 'react-router-dom';
import './Navigation.css';

function Navigation() {
  return (
    <nav className="main-nav">
      <div className="logo">
        <h1>Certificate4You</h1>
      </div>
      <ul className="nav-links">
        <li>
          <NavLink to="/" end>
            Home
          </NavLink>
        </li>
        <li>
          <NavLink to="/generate">
            Generate Certificate
          </NavLink>
        </li>
        <li>
          <NavLink to="/verify">
            Verify Certificate
          </NavLink>
        </li>
        <li>
          <NavLink to="/templates">
            My Templates
          </NavLink>
        </li>
      </ul>
    </nav>
  );
}

export default Navigation;