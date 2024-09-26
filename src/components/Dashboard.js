import React, { useState, useEffect } from 'react';
import './Dashboard.css';

function Dashboard() {
  const [apiKeys, setApiKeys] = useState([]);
  const [error, setError] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
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

    fetchApiKeys();
  }, []);

  const regenerateApiKey = async (keyId) => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/.netlify/functions/regenerate-api-key', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({ keyId }),
      });

      if (response.ok) {
        const result = await response.json();
        setApiKeys(apiKeys.map(key => key.id === keyId ? result.apiKey : key));
      } else {
        throw new Error('Failed to regenerate API key');
      }
    } catch (error) {
      setError('Failed to regenerate API key. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const deleteApiKey = async (keyId) => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/.netlify/functions/delete-api-key', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({ keyId }),
      });

      if (response.ok) {
        setApiKeys(apiKeys.filter(key => key.id !== keyId));
      } else {
        throw new Error('Failed to delete API key');
      }
    } catch (error) {
      setError('Failed to delete API key. Please try again.');
    } finally {
      setIsLoading(false);
    }
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
            <div key={key.id} className="api-key">
              <p><strong>Key:</strong> {key.apiKey}</p>
              <p><strong>Created At:</strong> {key.createdAt}</p>
              <p><strong>Usage Count:</strong> {key.usageCount}</p>
              <p><strong>Limit:</strong> {key.limit}</p>
              <button onClick={() => regenerateApiKey(key.id)}>Regenerate</button>
              <button onClick={() => deleteApiKey(key.id)}>Delete</button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default Dashboard;