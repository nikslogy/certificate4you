import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import './Dashboard.css';
import { format } from 'date-fns';
import { motion, AnimatePresence } from 'framer-motion';

function Dashboard() {
  const [apiKeys, setApiKeys] = useState([]);
  const [error, setError] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showNotification, setShowNotification] = useState(false);
  const [notificationMessage, setNotificationMessage] = useState('');
  const [bulkGenerations, setBulkGenerations] = useState([]);

  useEffect(() => {
    fetchApiKeys();
    fetchBulkGenerations();
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

  const fetchBulkGenerations = async () => {
    try {
      const response = await fetch('/.netlify/functions/get-bulk-generations', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
      });

      if (response.ok) {
        const result = await response.json();
        setBulkGenerations(result.bulkGenerations);
      } else {
        throw new Error('Failed to fetch bulk generations');
      }
    } catch (error) {
      setError('Failed to fetch bulk generations. Please try again.');
    }
  };

  const deleteApiKey = async (apiKey) => {
    if (window.confirm('Are you sure you want to delete this API key?')) {
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

        const data = await response.json();

        if (response.ok) {
          setApiKeys(apiKeys.filter(key => key.apiKey !== apiKey));
          displayNotification('API key deleted successfully');
        } else {
          throw new Error(data.error || 'Failed to delete API key');
        }
      } catch (error) {
        setError(`Failed to delete API key: ${error.message}`);
      } finally {
        setIsLoading(false);
      }
    }
  };

  const copyApiKey = (key) => {
    navigator.clipboard.writeText(key).then(() => {
      displayNotification('API key copied to clipboard');
    });
  };

  const displayNotification = (message) => {
    setNotificationMessage(message);
    setShowNotification(true);
    setTimeout(() => setShowNotification(false), 3000);
  };

  return (
    <div className="dashboard">
      <h1>Dashboard</h1>
      <section className="api-keys-section">
        <h2>Manage Your API Keys</h2>
        {error && <div className="error-message">{error}</div>}
        {isLoading ? (
          <div className="loading-message">Loading...</div>
        ) : apiKeys.length === 0 ? (
          <div className="no-api-keys">
            <p>You don't have any API keys yet.</p>
            <Link to="/api-key-generator" className="create-api-key-button">Create API Key</Link>
          </div>
        ) : (
          <motion.div className="api-keys" layout>
            <AnimatePresence>
              {apiKeys.map(key => (
                <motion.div
                  key={key.apiKey}
                  className="api-key-card"
                  layout
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  transition={{ duration: 0.3 }}
                >
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
                </motion.div>
              ))}
            </AnimatePresence>
          </motion.div>
        )}
        {apiKeys.length > 0 && (
          <Link to="/api-key-generator" className="create-api-key-button">Create New API Key</Link>
        )}
      </section>
      
      <section className="bulk-generations-section">
        <h2>Bulk Certificate Generations</h2>
        {bulkGenerations.length === 0 ? (
          <p>No bulk generations found.</p>
        ) : (
          <div className="bulk-generations-list">
            {bulkGenerations.map(generation => (
              <div key={generation.id} className="bulk-generation-item">
                <p><strong>Generation ID:</strong> {generation.id}</p>
                <p><strong>Status:</strong> {generation.status}</p>
                <p><strong>Created:</strong> {format(new Date(generation.createdAt), 'PPpp')}</p>
                {generation.status === 'completed' && (
                  <a href={generation.downloadUrl} download className="download-button">Download Certificates</a>
                )}
              </div>
            ))}
          </div>
        )}
        <Link to="/bulk-certificate-generator" className="create-bulk-generation-button">Create Bulk Generation</Link>
      </section>

      <AnimatePresence>
        {showNotification && (
          <motion.div
            className="notification"
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 50 }}
          >
            {notificationMessage}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default Dashboard;