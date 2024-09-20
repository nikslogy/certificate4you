import React from 'react';
import './Pricing.css';

function Pricing() {
  return (
    <div className="pricing">
      <h1>Pricing Plans</h1>
      <div className="pricing-plans">
        <div className="pricing-plan">
          <h2>Free Plan</h2>
          <p>Generate up to 200 certificates</p>
          <p>Price: $0/month</p>
          <button>Get Started</button>
        </div>
        <div className="pricing-plan">
          <h2>Basic Plan</h2>
          <p>Generate up to 500 certificates/month</p>
          <p>Price: $5/month</p>
          <button>Coming Soon</button>
        </div>
        <div className="pricing-plan">
          <h2>Pro Plan</h2>
          <p>Generate up to 3000 certificates/month</p>
          <p>Price: $15/month</p>
          <button>Coming Soon</button>
        </div>
      </div>
    </div>
  );
}

export default Pricing;