import React, { useState } from 'react';
import './CertificateVerifier.css';

function CertificateVerifier() {
  const [id, setId] = useState('');
  const [result, setResult] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [errorDetails, setErrorDetails] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorDetails(null);
    
    // Trim the ID to remove any accidental whitespace
    const trimmedId = id.trim();
    
    try {
      console.log(`Sending verification request for ID: ${trimmedId}`);
      const response = await fetch(`/.netlify/functions/verify-certificate/${trimmedId}`);
      const data = await response.json();
      console.log('Response received:', data);

      if (!response.ok) {
        throw new Error(data.error || 'Failed to verify certificate');
      }

      setResult(data);
    } catch (error) {
      console.error('Error verifying certificate:', error);
      setResult({ error: error.message, isValid: false });
      setErrorDetails(error.stack || 'No additional details available');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="certificate-verifier">
      <h2>Verify Certificate</h2>
      <form onSubmit={handleSubmit}>
        <div className="input-group">
          <input
            type="text"
            value={id}
            onChange={(e) => setId(e.target.value)}
            placeholder="Enter Certificate ID"
            required
          />
          <button type="submit" disabled={isLoading}>
            {isLoading ? 'Verifying...' : 'Verify'}
          </button>
        </div>
      </form>
      {result && (
        <div className={`result ${result.isValid ? 'valid' : 'invalid'}`}>
          {result.isValid ? (
            <>
              <h3>Certificate is Valid</h3>
              <p><strong>Name:</strong> {result.name}</p>
              <p><strong>Issuer:</strong> {result.issuer}</p>
              {result.course && <p><strong>Course:</strong> {result.course}</p>}
              {result.date && <p><strong>Date:</strong> {result.date}</p>}
              {result.pdfUrl && (
                <a href={result.pdfUrl} target="_blank" rel="noopener noreferrer" className="btn btn-view">
                  View Certificate
                </a>
              )}
            </>
          ) : (
            <>
              <h3>Certificate is Invalid</h3>
              <p>{result.error}</p>
              {result.details && <p><small>Details: {result.details}</small></p>}
            </>
          )}
        </div>
      )}
      {errorDetails && (
        <div className="debug-info">
          <details>
            <summary>Debug Information</summary>
            <pre>{errorDetails}</pre>
          </details>
        </div>
      )}
    </div>
  );
}

export default CertificateVerifier;
