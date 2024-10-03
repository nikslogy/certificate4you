import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import './Auth.css';

function Signup() {
  const [formData, setFormData] = useState({ name: '', email: '', password: '', otp: '' });
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  const [otpSent, setOtpSent] = useState(false);
  const navigate = useNavigate();

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prevData => ({ ...prevData, [name]: value }));
  };

  const handleSendOtp = async (e) => {
    e.preventDefault();
    setError(null);

    try {
      const response = await fetch('/.netlify/functions/send-otp', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email: formData.email }),
      });

      if (response.ok) {
        setOtpSent(true);
        setSuccess('OTP sent successfully. Please check your email.');
      } else {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to send OTP');
      }
    } catch (error) {
      setError(error.message || 'Failed to send OTP. Please try again.');
    }
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
      {success && <div className="success-message show">{success}</div>}
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
        {!otpSent ? (
          <button type="button" onClick={handleSendOtp} className="auth-button">Send OTP</button>
        ) : (
          <>
            <div className="form-group1">
              <input
                type="text"
                id="otp"
                name="otp"
                value={formData.otp}
                onChange={handleInputChange}
                required
                placeholder=" "
              />
              <label htmlFor="otp">OTP</label>
            </div>
            <button type="submit" className="auth-button">Sign Up</button>
          </>
        )}
      </form>
      <p className="auth-link">
        Already have an account? <Link to="/login">Log in</Link>
      </p>
    </div>
  );
}

export default Signup;