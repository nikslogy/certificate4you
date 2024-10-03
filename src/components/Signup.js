import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './Auth.css';

function Signup() {
  const [formData, setFormData] = useState({ name: '', email: '', password: '' });
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  const navigate = useNavigate();

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prevData => ({ ...prevData, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setSuccess(false);

    try {
      const response = await fetch('/.netlify/functions/signup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        setSuccess(true);
        setTimeout(() => {
          navigate('/login');
        }, 1500);
      } else {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to sign up');
      }
    } catch (error) {
      setError(error.message || 'Failed to sign up. Please try again.');
    }
  };

  return (
    <div className={`auth-container ${success ? 'success' : ''}`}>
      <h1>Sign Up</h1>
      {error && <div className="error-message">{error}</div>}
      {success && <div className="success-message show">Sign up successful! Redirecting to login...</div>}
      <form onSubmit={handleSubmit} className="auth-form">
        <div className="form-group1">
          <input
            type="text"
            id="name"
            name="name"
            value={formData.name}
            onChange={handleInputChange}
            required
            placeholder=" "
          />
          <label htmlFor="name">Name</label>
        </div>
        <div className="form-group1">
          <input
            type="email"
            id="email"
            name="email"
            value={formData.email}
            onChange={handleInputChange}
            required
            placeholder=" "
          />
          <label htmlFor="email">Email</label>
        </div>
        <div className="form-group1">
          <input
            type="password"
            id="password"
            name="password"
            value={formData.password}
            onChange={handleInputChange}
            required
            placeholder=" "
          />
          <label htmlFor="password">Password</label>
        </div>
        <button type="submit" className="auth-button">Sign Up</button>
      </form>
    </div>
  );
}

export default Signup;