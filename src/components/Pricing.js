import React from 'react';
import './Pricing.css';

function Pricing() {
  return (
    <div className="pricing-container">
      <h1 className="pricing-title">Pricing Plans</h1>
      <div className="pricing-plans-container">
        <div className="pricing-plan-card">
          <h2 className="pricing-plan-title">Free Plan</h2>
          <p className="pricing-plan-description">Generate up to 200 certificates</p>
          <p className="pricing-plan-price">Price: $0/month</p>
          <button className="pricing-plan-button">Get Started</button>
        </div>
        <div className="pricing-plan-card">
          <h2 className="pricing-plan-title">Basic Plan</h2>
          <p className="pricing-plan-description">Generate up to 500 certificates/month</p>
          <p className="pricing-plan-price">Price: $5/month</p>
          <button className="pricing-plan-button">Coming Soon</button>
        </div>
        <div className="pricing-plan-card">
          <h2 className="pricing-plan-title">Pro Plan</h2>
          <p className="pricing-plan-description">Generate up to 3000 certificates/month</p>
          <p className="pricing-plan-price">Price: $15/month</p>
          <button className="pricing-plan-button">Coming Soon</button>
        </div>
      </div>
    </div>
  );
}

export default Pricing;