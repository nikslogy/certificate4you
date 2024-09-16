import React, { useState, useRef } from 'react';
import SignatureCanvas from 'react-signature-canvas';
import './CertificateGenerator.css';

function CertificateGenerator() {
  const [formData, setFormData] = useState({
    name: '',
    course: '',
    date: '',
    certificateType: 'completion',
    issuer: '',
    additionalInfo: '',
  });
  const [logo, setLogo] = useState(null);
  const [signatures, setSignatures] = useState([{ name: '', image: null, type: 'upload' }]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const sigPads = useRef([]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prevData => ({ ...prevData, [name]: value }));
  };

  const handleLogoUpload = (e) => {
    setLogo(e.target.files[0]);
  };

  const handleSignatureNameChange = (index, name) => {
    const newSignatures = [...signatures];
    newSignatures[index].name = name;
    setSignatures(newSignatures);
  };

  const handleSignatureTypeChange = (index, type) => {
    const newSignatures = [...signatures];
    newSignatures[index].type = type;
    newSignatures[index].image = null;
    setSignatures(newSignatures);
  };

  const handleSignatureUpload = (index, e) => {
    const file = e.target.files[0];
    const reader = new FileReader();
    reader.onload = (event) => {
      const newSignatures = [...signatures];
      newSignatures[index].image = event.target.result;
      setSignatures(newSignatures);
    };
    reader.readAsDataURL(file);
  };

  const addSignatureField = () => {
    if (signatures.length < 3) {
      setSignatures([...signatures, { name: '', image: null, type: 'upload' }]);
    }
  };

  const removeSignatureField = (index) => {
    const newSignatures = signatures.filter((_, i) => i !== index);
    setSignatures(newSignatures);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
  
    const dataToSend = {
      ...formData,
      signatures: signatures.map((sig, index) => ({
        name: sig.name,
        image: sig.type === 'draw' ? sigPads.current[index].toDataURL() : sig.image
      }))
    };
  
    if (logo) {
      const reader = new FileReader();
      reader.onload = async (event) => {
        dataToSend.logo = event.target.result.split(',')[1]; // Get base64 data
  
        try {
          const response = await fetch('/.netlify/functions/generate-certificate', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(dataToSend),
          });
          
          if (!response.ok) {
            const errorText = await response.text();
            console.error('Error response:', errorText);
            throw new Error(`HTTP error! status: ${response.status}, details: ${errorText}`);
          }
          
          const result = await response.json();
          if (result.url) {
            window.open(result.url, '_blank');
          } else {
            throw new Error('No URL returned from server');
          }
        } catch (error) {
          console.error('Error generating certificate:', error);
          setError(`Failed to generate certificate. Error: ${error.message}`);
        } finally {
          setIsLoading(false);
        }
      };
      reader.readAsDataURL(logo);
    } else {
      // If no logo, send the data without it
      try {
        const response = await fetch('/.netlify/functions/generate-certificate', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(dataToSend),
        });
        
        // ... (rest of the error handling and response processing)
      } catch (error) {
        console.error('Error generating certificate:', error);
        setError(`Failed to generate certificate. Error: ${error.message}`);
      } finally {
        setIsLoading(false);
      }
    }
  };

  return (
    <div className="certificate-generator">
      <h1>Generate Certificate</h1>
      {error && <div className="error-message">{error}</div>}
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label htmlFor="certificateType">Certificate Type</label>
          <select
            id="certificateType"
            name="certificateType"
            value={formData.certificateType}
            onChange={handleInputChange}
            required
          >
            <option value="completion">Certificate of Completion</option>
            <option value="achievement">Certificate of Achievement</option>
            <option value="participation">Certificate of Participation</option>
            <option value="excellence">Certificate of Excellence</option>
            <option value="training">Certificate of Training</option>
            <option value="appreciation">Certificate of Appreciation</option>
          </select>
        </div>

        <div className="form-group">
          <label htmlFor="name">Recipient Name</label>
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
          <label htmlFor="course">Course/Event Name</label>
          <input
            type="text"
            id="course"
            name="course"
            value={formData.course}
            onChange={handleInputChange}
            required
          />
        </div>

        <div className="form-group">
          <label htmlFor="date">Date of Completion</label>
          <input
            type="date"
            id="date"
            name="date"
            value={formData.date}
            onChange={handleInputChange}
            required
          />
        </div>

        <div className="form-group">
          <label htmlFor="issuer">Issuer</label>
          <input
            type="text"
            id="issuer"
            name="issuer"
            value={formData.issuer}
            onChange={handleInputChange}
            required
          />
        </div>

        <div className="form-group">
          <label htmlFor="additionalInfo">Additional Information</label>
          <textarea
            id="additionalInfo"
            name="additionalInfo"
            value={formData.additionalInfo}
            onChange={handleInputChange}
          />
        </div>

        <div className="form-group">
          <label htmlFor="logo">Upload Logo</label>
          <input
            type="file"
            id="logo"
            accept="image/*"
            onChange={handleLogoUpload}
          />
        </div>

        <div className="form-group">
          <label>Signatures</label>
          {signatures.map((sig, index) => (
            <div key={index} className="signature-field">
              <input
                type="text"
                placeholder="Signer's Name"
                value={sig.name}
                onChange={(e) => handleSignatureNameChange(index, e.target.value)}
                required
              />
              <select
                value={sig.type}
                onChange={(e) => handleSignatureTypeChange(index, e.target.value)}
              >
                <option value="upload">Upload Signature</option>
                <option value="draw">Draw Signature</option>
              </select>
              {sig.type === 'upload' ? (
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => handleSignatureUpload(index, e)}
                  required
                />
              ) : (
                <SignatureCanvas
                  ref={(ref) => sigPads.current[index] = ref}
                  canvasProps={{width: 300, height: 150, className: 'signature-canvas'}}
                />
              )}
              {index > 0 && (
                <button type="button" onClick={() => removeSignatureField(index)}>Remove</button>
              )}
            </div>
          ))}
          {signatures.length < 3 && (
            <button type="button" onClick={addSignatureField}>Add Signature</button>
          )}
        </div>

        <button type="submit" disabled={isLoading}>
          {isLoading ? 'Generating...' : 'Generate Certificate'}
        </button>
      </form>
    </div>
  );
}

export default CertificateGenerator;