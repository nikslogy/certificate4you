import React, { useState } from 'react';

function CertificateVerifier() {
  const [id, setId] = useState('');
  const [result, setResult] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const response = await fetch(`http://localhost:3001/api/verify-certificate/${id}`);
      const text = await response.text(); // Get the raw response text
      console.log('Raw response:', text); // Log the raw response
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = JSON.parse(text); // Parse the text as JSON
      setResult(data);
    } catch (error) {
      console.error('Error verifying certificate:', error);
      setResult({ error: 'Failed to verify certificate' });
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
        <button type="submit">Verify</button>
      </form>
      {result && (
        <div>
          {result.name ? (
            <p>Certificate is valid. Name: {result.name}</p>
          ) : (
            <p>Certificate is invalid.</p>
          )}
        </div>
      )}
    </div>
  );
}

export default CertificateVerifier;
