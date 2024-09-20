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
  const [isLoading, setIsLoading] = useState(false);
  const [remainingLimit, setRemainingLimit] = useState(null);
  const [copySuccess, setCopySuccess] = useState(false);
  const [showSendToEmail, setShowSendToEmail] = useState(false);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prevData => ({ ...prevData, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);
    setShowSendToEmail(false);

    try {
      const response = await fetch('/.netlify/functions/generate-api-key', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        const result = await response.json();
        setApiKey(result.apiKey);
        setRemainingLimit(result.limit);
      } else if (response.status === 400) {
        // User already exists
        setShowSendToEmail(true);
      } else {
        throw new Error('Failed to generate API key');
      }
    } catch (error) {
      setError('Failed to process your request. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const sendApiKeyToEmail = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/.netlify/functions/send-api-key-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email: formData.email }),
      });

      if (response.ok) {
        setShowSendToEmail(false);
        setApiKey('API key sent to your email');
      } else {
        throw new Error('Failed to send API key to email');
      }
    } catch (error) {
      setError('Failed to send API key to email. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(apiKey);
    setCopySuccess(true);
    setTimeout(() => setCopySuccess(false), 3000);
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
        <div className="loading-message">Processing your request, please wait...</div>
      ) : apiKey ? (
        <div className="success-message">
          <p>Your API Key: <strong>{apiKey}</strong></p>
          {remainingLimit && <p>You can generate up to {remainingLimit} certificates with this key.</p>}
          {copySuccess && <p className="copy-success">API Key copied to clipboard!</p>}
          <div className="api-key-actions">
            <button onClick={copyToClipboard}>Copy to Clipboard</button>
            <button onClick={downloadApiKey}>Download API Key</button>
          </div>
        </div>
      ) : showSendToEmail ? (
        <div className="existing-user-message">
          <p>An API key already exists for this email.</p>
          <button onClick={sendApiKeyToEmail}>Send API Key to Email</button>
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