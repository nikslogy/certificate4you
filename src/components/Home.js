import React from 'react';
import { Link } from 'react-router-dom';
import './Home.css';

function Home() {
  return (
    <div className="home">
      <div className="hero">
        <h1 className="title">
          <span className="title-line">Certificate</span>
          <span className="title-line">4You</span>
        </h1>
        <p className="subtitle">Generate professional certificates with ease</p>
        <div className="cta-buttons">
          <Link to="/generate" className="cta-button primary">Generate Certificate</Link>
          <Link to="/api-guide" className="cta-button secondary">API Guide</Link>
        </div>
      </div>
      <div className="features">
        <div className="feature">
          <i className="fas fa-magic"></i>
          <h2>Easy to Use</h2>
          <p>Simple API for quick integration</p>
        </div>
        <div className="feature">
          <i className="fas fa-paint-brush"></i>
          <h2>Customizable</h2>
          <p>Tailor certificates to your needs</p>
        </div>
        <div className="feature">
          <i className="fas fa-lock"></i>
          <h2>Secure</h2>
          <p>Verified and tamper-proof certificates</p>
        </div>
      </div>
    </div>
  );
}

export default Home;