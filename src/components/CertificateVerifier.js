import React, { useState } from 'react';
import './CertificateVerifier.css';

function CertificateVerifier() {
  const [id, setId] = useState('');
  const [result, setResult] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const response = await fetch(`/api/verify-certificate/${id}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to verify certificate');
      }

      setResult(data);
      console.log('Certificate data:', data);
    } catch (error) {
      console.error('Error verifying certificate:', error);
      setResult({ error: error.message, isValid: false });
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
            </>
          )}
        </div>
      )}
    </div>
  );
}

export default CertificateVerifier;
