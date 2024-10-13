import React from 'react';
import './Pricing.css';
import { FaCheck } from 'react-icons/fa';

function Pricing() {
  const plans = [
    {
      title: 'Free Plan',
      description: 'Perfect for small projects',
      price: '$0',
      period: 'month',
      features: [
        'Generate up to 200 certificates',
        'Basic templates',
        'Email support'
      ],
      buttonText: 'Get Started',
      isPopular: false
    },
    {
      title: 'Basic Plan',
      description: 'Great for growing businesses',
      price: '$5',
      period: 'month',
      features: [
        'Generate up to 1000 certificates/month',
        'All templates included',
        'Priority email support',
        'API access',
        'AI generation',
      ],
      buttonText: 'Coming Soon',
      isPopular: true
    },
    {
      title: 'Pro Plan',
      description: 'For large-scale operations',
      price: '$15',
      period: 'month',
      features: [
        'Generate up to 4000 certificates/month',
        'Custom templates',
        '24/7 phone support',
        'Advanced API features',
        'Bulk generation',
        'AI generation'
      ],
      buttonText: 'Coming Soon',
      isPopular: false
    }
  ];

  return (
    <div className="pricing-container">
      <h1 className="pricing-title">Choose Your Plan</h1>
      <p className="pricing-subtitle">Select the perfect plan for your certificate needs</p>
      <div className="pricing-plans-container">
        {plans.map((plan, index) => (
          <div key={index} className={`pricing-plan-card ${plan.isPopular ? 'popular' : ''}`}>
            {plan.isPopular && <div className="popular-badge">Most Popular</div>}
            <h2 className="pricing-plan-title">{plan.title}</h2>
            <p className="pricing-plan-description">{plan.description}</p>
            <div className="pricing-plan-price">
              <span className="price">{plan.price}</span>
              <span className="period">/{plan.period}</span>
            </div>
            <ul className="pricing-plan-features">
              {plan.features.map((feature, featureIndex) => (
                <li key={featureIndex}>
                  <FaCheck className="feature-icon" /> {feature}
                </li>
              ))}
            </ul>
            <button className="pricing-plan-button">{plan.buttonText}</button>
          </div>
        ))}
      </div>
    </div>
  );
}

export default Pricing;