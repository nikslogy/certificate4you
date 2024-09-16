import React, { useState } from 'react';

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
    } catch (error) {
      console.error('Error verifying certificate:', error);
      setResult({ error: error.message, isValid: false });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="CertificateVerifier">
      <h2>Verify Certificate</h2>
      <form onSubmit={handleSubmit}>
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
      </form>
      {result && (
        <div>
          {result.isValid ? (
            <div>
              <p>Certificate is valid.</p>
              <p>Name: {result.name}</p>
              {result.pdfUrl && (
                <a href={result.pdfUrl} target="_blank" rel="noopener noreferrer">
                  View Certificate
                </a>
              )}
            </div>
          ) : (
            <p>Certificate is invalid: {result.error}</p>
          )}
        </div>
      )}
    </div>
  );
}

export default CertificateVerifier;
