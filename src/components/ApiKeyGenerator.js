import React, { useState } from 'react';
import './ApiKeyGenerator.css';

function ApiKeyGenerator() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    reason: ''
  });
  const [apiKey, setApiKey] = useState(null);
  const [error, setError] = useState(null);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prevData => ({ ...prevData, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setApiKey(null);

    try {
      const response = await fetch('/.netlify/functions/generate-api-key', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        throw new Error('Failed to generate API key');
      }

      const result = await response.json();
      setApiKey(result.apiKey);
    } catch (error) {
      setError('Failed to generate API key. Please try again.');
    }
  };

  return (
    <div className="api-key-generator">
      <h1>Get Your Free API Key</h1>
      {error && <div className="error-message">{error}</div>}
      {apiKey ? (
        <div className="success-message">
          <p>Your API Key: <strong>{apiKey}</strong></p>
          <p>You can now generate up to 200 certificates with this key.</p>
        </div>
      ) : (
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="name">Name</label>
            <input
              type="text"
              id="name"
              name="name"
              value={formData.name}
              onChange={handleInputChange}
              required
            />
          </div>
          <div className="form-group">
            <label htmlFor="email">Email</label>
            <input
              type="email"
              id="email"
              name="email"
              value={formData.email}
              onChange={handleInputChange}
              required
            />
          </div>
          <div className="form-group">
            <label htmlFor="reason">Reason for API Key</label>
            <textarea
              id="reason"
              name="reason"
              value={formData.reason}
              onChange={handleInputChange}
              required
            />
          </div>
          <button type="submit">Get API Key</button>
        </form>
      )}
    </div>
  );
}

export default ApiKeyGenerator;