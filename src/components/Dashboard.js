import React, { useState, useEffect } from 'react';
import './Dashboard.css';
import { format } from 'date-fns';

function Dashboard() {
  const [apiKeys, setApiKeys] = useState([]);
  const [error, setError] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    fetchApiKeys();
  }, []);

  const fetchApiKeys = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/.netlify/functions/get-api-keys', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
      });

      if (response.ok) {
        const result = await response.json();
        setApiKeys(result.apiKeys);
      } else {
        throw new Error('Failed to fetch API keys');
      }
    } catch (error) {
      setError('Failed to fetch API keys. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const deleteApiKey = async (apiKey) => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/.netlify/functions/delete-api-key', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({ keyId: apiKey }),
      });

      if (response.ok) {
        setApiKeys(apiKeys.filter(key => key.apiKey !== apiKey));
      } else {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to delete API key');
      }
    } catch (error) {
      setError(`Failed to delete API key: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const copyApiKey = (key) => {
    navigator.clipboard.writeText(key).then(() => {
      alert('API key copied to clipboard');
    }, (err) => {
      console.error('Could not copy text: ', err);
    });
  };

  return (
    <div className="dashboard">
      <h1>API Key Management</h1>
      {error && <div className="error-message">{error}</div>}
      {isLoading ? (
        <div className="loading-message">Loading...</div>
      ) : (
        <div className="api-keys">
          {apiKeys.map(key => (
            <div key={key.apiKey} className="api-key-card">
              <h3>API Key: {key.apiKey.slice(0, 8)}...</h3>
              <p><strong>Name:</strong> {key.name || 'Unnamed'}</p>
              <p><strong>Reason:</strong> {key.reason || 'Not specified'}</p>
              <p><strong>Created:</strong> {format(new Date(key.createdAt), 'PPpp')}</p>
              <p><strong>Usage Count:</strong> {key.usageCount}</p>
              <p><strong>Limit:</strong> {key.limit}</p>
              <div className="api-key-actions">
                <button onClick={() => copyApiKey(key.apiKey)} className="copy-button">Copy Key</button>
                <button onClick={() => deleteApiKey(key.apiKey)} className="delete-button">Delete</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default Dashboard;