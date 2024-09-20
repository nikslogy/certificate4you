import React, { useState, useEffect, useCallback } from 'react';
import './ApiKeyGenerator.css';

function ApiKeyGenerator() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    reason: ''
  });
  const [apiKey, setApiKey] = useState(null);
  const [error, setError] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [remainingLimit, setRemainingLimit] = useState(null);

  const checkExistingUser = useCallback(async () => {
    if (!formData.email) return;
    try {
      const response = await fetch('/.netlify/functions/check-existing-user', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email: formData.email }),
      });

      if (response.ok) {
        const result = await response.json();
        if (result.apiKey) {
          setApiKey(result.apiKey);
          setRemainingLimit(result.remainingLimit);
        }
      }
    } catch (error) {
      console.error('Error checking existing user:', error);
    }
  }, [formData.email]);

  useEffect(() => {
    checkExistingUser();
  }, [checkExistingUser, formData.email]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prevData => ({ ...prevData, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

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
      setRemainingLimit(result.limit);
    } catch (error) {
      setError('Failed to generate API key. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(apiKey);
    alert('API Key copied to clipboard!');
  };

  const downloadApiKey = () => {
    const element = document.createElement('a');
    const file = new Blob([apiKey], {type: 'text/plain'});
    element.href = URL.createObjectURL(file);
    element.download = 'api_key.txt';
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  return (
    <div className="api-key-generator">
      <h1>Get Your Free API Key</h1>
      {error && <div className="error-message">{error}</div>}
      {isLoading ? (
        <div className="loading-message">Generating API Key, please wait...</div>
      ) : apiKey ? (
        <div className="success-message">
          <p>Your API Key: <strong>{apiKey}</strong></p>
          <p>Remaining limit: {remainingLimit} certificates</p>
          <div className="api-key-actions">
            <button onClick={copyToClipboard}>Copy to Clipboard</button>
            <button onClick={downloadApiKey}>Download API Key</button>
          </div>
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